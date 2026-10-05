"""A single static HTML page: every channel, its queue, and its latest numbers."""

from __future__ import annotations

import html
import os
from pathlib import Path

from .persona import Persona
from .store import Store

CSS = """
:root{--bg:#f7f7f5;--card:#fff;--ink:#1d1d1f;--muted:#6b6b70;--line:#e4e4e0;--accent:#c2410c}
@media (prefers-color-scheme:dark){:root{--bg:#141416;--card:#1d1d20;--ink:#f2f2f2;--muted:#a1a1a8;--line:#2e2e33;--accent:#fb923c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px}h1{font-size:22px;margin:0 0 4px}
.sub{color:var(--muted);margin:0 0 24px}.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
.card h2{font-size:17px;margin:0}.meta{color:var(--muted);font-size:13px;margin:2px 0 12px}
.stats{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}.stat b{display:block;font-size:20px}
.stat span{color:var(--muted);font-size:12px}table{width:100%;border-collapse:collapse;font-size:13px}
td{border-top:1px solid var(--line);padding:6px 4px;vertical-align:top}.pill{font-size:11px;padding:1px 6px;border-radius:9px;border:1px solid var(--line)}
.thumbs{display:flex;gap:4px;overflow-x:auto;margin:8px 0}.thumbs img{height:84px;border-radius:6px}
"""

STATUS_ORDER = ("planned", "rendered", "approved", "published", "failed", "rejected")


def build(personas: list[Persona], store: Store, out: Path) -> Path:
    counts = store.counts()
    cards = []
    for p in personas:
        c = counts.get(p.slug, {})
        followers = store.follower_history(p.slug)
        f_now = followers[-1]["followers"] if followers else None
        metrics = store.latest_post_metrics(p.slug)
        reach = sum(m.get("reach", 0) for m in metrics)
        saves = sum(m.get("saved", 0) for m in metrics)
        stats = [("followers", f_now if f_now is not None else "—"), ("reach", int(reach)), ("saves", int(saves))]
        stats += [(s, c.get(s, 0)) for s in STATUS_ORDER if c.get(s)]
        upcoming = store.list(persona=p.slug)[:8]
        thumbs = [m for post in store.list(persona=p.slug, status="rendered")[:6] for m in post.media_paths[:1]]
        rows = "".join(
            f"<tr><td>#{x.id}</td><td>{html.escape(x.slot_at[:16].replace('T', ' '))}</td>"
            f"<td><span class=pill>{x.kind}</span></td><td>{html.escape(x.concept[:90])}</td>"
            f"<td>{x.status}</td></tr>" for x in upcoming)
        imgs = "".join(f'<img src="{html.escape(os.path.relpath(t, out.parent))}" alt="">' for t in thumbs)
        cards.append(f"""<section class=card><h2>{html.escape(p.name)}</h2>
<p class=meta>{html.escape(p.handle or p.slug)} · {html.escape(p.genre)} · {p.persona_type.replace('_', ' ')}</p>
<div class=stats>{''.join(f'<div class=stat><b>{v}</b><span>{k}</span></div>' for k, v in stats)}</div>
{f'<div class=thumbs>{imgs}</div>' if imgs else ''}
<table>{rows or '<tr><td>Queue empty. Run <code>studio plan</code>.</td></tr>'}</table></section>""")
    out.write_text(f"""<!doctype html><html lang=en><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1"><title>Persona Studio</title>
<style>{CSS}</style></head><body><main><h1>Persona Studio</h1>
<p class=sub>{len(personas)} channels</p><div class=grid>{''.join(cards)}</div></main></body></html>""")
    return out
