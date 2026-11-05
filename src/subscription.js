export function daysUntilExpiry(expiryDate, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) throw new Error('Date d’échéance invalide.');
  const [expiryYear, expiryMonth, expiryDay] = expiryDate.split('-').map(Number);
  if (new Date(Date.UTC(expiryYear, expiryMonth - 1, expiryDay)).toISOString().slice(0, 10) !== expiryDate) throw new Error('Date d’échéance invalide.');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kinshasa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const today = `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}-${parts.find(part => part.type === 'day').value}`;
  const utcDate = value => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((utcDate(expiryDate) - utcDate(today)) / 86400000);
}
