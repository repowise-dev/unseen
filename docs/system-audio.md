# Capturing the other side of the call

By default Engram transcribes your microphone only. To also transcribe the other
participants, route system audio into a virtual input device and select it in
**Settings → Audio**.

## macOS — BlackHole

1. Install [BlackHole 2ch](https://existential.audio/blackhole/) (free).
2. **Audio MIDI Setup** → **+** → *Create Multi-Output Device* → check your
   speakers/headphones **and** BlackHole 2ch.
3. Set system output to the Multi-Output Device (you still hear everything;
   BlackHole gets a copy).
4. In Engram: Settings → Audio → Microphone → **BlackHole 2ch**.

To mix your mic *and* system audio into one stream, create an *Aggregate
Device* containing your mic + BlackHole and select that instead. (A built-in
mixed-capture mode is on the roadmap.)

## Windows — loopback

Options today:
- **Stereo Mix** (if your driver exposes it): enable in Sound settings →
  Recording, select it in Engram.
- [VB-CABLE](https://vb-audio.com/Cable/): set playback to CABLE Input, select
  CABLE Output as Engram's microphone.

Native WASAPI loopback capture is on the roadmap.

## Linux — PulseAudio/PipeWire

Select the `monitor` source of your output device as Engram's microphone
(`pavucontrol` → Recording tab while Engram is listening).

## A note on diarization

With system audio mixed in, Deepgram's diarization tags remote speakers
separately, which improves "who said what" and the user-speaker heuristic.
