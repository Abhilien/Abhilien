"""SQLite content queue + metrics. One file, no server.

Post lifecycle:  planned -> rendered -> approved -> published
                       \\-> rejected        \\-> failed (retryable)
Nothing reaches Instagram without passing through ``approved``: a human signs off.
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

STATUSES = ("planned", "rendered", "approved", "published", "rejected", "failed")
KINDS = ("single", "carousel", "story")

SCHEMA = """
CREATE TABLE IF NOT EXISTS posts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    persona       TEXT NOT NULL,
    kind          TEXT NOT NULL,
    slot_at       TEXT NOT NULL,           -- ISO8601 UTC
    pillar        TEXT DEFAULT '',
    concept       TEXT NOT NULL,
    caption       TEXT DEFAULT '',
    hashtags      TEXT DEFAULT '[]',
    frames        TEXT NOT NULL,           -- JSON list of {scene, overlay}
    status        TEXT NOT NULL DEFAULT 'planned',
    media_paths   TEXT DEFAULT '[]',
    media_urls    TEXT DEFAULT '[]',
    ig_media_ids  TEXT DEFAULT '[]',
    notes         TEXT DEFAULT '',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS posts_persona_slot ON posts(persona, slot_at);

CREATE TABLE IF NOT EXISTS post_metrics (
    post_id    INTEGER NOT NULL REFERENCES posts(id),
    fetched_at TEXT NOT NULL,
    metric     TEXT NOT NULL,
    value      REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS account_metrics (
    persona    TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    followers  INTEGER,
    media_count INTEGER
);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@dataclass
class Post:
    id: int
    persona: str
    kind: str
    slot_at: str
    pillar: str
    concept: str
    caption: str
    hashtags: list[str]
    frames: list[dict]
    status: str
    media_paths: list[str] = field(default_factory=list)
    media_urls: list[str] = field(default_factory=list)
    ig_media_ids: list[str] = field(default_factory=list)
    notes: str = ""

    @property
    def full_caption(self) -> str:
        tags = " ".join(h if h.startswith("#") else f"#{h}" for h in self.hashtags)
        return f"{self.caption}\n\n{tags}".strip()

    def summary(self) -> dict:
        return {
            "id": self.id, "persona": self.persona, "kind": self.kind, "slot_at": self.slot_at,
            "pillar": self.pillar, "concept": self.concept, "status": self.status,
            "frames": len(self.frames), "notes": self.notes,
        }


class Store:
    def __init__(self, path: Path | str):
        self.path = str(path)
        self.db = sqlite3.connect(self.path)
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)

    def close(self) -> None:
        self.db.close()

    # --- posts ---------------------------------------------------------------

    def add_post(self, persona: str, kind: str, slot_at: str, concept: str, frames: list[dict],
                 caption: str = "", hashtags: list[str] | None = None, pillar: str = "") -> int:
        if kind not in KINDS:
            raise ValueError(f"kind must be one of {KINDS}")
        if not frames:
            raise ValueError("a post needs at least one frame")
        if kind == "single" and len(frames) != 1:
            raise ValueError("a single post has exactly one frame")
        if kind == "carousel" and not 2 <= len(frames) <= 10:
            raise ValueError("a carousel has 2-10 frames")
        ts = now_iso()
        cur = self.db.execute(
            "INSERT INTO posts (persona, kind, slot_at, pillar, concept, caption, hashtags, frames,"
            " created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (persona, kind, slot_at, pillar, concept, caption, json.dumps(hashtags or []),
             json.dumps(frames), ts, ts),
        )
        self.db.commit()
        return int(cur.lastrowid)

    def _row(self, r: sqlite3.Row) -> Post:
        return Post(
            id=r["id"], persona=r["persona"], kind=r["kind"], slot_at=r["slot_at"], pillar=r["pillar"],
            concept=r["concept"], caption=r["caption"], hashtags=json.loads(r["hashtags"]),
            frames=json.loads(r["frames"]), status=r["status"], media_paths=json.loads(r["media_paths"]),
            media_urls=json.loads(r["media_urls"]), ig_media_ids=json.loads(r["ig_media_ids"]),
            notes=r["notes"],
        )

    def get(self, post_id: int) -> Post:
        r = self.db.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
        if r is None:
            raise KeyError(f"No post #{post_id}")
        return self._row(r)

    def list(self, persona: str | None = None, status: str | None = None,
             due_before: str | None = None, limit: int = 200) -> list[Post]:
        q, args = "SELECT * FROM posts WHERE 1=1", []
        if persona:
            q += " AND persona = ?"; args.append(persona)
        if status:
            q += " AND status = ?"; args.append(status)
        if due_before:
            q += " AND slot_at <= ?"; args.append(due_before)
        q += " ORDER BY slot_at, id LIMIT ?"; args.append(limit)
        return [self._row(r) for r in self.db.execute(q, args)]

    def slots_taken(self, persona: str) -> set[tuple[str, str]]:
        rows = self.db.execute(
            "SELECT kind, slot_at FROM posts WHERE persona = ? AND status != 'rejected'", (persona,))
        return {("story" if r["kind"] == "story" else "feed", r["slot_at"]) for r in rows}

    def update(self, post_id: int, **fields) -> None:
        allowed = {"status", "caption", "hashtags", "frames", "media_paths", "media_urls",
                   "ig_media_ids", "notes", "slot_at", "concept"}
        bad = set(fields) - allowed
        if bad:
            raise ValueError(f"cannot update {bad}")
        if "status" in fields and fields["status"] not in STATUSES:
            raise ValueError(f"status must be one of {STATUSES}")
        sets, args = [], []
        for k, v in fields.items():
            sets.append(f"{k} = ?")
            args.append(json.dumps(v) if isinstance(v, (list, dict)) else v)
        sets.append("updated_at = ?"); args.append(now_iso())
        args.append(post_id)
        self.db.execute(f"UPDATE posts SET {', '.join(sets)} WHERE id = ?", args)
        self.db.commit()

    def counts(self) -> dict[str, dict[str, int]]:
        out: dict[str, dict[str, int]] = {}
        for r in self.db.execute("SELECT persona, status, COUNT(*) n FROM posts GROUP BY persona, status"):
            out.setdefault(r["persona"], {})[r["status"]] = r["n"]
        return out

    # --- metrics -------------------------------------------------------------

    def record_post_metrics(self, post_id: int, metrics: dict[str, float]) -> None:
        ts = now_iso()
        self.db.executemany(
            "INSERT INTO post_metrics (post_id, fetched_at, metric, value) VALUES (?,?,?,?)",
            [(post_id, ts, k, float(v)) for k, v in metrics.items()],
        )
        self.db.commit()

    def record_account(self, persona: str, followers: int | None, media_count: int | None) -> None:
        self.db.execute("INSERT INTO account_metrics VALUES (?,?,?,?)", (persona, now_iso(), followers, media_count))
        self.db.commit()

    def latest_post_metrics(self, persona: str) -> list[dict]:
        """Most recent value of each metric per published post, joined with the post concept."""
        rows = self.db.execute(
            """
            SELECT p.id, p.kind, p.pillar, p.concept, p.slot_at, m.metric, m.value
            FROM posts p JOIN post_metrics m ON m.post_id = p.id
            WHERE p.persona = ? AND m.fetched_at = (
                SELECT MAX(fetched_at) FROM post_metrics WHERE post_id = p.id)
            ORDER BY p.slot_at
            """, (persona,))
        by_post: dict[int, dict] = {}
        for r in rows:
            d = by_post.setdefault(r["id"], {"id": r["id"], "kind": r["kind"], "pillar": r["pillar"],
                                             "concept": r["concept"], "slot_at": r["slot_at"]})
            d[r["metric"]] = r["value"]
        return list(by_post.values())

    def follower_history(self, persona: str) -> list[dict]:
        rows = self.db.execute(
            "SELECT fetched_at, followers, media_count FROM account_metrics WHERE persona = ? ORDER BY fetched_at",
            (persona,))
        return [dict(r) for r in rows]
