"""Agent loop + tools, with a scripted fake Claude client (no network)."""

from datetime import date
from types import SimpleNamespace as NS

import pytest

from studio.agent import StudioAgent, ToolError, Toolbox


def text(t):
    return NS(type="text", text=t)


def tool(id, name, inp):
    return NS(type="tool_use", id=id, name=name, input=inp)


class FakeClient:
    def __init__(self, responses):
        self.responses = list(responses)
        self.requests = []
        self.beta = NS(messages=NS(create=self.create))

    def create(self, **kw):
        self.requests.append({**kw, "messages": list(kw["messages"])})
        content, stop = self.responses.pop(0)
        return NS(content=content, stop_reason=stop)


@pytest.fixture
def toolbox(settings, store):
    return Toolbox(settings, store, today=date(2026, 10, 5))


def test_queue_post_rules(toolbox):
    import json
    slots = json.loads(toolbox.run("get_open_slots", {"slug": "cabin-hours", "days": 1}))
    feed = next(s for s in slots if s["kind"] != "story")
    args = {"slug": "cabin-hours", "kind": "single", "slot_at": feed["at_utc"], "concept": "nook",
            "frames": [{"scene": "a selfie in the nook"}]}
    with pytest.raises(ToolError, match="faceless"):
        toolbox.run("queue_post", args)
    args["frames"] = [{"scene": "window seat, rain, wool blanket"}]
    assert "Queued post #1" == toolbox.run("queue_post", args)
    with pytest.raises(ToolError, match="already taken"):
        toolbox.run("queue_post", args)


def test_save_persona_returns_validation_errors(toolbox, settings):
    with pytest.raises(ToolError, match="adult"):
        toolbox.run("save_persona", {"persona": {"slug": "kid", "name": "Kid", "genre": "x", "age": 15,
                                                 "identity": {"face": "f"}}})
    ok = toolbox.run("save_persona", {"persona": {"slug": "nova-lane", "name": "Nova Lane", "genre": "music",
                                                  "age": 23, "identity": {"face": "f"}}})
    assert "nova-lane" in ok and (settings.personas_dir / "nova-lane.yaml").exists()


def test_case_studies_filter(toolbox):
    out = toolbox.run("list_case_studies", {"type": "faceless"})
    assert "Aesthetic" in out and "Miquela" not in out


def test_agent_loop_runs_tools_and_handles_errors(settings, store):
    fake = FakeClient([
        ([text("Looking."), tool("t1", "list_personas", {}), tool("t2", "get_persona", {"slug": "nope"})],
         "tool_use"),
        ([text("partial")], "pause_turn"),
        ([text("Done.")], "end_turn"),
    ])
    events = []
    agent = StudioAgent(settings, store, client=fake, on_event=lambda k, t: events.append(k))
    assert agent.ask("hi") == "Done."
    results = fake.requests[1]["messages"][-1]["content"]
    assert [r["is_error"] for r in results] == [False, True]  # parallel results in one message
    assert fake.requests[0]["fallbacks"] == "default"
    assert fake.requests[0]["thinking"] == {"type": "adaptive"}
    assert "tool" in events


def test_agent_refusal(settings, store):
    fake = FakeClient([([], "refusal")])
    assert "declined" in StudioAgent(settings, store, client=fake).ask("x")
