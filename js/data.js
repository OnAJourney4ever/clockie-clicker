// data.js — buildings, achievements, syrup flavours, news and changelog.

export const VERSION = '0.2.0';
export const START_BANK = 60; // the game starts at 11:59:00 PM
export const PRICE_GROWTH = 1.15; // Cookie Clicker: price = base * 1.15^owned, rounded up
export const SELL_RATE = 0.25; // Cookie Clicker refunds 25% of what a building cost
export const RING_SIZE = 50; // cursors per ring around the clock

export const BUILDINGS = [
  {
    id: 'cursor',
    name: 'Cursor',
    base: 15,
    sps: 0.1,
    desc: 'Nudges the second hand back every ten seconds.',
    quote: 'It points at the clock. The clock, unnerved, loses a little time.',
  },
  {
    id: 'nurse',
    name: 'Nurse',
    base: 90,
    sps: 1,
    desc: 'Adds one second to your life every second.',
    quote: '"Take two seconds and call me in the morning. If there is a morning."',
  },
];

const MIN = 60, HOUR = 3600, DAY = 86400, YEAR = 31536000;

// glyph names live in art.js (GLYPHS); tier picks the frame colour
const A = [];
const add = (id, name, desc, glyph, tier, check) => A.push({ id, name, desc, glyph, tier, check });

[[1, 'Tick', 'Click the clock once.'],
 [100, 'Tock', 'Click the clock <b>100</b> times.'],
 [1000, 'Clockwork fingers', 'Click the clock <b>1,000</b> times.'],
 [10000, 'Repetitive strain', 'Click the clock <b>10,000</b> times.'],
 [100000, 'Carpal tunnel vision', 'Click the clock <b>100,000</b> times.'],
].forEach(([n, name, desc], i) => add('click' + n, name, desc, 'cursor', i, (g) => g.all.clicks >= n));

[[MIN, 'Borrowed time', 'Wind back <b>1 minute</b> in total.'],
 [HOUR, 'Overtime', 'Wind back <b>1 hour</b> in total.'],
 [DAY, 'Another day', 'Wind back <b>1 day</b> in total.'],
 [7 * DAY, 'Week-end', 'Wind back <b>1 week</b> in total.'],
 [30 * DAY, 'A month of Sundays', 'Wind back <b>30 days</b> in total.'],
 [YEAR, 'Annual leave', 'Wind back <b>1 year</b> in total.'],
 [10 * YEAR, 'Decade dance', 'Wind back <b>10 years</b> in total.'],
 [100 * YEAR, 'Centenarian', 'Wind back <b>100 years</b> in total.'],
 [1000 * YEAR, 'Millennial', 'Wind back <b>1,000 years</b> in total.'],
].forEach(([n, name, desc], i) => add('wound' + i, name, desc, 'hourglass', i, (g) => g.all.earned >= n));

[[1, 'Break even', 'Wind back <b>1 second</b> per second, enough to stop the clock.'],
 [10, 'Ahead of schedule', 'Wind back <b>10 seconds</b> per second.'],
 [100, 'Time dilation', 'Wind back <b>100 seconds</b> per second.'],
 [1000, 'Temporal anomaly', 'Wind back <b>1,000 seconds</b> per second.'],
 [10000, 'Chronoclasm', 'Wind back <b>10,000 seconds</b> per second.'],
].forEach(([n, name, desc], i) => add('rate' + n, name, desc, 'bolt', i, (g, sps) => sps >= n - 1e-9));

[[1, 'Point and click', 'Have <b>1</b> cursor.'],
 [10, 'Double-click', 'Have <b>10</b> cursors.'],
 [25, 'Point taken', 'Have <b>25</b> cursors.'],
 [50, 'Full circle', 'Have <b>50</b> cursors, a complete ring around the clock.'],
 [100, 'Second ring', 'Have <b>100</b> cursors.'],
 [200, 'Lord of the rings', 'Have <b>200</b> cursors.'],
].forEach(([n, name, desc], i) => add('cursor' + n, name, desc, 'hand', i, (g) => g.run.owned.cursor >= n));

