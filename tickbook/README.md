# Tickbook ✎

A tiny, private, offline planner for Android. It looks like a notebook and uses handwritten fonts.

**Install:** copy `Tickbook.apk` to your phone, open it, and allow "install unknown apps" when Android asks.

## How it works
- **Projects** live on the home page. Each one gets its own ink colour and handwriting (Caveat, Patrick Hand, Kalam or Plain).
- Tap a project to open it, then add tasks. Tap a task to open it and add steps inside. You can nest as deep as you like.
- **Accountability rule:** you can only tick something once everything inside it is ticked. Locked items have a dashed box. If you untick a step, its parents reopen. Adding a new step to a finished item reopens it too.
- Give any item a date and time and it shows up under **up next** on the home page. Overdue items turn red.
- Tap `⋯` (or the big title) to rename, recolour, change the font, add a note, set a date, reorder or delete. Deleting can be undone.
- ⚙ Settings: paper style (Paper / Kraft / Night), default handwriting, hide finished items, backup and restore.

## Privacy
The APK asks for **no permissions**, not even internet, and the WebView also blocks network loads. Your data is one JSON file in the app's private storage. To move it to a new phone or keep it safe through a reinstall, use Settings → share/copy backup.

## Rebuild
```
ANDROID_HOME=/path/to/sdk ./build.sh   # needs platforms;android-34 + build-tools;35.0.0, JDK 17+
```
The UI is plain HTML/CSS/JS in `app/assets/`, and you can open `index.html` in any browser to try it. `tickbook.keystore` is the signing key. Keep it, because updates must be signed with the same key so they install over the old version without wiping your data.
