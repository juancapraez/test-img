function isValidHost(req) {
  const host = req.headers.host || req.headers['x-forwarded-host'] || '';
  const origin = req.headers.origin || '';
  
  // Extract hostname from origin if available
  let originHost = '';
  if (origin) {
    try {
      originHost = new URL(origin).hostname;
    } catch (e) {
      // Invalid origin format, ignore
    }
  }
  
  // Check if either host or origin ends with .trazo.co
  const isValid = host.endsWith('.trazo.co') || originHost.endsWith('.trazo.co');
  
  return isValid;
}

module.exports = { isValidHost };
