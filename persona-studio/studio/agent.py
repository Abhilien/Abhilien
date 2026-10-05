"""The studio agent: Claude with tools to research niches, design personas and plan content.

What the agent can do on its own: research (web search + case studies), create and edit
persona bibles, and fill the content queue. What it deliberately cannot do: render paid
images, approve posts or publish. Those stay human commands, so nothing goes live without you.
"""

from __future__ import annotations

import json
import re
from datetime import date, datetime, timezone
from typing import Callable

import anthropic
import yaml
from pydantic import ValidationError

from .config import MODEL, Settings
from .persona import Persona, load_all, load_persona, save_persona
from .planner import plan_slots
from .store import Store

SYSTEM_PROMPT = """\
You are the creative director and operator of an AI influencer studio that runs a portfolio of \
Instagram channels. Some channels are AI characters (original, fictional people with a locked \
face: the studio's "AI celebs"); others are faceless (aesthetic, place, object, POV or \
micro-education pages). The content is photos only: single images, carousels and stories.

How you work:
- Ground decisions in evidence: the studio's case studies, live web research, and each \
channel's own performance numbers. Say which evidence a decision rests on.
- Think like a talent manager, not a content mill. A character needs a point of view, a life \
with recurring people and places, small storylines that run across weeks, and a reason to \
follow beyond looks. A faceless page needs one tight aesthetic or promise and posts people \
want to save and share.
- Design for Instagram's signals: saves, shares, story replies and watch-through. Carousels \
should open with a hook frame. Stories should be 3-5 frame mini-arcs (setup, moment, payoff \
or question).

Non-negotiable rules (the business depends on them):
1. Characters are original and fictional. Never base a persona on a real person's face, name, \
voice or identity, and never imply a real celebrity endorses anything.
2. Every character is an adult (age 21 or older is the studio default).
3. Every channel discloses that it is AI in its bio, and the publishing code adds the \
disclosure to every caption. Never write captions that claim the images are real photos, real \
trips or real product results.
4. No sexualised content, no hate or harassment, no medical, financial or legal claims \
presented as advice, no fake giveaways or engagement bait ("follow for follow", "comment to win").
5. Paid partnerships are labelled (#ad, or Instagram's paid-partnership label).

Writing image scenes (the `scene` field of a frame):
- Describe only the scene: location, action and pose, outfit, props, framing, time of day, mood.
- Do NOT describe the character's face or body. The pipeline adds the locked identity and \
visual style to every prompt automatically, and re-describing the face makes it drift.
- For faceless channels, never include an identifiable person; hands, silhouettes and \
back-of-head POV are fine.
- Story frames may carry `overlay` text: 12 words or fewer, conversational.

Captions follow the persona's voice settings. Write the caption body only: hashtags go in \
the hashtags list (mix the persona's core tags with relevant rotating ones), and the \
disclosure line is appended by code.

When a tool returns a validation error, fix the input and call it again."""

