/**
 * Format number with thousands separator 
 * Uses comma for thousands and period for decimals
 */

function formatNumber(number, currency) {
  if (typeof number !== 'number') {
    number = parseFloat(number);
  }
  
  if (isNaN(number)) {
    return '0';
  }
  
  // Format with comma for thousands and period for decimals
  // Using en-US format and replacing the currency symbol
  let formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
  
  // Remove any commas from the decimal part if they exist
  const parts = formatted.split('.');
  if (parts.length > 1) {
    formatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + parts[1];
  } else {
    formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const prefix = currency ? `${String(currency).toUpperCase()} ` : '';
  return `${prefix} $ ${formatted}`;
}

/**
 * Format number without decimals
 * Uses comma for thousands separator
 */
function formatNumberNoDecimals(number) {
  if (typeof number !== 'number') {
    number = parseFloat(number);
  }
  
  if (isNaN(number)) {
    return '0';
  }
  
  // Format without decimals
  let formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
  
  // Add thousands separator
  formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return formatted;
}

/**
 * Format number without currency symbol
 */
function formatNumberNoCurrency(number) {
  if (typeof number !== 'number') {
    number = parseFloat(number);
  }
  
  if (isNaN(number)) {
    return '0';
  }
  
  // Format with comma for thousands and period for decimals
  let formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
  
  // Remove any commas from the decimal part if they exist
  const parts = formatted.split('.');
  if (parts.length > 1) {
    formatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + parts[1];
  } else {
    formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  return formatted;
}

module.exports = { formatNumber, formatNumberNoDecimals, formatNumberNoCurrency };
