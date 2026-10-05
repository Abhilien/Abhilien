# Connecting a channel to Instagram

The studio publishes through Meta's **official Instagram Graph API** (content publishing). It
does not use passwords, browser automation or unofficial libraries. Those break Instagram's
terms and are the most common reason automated accounts get banned.

Meta's developer console changes often, so check the screens against the current docs:
<https://developers.facebook.com/docs/instagram-platform/content-publishing>.

## One-time setup per channel

1. **Create the Instagram account** for the persona (one email or phone per account). Set the
   name, handle and bio. Put the AI disclosure in the bio (`studio show` prints the persona's).
2. **Switch it to a Professional account** (Creator or Business) in Instagram settings.
3. Depending on the API flavour you choose, **link it to a Facebook Page** (one Page per persona
   is cleanest). The newer "Instagram API with Instagram Login" doesn't need a Page. In that
   case set `GRAPH_API_HOST=https://graph.instagram.com`.
4. **Create a Meta app** at developers.facebook.com (type: Business) and add the Instagram product.
5. Request these permissions: `instagram_basic` / `instagram_business_basic`,
   `instagram_content_publish` / `instagram_business_content_publish`, and
   `instagram_manage_insights` / `instagram_business_manage_insights`. Accounts you own work in
   development mode. App Review is only needed to manage accounts you don't own (for example
   client brands).
6. **Generate a long-lived access token** (valid about 60 days; refresh it before it expires) and find
   the **Instagram user ID** (`GET /me/accounts` → Page → `instagram_business_account`, or
   `GET /me` with Instagram Login).
7. Add both to `.env`, keyed by the persona slug in upper case:

   ```
   IG_TOKEN_LUNA_VOSS=EAAG...
   IG_USER_ID_LUNA_VOSS=17841400000000000
   ```

## Image hosting

Instagram **downloads** each image from a public HTTPS URL; you can't upload a file directly.

- The Replicate provider returns hosted URLs, which the studio uses directly (these expire after
  a while, so publish within a day or so of rendering).
- Story frames with text overlays are edited locally, so they need your own hosting. Sync
  `./media` to a public bucket (Cloudflare R2, S3, GCS, Bunny CDN…) and set
  `MEDIA_PUBLIC_BASE_URL`. Example with the AWS CLI:
  `aws s3 sync media s3://my-bucket/media --acl public-read` and
  `MEDIA_PUBLIC_BASE_URL=https://my-bucket.s3.amazonaws.com/media`.
- Images must be JPEG. The studio always saves JPEG.

## Going live

```bash
studio publish            # dry run: shows exactly what would be posted
# when happy:
echo "ALLOW_LIVE_PUBLISH=true" >> .env
studio publish --live
```

Automate with cron, for example every 15 minutes:

```
*/15 * * * * cd /path/to/persona-studio && /usr/bin/python3 -m studio publish --live >> publish.log 2>&1
```

Only posts that are **approved** and whose **slot time has passed** are published. There is a
per-channel safety cap (`DAILY_PUBLISH_CAP` in `studio/instagram.py`) that stays far below Meta's
own rate limit.

## Limits worth knowing

- The API can't add story stickers (polls, questions, links) or music. Add them in the app for
  stories where they matter, or rely on the burned-in overlay text.
- Story insights are only available for about 24 hours after posting, so run `studio insights` daily.
- Metric names in the Insights API change between versions. If a metric errors, edit
  `POST_METRICS` / `STORY_METRICS` in `studio/instagram.py`.
- Don't run several accounts from one device or IP with automated logins. With the official
  API this doesn't come up: publishing is server-to-server.