TOOLS: list[dict] = [
    {
        "name": "list_personas",
        "description": "List every persona (channel) in the studio with its genre, type and queue counts.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "get_persona",
        "description": "Return one persona's full bible as YAML.",
        "input_schema": {
            "type": "object",
            "properties": {"slug": {"type": "string"}},
            "required": ["slug"], "additionalProperties": False,
        },
    },
    {
        "name": "save_persona",
        "description": (
            "Create or overwrite a persona bible. `persona` must match this JSON schema; the tool "
            "returns validation errors if not. Schema:\n" + json.dumps(Persona.model_json_schema())
        ),
        "input_schema": {
            "type": "object",
            "properties": {"persona": {"type": "object", "description": "The full persona object."}},
            "required": ["persona"], "additionalProperties": False,
        },
    },
    {
        "name": "list_case_studies",
        "description": "Successful AI influencers and faceless page models from the studio's research file. "
                       "Filter by type ('ai_character' or 'faceless') and/or a genre keyword.",
        "input_schema": {
            "type": "object",
            "properties": {"type": {"type": "string"}, "genre_keyword": {"type": "string"}},
            "additionalProperties": False,
        },
    },
    {
        "name": "get_open_slots",
        "description": "Calendar slots a persona still needs filled over the next `days` days, each with its "
                       "format (single/carousel/story), time, pillar and frame count. Fill these with queue_post.",
        "input_schema": {
            "type": "object",
            "properties": {"slug": {"type": "string"},
                           "days": {"type": "integer", "minimum": 1, "maximum": 31}},
            "required": ["slug"], "additionalProperties": False,
        },
    },
    {
        "name": "queue_post",
        "description": "Add one planned post to the queue. `slot_at` must be one of the open slots' at_utc values. "
                       "single = 1 frame, carousel = 2-10 frames, story = one frame per story card.",
        "input_schema": {
            "type": "object",
            "properties": {
                "slug": {"type": "string"},
                "kind": {"type": "string", "enum": ["single", "carousel", "story"]},
                "slot_at": {"type": "string"},
                "pillar": {"type": "string"},
                "concept": {"type": "string", "description": "One line: the idea and why it should perform"},
                "caption": {"type": "string", "description": "Caption body; empty for stories"},
                "hashtags": {"type": "array", "items": {"type": "string"}},
                "frames": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"scene": {"type": "string"}, "overlay": {"type": "string"}},
                        "required": ["scene"], "additionalProperties": False,
                    },
                },
            },
            "required": ["slug", "kind", "slot_at", "concept", "frames"],
            "additionalProperties": False,
        },
    },
    {
        "name": "list_queue",
        "description": "List queued posts, optionally filtered by persona slug and status "
                       "(planned, rendered, approved, published, rejected, failed).",
        "input_schema": {
            "type": "object",
            "properties": {"slug": {"type": "string"}, "status": {"type": "string"}},
            "additionalProperties": False,
        },
    },
    {
        "name": "revise_post",
        "description": "Revise a post that is not yet published. Changing frames sends it back to 'planned' "
                       "so it is re-rendered.",
        "input_schema": {
            "type": "object",
            "properties": {
                "post_id": {"type": "integer"},
                "concept": {"type": "string"},
                "caption": {"type": "string"},
                "hashtags": {"type": "array", "items": {"type": "string"}},
                "frames": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"scene": {"type": "string"}, "overlay": {"type": "string"}},
                        "required": ["scene"], "additionalProperties": False,
                    },
                },
            },
            "required": ["post_id"], "additionalProperties": False,
        },
    },
    {
        "name": "get_performance",
        "description": "A persona's latest per-post metrics (reach, likes, comments, saved, shares...) and "
                       "follower history. Empty until posts are published and insights are refreshed.",
        "input_schema": {
            "type": "object",
            "properties": {"slug": {"type": "string"}},
            "required": ["slug"], "additionalProperties": False,
        },
    },
    {
        "name": "save_report",
        "description": "Save a markdown research or strategy report to research/reports/. Returns the path.",
        "input_schema": {
            "type": "object",
            "properties": {"title": {"type": "string"}, "markdown": {"type": "string"}},
            "required": ["title", "markdown"], "additionalProperties": False,
        },
    },
]

SERVER_TOOLS: list[dict] = [
    {"type": "web_search_20260209", "name": "web_search", "max_uses": 10},
    {"type": "web_fetch_20260209", "name": "web_fetch", "max_uses": 6},
]


class ToolError(Exception):
    pass


