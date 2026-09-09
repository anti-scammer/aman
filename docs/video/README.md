# Videos

Two narrated Arabic videos, built from the running system rather than mockups.
The web footage is the real app, the phone footage is the real app on an Android
emulator, and the document footage is the real `docs/how-it-works.html`.

| Spec | Output | Length | For |
| --- | --- | --- | --- |
| `scenes.json` | `build/aman-walkthrough.ar.mp4` | ~5:30 | Anyone. What the platform does, end to end. |
| `scenes.deepdive.json` | `build/aman-deepdive.ar.mp4` | ~32:00 | Teammates and co-developers. A chaptered reading of the methodology document. |

Both are 1920x1080, 30fps, with burned-in Arabic subtitles.

## Editing

Everything is driven by the scene files.

- **`script.ar.md`** is the human-facing version of the walkthrough narration,
  for reading and redrafting. Keep it in step with `scenes.json`.
- **`scenes.json` / `scenes.deepdive.json`** are what the tools read: running
  order, narration, subtitles, and what each scene shows. Changing narration
  retimes the video automatically, because scene length is derived from how long
  the voice takes.

A `doc` scene needs no code. It declares what to look at:

```json
{ "source": "doc", "shots": [ { "sel": "table", "nth": 3, "hold": 7 } ] }
```

`hold` is a **weight**, not seconds. The available time is shared out in
proportion, so a chapter always fills its narration instead of ending in a
frozen frame.

The **first shot is where the scene opens**. Loading the page and moving to it
happen before the recorder starts, so a chapter begins on its subject rather
than at the top of the document. Only the second shot onward is a visible
scroll.

## Building

Once:

```sh
npm install
```

Then, per video (omit `--spec` for the walkthrough):

```sh
node tts.mjs          --spec scenes.deepdive.json   # narration + timings.json
node render-cards.mjs --spec scenes.deepdive.json   # cards, chapter dividers, phone stage
node render-subs.mjs  --spec scenes.deepdive.json   # subtitle plates
node capture-web.mjs  --spec scenes.deepdive.json   # web + document footage
./capture-mobile.sh                                 # emulator footage (walkthrough only)
node build.mjs        --spec scenes.deepdive.json   # assemble
```

Each stage writes only into `build/<spec>/`, and each is independently
re-runnable. To redo one scene after a wording or choreography change:

```sh
node tts.mjs --spec scenes.deepdive.json --only 11-mod
node capture-web.mjs --spec scenes.deepdive.json --only 11-mod
node build.mjs --spec scenes.deepdive.json
```

Servers required: the app on `http://127.0.0.1:5173`, the API on
`http://127.0.0.1:3000`, and `docs/` on `http://127.0.0.1:8080` for document
scenes. `capture-mobile.sh` needs the app installed on a running emulator; it
relaunches the app detached on purpose, because an attached `flutter run`
session draws a highlight border around the whole screen that would otherwise be
recorded.

## Choices worth knowing about

**The voice is synthetic.** `tts.mjs` uses edge-tts: free, no account. Its
naturalness depends far less on which voice is chosen than on how the text is
fed to it, so each sentence is synthesised alone, real pauses are inserted
between them, and the rate is dropped slightly. Handing the model a whole
paragraph is what produces the hurried, flat delivery people recognise as
robotic. Swap voices with `--voice ar-JO-TaimNeural`.

edge-tts sends the narration text to Microsoft's servers to synthesise it. The
text is the project's own explainer copy, nothing sensitive.

To use a recorded human voice instead, drop one `.mp3` per scene into
`build/<spec>/audio/` with the same filenames and re-run `build.mjs`; it reads
durations from whatever files it finds.

**Text is typeset by Chrome, not ffmpeg.** This ffmpeg build ships without
libass, freetype and fontconfig, so its `subtitles` and `drawtext` filters do not
exist. Cards and subtitle plates are rendered as PNGs in headless Chrome and
composited. That is the better answer regardless: Chrome shapes and orders
Arabic correctly and uses the product's own typeface, so the videos and the app
look like one thing.

**Scenes are built individually, then concatenated.** One giant filtergraph
would rebuild everything on any change and would report failures without naming
the scene that broke.

**Element positions are measured, never assumed.** `render-cards.mjs` measures
where the phone stage leaves a slot and writes it out for `build.mjs`, and doc
scenes scroll to selectors rather than pixel offsets. Both were bugs first: a
hand-computed RTL grid put the phone on top of the caption, and pixel offsets
calibrated at one viewport pointed at the wrong content at another.