[[1, 'Second opinion', 'Have <b>1</b> nurse.'],
 [5, 'House call', 'Have <b>5</b> nurses.'],
 [10, 'Night shift', 'Have <b>10</b> nurses.'],
 [25, 'Residency', 'Have <b>25</b> nurses.'],
 [50, 'Teaching hospital', 'Have <b>50</b> nurses.'],
 [100, 'Board certified', 'Have <b>100</b> nurses.'],
].forEach(([n, name, desc], i) => add('nurse' + n, name, desc, 'nurse', i, (g) => g.run.owned.nurse >= n));

add('bank300', 'Five more minutes', 'Have <b>5 minutes</b> on the clock at once.', 'clock', 0, (g) => g.run.bank >= 5 * MIN);
add('bank3600', 'Sleeping in', 'Have <b>1 hour</b> on the clock at once.', 'clock', 1, (g) => g.run.bank >= HOUR);
add('bank86400', 'Day off', 'Have <b>1 day</b> on the clock at once.', 'clock', 2, (g) => g.run.bank >= DAY);
add('close3', 'Close shave', 'Let the clock get within <b>3 seconds</b> of midnight, then climb back to a full minute.', 'heart', 1, (g) => g.run.saved3);
add('close1', 'By a hair', 'Let the clock get within <b>1 second</b> of midnight, then climb back to a full minute.', 'heart', 2, (g) => g.run.saved1);
add('death1', 'Midnight snack', 'Let the clock strike midnight.', 'moon', 0, (g) => g.all.deaths >= 1);
add('death5', 'Groundhog night', 'Let the clock strike midnight <b>5</b> times.', 'moon', 1, (g) => g.all.deaths >= 5);

export const ACHIEVEMENTS = A;

// Every achievement fills the syrup 4%; every 25 achievements pours a new flavour.
export const SYRUP_PER_ACH = 4;
export const ACH_PER_FLAVOR = 25;
export const FLAVORS = [
  { name: 'Maple syrup', color: '#c4651a', desc: 'Sticky, amber and faintly smug.' },
  { name: 'Clover honey', color: '#e8ab1c', desc: 'Gathered by bees who were never late for anything.' },
  { name: 'Strawberry syrup', color: '#e0466a', desc: 'Tastes like a summer afternoon that went on too long.' },
  { name: 'Blueberry syrup', color: '#4656c8', desc: 'Deep blue, like the hour before dawn.' },
  { name: 'Mint syrup', color: '#3fbf8c', desc: 'Cool, fresh and suspiciously awake.' },
  { name: 'Grape syrup', color: '#8a38b4', desc: 'Purple. Unapologetically purple.' },
  { name: 'Blackstrap molasses', color: '#45210e', desc: 'Slow. So, so slow. Time barely moves through it.' },
  { name: 'Midnight syrup', color: '#1c1850', desc: 'It glitters, faintly, with stars that are not there.' },
];

export function syrupState(achCount) {
  const idx = Math.min(FLAVORS.length - 1, Math.floor(achCount / ACH_PER_FLAVOR));
  const maxed = idx === FLAVORS.length - 1 && achCount >= ACH_PER_FLAVOR * FLAVORS.length;
  const progress = maxed ? 100 : (achCount % ACH_PER_FLAVOR) * SYRUP_PER_ACH;
  return { idx, flavor: FLAVORS[idx], progress };
}

