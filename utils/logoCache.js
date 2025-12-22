/**
 * Shared Logo Cache Module
 * Centralized caching for logos across all endpoints
 */

const { downloadImageAsBase64 } = require('./imageBase64');

// In-memory logo cache with 12-hour TTL
const logoCache = new Map();
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const MAX_CACHE_SIZE = 1000;

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of logoCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      logoCache.delete(key);
    }
  }
}, 60 * 60 * 1000); // 1 hour

function getCachedLogo(logoUrl) {
  const cached = logoCache.get(logoUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Move to end (LRU)
    logoCache.delete(logoUrl);
    logoCache.set(logoUrl, cached);
    return cached.dataUri;
  }
  return null;
}

function setCachedLogo(logoUrl, dataUri) {
  // If cache is full, remove oldest entry
  if (logoCache.size >= MAX_CACHE_SIZE) {
    const firstKey = logoCache.keys().next().value;
    logoCache.delete(firstKey);
  }
  logoCache.set(logoUrl, {
    dataUri,
    timestamp: Date.now()
  });
}

async function downloadAndCacheLogo(logoUrl, format = "image/jpeg") {
  let logoDataUri = getCachedLogo(logoUrl);
  
  if (!logoDataUri) {
    try {
      logoDataUri = await downloadImageAsBase64(logoUrl, format);
      setCachedLogo(logoUrl, logoDataUri);
    } catch (error) {
      // If logo download fails, use a placeholder
      console.error('Error downloading logo:', error);
      logoDataUri = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMwIiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgMTMwIDQ1IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMzAiIGhlaWdodD0iNDUiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSI2NSIgeT0iMjciIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TE9HTzwvdGV4dD48L3N2Zz4=';
    }
  }
  
  return logoDataUri;
}

// Export cache functions for testing/monitoring if needed
function getCacheStats() {
  return {
    size: logoCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL
  };
}

module.exports = {
  getCachedLogo,
  setCachedLogo,
  downloadAndCacheLogo,
  getCacheStats
};
