// OAuth for the cloud sync providers, using expo-auth-session with PKCE.
//
// Returns an access token the SyncProvider adapters use through the shared
// transport. The flow opens the system browser, so it never sees the user's
// password. Credentials come from app/config; when they are placeholders the
// call throws a clear, actionable error.

import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { OAUTH, isConfigured, type OAuthConfig } from "../config";

WebBrowser.maybeCompleteAuthSession();

export interface AuthResult {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms when the access token expires, when the provider reports it. */
  expiresAt?: number;
}

async function authorize(config: OAuthConfig, scheme: string): Promise<AuthResult> {
  if (!isConfigured(config)) {
    throw new Error(
      "This provider is not configured. Add its OAuth client id in app/config.ts.",
    );
  }

  const redirectUri = AuthSession.makeRedirectUri({ scheme });
  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    scopes: config.scopes,
    redirectUri,
    usePKCE: true,
    extraParams: { token_access_type: "offline" },
  });

  const discovery: AuthSession.DiscoveryDocument = {
    authorizationEndpoint: config.authorizationEndpoint,
    tokenEndpoint: config.tokenEndpoint,
  };

  const result = await request.promptAsync(discovery);
  if (result.type !== "success" || !result.params.code) {
    throw new Error("Authorization was cancelled or failed.");
  }

  const token = await AuthSession.exchangeCodeAsync(
    {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      code: result.params.code,
      redirectUri,
      extraParams: request.codeVerifier
        ? { code_verifier: request.codeVerifier }
        : undefined,
    },
    discovery,
  );

  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresIn ? Date.now() + token.expiresIn * 1000 : undefined,
  };
}

/** Connect Google Drive (appDataFolder scope). */
export function authorizeGoogleDrive(scheme = "ledger"): Promise<AuthResult> {
  return authorize(OAUTH.googleDrive, scheme);
}

/** Connect Dropbox (scoped app folder). */
export function authorizeDropbox(scheme = "ledger"): Promise<AuthResult> {
  return authorize(OAUTH.dropbox, scheme);
}
