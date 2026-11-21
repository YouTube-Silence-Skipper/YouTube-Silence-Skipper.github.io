// Tests for the promotion window in src/promo.js. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import promo from '../src/promo.js';

const { ptMidnight, dayOf, promoState, pinnedState, pickSeason, splitDuration } = promo;
const at = (iso) => Date.parse(iso);
const iso = (ms) => new Date(ms).toISOString();

test('ptMidnight: PST (UTC-8) and PDT (UTC-7) days', () => {
  assert.equal(iso(ptMidnight(2026, 12, 25)), '2026-12-25T08:00:00.000Z'); // PST
  assert.equal(iso(ptMidnight(2026, 10, 31)), '2026-10-31T07:00:00.000Z'); // PDT
  assert.equal(iso(ptMidnight(2026, 11, 1)), '2026-11-01T07:00:00.000Z');  // DST ends 2am that day
  assert.equal(iso(ptMidnight(2026, 11, 2)), '2026-11-02T08:00:00.000Z');
  assert.equal(iso(ptMidnight(2026, 12, 32)), '2027-01-01T08:00:00.000Z'); // day overflow rolls over
});

test('dayOf: fixed days and Black Friday (day after the 4th Thursday of November)', () => {
  assert.deepEqual(dayOf('12-25', 2026), { m: 12, d: 25 });
  assert.deepEqual(dayOf('10-31', 2026), { m: 10, d: 31 });
  assert.deepEqual(dayOf('black-friday', 2026), { m: 11, d: 27 });
  assert.deepEqual(dayOf('black-friday', 2027), { m: 11, d: 26 });
  assert.deepEqual(dayOf('black-friday', 2025), { m: 11, d: 28 });
  assert.deepEqual(dayOf('black-friday', 2029), { m: 11, d: 23 }); // Nov 1 is a Thursday
});

const XMAS = { day: '12-25', extendDays: 3, leadDays: 60 };

test('Christmas: before → counts down to Dec 25 00:00 PT', () => {
  const s = promoState(XMAS, at('2026-12-20T12:00:00-08:00'));
  assert.equal(s.phase, 'before');
  assert.equal(iso(s.dayStart), '2026-12-25T08:00:00.000Z');
});

test('Christmas: live from Dec 25 00:00 PT through the end of Dec 28 PT', () => {
  assert.equal(promoState(XMAS, at('2026-12-24T23:59:59-08:00')).phase, 'before');
  assert.equal(promoState(XMAS, at('2026-12-25T00:00:00-08:00')).phase, 'live');
  const lastSecond = promoState(XMAS, at('2026-12-28T23:59:59-08:00'));
  assert.equal(lastSecond.phase, 'live');
  assert.equal(iso(lastSecond.end), '2026-12-29T08:00:00.000Z');
  assert.equal(promoState(XMAS, at('2026-12-29T00:00:00-08:00')).phase, 'off');
});

test('Christmas: the deadline is Pacific time, whatever the visitor\'s zone', () => {
  // 2026-12-29 15:00 in Seoul is still Dec 28 22:00 PT → live
  assert.equal(promoState(XMAS, at('2026-12-29T15:00:00+09:00')).phase, 'live');
  // 2026-12-29 17:00 in Seoul is Dec 29 00:00 PT → off
  assert.equal(promoState(XMAS, at('2026-12-29T17:00:00+09:00')).phase, 'off');
});

test('Christmas: a theme left up into January does not count down to next Christmas', () => {
  assert.equal(promoState(XMAS, at('2027-01-05T12:00:00-08:00')).phase, 'off');
  // ...and too far ahead of the day counts as out of season
  assert.equal(promoState(XMAS, at('2026-09-01T12:00:00-07:00')).phase, 'off');
  assert.equal(promoState(XMAS, at('2026-11-01T12:00:00-07:00')).phase, 'before'); // within 60 days
});

test('Halloween: PDT day, sale ends at the end of Nov 3 PST', () => {
  const cfg = { day: '10-31', extendDays: 3 };
  assert.equal(promoState(cfg, at('2026-10-30T12:00:00-07:00')).phase, 'before');
  assert.equal(promoState(cfg, at('2026-10-31T00:00:00-07:00')).phase, 'live');
  assert.equal(iso(promoState(cfg, at('2026-11-02T12:00:00-08:00')).end), '2026-11-04T08:00:00.000Z');
  assert.equal(promoState(cfg, at('2026-11-04T00:00:01-08:00')).phase, 'off');
});

test('Black Friday 2026: live Nov 27 through the end of Nov 30 (Cyber Monday) PT', () => {
  const cfg = { day: 'black-friday', extendDays: 3 };
  assert.equal(promoState(cfg, at('2026-11-21T10:00:00-08:00')).phase, 'before');
  assert.equal(promoState(cfg, at('2026-11-27T00:00:00-08:00')).phase, 'live');
  assert.equal(promoState(cfg, at('2026-11-30T23:59:59-08:00')).phase, 'live');
  assert.equal(promoState(cfg, at('2026-12-01T00:00:00-08:00')).phase, 'off');
});

