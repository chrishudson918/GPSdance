# Build vs. buy: music editing for GPS high school dance

> Recommendation approved by the user 2026-11-05. The shareable version for the decision makers is the Claude doc **Build vs. Buy: Dance Music Software** (https://claude.ai/artifact/2XYgz1csbokRFJyseGsAtk); keep the two in step. Facts checked against vendor pages on 2026-11-05; items marked **(test)** still need a hands-on check.

## The question

The high school dance instructors need software for routine music. They asked for **basic cuts, fades, tempo changes, seamless transitions, and finding/censoring inappropriate words**. They are leaning toward **GoldWave**. This page compares buying GoldWave (or keeping today's mix of tools) with building a small district web app.

## What they use today

A patchwork: some use GoldWave, some Audacity, some GarageBand on personal devices. The instructors' main complaint is that these tools are **"a professional construction worker's tool shed when all they really need is some specific screwdrivers and a hammer or two."**

## Requirements gathered from the department

Beyond the original five criteria, discovery turned up:

1. Works on **district Windows PCs and Chromebooks**, for instructors **and students**.
2. **Google Drive integration is a must:** source songs live in Drive and Gmail.
3. Save to Drive and download as **MP3/WAV**.
4. **Share** projects with instructors across district schools and with students, either **editable** or **play-only**.
5. A **practice player:** jump to named sections, loop a section, practice speed, a metronome count-in, a countdown, and a show set list.
6. Transitions include **crossfades, beat-matching, and sound-effect bridges**. An option to lock a whole mix to one tempo.
7. **Volume leveling** across songs. Undo and restoring earlier versions.
8. **Student privacy:** no student data leaves district control.

## GoldWave at a glance

| | |
|---|---|
| Price | **$59 lifetime** or **$19 per year**, per user. No education or volume pricing is listed. |
| Licensing | One license covers all of *one person's* devices. A device shared by people who may use it at the same time needs its own license. |
| Platforms | Windows desktop app. **GoldWave Infinity**, a browser version included with every license, is listed for iOS, Android, macOS, Linux and **ChromeOS**. It runs on the device and uses no servers. |
| Current version | 7.09 (September 2026) |

## Scorecard

✅ does it · ⚠️ partly / with effort · ❌ no · ❓ not stated by the vendor

| Need | GoldWave (desktop) | GoldWave Infinity (browser) | Audacity (free) | GarageBand (free) | District app (build) |
|---|---|---|---|---|---|
| Cuts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fades | ✅ | ⚠️ (only voice-over fades listed) | ✅ | ✅ | ✅ |
| Tempo change, same pitch | ⚠️ Time effect has a Tempo setting **(test)** | ❓ only "playback speed" listed | ✅ Change Tempo | ⚠️ project tempo | ✅ |
| Crossfades | ✅ | ✅ | ✅ | ✅ | ✅ |
| Beat-matching / BPM detection | ❓ | ❓ | ⚠️ Beat Finder labels beats; matching is manual | ⚠️ for loops, not imported songs | ✅ |
| Sound-effect bridges | ⚠️ manual mixing | ⚠️ | ⚠️ manual | ✅ | ✅ built-in + Drive libraries |
| Volume leveling | ✅ LUFS, Auto Gain | ⚠️ measures LUFS; Auto Gain | ✅ Loudness Normalization | ⚠️ | ✅ |
| Censor a word | ⚠️ select it by hand, then beep, static, gibberish or other audio | ⚠️ same | ⚠️ by hand | ⚠️ by hand | ✅ reverse, marked by hand (Jan 1) |
| **Find** bad words automatically | ❌ transcription exists (Windows speech engine) but doesn't feed Censor | ❌ AI transcription exists, not linked to Censor | ⚠️ Whisper plugin makes a transcript to read through | ❌ | ✅ flags words to review (after Jan 1) |
| Chromebook | ❌ | ✅ (vendor list) **(test)** | ❌ (Linux mode only, usually off on managed devices) | ❌ | ✅ |
| Google Drive open/save | ❌ not mentioned | ❌ not mentioned | ❌ | ❌ (iCloud) | ✅ |
| Share editable / play-only | ❌ email files | ❌ | ❌ | ⚠️ Apple devices only | ✅ via Drive permissions |
| Practice player (sections, loop, count-in, set list) | ⚠️ playback speed only | ⚠️ playback speed only | ❌ | ❌ | ✅ |
| Simple for "somewhat comfortable" users | ⚠️ hundreds of tools | ⚠️ | ❌ | ⚠️ | ✅ built for this only |
| Student privacy | ✅ local | ✅ on-device | ✅ local | ⚠️ personal Apple IDs | ✅ no app data; Drive only |

## Cost

| | Upfront | Ongoing | Notes |
|---|---|---|---|
| **GoldWave** | 6 instructors × $59 = **$354**. Students extra: on shared Chromebooks, likely one license per device or per student. **Ask the vendor for education/site pricing.** | $0 (lifetime) | Fastest to start. Still needs a separate way to store and share mixes. |
| **Audacity** | $0 | $0 | Windows PCs only for practical purposes. |
| **District app** | IT staff time (Claude-assisted), roughly 8 weeks to the January 1 version | Hosting **$0** (Firebase free tier in the district's Google Cloud). Staff time for fixes and updates. | Fits the requirements exactly; the district owns it. Risk: it's custom software the district must keep up. |

## Where GoldWave is strong

Fair to say, and it changed some early assumptions:

- **It's cheap**, mature, and already familiar to some of the staff.
- **The browser version (Infinity) is listed for ChromeOS** and processes audio on the device, which is good for privacy.
- **It has a Censor tool and AI transcription.** They aren't connected, though: someone still has to find each word by ear and select it by hand.

## Where it falls short of the department's needs

- **No Google Drive integration and no project sharing**, the department's top workflow need. Mixes would travel as emailed files, with no editable vs. play-only.
- **No practice player:** no named sections, section loops, count-in, countdown or set list.
- **Beat-matching and one-tempo mixes** aren't listed.
- **It's the tool shed.** The breadth that makes GoldWave powerful is exactly what the instructors say gets in their way.
- **Licensing for students** on shared Chromebooks is unclear and could multiply the cost.

## Risks of building

- **Deadline:** January 1 is tight. Mitigation: a pilot instructor tests early versions; automatic word-finding is already scheduled after January 1.
- **Maintenance:** the district owns custom code. Mitigation: plain docs written for handoff; static hosting with no servers to patch.
- **Approvals:** the Google Cloud project and the Workspace trust setting need a coworker who is a Workspace admin; the web filter needs to allow one address.
- **Chromebook performance:** long mixes and speech recognition are heavy. Mitigation: a Chromebook proof of concept before committing to the full build.

## Recommendation

**Build the district app, and run a short GoldWave Infinity trial in parallel as a fallback.**

- GoldWave covers the basic editing well. But the department's most specific needs (Drive, sharing, the practice player, automatic word-finding, simplicity) aren't in it, and those are what the build is for.
- A trial on a district Chromebook costs nothing (GoldWave has an evaluation mode) and answers the open "(test)" items. If the build slips, the department has a known-good option for January.
- Decision point: after the Chromebook proof of concept (about 2 weeks in). If it shows the browser can't handle long mixes well, reconsider buying.

## Still to confirm

- [ ] GoldWave Infinity on a district Chromebook: does it load past the web filter, and does it handle a 10-minute mix? **(test)**
- [ ] GoldWave tempo change keeps pitch? **(test)**
- [ ] GoldWave education / site license pricing (ask the vendor).
- [ ] District requirements for new software (data-privacy agreement, accessibility).

## Sources

- GoldWave features: https://goldwave.com/goldwave.php
- GoldWave Infinity: https://www.goldwave.com/goldwaveapp.php
- GoldWave pricing: https://goldwave.com/gwbuy.php
- GoldWave FAQ (licensing, platforms): https://goldwave.com/faq.php
- GoldWave Speech Converter: https://goldwave.com/help/desktop/ToolSpeechConverter.html
- GoldWave Censor (GoldWave 6 manual): http://underpop.free.fr/g/goldwave/effectcensor.html
- GoldWave Time effect: https://goldwave.com/help/mobile/EffectTime.html
- Audacity Change Tempo: https://manual.audacityteam.org/man/change_tempo.html
