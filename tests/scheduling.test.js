import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSlots, overlaps, localDateTimeToUtcIso, validateNoConfirmedOverlap} from '../src/scheduling.js';

test('Caracas local time converts to UTC',()=>{
  assert.equal(localDateTimeToUtcIso('2026-10-05','09:00'),'2026-10-05T13:00:00.000Z');
});

test('overlap semantics are half-open',()=>{
  assert.equal(overlaps('2026-01-01T10:00:00Z','2026-01-01T11:00:00Z','2026-01-01T11:00:00Z','2026-01-01T12:00:00Z'),false);
  assert.equal(overlaps('2026-01-01T10:00:00Z','2026-01-01T11:00:00Z','2026-01-01T10:30:00Z','2026-01-01T11:30:00Z'),true);
});

test('duration plus buffers control availability',()=>{
  const slots=buildSlots({
    date:'2026-10-05',
    rules:[{weekday:1,start_time:'09:00',end_time:'12:00',enabled:1}],
    busy:[{start_at:'2026-10-05T14:00:00.000Z',end_at:'2026-10-05T15:00:00.000Z'}], // 10-11 local
    blocks:[],durationMinutes:30,bufferBeforeMinutes:0,bufferAfterMinutes:15,slotStepMinutes:15,minNoticeMinutes:0,nowUtcIso:'2026-10-01T00:00:00Z'
  });
  assert.ok(slots.some(s=>s.start_at==='2026-10-05T13:00:00.000Z'));
  assert.ok(!slots.some(s=>s.start_at==='2026-10-05T13:30:00.000Z')); // reserve to 10:15 conflicts at 10
});

test('pending bookings block duplicate reservation',()=>{
  assert.equal(validateNoConfirmedOverlap([{id:'a',status:'pending',reserve_start_at:'2026-10-05T13:00:00Z',reserve_end_at:'2026-10-05T14:00:00Z'}],'2026-10-05T13:30:00Z','2026-10-05T14:30:00Z'),false);
});