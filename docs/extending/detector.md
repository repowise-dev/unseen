# Adding a trigger detector

A detector is a pure predicate that decides whether new speech warrants an
answer. ~30 lines including tests.

1. Add a function in `src/renderer/overlay/trigger-engine/detectors.ts`:

```ts
/** Fires when someone sounds uncertain — for a coaching profile. */
export const hesitation: Detector = ({ newText }) =>
  /\b(um+|uh+|i'?m not sure|good question)\b/i.test(newText);
```

2. Register it in the `DETECTORS` map in the same file.
3. Add its name to `KNOWN_DETECTORS` in `src/shared/profile-schema.ts` so
   profiles referencing it validate.
4. Unit-test it in `tests/trigger-engine.test.ts`.

Profiles opt in via `triggers.detectors: [hesitation, …]`.

The `DetectorContext` gives you `newText` (speech since the last answer),
`recentText` (last few finals), and the profile's `keywords`. Detectors must be
pure — no IPC, no DOM, no state.
