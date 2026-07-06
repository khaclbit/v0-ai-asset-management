/** Token storage helpers — always checks for SSR safety. */

const ACCESS_KEY = "access_token"
const REFRESH_KEY = "refresh_token"
const AUTH_USER_KEY = "auth_user"

const isBrowser = () => typeof window !== "undefined"

export function getAccessToken(): string | null {
  return isBrowser() ? localStorage.getItem(ACCESS_KEY) : null
}

export function getRefreshToken(): string | null {
  return isBrowser() ? localStorage.getItem(REFRESH_KEY) : null
}

export function setTokens(access: string, refresh?: string): void {
  if (!isBrowser()) return
  localStorage.setItem(ACCESS_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens(): void {
  if (!isBrowser()) return
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export function hasValidToken(): boolean {
  return Boolean(getAccessToken())
}
