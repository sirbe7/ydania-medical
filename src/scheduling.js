export const DEFAULT_TIMEZONE = 'America/Caracas';
export const DEFAULT_UTC_OFFSET_MINUTES = -240;

export function localDateTimeToUtcIso(date, time, offsetMinutes = DEFAULT_UTC_OFFSET_MINUTES) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Invalid local date/time');
  const [y,m,d] = date.split('-').map(Number);
  const [hh,mm] = time.split(':').map(Number);
  const utcMs = Date.UTC(y,m-1,d,hh,mm) - offsetMinutes * 60_000;
  return new Date(utcMs).toISOString();
}

export function utcIsoToLocalParts(iso, offsetMinutes = DEFAULT_UTC_OFFSET_MINUTES) {
  const ms = new Date(iso).getTime() + offsetMinutes * 60_000;
  const dt = new Date(ms);
  return {
    date: dt.toISOString().slice(0,10),
    time: dt.toISOString().slice(11,16),
    weekday: dt.getUTCDay(),
  };
}

export function minutesToTime(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

export function timeToMinutes(time) {
  const [h,m] = time.split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) throw new Error('Invalid time');
  return h*60+m;
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export function buildSlots({
  date,
  rules,
  busy = [],
  blocks = [],
  durationMinutes,
  bufferBeforeMinutes = 0,
  bufferAfterMinutes = 0,
  slotStepMinutes = 15,
  minNoticeMinutes = 0,
  nowUtcIso = new Date().toISOString(),
  offsetMinutes = DEFAULT_UTC_OFFSET_MINUTES,
}) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const dayRules = rules.filter(r => Number(r.weekday) === weekday && Number(r.enabled ?? 1) === 1);
  const result = [];
  const required = Number(durationMinutes) + Number(bufferBeforeMinutes) + Number(bufferAfterMinutes);
  const nowMs = new Date(nowUtcIso).getTime();
  const minStartMs = nowMs + Number(minNoticeMinutes) * 60_000;

  for (const rule of dayRules) {
    const startMin = timeToMinutes(rule.start_time);
    const endMin = timeToMinutes(rule.end_time);
    for (let candidate = startMin; candidate + required <= endMin; candidate += slotStepMinutes) {
      const visibleStart = candidate + Number(bufferBeforeMinutes);
      const reserveStartIso = localDateTimeToUtcIso(date, minutesToTime(candidate), offsetMinutes);
      const visibleStartIso = localDateTimeToUtcIso(date, minutesToTime(visibleStart), offsetMinutes);
      const reserveEndIso = new Date(new Date(reserveStartIso).getTime() + required * 60_000).toISOString();
      const visibleEndIso = new Date(new Date(visibleStartIso).getTime() + Number(durationMinutes) * 60_000).toISOString();
      if (new Date(visibleStartIso).getTime() < minStartMs) continue;
      const conflict = [...busy, ...blocks].some(x => overlaps(reserveStartIso, reserveEndIso, x.start_at, x.end_at));
      if (!conflict) result.push({start_at: visibleStartIso, end_at: visibleEndIso, reserve_start_at: reserveStartIso, reserve_end_at: reserveEndIso});
    }
  }
  return result;
}

export function validateNoConfirmedOverlap(bookings, candidateStart, candidateEnd, ignoreId = null) {
  return !bookings.some(b => b.id !== ignoreId && ['pending','confirmed'].includes(b.status) && overlaps(candidateStart, candidateEnd, b.reserve_start_at || b.start_at, b.reserve_end_at || b.end_at));
}