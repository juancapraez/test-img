function hasValidApiKey(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  const validApiKey = process.env.RECEIPT_API_KEY;
  
  return token === validApiKey;
}

module.exports = { hasValidApiKey };
