// Session timeout (URS-01). The same value drives the server-side sliding JWT
// expiry (lib/auth.config.ts) and the browser idle logout
// (components/auth/idle-logout.tsx), so a screen left open is signed out even
// when it makes no requests. Override with NEXT_PUBLIC_SESSION_IDLE_MINUTES.
const DEFAULT_MINUTES = 15;

function minutes(): number {
  const n = Number(process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_MINUTES;
}

export const SESSION_IDLE_MINUTES = minutes();
export const SESSION_IDLE_SECONDS = SESSION_IDLE_MINUTES * 60;
// Re-issue the token at most this often while the user is active, so each
// request pushes the expiry forward by a full idle window without writing a
// cookie on every single request.
export const SESSION_REFRESH_SECONDS = 60;
