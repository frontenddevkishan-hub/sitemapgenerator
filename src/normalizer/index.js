/**
 * URL Normalization
 * Removes hashes, tracking parameters, duplicate slashes, and sorts query strings.
 */

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'sessionid',
  'sid'
];

export function normalizeUrl(urlString) {
  try {
    const url = new URL(urlString);
    url.hash = '';

    const searchParams = new URLSearchParams(url.search);
    const keysToDelete = [];
    for (const key of searchParams.keys()) {
      if (TRACKING_PARAMS.includes(key.toLowerCase())) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => searchParams.delete(key));

    searchParams.sort();
    url.search = searchParams.toString();
    url.pathname = url.pathname.replace(/\/{2,}/g, '/');

    return url.toString();
  } catch (err) {
    return urlString;
  }
}
