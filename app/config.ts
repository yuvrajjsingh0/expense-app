// App configuration the developer fills in before shipping. Kept out of the core
// so the engine has no secrets. In production, source these from a secure config
// (EAS secrets, app.config.ts extra) rather than committing real values.

export interface OAuthConfig {
  clientId: string;
  /** Some providers need the secret for the token exchange; omit with PKCE. */
  clientSecret?: string;
  scopes: string[];
  authorizationEndpoint: string;
  tokenEndpoint: string;
}

export const OAUTH: Record<"googleDrive" | "dropbox", OAuthConfig> = {
  googleDrive: {
    clientId: "YOUR_GOOGLE_OAUTH_CLIENT_ID",
    scopes: ["https://www.googleapis.com/auth/drive.appdata"],
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
  },
  dropbox: {
    clientId: "YOUR_DROPBOX_APP_KEY",
    scopes: ["files.content.write", "files.content.read"],
    authorizationEndpoint: "https://www.dropbox.com/oauth2/authorize",
    tokenEndpoint: "https://api.dropboxapi.com/oauth2/token",
  },
};

/** True once a provider has real credentials configured. */
export function isConfigured(config: OAuthConfig): boolean {
  return !config.clientId.startsWith("YOUR_");
}
