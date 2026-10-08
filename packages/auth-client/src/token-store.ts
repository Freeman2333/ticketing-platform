type AccessToken = string | null;
type AuthChangeListener = (token: AccessToken) => void;

let accessToken: AccessToken = null;
const listeners = new Set<AuthChangeListener>();

export function getAccessToken(): AccessToken {
  return accessToken;
}

export function setAccessToken(token: AccessToken): void {
  accessToken = token;
  listeners.forEach((listener) => listener(token));
}

export function onAuthChange(listener: AuthChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
