"""Deterministic calendar: which slots a persona needs filled, and with which pillar/format.

Code decides *when* and *how much* (so cadence is reliable); the agent decides *what*.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from .persona import Persona


@dataclass
class Slot:
    kind: str          # single | carousel | story
    at_utc: str        # ISO8601, UTC
    local: str         # human label in the persona's timezone
    pillar: str = ""
    frames: int = 1

    @property
    def lane(self) -> str:
        return "story" if self.kind == "story" else "feed"


def _spread(n: int, days: int) -> list[int]:
    """Day offsets for n posts spread evenly over `days` days."""
    if n <= 0:
        return []
    return [int(i * days / n) for i in range(n)]


def assign_by_share(names: list[str], shares: list[float], count: int) -> list[str]:
    """Pick `count` labels so running totals track the target shares (smooth, deterministic)."""
    if not names or count <= 0:
        return [""] * max(count, 0)
    total = sum(shares) or 1.0
    shares = [s / total for s in shares]
    used = [0] * len(names)
    out = []
    for i in range(1, count + 1):
        # the label furthest behind its target goes next; ties go to the larger share
        deficits = [shares[j] * i - used[j] for j in range(len(names))]
        j = max(range(len(names)), key=lambda k: (deficits[k], shares[k]))
        used[j] += 1
        out.append(names[j])
    return out


def plan_slots(persona: Persona, start: date, days: int = 7,
               taken: set[tuple[str, str]] | None = None) -> list[Slot]:
    c = persona.cadence
    tz = ZoneInfo(c.timezone)
    taken = taken or set()
    hours = c.post_hours

    def at(day: date, hour: int) -> tuple[str, str]:
        local = datetime.combine(day, time(hour=hour), tzinfo=tz)
        return local.astimezone(timezone.utc).isoformat(), local.strftime("%a %d %b %H:%M %Z")

    slots: list[Slot] = []

    weeks = days / 7
    n_feed = round(c.feed_per_week * weeks)
    for i, offset in enumerate(_spread(n_feed, days)):
        day = start + timedelta(days=offset)
        utc, local = at(day, hours[(i * 2 + len(hours) - 1) % len(hours)])  # bias to evening slot first
        slots.append(Slot("single", utc, local))

    # carousels: every feed slot whose cumulative share crosses the next integer
    acc = 0.0
    for s in slots:
        acc += c.carousel_share
        if acc >= 1 - 1e-9:
            acc -= 1
            s.kind, s.frames = "carousel", 4

    for d in range(days):
        day = start + timedelta(days=d)
        for k in range(c.stories_per_day):
            utc, local = at(day, hours[k % len(hours)])
            slots.append(Slot("story", utc, local, frames=c.frames_per_story))

    slots = [s for s in slots if (s.lane, s.at_utc) not in taken]

    feed = [s for s in slots if s.lane == "feed"]
    if persona.pillars:
        names = [p.name for p in persona.pillars]
        for s, name in zip(feed, assign_by_share(names, [p.share for p in persona.pillars], len(feed))):
            s.pillar = name
    for s in slots:
        if s.lane == "story" and not s.pillar:
            s.pillar = "behind the scenes / daily life"

    return sorted(slots, key=lambda s: (s.at_utc, s.kind))
