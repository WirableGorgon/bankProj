const TOKEN_KEY = 'token';

export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token && token.trim() ? token.trim() : '';
}

export function hasToken() {
  return Boolean(getToken());
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function requireAuth(router) {
  if (hasToken()) {
    return true;
  }

  clearToken();
  router.navigate('/');
  return false;
}

export function handleAuthError(router, error) {
  if (!error?.isUnauthorized) {
    return false;
  }

  clearToken();
  router.navigate('/');
  return true;
}
