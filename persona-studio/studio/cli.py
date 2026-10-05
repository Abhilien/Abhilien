"""`studio` command line.

  Agent (needs Claude):   new, research, plan, review, chat
  Production (no LLM):    personas, queue, show, render, approve, reject, publish, insights, dashboard
"""

from __future__ import annotations

import argparse
import sys

from . import agent as ag
from .config import Settings
from .dashboard import build as build_dashboard
from .imagegen import get_provider
from .instagram import InstagramClient
from .persona import load_all, load_persona
from .pipeline import build_caption, publish_due, refresh_insights, render_post
from .store import Store


def _printer(kind: str, text: str) -> None:
    prefix = {"tool": "  → ", "text": "", "warning": "! ", "refusal": "! "}.get(kind, "")
    print(f"{prefix}{text}", flush=True)


def _agent(settings: Settings, store: Store, args) -> ag.StudioAgent:
    return ag.StudioAgent(settings, store, on_event=_printer, effort=args.effort, web=not args.no_web)


def cmd_personas(s, store, args):
    personas = load_all(s.personas_dir)
    counts = store.counts()
    if not personas:
        print("No personas yet. Try: studio new \"cozy cabin interiors, faceless\"")
    for p in personas:
        q = ", ".join(f"{k} {v}" for k, v in counts.get(p.slug, {}).items()) or "queue empty"
        print(f"{p.slug:22} {p.persona_type:13} {p.genre[:30]:30} {q}")


def cmd_queue(s, store, args):
    for p in store.list(persona=args.persona, status=args.status):
        print(f"#{p.id:<5} {p.persona:18} {p.slot_at[:16]:16} {p.kind:8} {p.status:9} {p.concept[:70]}")


def cmd_show(s, store, args):
    p = store.get(args.id)
    persona = load_persona(s.personas_dir, p.persona)
    print(f"#{p.id} {p.persona} {p.kind} @ {p.slot_at} [{p.status}] pillar={p.pillar}\n{p.concept}\n")
    for i, f in enumerate(p.frames, 1):
        print(f"  frame {i}: {f['scene']}" + (f"\n           overlay: {f['overlay']}" if f.get("overlay") else ""))
    if p.kind != "story":
        print("\n--- caption as it will post ---\n" + build_caption(persona, p))
    for path in p.media_paths:
        print(f"  media: {path}")
    if p.notes:
        print(f"\nnotes: {p.notes}")


def cmd_render(s, store, args):
    provider = get_provider(s)
    posts = [store.get(i) for i in args.ids] if args.ids else store.list(persona=args.persona, status="planned")
    for post in posts[: args.limit]:
        persona = load_persona(s.personas_dir, post.persona)
        try:
            post = render_post(s, store, persona, post, provider)
            print(f"rendered #{post.id}: {', '.join(post.media_paths)}")
        except Exception as e:
            store.update(post.id, notes=f"render failed: {e}"[:500])
            print(f"! render failed for #{post.id}: {e}", file=sys.stderr)


def cmd_set_status(status):
    def run(s, store, args):
        for i in args.ids:
            post = store.get(i)
            if status == "approved" and post.status not in ("rendered", "failed"):
                print(f"! #{i} is '{post.status}': render it before approving", file=sys.stderr)
                continue
            store.update(i, status=status)
            print(f"#{i} -> {status}")
    return run


def cmd_publish(s, store, args):
    if args.live and not s.allow_live_publish:
        print("! --live ignored: set ALLOW_LIVE_PUBLISH=true in .env to post for real.", file=sys.stderr)
    personas = [load_persona(s.personas_dir, args.persona)] if args.persona else load_all(s.personas_dir)
    done = publish_due(s, store, personas, live=args.live)
    for p in done:
        print(f"#{p.id} {p.persona} {p.kind}: {p.status} {p.ig_media_ids} {p.notes}")
    if not done:
        print("Nothing due. (Posts must be approved and their slot time reached.)")


