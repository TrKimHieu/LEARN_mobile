/** Shared by Expo config (Node) and the app (Metro). Never infer an API from Metro. */
function resolveEnvironment(value) {
  if (!['development', 'preview', 'production'].includes(value)) {
    throw new Error('APP_ENV must be development, preview or production.');
  }
  return value;
}

function resolveApiOrigin(value, environment) {
  resolveEnvironment(environment);
  if (!value || value.trim() !== value) throw new Error('Set EXPO_PUBLIC_API_URL to the API origin.');
  let url;
  try { url = new URL(value); } catch { throw new Error('EXPO_PUBLIC_API_URL must be a valid origin.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
    url.pathname !== '/' || url.search || url.hash) {
    throw new Error('EXPO_PUBLIC_API_URL must be an HTTP(S) origin without credentials, path, query or fragment.');
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  const local = ['localhost', '[::1]', '[::]', '0.0.0.0'].includes(hostname) || hostname.endsWith('.localhost') ||
    /^127\./.test(hostname) || /^\[::ffff:7f[0-9a-f]{2}:/.test(hostname);
  if (environment !== 'development' && (url.protocol !== 'https:' || local)) {
    throw new Error('Preview and production require a remote HTTPS API origin.');
  }
  return url.origin;
}

module.exports = { resolveApiOrigin, resolveEnvironment };