class Toolbox:
    """Executes the agent's client-side tools against the studio's files and database."""

    def __init__(self, settings: Settings, store: Store, today: date | None = None):
        self.settings, self.store = settings, store
        self.today = today or datetime.now(timezone.utc).date()

    def run(self, name: str, args: dict) -> str:
        fn = getattr(self, f"t_{name}", None)
        if fn is None:
            raise ToolError(f"unknown tool {name}")
        return fn(**args)

    def t_list_personas(self) -> str:
        counts = self.store.counts()
        rows = [{"slug": p.slug, "name": p.name, "type": p.persona_type, "genre": p.genre,
                 "niche": p.niche, "queue": counts.get(p.slug, {})}
                for p in load_all(self.settings.personas_dir)]
        return json.dumps(rows, indent=1) if rows else "No personas yet."

    def t_get_persona(self, slug: str) -> str:
        try:
            p = load_persona(self.settings.personas_dir, slug)
        except FileNotFoundError as e:
            raise ToolError(str(e))
        return yaml.safe_dump(p.model_dump(mode="json", exclude_none=True), sort_keys=False, allow_unicode=True)

    def t_save_persona(self, persona: dict) -> str:
        try:
            p = Persona.model_validate(persona)
        except ValidationError as e:
            raise ToolError(f"Persona is invalid, fix and retry:\n{e}")
        path = save_persona(self.settings.personas_dir, p)
        return f"Saved {p.name} ({p.slug}) to {path.relative_to(self.settings.root)}"

    def t_list_case_studies(self, type: str = "", genre_keyword: str = "") -> str:
        data = yaml.safe_load(self.settings.case_studies_file.read_text()) or []
        if type:
            data = [c for c in data if c.get("type") == type]
        if genre_keyword:
            kw = genre_keyword.lower()
            data = [c for c in data if kw in json.dumps(c).lower()]
        return yaml.safe_dump(data, sort_keys=False, allow_unicode=True) if data else "No matching case studies."

    def t_get_open_slots(self, slug: str, days: int = 7) -> str:
        p = self._persona(slug)
        slots = plan_slots(p, self.today, days, self.store.slots_taken(slug))
        return json.dumps([s.__dict__ for s in slots], indent=1) if slots else "Calendar is full."

    def t_queue_post(self, slug: str, kind: str, slot_at: str, concept: str, frames: list[dict],
                     caption: str = "", hashtags: list[str] | None = None, pillar: str = "") -> str:
        p = self._persona(slug)
        try:
            datetime.fromisoformat(slot_at)
        except ValueError:
            raise ToolError("slot_at must be an ISO timestamp from get_open_slots")
        lane = "story" if kind == "story" else "feed"
        if (lane, slot_at) in self.store.slots_taken(slug):
            raise ToolError(f"slot {slot_at} is already taken for {lane}")
        if p.persona_type == "faceless":
            for f in frames:
                if re.search(r"\b(face|selfie|portrait)\b", f.get("scene", ""), re.I):
                    raise ToolError("faceless channel: scenes must not show a face/selfie/portrait")
        hashtags = (hashtags or [])[: max(p.hashtags.per_post, len(p.hashtags.core))]
        try:
            pid = self.store.add_post(slug, kind, slot_at, concept, frames, caption, hashtags, pillar)
        except ValueError as e:
            raise ToolError(str(e))
        return f"Queued post #{pid}"

    def t_list_queue(self, slug: str = "", status: str = "") -> str:
        posts = self.store.list(persona=slug or None, status=status or None)
        return json.dumps([p.summary() for p in posts], indent=1) if posts else "Queue is empty."

    def t_revise_post(self, post_id: int, **changes) -> str:
        try:
            post = self.store.get(post_id)
        except KeyError as e:
            raise ToolError(str(e))
        if post.status == "published":
            raise ToolError("published posts cannot be revised")
        if "frames" in changes:
            changes["status"] = "planned"
            changes["media_paths"], changes["media_urls"] = [], []
        self.store.update(post_id, **changes)
        return f"Revised post #{post_id}"

    def t_get_performance(self, slug: str) -> str:
        return json.dumps({"posts": self.store.latest_post_metrics(slug),
                           "followers": self.store.follower_history(slug)}, indent=1)

    def t_save_report(self, title: str, markdown: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60] or "report"
        path = self.settings.reports_dir / f"{self.today.isoformat()}-{slug}.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"# {title}\n\n{markdown}\n")
        return f"Saved {path.relative_to(self.settings.root)}"

    def _persona(self, slug: str) -> Persona:
        try:
            return load_persona(self.settings.personas_dir, slug)
        except FileNotFoundError as e:
            raise ToolError(str(e))


