/**
 * Validates and filters URLs
 */

const BLOCKED_SCHEMES = ['mailto:', 'javascript:', 'tel:', 'sms:', 'ftp:', 'blob:', 'data:'];

export function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (BLOCKED_SCHEMES.includes(url.protocol)) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

export function isInternalUrl(urlString, baseUrlString) {
  try {
    const url = new URL(urlString);
    const baseUrl = new URL(baseUrlString);
    
    // Check if domain matches (or subdomain if allowed, but strict match for now as per "internal URL rules")
    // If the base URL is https://example.com, we should allow example.com and www.example.com?
    // The spec says: Accept https://example.com/about. Reject https://facebook.com.
    // Let's match the exact hostname, removing 'www.' for comparison
    const host1 = url.hostname.replace(/^www\./, '');
    const host2 = baseUrl.hostname.replace(/^www\./, '');
    
    return host1 === host2;
  } catch (err) {
    return false;
  }
}
