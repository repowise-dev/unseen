# On-disk data layout (frozen contract)

This layout is **frozen** as of Phase 4 so the future native iOS client (Phase
5) can read/write the same files without chasing a moving target.

```
<dataDir>/
  memory/
    log/<YYYY-MM-DD>.jsonl          # append-only daily event log
    facts/personal/<YYYY-MM-DD>.json
    facts/work/<YYYY-MM-DD>.json
    facts/<ns>/<YYYY-MM-DD>.lock    # transient single-distiller lock
  knowledge/                       # hand-imported + pinned markdown
  sessions/                        # meeting JSONL (existing)
```

`<dataDir>` is configurable (Settings → Memory → Data location):

- **Local (default):** the OS userData dir
  (`~/Library/Application Support/Engram` on macOS).
- **iCloud:** `~/Library/Mobile Documents/com~apple~CloudDocs/Engram/`. A second
  Mac that signs into the same iCloud sees the same data after sync.

## What does NOT sync (stays in local userData)

- `settings.json` — read at startup to learn `dataDir`, so it can't itself live
  under `dataDir` (chicken-and-egg). Each device keeps its own settings.
- `secrets.json` — API keys, keychain-encrypted. **Never** leaves the device.

> This is a deliberate, documented deviation from the roadmap's §7.3 sketch
> (which placed `settings.json` in the synced dir): the bootstrap ordering and
> the secrets-stay-local rule make local settings the correct call.

## Log event shape

```jsonc
{ "t": 1750000000000, "kind": "dictation|meeting|note",
  "ns": "personal|work", "app": "Slack", "text": "...", "sessionId": "..." }
```

## Sync mechanics

- **Append-only JSONL** → two devices appending the same day rarely truly
  conflict. The merge is `sort by t` + `dedupe by (t, kind, text)`
  (`mergeLogEvents`), applied on every read.
- **Facts** are produced by an idempotent merge (`mergeFacts`, stable key), so
  re-distilling a day — or distilling on either device — never duplicates.
- **Single-distiller lock:** `facts/<ns>/<day>.lock` carries a device id +
  timestamp. A peer skips a day another device is actively distilling; a stale
  lock (>1h, e.g. a crashed run) is reclaimed automatically.
- Consistency is **eventual**, not real-time — iCloud Drive does the syncing.
