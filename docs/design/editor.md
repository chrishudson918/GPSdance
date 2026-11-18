# Editor design

What's decided for the Editor screen. Requirements: [REQUIREMENTS.md](../REQUIREMENTS.md) §2–3.

## Layout: option A (picked 2026-11-18)

Clickable mockups: https://chrishudson918.github.io/GPSdance/mockups/editor/ (source in `public/mockups/editor/`, no real audio). The user picked **option A**:

- Dark look, bright song colors.
- **One row per song**, staggered left to right.
- **Fixed toolbar across the top** (icon + label buttons).
- Song settings beside each row: Speed −/+, BPM (click to fix), Volume −/+.
- Trim by dragging a song's edges; Split at the playhead; drag to move.
- Fades: drag the white dots at a song's top corners (or the Fade button).
- **Overlap = crossfade.** Dragging a song so it overlaps the one before makes a crossfade; the Transition button changes it to beat-matched or a sound-effect bridge.
- Censor: zoom in around the playhead and drag a box over the word; Listen, nudge, Remove.

Which toolbar buttons to keep is **not** final: see "Review once it's running" below.

## Time, measures and 8-counts (decided 2026-11-18)

These change what a project file stores, so they were settled before the build.

- **A toolbar switch cycles the ruler: Time (m:ss) → Measures → 8-counts.** Same grid underneath; only the labels change (an 8-count = two 4/4 measures).
- **The grid follows each song's own tempo.** Where the tempo changes, a **tempo flag** shows the new BPM on the ruler. It must look clearly different from the section flags ("Chorus", "Turn sequence"…). When back-to-back songs have been matched to the same BPM, there is no flag and no visual change.
- **During an overlap the grid switches at the start of the next song** (the default). The overlap shows that two BPMs are playing at once, with an easy switch to show the first song's grid instead. The project **remembers that choice per overlap**.
- **Beats per measure: per song, 4/4 by default**; 3/4 or 6/8 can be picked in the song's settings.
- **The "1" of each song (its first downbeat).** The app guesses it; the user can fix it three ways: tap along on the "1", shift it one beat at a time with ◀ / ▶, or zoom in on the song and click where the "1" is.
- **Snap to grid** (toolbar on/off): when on, a song snaps **by its "1"** to the grid lines, not by where the audio file starts; when off, songs move freely.
- **Grid lines** in Measures view: 1/2, 1/4, 1/8 or 1/16 notes.

What the project file needs for this: per song a time signature and the "1" position (plus the BPM it already has); per overlap which grid to show. Tempo flags are worked out from the songs, not stored.

Open detail: how 8-counts are numbered across a 3/4 or 6/8 song (dancers still count in 8s). Decide when the ruler is built.

## Review once it's running

UX ideas from the user, to go over with real audio in the first build (none changes the project file):

- Drag a row's edge to make song rows taller or shorter.
- Mouse wheel / trackpad zooms in and out; Shift + scroll moves sideways.
- Which toolbar buttons to include (the user has thoughts).
- The look of tempo flags and the "two BPMs" overlap marker: mock up before building.
