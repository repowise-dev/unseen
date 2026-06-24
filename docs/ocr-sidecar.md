# OCR sidecar (handwriting → text)

Apple Notes handwriting is captured by reading Apple's **pre-rendered drawing
PNGs** from the Notes group container's `Media/` folders (we never decode the
gzipped protobuf — decision #6). Those PNGs are turned into text by a **vendored,
fully-offline OSS OCR process** — no cloud, no Claude OCR (decision #7).

## Contract

The engine is swappable without touching any caller. The contract is:

```
<command> <png-path>   →   stdout: JSON { "text": "..." }   (plain text also accepted)
```

`src/main/services/notes/ocr-sidecar.ts` resolves the command and shells out to
it. When no engine is configured, `ocrImage()` returns `""` and Notes ingestion
simply skips handwriting (typed notes still ingest) — the count of skipped PNGs
is surfaced in Settings → Memory.

## Configuring an engine

Today the command is resolved from the `UNSEEN_OCR_CMD` environment variable:

```bash
export UNSEEN_OCR_CMD=/path/to/unseen-ocr     # called as: unseen-ocr <png>
```

A reference engine should:

- Default to **PaddleOCR-VL-1.5** (runs on Apple Metal).
- Fall back to **TrOCR-large-handwritten** for messy handwriting.
- Print `{"text": "..."}` to stdout and exit 0.

## Vendoring (packaging)

The runtime + model weights are **hundreds of MB** and are intentionally **not**
committed to this repo. At package time they are bundled as an
`extraResources` entry (alongside `profiles/`) and `ocr-sidecar.ts` is extended
to prefer that bundled path over `UNSEEN_OCR_CMD`. Document the exact footprint
in the release notes when the engine is added.

> Footprint note: budget ~300–700 MB for the PaddleOCR-VL weights + a minimal
> Python/Metal runtime, or a self-contained compiled binary.

## Why this shape

- **Offline + update-proof:** depends on nothing in macOS, so an OS update can't
  break it.
- **Swappable:** Paddle ↔ TrOCR (or anything else) is a command change, no code
  change in callers.
- **Tunable:** it's one writer (the user), so the engine can be tuned to their
  handwriting.