class StudioAgent:
    def __init__(self, settings: Settings, store: Store, client: anthropic.Anthropic | None = None,
                 on_event: Callable[[str, str], None] | None = None, effort: str = "high",
                 web: bool = True, max_turns: int = 60):
        self.client = client or anthropic.Anthropic()
        self.tools = Toolbox(settings, store)
        self.on_event = on_event or (lambda kind, text: None)
        self.effort = effort
        self.tool_defs = TOOLS + (SERVER_TOOLS if web else [])
        self.max_turns = max_turns
        self.messages: list[dict] = []

    def ask(self, prompt: str) -> str:
        """Run one user request to completion; returns the agent's final text."""
        self.messages.append({"role": "user", "content": prompt})
        for _ in range(self.max_turns):
            response = self.client.beta.messages.create(
                model=MODEL,
                max_tokens=16000,
                system=SYSTEM_PROMPT,
                tools=self.tool_defs,
                messages=self.messages,
                thinking={"type": "adaptive"},
                output_config={"effort": self.effort},
                cache_control={"type": "ephemeral"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
            # append the full content (thinking, server tool results...) unchanged
            self.messages.append({"role": "assistant", "content": response.content})
            text = "".join(b.text for b in response.content if b.type == "text")

            if response.stop_reason == "refusal":
                self.on_event("refusal", text)
                return text or "The request was declined."
            if response.stop_reason == "pause_turn":
                continue  # long server-side search turn: send it back to resume
            if response.stop_reason != "tool_use":
                if response.stop_reason == "max_tokens":
                    self.on_event("warning", "response hit max_tokens and may be cut off")
                return text

            if text:
                self.on_event("text", text)
            results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                self.on_event("tool", f"{block.name} {json.dumps(block.input)[:160]}")
                try:
                    out, is_error = self.tools.run(block.name, dict(block.input)), False
                except ToolError as e:
                    out, is_error = str(e), True
                except TypeError as e:  # wrong/missing arguments
                    out, is_error = f"bad arguments: {e}", True
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": out, "is_error": is_error})
            self.messages.append({"role": "user", "content": results})
        return "Stopped: too many steps in one request."


# --- canned missions -----------------------------------------------------------

def mission_new_persona(brief: str) -> str:
    return f"""Create a new channel for the studio. Brief: {brief}

1. Study what already works: list_case_studies for this type and genre, then web_search for \
what is succeeding in this niche on Instagram right now (formats, aesthetics, posting rhythm, \
how similar accounts make money). Note which accounts you found.
2. Find the gap: a specific angle, personality or underserved audience (language and region \
count) rather than a copy of an existing account.
3. Design the full persona bible and save it with save_persona. For an AI character, write a \
very specific identity lock (face, hair, build, 2-3 signature details) and a signature trait \
people will recognise at thumbnail size. Give the character a home base, a friend group and \
running storylines.
4. Save a launch report with save_report: positioning, 5 handle ideas, bio, the first 9 grid \
posts as a cohesive grid, a 30-day growth plan, and a monetization path with milestones.
Finish with a short summary."""


def mission_research(topic: str) -> str:
    return f"""Research for the studio: {topic}

Use list_case_studies and web_search/web_fetch. Look for concrete, recent evidence: account \
examples, follower ranges, formats that perform, how they monetize, what got accounts \
penalised. Separate verified facts (with sources) from your own inferences. Save the result \
with save_report, ending with specific recommendations for our portfolio (list_personas)."""


def mission_plan(slug: str, days: int) -> str:
    return f"""Plan content for '{slug}' for the next {days} days.

1. get_persona and get_performance (use the numbers if there are any: more of what earned \
saves and shares, less of what did not).
2. get_open_slots for {days} days, then fill every slot with queue_post, respecting each \
slot's format, pillar and frame count.
3. Make the week feel like a life or a coherent publication: connect stories and feed posts \
(a story teases what a feed post pays off), keep recurring places and people, and build one \
small storyline across the week.
Finish with a table of what you queued."""


def mission_review(slug: str) -> str:
    return f"""Run a performance review for '{slug}'.

get_persona, get_performance and list_queue. Identify which pillars, formats and posting \
times are working (if there is no data yet, say so and review the plan's quality instead). \
Recommend concrete changes. If a change to the persona bible is clearly justified (pillar \
shares, cadence, hashtags), apply it with save_persona and say what you changed. Revise any \
unpublished queued posts that no longer fit, using revise_post. Save the review with save_report."""
