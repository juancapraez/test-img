/**
 * Format date in human readable format (Spanish)
 */

function humanDate(date = new Date()) {
  const options = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Bogota'
  };
  
  return new Intl.DateTimeFormat('es-CO', options).format(date);
}

module.exports = { humanDate };
