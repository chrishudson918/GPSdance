// Google settings for the personal test project "GPSdance test" (Google Cloud, testing mode:
// only the test users listed on its Audience page can sign in). Set up 2026-11-10 for test 5.
// The district's own Google Cloud project replaces these later (docs/design/tech-stack.md, "Setup").
//
// All three are public by design and safe in a public repo:
// - the OAuth client ID identifies the app; it only works from the "Authorized JavaScript origins"
//   set on the client (http://localhost:5173 and https://chrishudson918.github.io);
// - the API key works for the Google Picker API only. It has no website restriction: with one,
//   the Picker said "The API developer key is invalid" (docs/LESSONS.md, "Google");
// - the project number (the Picker's "app ID") isn't secret.
// The OAuth *client secret* is never used by a browser app and must never be added here.

export const GOOGLE = {
  clientId: '1079259439393-s0p6mo3p2br2sgef98q0nmg0pcr7s8vq.apps.googleusercontent.com',
  pickerApiKey: 'AIzaSyAjQwQ-dv5e4s30Avn6kX8Uts6p8OOyKOQ',
  /** The Cloud project number. The Picker needs it so a picked file is opened up to this app. */
  appId: '1079259439393',
  /** The only permission asked for: files the person picks or the app made. */
  scope: 'https://www.googleapis.com/auth/drive.file',
} as const;
