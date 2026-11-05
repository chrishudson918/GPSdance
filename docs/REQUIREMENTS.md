# Requirements

> Approved by the user 2026-11-05, from the first two interview rounds. Changes need the user's OK.
> Priority: **R1** = must work by **January 1, 2027**. **R2** = shortly after.

## 1. Users and devices

| | |
|---|---|
| Users | Instructors (6 confirmed) and students (number unknown) at Gilbert Public Schools |
| Skill level | Somewhat comfortable: basic cuts and fades, confused by pro tools |
| Devices | District Windows PCs and Chromebooks, in a current Chrome browser |
| Sign-in | District Google account (Google Workspace) |
| Network | Online-first; Wi-Fi is usually fine where they practice |

## 2. Editor (R1)

- **Open songs** from Google Drive with Google's file picker. Email attachments are saved to Drive first. Common formats: MP3, M4A/AAC, WAV.
- **Cut:** trim, split, delete and rearrange parts of a song. Cuts can snap to beats.
- **Fade** in and out, with adjustable length.
- **Tempo:** speed a song up or slow it down without changing its pitch.
- **Combine songs** into one mix on a single, simple timeline.
- **Transitions** between songs:
  - crossfade (length adjustable);
  - beat-matched: the tempo and beats of the two songs line up across the change;
  - sound-effect bridge: an effect (whoosh, boom, riser…) placed over the change.
- **One tempo for the whole mix** (optional): pick a target BPM and every song is stretched to it.
- **Tempo detection:** the app finds each song's BPM and beats automatically. It can be adjusted by hand if it guesses wrong.
- **Volume leveling:** bring every song in a mix to the same loudness.
- **Censor by hand:** mark a word's start and end; the app plays that slice backward (reverse).
- **Undo/redo**, unlimited while editing.
- **Save** the project to Drive. **Export** the finished mix as MP3 or WAV, to Drive or as a download.
- Must handle **long mixes (10+ minutes, many songs)** on a Chromebook without running out of memory.

## 3. Sound effects (R1)

Three sources, shown together in one picker:

1. **Built-in starter library:** a small set of free-license effects (license recorded for each).
2. **The user's own effects** from their Drive.
3. **A shared district library:** a shared Drive folder every instructor can see. Who manages it is still to be decided.

## 4. Player (R1)

- Play/pause and seeking on a large, easy-to-use screen.
- **Named sections** (markers set in the editor, e.g. "Chorus", "Turn sequence") to jump straight to a part.
- **Loop** a section.
- **Practice speed** (e.g. 80%) without changing pitch or the mix itself.
- **Metronome count-in** at the song's BPM before a section starts (practice only).
- **Countdown / delay start:** press play, walk to position, the music starts after N seconds.
- **Set list:** line several routines up in show order for a long show. One long mix also works.

## 5. Sharing and versions (R1)

- Share a project with instructors (same school or other district schools) and students.
- **Editable** (Drive "Editor") opens in the editor. **Play-only** (Drive "Viewer") opens in the player only.
- **One editor at a time:** if a project changed since you opened it, warn and keep both versions; never overwrite silently.
- **Saved versions:** restore an earlier save, using Drive's version history.

## 6. Automatic bad-word finding (R2)

- Speech recognition runs **in the browser** (an open-source Whisper model): no server, no cost, audio never leaves the device.
- The app **flags** words that are on the list; a person listens to each one and approves or skips it. Approved words are reversed.
- **Word list:** a built-in standard list that each instructor can add words to or remove words from.
- Expected to be slow on Chromebooks (possibly minutes per song) and imperfect on sung lyrics. Marking by hand is always available.

## 7. Technical constraints

- **Static web app:** HTML/JS/CSS only, no backend and no database of our own. Projects are files in the user's Drive.
- **Google permissions:** the narrowest Drive access possible (the app sees only files the user picks or the app created), so the district can trust the app without Google's full app review. Exact scopes to be confirmed.
- **Everything served from the app's own address:** no outside CDNs for code, fonts, sounds or the speech model. The district web filter can't be changed by the user, so the app should need only one allowed address (plus Google's own sign-in and Drive).
- **Hosting:** GitHub Pages (public repo, on the user's personal GitHub) while building and testing. Then **Firebase Hosting in the district's Google Cloud project** for the final product.
- **No secrets in the code.** A browser app's Google client ID is public by design.
- **Privacy:** no student data stored by the app; nothing sent to third parties. To check: FERPA/COPPA and any district data-privacy agreement process.

## 8. People and process

- **Pilot group:** one or two instructors try early versions before January 1.
- **Google Workspace admin:** a coworker, who creates or approves the Google Cloud project and trusts the app in the Admin console. Claude drafts the request.
- **Maintenance:** the user at first, handed to someone else later. Docs must be self-contained.
- **Decision:** a short build-vs-buy write-up for the decision makers (this app vs GoldWave, Audacity and GarageBand, measured against the criteria).

## 9. Open questions

- [ ] A fun app name.
- [x] Check GoldWave's features: see [build-vs-buy.md](build-vs-buy.md) (2026-11-05). Hands-on tests are still open there.
- [ ] Who manages the web filter? (`github.io` does open on a student Chromebook at school under a staff login, 2026-11-05; confirm once with a student login.)
- [ ] Who manages the shared sound-effects folder?
- [ ] Rough number of students.
- [ ] Any district rules for new software (data-privacy agreement, accessibility/WCAG, approval committee)?
- [ ] Who is in the pilot group?
- [x] Commit identity and the GitHub username: chrishudson918, noreply email, no AI attribution.
