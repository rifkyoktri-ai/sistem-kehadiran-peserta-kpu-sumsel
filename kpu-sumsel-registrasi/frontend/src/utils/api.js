

export const getAuthHeader = (password, extra = {}) => {
  const base = password && password.startsWith('eyJ')
    ? { 'Authorization': 'Bearer ' + password }
    : password ? { 'x-password': password } : {};
  return { 'Content-Type': 'application/json', ...base, ...extra };
};

export const apiRequest = async (method, url, body, password) => {
  const headers = getAuthHeader(password);
  const options = {
    method,
    headers,
  };
  if (body) options.body = JSON.stringify(body);
  const resp = await fetch(url, options);
  if (resp.status === 401) {
    throw new Error('401');
  }
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(txt || resp.statusText);
  }
  return resp.json();
};
