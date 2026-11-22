const pad = (n) => String(n).padStart(2, '0');

function todayJakarta() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function isoNow() {
  return new Date().toISOString();
}

module.exports = { todayJakarta, isoNow, pad };
