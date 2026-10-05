from datetime import date, datetime, timezone

import pytest
from pydantic import ValidationError

from studio.dashboard import build as build_dashboard
from studio.imagegen import MockProvider
from studio.instagram import InstagramClient
from studio.persona import Persona, load_all, load_persona
from studio.pipeline import build_caption, publish_due, render_post
from studio.planner import assign_by_share, plan_slots
from studio.prompts import image_prompt


def base(**kw):
    d = dict(slug="test-char", name="Test Char", genre="fashion", age=25,
             identity={"face": "round face, green eyes"}, disclosure="AI character")
    d.update(kw)
    return d


# --- persona rules --------------------------------------------------------------

def test_example_personas_are_valid(settings):
    assert {p.slug for p in load_all(settings.personas_dir)} >= {"luna-voss", "cabin-hours"}


@pytest.mark.parametrize("bad", [
    dict(age=17), dict(age=None), dict(identity=None), dict(disclosure=" "),
    dict(based_on_real_person=True), dict(name="Taylor Swift"), dict(slug="Bad Slug"),
    dict(pillars=[{"name": "a", "share": 0.5}, {"name": "b", "share": 0.2}]),
])
def test_persona_rules_reject(bad):
    with pytest.raises(ValidationError):
        Persona.model_validate(base(**bad))


def test_faceless_needs_no_face_or_age():
    p = Persona.model_validate(dict(slug="x", name="X", genre="g", persona_type="faceless", disclosure="AI"))
    assert p.identity is None


# --- planner --------------------------------------------------------------------

def test_assign_by_share_tracks_targets():
    out = assign_by_share(["a", "b", "c"], [0.5, 0.3, 0.2], 10)
    assert (out.count("a"), out.count("b"), out.count("c")) == (5, 3, 2)


def test_plan_slots_counts_and_formats(settings):
    p = load_persona(settings.personas_dir, "luna-voss")   # 4 feed/week, 50% carousel, 1 story/day
    slots = plan_slots(p, date(2026, 10, 5), days=7)
    feed = [s for s in slots if s.lane == "feed"]
    stories = [s for s in slots if s.kind == "story"]
    assert len(feed) == 4 and len(stories) == 7
    assert sum(s.kind == "carousel" for s in feed) == 2
    assert all(s.pillar for s in slots)
    assert all(s.frames == 3 for s in stories)
    # Lisbon is UTC+1 in October: an 08:00 local slot is 07:00 UTC
    assert any(s.at_utc.endswith("07:00:00+00:00") for s in stories)


def test_plan_slots_skips_taken(settings):
    p = load_persona(settings.personas_dir, "luna-voss")
    first = plan_slots(p, date(2026, 10, 5), 7)
    taken = {(first[0].lane, first[0].at_utc)}
    assert len(plan_slots(p, date(2026, 10, 5), 7, taken)) == len(first) - 1


# --- prompts --------------------------------------------------------------------

def test_prompt_locks_identity_for_characters(settings):
    p = load_persona(settings.personas_dir, "luna-voss")
    spec = image_prompt(p, "reading on a train", "story")
    assert "copper-auburn" in spec["prompt"] and "reading on a train" in spec["prompt"]
    assert spec["aspect_ratio"] == "9:16"


def test_prompt_faceless_excludes_people(settings):
    spec = image_prompt(load_persona(settings.personas_dir, "cabin-hours"), "reading nook", "single")
    assert "no faces" in spec["prompt"] and "visible face" in spec["negative"]


# --- store / pipeline -----------------------------------------------------------

def test_store_validates_frame_counts(store):
    with pytest.raises(ValueError):
        store.add_post("x", "carousel", "2026-01-01T00:00:00+00:00", "c", [{"scene": "a"}])
    with pytest.raises(ValueError):
        store.add_post("x", "single", "2026-01-01T00:00:00+00:00", "c", [{"scene": "a"}, {"scene": "b"}])


def test_caption_always_discloses(settings, store):
    p = load_persona(settings.personas_dir, "luna-voss")
    pid = store.add_post(p.slug, "single", "2026-01-01T00:00:00+00:00", "c", [{"scene": "s"}],
                         caption="Morning train.", hashtags=["slowtravel", "#lisbon"])
    cap = build_caption(p, store.get(pid))
    assert p.disclosure in cap and "#slowtravel #lisbon" in cap


def test_render_and_dry_run_publish(settings, store):
    p = load_persona(settings.personas_dir, "luna-voss")
    settings.media_public_base_url = "https://cdn.example.com/media"
    pid = store.add_post(p.slug, "story", "2026-01-01T08:00:00+00:00", "c",
                         [{"scene": "a", "overlay": "guess where"}, {"scene": "b"}])
    post = render_post(settings, store, p, store.get(pid), MockProvider())
    assert post.status == "rendered" and len(post.media_paths) == 2
    store.update(pid, status="approved")

    made = []
    def factory(*a, **kw):
        made.append(InstagramClient(*a, **kw, sleep=lambda s: None))
        return made[-1]

    done = publish_due(settings, store, [p], live=False,
                       now=datetime(2026, 1, 2, tzinfo=timezone.utc), client_factory=factory)
    assert [d.status for d in done] == ["published"]
    calls = made[0].calls
    containers = [c for c in calls if c[1].endswith("/media")]
    assert all(c[2]["media_type"] == "STORIES" for c in containers)
    assert containers[0][2]["image_url"] == "https://cdn.example.com/media/luna-voss/00001-1.jpg"


def test_publish_requires_time_and_approval(settings, store):
    p = load_persona(settings.personas_dir, "luna-voss")
    store.add_post(p.slug, "single", "2030-01-01T00:00:00+00:00", "future", [{"scene": "s"}])
    assert publish_due(settings, store, [p], live=False, now=datetime(2026, 1, 1, tzinfo=timezone.utc)) == []


def test_live_publish_without_credentials_fails_safely(settings, store, monkeypatch):
    settings.allow_live_publish = True
    monkeypatch.delenv("IG_TOKEN_LUNA_VOSS", raising=False)
    p = load_persona(settings.personas_dir, "luna-voss")
    pid = store.add_post(p.slug, "single", "2026-01-01T00:00:00+00:00", "c", [{"scene": "s"}])
    store.update(pid, status="approved")
    publish_due(settings, store, [p], live=True, now=datetime(2026, 1, 2, tzinfo=timezone.utc))
    assert store.get(pid).status == "failed"


def test_carousel_call_sequence():
    c = InstagramClient("t", "123", sleep=lambda s: None)
    c.publish_carousel(["https://a/1.jpg", "https://a/2.jpg"], "hi")
    posts = [(m, path, p) for m, path, p in c.calls if m == "POST"]
    assert [p.get("is_carousel_item") for _, _, p in posts[:2]] == ["true", "true"]
    assert posts[2][2]["media_type"] == "CAROUSEL" and posts[2][2]["children"].count(",") == 1
    assert posts[3][1] == "123/media_publish"


def test_dashboard_renders(settings, store):
    out = build_dashboard(load_all(settings.personas_dir), store, settings.root / "d.html")
    assert "Luna Voss" in out.read_text()
