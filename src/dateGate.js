const CALENDAR_TIMEZONE = 'Europe/Berlin';

function dateToYmdInTimezone(date, timeZone = CALENDAR_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function isUnlockedForToday(unlockDate, timeZone = CALENDAR_TIMEZONE) {
  const today = dateToYmdInTimezone(new Date(), timeZone);
  return today >= unlockDate;
}