def cmd_insights(s, store, args):
    personas = [load_persona(s.personas_dir, args.persona)] if args.persona else load_all(s.personas_dir)
    for persona in personas:
        token, ig = s.ig_credentials(persona.slug)
        if not (token and ig):
            print(f"{persona.slug}: no Instagram credentials, skipped")
            continue
        client = InstagramClient(token, ig, s.graph_host, s.graph_version, dry_run=False)
        n = refresh_insights(s, store, persona, client)
        print(f"{persona.slug}: metrics refreshed for {n} posts")


def cmd_dashboard(s, store, args):
    out = build_dashboard(load_all(s.personas_dir), store, s.root / "dashboard.html")
    print(f"Wrote {out}")


def cmd_new(s, store, args):
    print(_agent(s, store, args).ask(ag.mission_new_persona(args.brief)))


def cmd_research(s, store, args):
    print(_agent(s, store, args).ask(ag.mission_research(args.topic)))


def cmd_plan(s, store, args):
    print(_agent(s, store, args).ask(ag.mission_plan(args.slug, args.days)))


def cmd_review(s, store, args):
    print(_agent(s, store, args).ask(ag.mission_review(args.slug)))


def cmd_chat(s, store, args):
    agent = _agent(s, store, args)
    print("Studio agent. Ask anything about your channels; empty line or Ctrl-D to quit.")
    while True:
        try:
            line = input("\nyou> ").strip()
        except EOFError:
            break
        if not line:
            break
        print("\n" + agent.ask(line))


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="studio", description="Run a portfolio of AI Instagram channels.")
    ap.add_argument("--effort", default="high", choices=["low", "medium", "high", "xhigh", "max"],
                    help="agent reasoning effort")
    ap.add_argument("--no-web", action="store_true", help="agent without web search/fetch")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("personas", help="list channels").set_defaults(fn=cmd_personas)
    p = sub.add_parser("new", help="agent: research + design a new channel"); p.add_argument("brief")
    p.set_defaults(fn=cmd_new)
    p = sub.add_parser("research", help="agent: research a niche/competitor/question"); p.add_argument("topic")
    p.set_defaults(fn=cmd_research)
    p = sub.add_parser("plan", help="agent: fill the content calendar"); p.add_argument("slug")
    p.add_argument("--days", type=int, default=7); p.set_defaults(fn=cmd_plan)
    p = sub.add_parser("review", help="agent: performance review + adjustments"); p.add_argument("slug")
    p.set_defaults(fn=cmd_review)
    sub.add_parser("chat", help="agent: free-form conversation").set_defaults(fn=cmd_chat)

    p = sub.add_parser("queue", help="list queued posts"); p.add_argument("--persona"); p.add_argument("--status")
    p.set_defaults(fn=cmd_queue)
    p = sub.add_parser("show", help="show one post"); p.add_argument("id", type=int); p.set_defaults(fn=cmd_show)
    p = sub.add_parser("render", help="generate images for planned posts")
    p.add_argument("ids", nargs="*", type=int); p.add_argument("--persona"); p.add_argument("--limit", type=int, default=50)
    p.set_defaults(fn=cmd_render)
    p = sub.add_parser("approve", help="approve rendered posts"); p.add_argument("ids", nargs="+", type=int)
    p.set_defaults(fn=cmd_set_status("approved"))
    p = sub.add_parser("reject", help="reject posts"); p.add_argument("ids", nargs="+", type=int)
    p.set_defaults(fn=cmd_set_status("rejected"))
    p = sub.add_parser("publish", help="publish approved posts whose time has come (dry run unless --live)")
    p.add_argument("--persona"); p.add_argument("--live", action="store_true"); p.set_defaults(fn=cmd_publish)
    p = sub.add_parser("insights", help="pull metrics from Instagram"); p.add_argument("--persona")
    p.set_defaults(fn=cmd_insights)
    sub.add_parser("dashboard", help="write dashboard.html").set_defaults(fn=cmd_dashboard)

    args = ap.parse_args(argv)
    settings = Settings.from_env()
    store = Store(settings.db_path)
    try:
        args.fn(settings, store, args)
    finally:
        store.close()


if __name__ == "__main__":
    main()
