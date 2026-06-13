// Minimal typings for the Google Identity Services token client (we only use a tiny slice, so we
// declare it ourselves rather than pull in @types/google.accounts).

export type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

export type TokenErrorResponse = {
  type?: string;
  message?: string;
};

export type TokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

export type TokenClientConfig = {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: TokenErrorResponse) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
        };
      };
    };
  }
}
