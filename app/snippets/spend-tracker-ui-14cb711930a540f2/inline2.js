
export function gis_token(clientId, scope, hint, choose) {
  return new Promise((resolve, reject) => {
    const g = globalThis.google && google.accounts && google.accounts.oauth2;
    if (!g) { reject("not-loaded"); return; }
    const client = g.initTokenClient({
      client_id: clientId,
      scope,
      hint: hint || undefined,
      prompt: choose ? "select_account" : "",
      callback: (r) => {
        if (r.error) { reject(r.error); return; }
        if (!g.hasGrantedAllScopes(r, scope)) { reject("scope"); return; }
        resolve({ token: r.access_token, expiresIn: Number(r.expires_in) || 3600 });
      },
      error_callback: (e) => reject((e && e.type) || "unknown"),
    });
    client.requestAccessToken();
  });
}
