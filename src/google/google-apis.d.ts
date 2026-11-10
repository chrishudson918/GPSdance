// Types for the two Google scripts the app loads at run time (they ship no npm types we use).
// Only the parts GPSdance calls. Full docs:
// - Sign-in (Google Identity Services, token model): https://developers.google.com/identity/oauth2/web/reference/js-reference
// - Picker: https://developers.google.com/workspace/drive/picker/reference

declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token: string;
    expires_in: number;
    error?: string;
    error_description?: string;
  }
  interface TokenClient {
    requestAccessToken(overrides?: { prompt?: string }): void;
  }
  function initTokenClient(config: {
    client_id: string;
    scope: string;
    prompt?: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message?: string }) => void;
  }): TokenClient;
  function revoke(accessToken: string, done?: () => void): void;
}

declare namespace google.picker {
  const Action: { PICKED: string; CANCEL: string };
  const ViewId: { DOCS: string };
  interface PickedDoc {
    id: string;
    name: string;
    mimeType: string;
  }
  interface ResponseObject {
    action: string;
    docs?: PickedDoc[];
  }
  class DocsView {
    constructor(viewId?: string);
    setMimeTypes(mimeTypes: string): DocsView;
    setIncludeFolders(include: boolean): DocsView;
    /** true: only "My Drive" files; false: only files shared with me. */
    setOwnedByMe(owned: boolean): DocsView;
  }
  interface Picker {
    setVisible(visible: boolean): void;
    dispose(): void;
  }
  class PickerBuilder {
    setOAuthToken(token: string): PickerBuilder;
    setDeveloperKey(key: string): PickerBuilder;
    setAppId(appId: string): PickerBuilder;
    setTitle(title: string): PickerBuilder;
    addView(view: DocsView): PickerBuilder;
    setCallback(callback: (data: ResponseObject) => void): PickerBuilder;
    build(): Picker;
  }
}

declare const gapi: { load(api: string, callback: () => void): void };
