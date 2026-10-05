"""Render -> approve -> publish -> measure. Plain functions so the CLI, the agent and the
tests all drive the same code."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

from .config import Settings
from .imagegen import add_overlay
from .instagram import DAILY_PUBLISH_CAP, InstagramClient
from .persona import Persona
from .prompts import image_prompt
from .store import Post, Store


def build_caption(persona: Persona, post: Post) -> str:
    """Caption + disclosure + hashtags. The disclosure is added in code, never left to the model."""
    caption = post.caption.strip()
    if persona.disclosure.lower() not in caption.lower():
        caption = f"{caption}\n\n{persona.disclosure}".strip()
    tags = " ".join(h if h.startswith("#") else f"#{h}" for h in post.hashtags)
    return f"{caption}\n\n{tags}".strip()


def render_post(settings: Settings, store: Store, persona: Persona, post: Post, provider) -> Post:
    paths, urls = [], []
    for i, frame in enumerate(post.frames):
        spec = image_prompt(persona, frame["scene"], post.kind)
        out = settings.media_dir / persona.slug / f"{post.id:05d}-{i + 1}.jpg"
        result = provider.generate(spec, out)
        url = result.url
        if frame.get("overlay"):
            add_overlay(out, frame["overlay"])
            url = ""  # the hosted original no longer matches the edited file
        paths.append(str(out))
        urls.append(url)
    store.update(post.id, media_paths=paths, media_urls=urls, status="rendered", notes="")
    return store.get(post.id)


def public_urls(settings: Settings, post: Post) -> list[str]:
    out = []
    for path, url in zip(post.media_paths, post.media_urls):
        if url:
            out.append(url)
        elif settings.media_public_base_url:
            rel = Path(path).resolve().relative_to(settings.media_dir.resolve()).as_posix()
            out.append(f"{settings.media_public_base_url}/{rel}")
        else:
            raise RuntimeError(
                f"Post #{post.id}: {path} has no public URL. Upload ./media and set MEDIA_PUBLIC_BASE_URL.")
    return out


def publish_post(settings: Settings, store: Store, client: InstagramClient, persona: Persona, post: Post) -> Post:
    if post.status != "approved":
        raise RuntimeError(f"Post #{post.id} is '{post.status}'; only approved posts are published.")
    try:
        urls = public_urls(settings, post)
        if post.kind == "single":
            ids = [client.publish_image(urls[0], build_caption(persona, post))]
        elif post.kind == "carousel":
            ids = [client.publish_carousel(urls, build_caption(persona, post))]
        else:
            ids = [client.publish_story(u) for u in urls]
    except Exception as e:  # keep the queue moving; the post can be retried
        store.update(post.id, status="failed", notes=str(e)[:500])
        return store.get(post.id)
    note = "dry run" if client.dry_run else ""
    store.update(post.id, status="published", ig_media_ids=ids, notes=note)
    return store.get(post.id)


def published_last_24h(store: Store, persona: str, now: datetime) -> int:
    since = (now - timedelta(hours=24)).isoformat()
    return sum(1 for p in store.list(persona=persona, status="published") if p.slot_at >= since)


def publish_due(settings: Settings, store: Store, personas: list[Persona], live: bool,
                now: datetime | None = None, client_factory=None) -> list[Post]:
    now = now or datetime.now(timezone.utc)
    live = live and settings.allow_live_publish
    done = []
    for persona in personas:
        due = store.list(persona=persona.slug, status="approved", due_before=now.isoformat())
        if not due:
            continue
        token, ig_id = settings.ig_credentials(persona.slug)
        if live and not (token and ig_id):
            for p in due:
                store.update(p.id, status="failed", notes="missing IG_TOKEN_/IG_USER_ID_ for this persona")
            continue
        client = (client_factory or InstagramClient)(
            token, ig_id, settings.graph_host, settings.graph_version, dry_run=not live)
        budget = DAILY_PUBLISH_CAP - published_last_24h(store, persona.slug, now)
        for post in due:
            if budget <= 0:
                break
            done.append(publish_post(settings, store, client, persona, post))
            budget -= 1
    return done


def refresh_insights(settings: Settings, store: Store, persona: Persona, client: InstagramClient) -> int:
    acct = client.account()
    store.record_account(persona.slug, acct.get("followers_count"), acct.get("media_count"))
    n = 0
    for post in store.list(persona=persona.slug, status="published"):
        totals: dict[str, float] = {}
        for media_id in post.ig_media_ids:
            if media_id.startswith("dryrun"):
                continue
            for k, v in client.media_insights(media_id, story=post.kind == "story").items():
                totals[k] = totals.get(k, 0) + v
        if totals:
            store.record_post_metrics(post.id, totals)
            n += 1
    return n
