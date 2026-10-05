"""Instagram publishing + insights through Meta's official Instagram Graph API.

Uses the content-publishing flow: create a media container from a public JPEG URL, then
publish it. Supports single images, carousels (2-10 images) and stories.

Requirements (see docs/INSTAGRAM_SETUP.md): a Business or Creator account, a Meta app with
``instagram_content_publish`` (+ ``instagram_basic``, ``instagram_manage_insights``), and a
long-lived access token. Meta caps API publishing per account per 24h; the studio's own cap
(``DAILY_PUBLISH_CAP``) stays well under it.

The official API is used deliberately: browser bots and unofficial private-API libraries
violate Instagram's terms and are the fastest way to lose an account.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request

DAILY_PUBLISH_CAP = 20
POST_METRICS = ("reach", "likes", "comments", "saved", "shares", "total_interactions")
STORY_METRICS = ("reach", "replies", "navigation", "shares", "total_interactions")


class GraphError(RuntimeError):
    pass


class InstagramClient:
    def __init__(self, token: str, ig_user_id: str, host: str = "https://graph.facebook.com",
                 version: str = "v21.0", dry_run: bool = True, sleep=time.sleep):
        self.token, self.ig = token, ig_user_id
        self.base = f"{host.rstrip('/')}/{version}"
        self.dry_run = dry_run
        self.sleep = sleep
        self.calls: list[tuple[str, str, dict]] = []   # audit trail (also used by tests)
        self._fake = 0

    # --- transport ------------------------------------------------------------

    def _call(self, method: str, path: str, params: dict) -> dict:
        self.calls.append((method, path, {k: v for k, v in params.items() if k != "access_token"}))
        if self.dry_run:
            self._fake += 1
            if path.endswith("/insights"):
                return {"data": []}
            if method == "GET":
                return {"status_code": "FINISHED", "followers_count": 0, "media_count": 0}
            return {"id": f"dryrun-{self._fake}"}
        params = {**params, "access_token": self.token}
        url = f"{self.base}/{path.lstrip('/')}"
        data = None
        if method == "GET":
            url += "?" + urllib.parse.urlencode(params)
        else:
            data = urllib.parse.urlencode(params).encode()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data, method=method), timeout=60) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")
            raise GraphError(f"{method} {path} -> {e.code}: {body}") from None

    def _wait_ready(self, container_id: str, tries: int = 10) -> None:
        for _ in range(tries):
            status = self._call("GET", container_id, {"fields": "status_code"}).get("status_code")
            if status in (None, "FINISHED"):
                return
            if status in ("ERROR", "EXPIRED"):
                raise GraphError(f"container {container_id} status {status}")
            self.sleep(3)
        raise GraphError(f"container {container_id} not ready")

    def _publish(self, container_id: str) -> str:
        self._wait_ready(container_id)
        return self._call("POST", f"{self.ig}/media_publish", {"creation_id": container_id})["id"]

    # --- publishing ----------------------------------------------------------

    def publish_image(self, image_url: str, caption: str) -> str:
        c = self._call("POST", f"{self.ig}/media", {"image_url": image_url, "caption": caption})["id"]
        return self._publish(c)

    def publish_carousel(self, image_urls: list[str], caption: str) -> str:
        if not 2 <= len(image_urls) <= 10:
            raise ValueError("carousel needs 2-10 images")
        children = [
            self._call("POST", f"{self.ig}/media", {"image_url": u, "is_carousel_item": "true"})["id"]
            for u in image_urls
        ]
        for ch in children:
            self._wait_ready(ch)
        c = self._call("POST", f"{self.ig}/media",
                       {"media_type": "CAROUSEL", "children": ",".join(children), "caption": caption})["id"]
        return self._publish(c)

    def publish_story(self, image_url: str) -> str:
        c = self._call("POST", f"{self.ig}/media", {"image_url": image_url, "media_type": "STORIES"})["id"]
        return self._publish(c)

    # --- insights ------------------------------------------------------------

    def account(self) -> dict:
        return self._call("GET", self.ig, {"fields": "username,followers_count,media_count"})

    def media_insights(self, media_id: str, story: bool = False) -> dict[str, float]:
        metrics = STORY_METRICS if story else POST_METRICS
        resp = self._call("GET", f"{media_id}/insights", {"metric": ",".join(metrics)})
        out: dict[str, float] = {}
        for item in resp.get("data", []):
            values = item.get("values") or [{}]
            value = item.get("total_value", {}).get("value", values[0].get("value"))
            if isinstance(value, (int, float)):
                out[item["name"]] = value
        return out