// ---------------- news ticker ----------------
export function newsPool(g, sps) {
  const n = [
    'Local clock reported to be "about to strike midnight"; experts urge someone to do something.',
    'Scientists confirm midnight is "probably bad."',
    'Man who "just needed five more minutes" found with nine hundred extra minutes.',
    'Horologists warn that winding a clock backwards "voids the warranty, and possibly causality."',
    'Pumpkin carriage industry braces for midnight.',
    'Breaking: it is still almost midnight.',
    'Study finds 9 out of 10 clocks prefer clockwise. The tenth was unavailable for comment.',
    'Local rooster files formal complaint: "I no longer know when to crow."',
    'Syrup found pooling beneath local clock. "It\'s not sap," says nobody in particular.',
    'Cuckoo bird refuses to come out, citing "a bad feeling about this."',
    'Philosophers debate whether time wound back is "the same time" or "a slightly used time."',
    'Calendar printer reports printing the same page eleven thousand times.',
  ];
  if (g.run.owned.cursor > 0) n.push(
    'Cursors seen circling the clock "like tiny, polite vultures."',
    'Pointing at things now officially counts as work.',
    'Mouse-pointer union demands breaks; told breaks "would take time."',
  );
  if (g.run.owned.cursor >= 50) n.push('A complete ring of cursors now orbits the clock. Astronomers are furious.');
  if (g.run.owned.nurse > 0) n.push(
    'Hospitals report staffing shortage; all missing nurses last seen standing near a clock.',
    'Nurse prescribes "two seconds, twice daily."',
    'New study: a second a day keeps midnight away.',
    'Nurses\' union demands overtime pay, is told overtime "doesn\'t exist anymore."',
  );
  if (g.run.owned.nurse >= 10) n.push('"We\'re not even sure what we\'re treating," admits head nurse. "But it\'s working."');
  if (g.run.bank < 15) n.push('URGENT: midnight imminent. Citizens advised to click.', 'Experts recommend "clicking the clock, like, right now."');
  if (sps >= 1) n.push('Clock appears to be running backwards. Owners describe it as "fine, actually."');
  if (g.run.bank >= 3600) n.push('Bedtime postponed indefinitely. Children rejoice.');
  if (g.run.bank >= 86400) n.push('Local clock is now behind by more than a day. "Yesterday called," it says. "It wants its hour back."');
  if (g.all.deaths > 0) n.push('Witnesses claim the clock struck midnight, then "un-struck" it.', 'Ghost reports "unfinished business, mostly clicking."');
  return n;
}

export const CHANGELOG = [
  {
    v: '0.2.0',
    date: 'October 10, 2026',
    notes: [
      'Cursors are now a pointing <b>hand</b>, drawn as a real image, and it is the hand that orbits the clock. The arrow is for clicking.',
      '<b>Doctors</b> are now <b>Nurses</b>, and each has a perfectly ordinary name.',
      'Nurses and other structures stay put in their rows. Hover one to lift and highlight it.',
      'The art grid is twice as fine. Still pixelated, but not nearly as grainy.',
      'The syrup stopped pouring and just flows. The jar in Stats has seen some things.',
    ],
  },
  {
    v: '0.1.0',
    date: 'October 10, 2026',
    notes: [
      'The clock is ticking. It is one minute to midnight.',
      'Click the clock to wind its second hand back.',
      'Added <b>Cursors</b> (15 seconds, 0.1/s) and <b>Doctors</b> (90 seconds, 1/s; since renamed Nurses). Prices grow 15% per purchase, like you\'d expect.',
      'Cursors circle the clock in rings of 50. Doctors got their own ward.',
      'Added 38 achievements, statistics and <b>Syrup</b>, which seeps out beneath the clock.',
      'The Mythos is sealed. For now.',
    ],
  },
];

// ---------------- nurse names ----------------
const FIRST = ['Jennifer', 'Jessica', 'Sarah', 'Emily', 'Amanda', 'Ashley', 'Megan', 'Lauren', 'Rebecca', 'Michelle', 'Laura', 'Karen', 'Susan', 'Linda', 'Mary', 'Patricia', 'Barbara', 'Nancy', 'Lisa', 'Heather', 'Amy', 'Melissa', 'Stephanie', 'Rachel', 'Angela', 'Kelly', 'Christine', 'Elizabeth', 'Julie', 'Katie'];
const LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Baker', 'Turner', 'Parker', 'Collins', 'Cooper'];
export function randomName(taken = []) {
  for (let i = 0; i < 40; i++) {
    const name = `${FIRST[Math.floor(Math.random() * FIRST.length)]} ${LAST[Math.floor(Math.random() * LAST.length)]}`;
    if (!taken.includes(name)) return name;
  }
  return `${FIRST[Math.floor(Math.random() * FIRST.length)]} ${LAST[Math.floor(Math.random() * LAST.length)]}`;
}
