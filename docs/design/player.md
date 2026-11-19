# Player design

What's decided for the Player screen. Requirements: [REQUIREMENTS.md](../REQUIREMENTS.md) §4.

**The Player is the easy playback tool, with as little editing as possible.** Anything that changes the project (song order, sections, cuts) happens in the Editor.

## Layout: option A (picked 2026-11-18)

Clickable mockups: https://chrishudson918.github.io/GPSdance/mockups/player/ (source in `public/mockups/player/`, no real audio). The user picked **option A**, in the Editor's option A look:

- A **waveform** of the current song, colored and labeled by section, with the playhead; click to jump.
- **Section buttons** in a row under it, each with a **loop** icon.
- A **controls bar along the bottom**: Play/Pause, the time, Practice speed, Count-in, "Count-in between loop passes".
- A **set list** panel on the left that can be hidden.

## How it behaves

- **Play starts right away**, always. There is no delay start (dropped from the requirements by the user).
- **Practice speed:** preset buttons 50 · 60 · 75 · 90 · 100%. A new speed shows "Getting it ready…"; if the music was playing, it pauses, gets ready and carries on.
- **Count-in:** Off, 4 beats ("5, 6, 7, 8") or 8 beats, at the song's BPM. It plays when a **section button** is used to jump, and between loop passes if that switch is on. Plain Play never counts in.
- **Loop** a section from its loop icon; a switch picks whether a count-in plays between passes.
- **Two views,** switched by a header button: **normal** (the default) and a **Big view** for across the room: the section name, a giant 8-count · beat that flashes on the beat, and the time / time left in the section. Esc goes back.

## Set list = the project's song order

- There are **no set list files.** The set list is the songs of the open project, in the order they have in the Editor. Instructors don't save or manage anything extra.
- The Player **can't reorder, add or remove** songs. Clicking a song plays from it; when one ends, the next starts right away (they're one continuous mix).
- A whole show can therefore be one long project (e.g. 10 songs, ~30 minutes). That's too much to hold in memory on a Chromebook (about 23 MB per decoded stereo minute; see [LESSONS.md](../LESSONS.md), "Audio"), so:
  - the **Player** keeps only the song that's playing and the next one in memory;
  - the **Editor** loads audio only for the part being worked on, and uses small pre-drawn waveforms for the overview.
- **Long-show memory test** (page `/GPSdance/long-show/`, code in `src/longshow/`, details in [tech-stack.md](tech-stack.md)). First Dell 3120 run, 2026-11-18, 10 real songs, 39:32: **straight play passed** (all 9 song changes on time, each next song ready 3–5 minutes early; at most 215 MB of audio held); the tab peaked at about 686 MB around jumps. With the jump fixes (next song loads 15 s after a jump; audio at 44.1 kHz), jumps at 100% passed (0.2–0.6 s). **Practice speeds are now slowed live while the song plays** (2026-11-19): on the Dell at 75%, jumps 0.4–0.7 s, tab peak 250 MB, speed tool at most 32–35% of the processor, no gaps heard. Still to run: a full 40-minute show at a practice speed.
- **Jumping to a song must use "quick start"** to meet the 1-second limit: start playing the song's first seconds while the rest decodes (0.9 s on the Dell). Decoding the whole song first took 1.7–3.0 s. At a practice speed, a jump may take up to 10 s ("Getting it ready…"), like a speed change (user's call, 2026-11-18).