test('splitDuration: days/hours/minutes/seconds, never negative', () => {
  assert.deepEqual(splitDuration(((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000 + 999), { d: 2, h: 3, m: 4, s: 5 });
  assert.deepEqual(splitDuration(-5000), { d: 0, h: 0, m: 0, s: 0 });
});

// The live seasons (src/_data/theme.js): lead days 14 / 7 / 24, extend 3.
const SEASONS = {
  halloween: { promo: { day: '10-31', leadDays: 14, extendDays: 3 } },
  'black-friday': { promo: { day: 'black-friday', leadDays: 7, extendDays: 3 } },
  christmas: { promo: { day: '12-25', leadDays: 24, extendDays: 3 } },
};
const pick = (when) => pickSeason(SEASONS, at(when));

test('pickSeason 2026: Halloween Oct 17–Nov 3, Black Friday Nov 20–30, Christmas Dec 1–28 (PT)', () => {
  assert.equal(pick('2026-10-16T23:59:59-07:00'), null);
  assert.equal(pick('2026-10-17T00:00:00-07:00'), 'halloween');
  assert.equal(pick('2026-11-03T23:59:59-08:00'), 'halloween');
  assert.equal(pick('2026-11-04T00:00:00-08:00'), null);
  assert.equal(pick('2026-11-19T23:59:59-08:00'), null);
  assert.equal(pick('2026-11-20T00:00:00-08:00'), 'black-friday');
  assert.equal(pick('2026-11-30T23:59:59-08:00'), 'black-friday');
  assert.equal(pick('2026-12-01T00:00:00-08:00'), 'christmas');
  assert.equal(pick('2026-12-28T23:59:59-08:00'), 'christmas');
  assert.equal(pick('2026-12-29T00:00:00-08:00'), null);
  assert.equal(pick('2027-01-15T12:00:00-08:00'), null);
  assert.equal(pick('2026-07-04T12:00:00-07:00'), null);
});

test('pickSeason 2027: Black Friday moves with Thanksgiving (Nov 26 → starts Nov 19)', () => {
  assert.equal(pick('2027-11-18T23:59:59-08:00'), null);
  assert.equal(pick('2027-11-19T00:00:00-08:00'), 'black-friday');
});

test('pickSeason: overlapping seasons → the one whose day comes first wins', () => {
  const overlapping = {
    christmas: { promo: { day: '12-25', leadDays: 60, extendDays: 3 } },     // from Oct 26
    'black-friday': { promo: { day: 'black-friday', leadDays: 60, extendDays: 3 } }, // from Sep 28
    halloween: { promo: { day: '10-31', leadDays: 60, extendDays: 3 } },     // from Sep 1
  };
  const p = (when) => pickSeason(overlapping, at(when));
  assert.equal(p('2026-10-30T12:00:00-07:00'), 'halloween');     // all three in season
  assert.equal(p('2026-11-03T12:00:00-08:00'), 'halloween');     // Halloween's extension
  assert.equal(p('2026-11-04T12:00:00-08:00'), 'black-friday');  // BF and Christmas in season
  assert.equal(p('2026-11-30T12:00:00-08:00'), 'black-friday');
  assert.equal(p('2026-12-01T12:00:00-08:00'), 'christmas');
});

test('pinnedState: a pinned theme\'s sale runs from the deploy to the end of the next day + 3', () => {
  const xmas = { day: '12-25', extendDays: 3 };
  const deployed = at('2026-11-21T10:00:00-08:00');
  assert.equal(pinnedState(xmas, deployed, at('2026-11-21T09:59:59-08:00')).phase, 'off'); // before the deploy
  const s = pinnedState(xmas, deployed, at('2026-11-21T10:00:00-08:00'));
  assert.equal(s.phase, 'before');
  assert.equal(iso(s.dayStart), '2026-12-25T08:00:00.000Z');
  assert.equal(pinnedState(xmas, deployed, at('2026-12-26T12:00:00-08:00')).phase, 'live');
  assert.equal(pinnedState(xmas, deployed, at('2026-12-29T00:00:00-08:00')).phase, 'off');
  // left deployed into the new year: does not restart for next Christmas
  assert.equal(pinnedState(xmas, deployed, at('2027-01-10T12:00:00-08:00')).phase, 'off');
  assert.equal(pinnedState(xmas, deployed, at('2027-12-20T12:00:00-08:00')).phase, 'off');
});

test('pinnedState: deployed after this year\'s window → aims at next year\'s day', () => {
  const halloween = { day: '10-31', extendDays: 3 };
  const deployed = at('2026-11-10T12:00:00-08:00'); // after Nov 3
  const s = pinnedState(halloween, deployed, at('2026-11-10T12:00:00-08:00'));
  assert.equal(s.phase, 'before');
  assert.equal(iso(s.dayStart), '2027-10-31T07:00:00.000Z');
  assert.equal(pinnedState(halloween, deployed, at('2027-11-04T00:00:00-08:00')).phase, 'off');
});

test('pinnedState: Black Friday deployed early in the year counts down to this year\'s', () => {
  const bf = { day: 'black-friday', extendDays: 3 };
  const s = pinnedState(bf, at('2026-03-01T12:00:00-08:00'), at('2026-03-01T12:00:00-08:00'));
  assert.equal(s.phase, 'before');
  assert.equal(iso(s.dayStart), '2026-11-27T08:00:00.000Z');
});
