// data.js — buildings, upgrades, achievements, syrup flavours, news and changelog.

export const VERSION = '0.3.1';
export const START_BANK = 60; // the game starts at 11:59:00 PM
export const PRICE_GROWTH = 1.15; // Cookie Clicker: price = base * 1.15^owned, rounded up
export const SELL_RATE = 0.25; // Cookie Clicker refunds 25% of what a building cost
export const RING_SIZE = 50; // cursors per ring around the clock

// Base costs and production follow Cookie Clicker's table (Farm 1,100 / 8, Mine 12,000 / 47, ...).
// The Warlock House is the Wizard Tower, the Satellite is the Shipment (5.1 billion / 260,000) and
// the Observatory is the Alchemy Lab (75 billion / 1.6 million).
export const BUILDINGS = [
  {
    id: 'cursor', name: 'Cursor', plural: 'Cursors', base: 15, sps: 0.1,
    desc: 'Nudges the second hand back every ten seconds.',
    quote: 'It points at the clock. The clock, unnerved, loses a little time.',
  },
  {
    id: 'nurse', name: 'Nurse', plural: 'Nurses', base: 90, sps: 1,
    desc: 'Adds one second to your life every second.',
    quote: '"Take two seconds and call me in the morning. If there is a morning."',
  },
  {
    id: 'farm', name: 'Clock Farm', plural: 'Clock Farms', base: 1100, sps: 8,
    desc: 'Grows clocks.',
    quote: 'Plant a second, harvest an hour.',
  },
  {
    id: 'mine', name: 'Clock Mine', plural: 'Clock Mines', base: 12000, sps: 47,
    desc: 'Digs up buried clocks.',
    quote: 'Nobody knows who buried them.',
  },
  {
    id: 'factory', name: 'Clock Factory', plural: 'Clock Factories', base: 130000, sps: 260,
    desc: 'Mass-produces clocks.',
    quote: 'Now with 30% more hand.',
  },
  {
    id: 'bank', name: 'Bank', plural: 'Banks', base: 1400000, sps: 1400,
    desc: 'Generates seconds from interest.',
    quote: 'Time is Money. Literally.',
    lore: 'You have successfully converted the world economy away from spatial currency into temporal currency.',
  },
  {
    id: 'temple', name: 'Temple', plural: 'Temples', base: 20000000, sps: 7800,
    desc: 'Full of precious, time-stained relics.',
    quote: 'Your prayers have been put on hold.',
  },
  {
    id: 'warlock', name: 'Warlock House', plural: 'Warlock Houses', base: 330000000, sps: 44000,
    desc: 'Summons seconds from the void.',
    quote: 'The HOA has received several complaints about the space-time continuum.',
  },
  {
    id: 'satellite', name: 'Satellite', plural: 'Satellites', base: 5100000000, sps: 260000,
    desc: 'Stores atomic clocks in orbit.',
    quote: 'Ground control to Major Tick.',
  },
  {
    id: 'observatory', name: 'Observatory', plural: 'Observatories', base: 75000000000, sps: 1600000,
    desc: 'Studies the heavens, and the hours they keep.',
    quote: 'Turns out the universe has terrible time management.',
  },
  {
    id: 'portal', name: 'Portal', plural: 'Portals', base: 1000000000000, sps: 10000000,
    desc: 'Imports clocks from alternate dimensions.',
    quote: "Somewhere, it's always been clock o' clock.",
  },
];
export const BUILDING = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

const MIN = 60, HOUR = 3600, DAY = 86400, WEEK = 7 * DAY, YEAR = 31536000;
const n$ = (n) => n.toLocaleString('en-US');

// ====================================================================
// upgrades
// ====================================================================
// Tiered building upgrades: the same unlock counts and price multipliers as Cookie Clicker.
// Each one makes its building twice as efficient. Prices are multiples of the building's base cost.
export const TIER_REQ = [1, 5, 25, 50, 100, 150, 200, 250];
export const TIER_MULT = [10, 50, 500, 50000, 5e6, 5e8, 5e11, 5e14];

const TIERS = {
  nurse: [
    ['Fresh scrubs', 'Crisp, clean, and only slightly bureaucratic.'],
    ['Double shifts', 'Sleep is just a prolonged blink.'],
    ['Orthopedic clogs', 'Squish, squeak, save.'],
    ['Better coffee', 'It tastes like regret and productivity.'],
    ['A new wing', 'Built next to the other new wing.'],
    ['Framed degrees', 'On the wall, next to the clock. Naturally.'],
    ['Night rounds', 'Under a thousand softly ticking lamps.'],
    ['Union of the Seconds', 'Strong in numbers, stronger in minutes.'],
  ],
  farm: [
    ['Brass hoes', 'Rake in the minutes.'],
    ['Mainspring fertilizer', "It's mostly gears. Mostly."],
    ['Cuckoo orchards', 'Harvest season is very noisy.'],
    ['Grafted grandfathers', 'Tall, ancient, and extremely productive.'],
    ['Sundial sprinklers', 'Waters only on sunny hours.'],
    ['Pendulum scarecrows', 'Swings menacingly at crows. And at hours.'],
    ['Hourglass silos', 'Storage with a built-in countdown.'],
    ['Seasonal crop rotation', 'Spring forward, fall back, repeat.'],
  ],
  mine: [
    ['Tuning-fork picks', 'Hits all the right notes. And seconds.'],
    ['Escapement drills', 'Bores in short, regular bursts.'],
    ['Lantern-lit shafts', 'Nobody knows who left the lanterns on.'],
    ['Ore-sorting cogs', 'Gold, silver, and a surprising amount of brass.'],
    ['Time-lapse tunneling', 'Dig for a year in an afternoon.'],
    ['Fossil clocks', 'Evidence of earlier, slower civilizations.'],
    ['Deep-vein dynamite', 'Notable for its short fuse. Very short.'],
    ['Stalactite pendulums', 'Drip. Drip. Drip. Tick.'],
  ],
  factory: [
    ['Overclocked belts', 'Doing laps around the competition.'],
    ['Interchangeable gears', 'One size fits all, if you hit it hard enough.'],
    ['Night-shift robots', 'They never glance at the clock. They are the clock.'],
    ['Assembly arm upgrade', 'Finger quotas are strictly enforced.'],
    ['Just-in-time production', 'Delivered five minutes before it was ordered.'],
    ['Lean tick management', 'Eliminating wasted seconds, one lunch break at a time.'],
    ['Automated quality control', 'Rejects any clock that arrives late. All of them.'],
    ['Planned obsolescence', 'Everything breaks eventually. Usually on a Tuesday.'],
  ],
  bank: [
    ['Compound interest', 'The eighth wonder of the world, and the first of the ninth.'],
    ['Savings accounts', 'Slow, steady, and dull by design.'],
    ['Time deposits', 'Please do not withdraw before the stated minute.'],
    ['Overnight loans', 'Rates are higher after midnight.'],
    ['Hedge funds', 'Betting on both the past and the future.'],
    ['Futures trading', 'Buy low, sell yesterday.'],
    ['Quantitative easing', 'Seconds are printed in the back room.'],
    ['Gold standard clocks', 'Every second backed by one real gram of brass.'],
  ],
  temple: [
    ['Sundial altars', 'Praise the light, mind the shadow.'],
    ['Chanted hours', 'Matins, lauds, prime, terce, and so on.'],
    ['Candle clocks', 'Burns down at a very reasonable pace.'],
    ['Stained-glass dials', 'Each pane shows a different time zone.'],
    ['Pilgrim schedules', 'Please arrive in order of your appointment.'],
    ['Eternal flame timers', "It's been on hold for ages."],
    ['Hymn cadence', 'Four chimes to the verse.'],
    ['Reincarnation pass', 'Valid for any lifetime. Terms apply.'],
  ],
  warlock: [
    ['Hourglass wands', "Sand is a sorcerer's best friend."],
    ['Eldritch incantations', 'Essentially formatted as bureaucracy.'],
    ['Astral calendars', 'Marked with eclipses and dentist appointments.'],
    ['Pointy hats', 'Funnels the cosmic energy straight up.'],
    ['Owl-clock familiars', 'Hoo knows what time it is.'],
    ['Moonlit rituals', 'Twice a month, plus overtime.'],
    ['Reality-warping spellbooks', 'Reading may alter your age.'],
    ['HOA exemption', 'Space-time continuum waivers, pre-approved.'],
  ],
  satellite: [
    ['Solar panels', 'Sunlight: free. Seconds: priceless.'],
    ['Cesium reservoirs', 'Nine billion oscillations a second, and not one of them idle.'],
    ['Redundant atomic clocks', 'If one is wrong, the other two outvote it.'],
    ['Geosynchronous orbit', 'Always above you. Never watching. Probably.'],
    ['Relativity correction', 'Einstein would like a word. He has all the time.'],
    ['Laser uplink', 'Delivers the time at, well, the speed of light.'],
    ['Space station dock', 'Check in, check the time, check out.'],
    ['Constellation network', 'A hundred little clocks, all agreeing on one second.'],
  ],
  observatory: [
    ['Brass telescopes', 'Zoom in on the second.'],
    ['Star charts', 'Navigating by the stars and the schedule.'],
    ['Orrery gears', 'The planets, on a tiny little spring.'],
    ['Eclipse log', 'Noon, but briefly dramatic.'],
    ['Pulsar metronomes', 'Reliable. Absurdly so.'],
    ['Zodiac scheduling', 'Mercury is in retrograde; the meeting is moved.'],
    ['Deep-space dials', 'Light-years are just really long minutes.'],
    ['Cosmic calendar', 'The universe has been in session for 13.8 billion years.'],
  ],
  portal: [
    ['Clockwork gateways', 'A door, but with more ticks.'],
    ['Interdimensional imports', 'Customs are strict about gears.'],
    ['Rift calibration', 'Tuned to a parallel time zone.'],
    ['Paradox filters', 'Stops you meeting yourself. Mostly.'],
    ['Multiverse mailing list', 'Reply-all, across every universe.'],
    ['Timeline merger', 'Several versions of you are now a team.'],
    ['Void tuning forks', 'Resonates with the hum between worlds.'],
    ["Eternal clock o' clock", "It is, at last, always clock o' clock."],
  ],
};

// Cursor upgrades have their own prices (they follow the wiki's list exactly).
// kind 'double': clicking and cursors twice as efficient. 'fingers': +0.1 per non-cursor building
// (multiplied by `mul` for every later tier).
const CURSOR_UPGRADES = [
  ['Steel-tipped finger', 1, 100, 'double', 0, 'Pointing, but with conviction.'],
  ['Anti-cramp balm', 1, 500, 'double', 0, 'Clock-watching is a contact sport.'],
  ['Ambidexterity', 10, 10000, 'double', 0, 'Left hand, right hand, no hands. Wait.'],
  ['Thousand hands', 25, 100000, 'fingers', 1, 'Tick tick tick tick tick...'],
  ['Million hands', 50, 10e6, 'fingers', 5, 'Each one points at a different hour.'],
  ['Billion hands', 100, 100e6, 'fingers', 10, 'The minute hand has noticed you.'],
  ['Trillion hands', 150, 1e9, 'fingers', 20, 'Time does not so much fly as get poked.'],
  ['Quadrillion hands', 200, 10e9, 'fingers', 20, 'The clock face has developed a nervous tic.'],
];

export const UPGRADES = [];
CURSOR_UPGRADES.forEach(([name, req, cost, kind, mul, quote], i) => UPGRADES.push({
  id: 'cursor-' + i, name, b: 'cursor', req, cost, kind, mul, tier: i, quote,
  desc: kind === 'double'
    ? 'Clicking and cursors are twice as efficient.'
    : mul === 1 ? 'Clicking and cursors gain <b>+0.1 seconds</b> for each non-cursor building owned.'
      : `Multiplies the gain from Thousand hands by <b>${mul}</b>.`,
}));
for (const [bid, list] of Object.entries(TIERS)) {
  const b = BUILDINGS.find((x) => x.id === bid);
  list.forEach(([name, quote], i) => UPGRADES.push({
    id: `${bid}-${i}`, name, b: bid, req: TIER_REQ[i], cost: b.base * TIER_MULT[i], kind: 'tier', tier: i, quote,
    desc: `${b.plural} are twice as efficient.`,
  }));
}
export const UPGRADE = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

// ====================================================================
// achievements
// ====================================================================
// A.check(state, ctx): ctx = { sps, buildings, variety, upgrades, achievements }
const A = [];
const add = (id, name, desc, glyph, tier, check, quote) => A.push({ id, name, desc, glyph, tier, check, quote });
// rows: [threshold, name, quote]
const ladder = (prefix, glyph, rows, descFn, check) =>
  rows.forEach(([n, name, quote], i) => add(prefix + n, name, descFn(n), glyph, i, (g, c) => check(g, c, n), quote));

// -- clicking
ladder('click', 'cursor', [
  [1, 'Tick', 'The first step is the hardest.'],
  [100, 'Tock', 'And so we begin a very long sentence.'],
  [1000, 'Clockwork fingers', 'You could do this in your sleep. You might have.'],
  [10000, 'Repetitive strain', 'Your doctor has several questions.'],
  [100000, 'Carpal tunnel vision', 'You see only the clock now.'],
  [1000000, 'A million little ticks', 'Death by a million papercuts, delayed.'],
], (n) => `Click the clock <b>${n$(n)}</b> ${n === 1 ? 'time' : 'times'}.`, (g, c, n) => g.all.clicks >= n);
ladder('rapid', 'cursor', [
  [5, 'Quick draw', 'Fastest finger in the west wing.'],
  [10, 'Trigger finger', 'The clock flinches.'],
  [15, 'Blur', 'Witnesses report only a smear.'],
], (n) => `Click the clock <b>${n}</b> times in one second.`, (g, c, n) => g.all.rapid >= n);

// -- time wound back, all time
ladder('wound', 'hourglass', [
  [MIN, 'Borrowed time', 'Terms and conditions apply.'],
  [HOUR, 'Overtime', 'Technically unpaid.'],
  [DAY, 'Another day', 'Same as the last one, but longer.'],
  [WEEK, 'Week-end', 'The weekend, which you have extended indefinitely.'],
  [30 * DAY, 'A month of Sundays', "Not even Monday can reach you now."],
  [YEAR, 'Annual leave', 'Use it or lose it. You used it.'],
  [10 * YEAR, 'Decade dance', 'The clock tower has been repainted twice.'],
  [100 * YEAR, 'Centenarian', 'Receiving a letter from the King.'],
  [1000 * YEAR, 'Millennial', 'Do not try to explain smartphones to the past.'],
  [10000 * YEAR, 'Ice age', 'The glaciers are on a very tight schedule.'],
  [100000 * YEAR, 'Written in stone', 'The pyramids are, comparatively, quite new.'],
  [1e6 * YEAR, 'Million-year-old clock', 'Rust never sleeps. Neither do you.'],
  [1e8 * YEAR, 'Dinosaur o’clock', 'Please keep the tail out of the clock tower.'],
  [1e9 * YEAR, 'Billions and billions', 'Carl Sagan would be so proud. And so confused.'],
  [13.8e9 * YEAR, 'The age of the universe', 'You have, indeed, wound back the whole thing.'],
], (n) => `Wind back <b>${dur$(n)}</b> in total.`, (g, c, n) => g.all.earned >= n);

// -- seconds wound back per second
ladder('rate', 'bolt', [
  [1, 'Break even', 'Barely holding steady.'],
  [10, 'Ahead of schedule', 'The clock is looking nervous.'],
  [100, 'Time dilation', 'Einstein would approve, mostly.'],
  [1000, 'Temporal anomaly', 'Reality is mildly inconvenienced.'],
  [10000, 'Chronoclasm', 'Calendars everywhere flicker.'],
  [100000, 'Paradox pending', 'Several cats are in several boxes.'],
  [1e6, 'Hour a heartbeat', 'The pace is, frankly, unsustainable.'],
  [1e7, 'A day at a time', 'Midnight is a distant memory.'],
  [1e8, 'Rewind engine', 'Every second goes the wrong way. Right way.'],
  [1e9, 'A year per second', 'Calendars are being printed in bulk.'],
], (n) => `Wind back <b>${n$(n)}</b> ${n === 1 ? 'second' : 'seconds'} per second.`, (g, c, n) => c.sps >= n - 1e-9);

// -- time on the clock at once
ladder('bank', 'clock', [
  [5 * MIN, 'Five more minutes', 'Famous last words, all night.'],
  [HOUR, 'Sleeping in', 'The alarm is still ringing, somewhere.'],
  [DAY, 'Day off', 'No plans. No guilt.'],
  [WEEK, 'Sabbatical', 'Back when the clock catches up.'],
  [30 * DAY, 'Long weekend', 'Thirty days, hath September.'],
  [YEAR, 'Gap year', 'Finding yourself, then losing the map.'],
  [10 * YEAR, 'Early retirement', 'The clock has stopped bothering you.'],
  [100 * YEAR, 'Time millionaire', 'Do not spend it all in one place.'],
  [1000 * YEAR, 'Thousand-year plan', 'It is not even a long-term plan.'],
], (n) => `Have <b>${dur$(n)}</b> on the clock at once.`, (g, c, n) => g.run.bank >= n);

// -- survive one life for this long
ladder('life', 'heart', [
  [10 * MIN, 'Still here', 'Midnight remains patient.'],
  [HOUR, 'An hour of calm', 'Nothing bad has happened. Yet.'],
  [6 * HOUR, 'Long haul', 'You have forgotten what the sun looks like.'],
  [DAY, 'A full day', 'The clock has grown fond of you.'],
  [WEEK, 'Midnight deferred', 'A week! The clock is out of ideas.'],
], (n) => `Survive for <b>${dur$(n)}</b> without striking midnight.`, (g, c, n) => g.run.time >= n);

// -- total time played
ladder('play', 'clock', [
  [10 * MIN, 'Settling in', 'It looks like you came to stay.'],
  [HOUR, 'Time flies', 'Mostly backwards.'],
  [10 * HOUR, 'Dedicated', 'The clock is pleased.'],
  [100 * HOUR, 'Clockwork resident', 'The clock thinks of you as family.'],
], (n) => `Play for <b>${dur$(n)}</b> in total.`, (g, c, n) => g.all.playTime >= n);

// -- being away (the clock keeps running while the tab is in the background)
ladder('away', 'clock', [
  [MIN, 'Out of office', 'Back in five minutes. Probably.'],
  [HOUR, 'Gone fishing', 'The clock managed fine without you.'],
  [DAY, 'Left it running', 'And running. And running.'],
], (n) => `Keep the game running in the background for <b>${dur$(n)}</b>.`, (g, c, n) => g.all.awayTime >= n);

// -- total time spent in the store
ladder('spent', 'hourglass', [
  [HOUR, 'Shopaholic', 'An hour well spent. On other hours.'],
  [YEAR, 'Big spender', 'Well, time is money.'],
  [1000 * YEAR, 'Time baron', 'You own most of the minutes.'],
], (n) => `Spend <b>${dur$(n)}</b> in total.`, (g, c, n) => g.all.spent >= n);

// -- the buildings
const cursorRows = [
  [1, 'Point and click', 'Point. Click. Repeat.'],
  [10, 'Double-click', 'Twice as nice.'],
  [25, 'Point taken', 'A rather sharp one.'],
  [50, 'Full circle', 'A complete ring around the clock.'],
  [100, 'Second ring', 'The clock is feeling surrounded.'],
  [200, 'Lord of the rings', 'One ring to wind them all.'],
  [300, 'Hand to hand', 'More than anyone can count.'],
];
ladder('cursor', 'hand', cursorRows, (n) => `Have <b>${n}</b> ${n === 1 ? 'cursor' : 'cursors'}.`, (g, c, n) => g.run.owned.cursor >= n);
ladder('nurse', 'nurse', [
  [1, 'Second opinion', 'The best kind.'],
  [5, 'House call', 'They come to you.'],
  [10, 'Night shift', 'Always on call, always on time.'],
  [25, 'Residency', 'Do not call them interns.'],
  [50, 'Teaching hospital', 'Everyone is learning, nobody is sleeping.'],
  [100, 'Board certified', 'They have framed it. All of them.'],
  [150, 'Clinic', 'A full waiting room, and a longer waiting list.'],
  [200, 'Medical marvel', 'Studied in journals, feared in schedules.'],
  [250, 'A wing of their own', 'Complete with a smaller, lesser wing.'],
  [300, 'Florence would be proud', 'And a little scared.'],
], (n) => `Have <b>${n}</b> ${n === 1 ? 'nurse' : 'nurses'}.`, (g, c, n) => g.run.owned.nurse >= n);

const COUNTS = [1, 50, 100, 150, 200, 250];
const bld = (id, noun, names) => ladder(id, 'b:' + id,
  COUNTS.map((n, i) => [n, names[i][0], names[i][1]]),
  (n) => `Have <b>${n}</b> ${n === 1 ? noun[0] : noun[1]}.`,
  (g, c, n) => g.run.owned[id] >= n);
bld('farm', ['clock farm', 'clock farms'], [
  ['Sprout', 'Aw, shucks. Aw, ticks.'],
  ['Green thumb', 'Mostly green, a little brass.'],
  ['Seedy business', 'Do not ask where the seeds came from.'],
  ['Agricultural revolution', 'Everything is, suddenly, on time.'],
  ['Harvest moon', 'Reaped at exactly midnight. Obviously.'],
  ['Breadbasket of hours', 'Feeding a hungry universe.'],
]);
bld('mine', ['clock mine', 'clock mines'], [
  ['Into the dark', 'Careful. It is a long way down.'],
  ['Hard rock', 'You may feel the walls humming.'],
  ['Pickaxe pioneer', 'Strike the earth. Strike the hour.'],
  ['Dig deeper', 'Something is ticking down here.'],
  ['Motherlode', 'The vein stretches back to the Bronze Age.'],
  ['Hollow earth', 'There is a clock tower at the centre. Of course there is.'],
]);
bld('factory', ['clock factory', 'clock factories'], [
  ['Assembly required', 'Instructions not included.'],
  ['Mass production', 'Clocks by the cartload.'],
  ['Industrial revolution', 'The smoke has a rhythm to it.'],
  ['Hands on', 'Thirty percent of the workforce is, in fact, a hand.'],
  ['Smokestack skyline', 'The horizon is a very busy place.'],
  ['Automated everything', 'Even the lunch break is on a timer.'],
]);
bld('bank', ['bank', 'banks'], [
  ['Open an account', 'Please take a number. Any number.'],
  ['Savings and loan', 'Mostly savings. Mostly.'],
  ['Prime time', 'The interest rate is, rather literally, high.'],
  ['Too big to fail', 'The clock fails first.'],
  ['Money market', 'Where time is traded at a premium.'],
  ['Reserve of the realm', 'Gold bars, but in every size of second.'],
]);
bld('temple', ['temple', 'temples'], [
  ['Holy ground', 'Please remove your watch.'],
  ['Small miracle', 'It seems to be right on time.'],
  ['Pilgrimage site', 'The queue is very reverent.'],
  ['Church of the clock', 'We gather every hour, on the hour.'],
  ['Divine intervention', 'The gods have a very packed schedule.'],
  ['Eternal rest', 'Which, naturally, is on hold.'],
]);
bld('warlock', ['warlock house', 'warlock houses'], [
  ['Apprentice', 'Hat sold separately.'],
  ['Spell check', 'No red squiggles, for once.'],
  ['Circle of friends', 'And an extremely dangerous potluck.'],
  ['Cursed community', 'The HOA newsletter is somewhat ominous.'],
  ['Arcane avenue', 'Street parking is, however, a problem.'],
  ['Wizard’s council', 'Chair of the board: a disembodied voice.'],
]);
bld('satellite', ['satellite', 'satellites'], [
  ['Liftoff', 'Ten, nine, eight... wait, what time is it?'],
  ['Low Earth orbit', 'Lots of traffic up here, and all of it is punctual.'],
  ['Space junk', 'Every piece of it is still right on schedule.'],
  ['Geostationary', 'Fixed overhead. Fixed on time.'],
  ['Constellation', 'Named after you, eventually.'],
  ['Swarm', 'The sun is, mildly, inconvenienced.'],
]);
bld('observatory', ['observatory', 'observatories'], [
  ['Stargazer', 'Look up. Keep looking up.'],
  ['Night watch', 'Clear skies, tonight and forever.'],
  ['Constellation prize', 'Congratulations, you have a plaque.'],
  ['Deep field', 'Thousands of galaxies, all running late.'],
  ['Event horizon', 'Time is slightly weirder here.'],
  ['Cosmic observer', 'The universe waves back.'],
]);
bld('portal', ['portal', 'portals'], [
  ['Doorway', 'Please mind the gap. And the dimension.'],
  ['Rift valley', 'It is, somehow, both cold and humid.'],
  ['Gateway to everywhere', 'Everywhere is full of clocks.'],
  ['Dimensional tourism', 'Souvenir clocks make the best gifts.'],
  ['Parallel parking', 'Do not park in the wrong timeline.'],
  ['Clock o’ clock', 'It is now, finally, always clock o’ clock.'],
]);

// -- total buildings, variety, upgrades, achievements, deaths, close calls
ladder('bld', 'clock', [
  [10, 'Landlord', 'Rent is due, in seconds.'],
  [50, 'Property mogul', 'Do not pass go. Do pass midnight.'],
  [100, 'City planner', 'Zoning laws remain, mysteriously, suspended.'],
  [250, 'Metropolis', 'It never sleeps. It never stops ticking.'],
  [500, 'Empire', 'The sun never sets. Because you asked it not to.'],
  [1000, 'Civilization', 'Please print more calendars.'],
], (n) => `Own <b>${n$(n)}</b> buildings in total.`, (g, c, n) => c.buildings >= n);
ladder('variety', 'clock', [
  [3, 'Diversified', 'Do not put all your clocks in one basket.'],
  [5, 'Well-rounded', 'A nice mix of cuckoo and grandfather.'],
  [8, 'Renaissance clock', 'An expert at many things, all of them about time.'],
  [11, 'Full roster', 'One of everything. For the team photo.'],
], (n) => `Own at least one of <b>${n}</b> different building types.`, (g, c, n) => c.variety >= n);
ladder('upg', 'bolt', [
  [1, 'Upgrade', 'Plus one. In every possible way.'],
  [5, 'Handyman', 'Duct tape, mostly.'],
  [20, 'Tinkerer', 'The manual was more of a suggestion.'],
  [50, 'Mad scientist', 'It is alive! And a little late.'],
  [75, 'Mastermind', 'Everything is going exactly according to schedule.'],
], (n) => `Own <b>${n}</b> ${n === 1 ? 'upgrade' : 'upgrades'}.`, (g, c, n) => c.upgrades >= n);
ladder('ach', 'clock', [
  [10, 'Making progress', 'One small step for a clock.'],
  [25, 'Overachiever', 'Please stop, you are making the others look bad.'],
  [50, 'Completionist', 'There are still more of these, you know.'],
  [100, 'Trophy room', 'A shelf is simply not enough.'],
  [150, 'Hall of fame', 'You have, as they say, a lot of time on your hands.'],
], (n) => `Unlock <b>${n}</b> achievements.`, (g, c, n) => c.achievements >= n);
ladder('death', 'moon', [
  [1, 'Midnight snack', 'Midnight was, apparently, hungry.'],
  [5, 'Groundhog night', 'Same night. Same clock. Different you.'],
  [10, 'Creature of habit', 'Midnight and you are on a first-name basis.'],
  [25, 'Nine lives, and then some', 'Yet here you are.'],
], (n) => `Let the clock strike midnight ${n === 1 ? 'once' : `<b>${n}</b> times`}.`, (g, c, n) => g.all.deaths >= n);
add('close3', 'Close shave', 'Let the clock get within <b>3 seconds</b> of midnight, then climb back to a full minute.', 'heart', 1, (g) => g.run.saved3, 'Your hair is a little whiter.');
add('close1', 'By a hair', 'Let the clock get within <b>1 second</b> of midnight, then climb back to a full minute.', 'heart', 2, (g) => g.run.saved1, 'Someone just got a lot older.');

// -- miscellaneous
add('menu-stats', 'Self-assessment', 'Open the Stats menu.', 'clock', 0, (g) => g.all.menus.stats, 'Numbers! And more numbers.');
add('menu-options', 'Under the hood', 'Open the Options menu.', 'clock', 0, (g) => g.all.menus.options, 'Fiddle with the dials. Gently.');
add('menu-info', 'Read the manual', 'Open the Info menu.', 'clock', 0, (g) => g.all.menus.info, 'Nobody does. Except you.');
add('menu-mythos', 'Behind the curtain', 'Open the Mythos menu.', 'clock', 0, (g) => g.all.menus.mythos, 'The curtain does not move. But it was looking at you.');
ladder('news', 'clock', [
  [1, 'Headline reader', 'Extra, extra!'],
  [50, 'Tabloid addiction', 'You can stop whenever you like. Probably.'],
  [200, 'Fake news', 'You have personally read every possible headline. Twice.'],
], (n) => `Click the news ticker <b>${n}</b> ${n === 1 ? 'time' : 'times'}.`, (g, c, n) => g.all.newsClicks >= n);
add('save1', 'Better safe than sorry', 'Save the game yourself.', 'clock', 0, (g) => g.all.saves >= 1, 'The game saves every thirty seconds, but you did not know that.');
add('export1', 'Backup plan', 'Export your save.', 'clock', 1, (g) => g.all.exports >= 1, 'A copy in a safe place. A very small safe.');
add('import1', 'Time traveler', 'Import a save.', 'clock', 1, (g) => g.all.imports >= 1, 'Back from the future. Or the past. Hard to tell.');
add('sell1', "Buyer's remorse", 'Sell a building.', 'cursor', 0, (g) => g.all.sold >= 1, 'It seemed like a good idea at the time.');
add('sell100', 'Clearance sale', 'Sell <b>100</b> buildings.', 'cursor', 2, (g) => g.all.sold >= 100, 'Everything must go. Including the doorknob.');
add('night', 'Night owl', 'Play between midnight and 4 AM, your time.', 'moon', 0, (g, c) => c.hour < 4, 'It is, at this hour, very late. Even for a clock.');
add('witching', 'The witching hour', 'Play within five minutes of midnight, your time.', 'moon', 2, (g, c) => c.hour === 0 && c.minute < 5, 'The real midnight. Do try not to die.');
add('dawn', 'Early bird', 'Play between 5 and 7 AM, your time.', 'clock', 0, (g, c) => c.hour >= 5 && c.hour < 7, 'Catching the worm. And the schedule.');

export const ACHIEVEMENTS = A;
export const ACHIEVEMENT = Object.fromEntries(A.map((a) => [a.id, a]));

// ====================================================================
// syrup
// ====================================================================
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

// ====================================================================
// news
// ====================================================================
export function newsPool(g, sps) {
  const o = g.run.owned;
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
    'Local tabloid reports on itself. Readers unsure how to feel.',
    "You won't believe what this clock did next. (It ticked.)",
  ];
  if (o.cursor > 0) n.push(
    'Cursors seen circling the clock "like tiny, polite vultures."',
    'Pointing at things now officially counts as work.',
    'Hand union demands breaks; told breaks "would take time."',
  );
  if (o.cursor >= 50) n.push('A complete ring of hands now orbits the clock. Astronomers are furious.');
  if (o.nurse > 0) n.push(
    'Hospitals report staffing shortage; all missing nurses last seen standing near a clock.',
    'Nurse prescribes "two seconds, twice daily."',
    'New study: a second a day keeps midnight away.',
    "Nurses' union demands overtime pay, is told overtime \"doesn't exist anymore.\"",
  );
  if (o.nurse >= 10) n.push('"We\'re not even sure what we\'re treating," admits head nurse. "But it\'s working."');
  if (o.farm > 0) n.push(
    'Local farmer harvests a record crop of alarm clocks; neighbors "woke up fast."',
    'Scarecrow reportedly "just a very tall hour hand."',
    'Experts baffled as clocks bloom in the middle of winter. "It is, apparently, their season."',
  );
  if (o.mine > 0) n.push(
    'Miners strike gold, then brass, then a very confused grandfather clock.',
    'Mine collapses; no one hurt, but everyone is "about two hours behind."',
    'Geologists confirm: the deeper you dig, the later it gets.',
  );
  if (o.factory > 0) n.push(
    'Factory output up 30 percent; workers "now have more hand to give."',
    'Clock factory unveils new model: "Same as the old one, but louder."',
    'Assembly line shuts down for lunch, resumes the very second it ends.',
  );
  if (o.bank > 0) n.push(
    'World economy officially switches to temporal currency; inflation measured in minutes.',
    'Bank robber demands "all of your seconds." Bank complies.',
    'Stock market hits record high, quickly followed by record "just a moment ago."',
  );
  if (o.temple > 0) n.push(
    'Temple bells ring out at every hour, and also at a few that do not exist.',
    'Local pilgrims report "an overwhelming feeling of being on hold."',
    'High priest declares today "the first day of next week."',
  );
  if (o.warlock > 0) n.push(
    'Warlock house receives its fourth noise complaint this week; "it\'s the time-space continuum again."',
    'HOA fines resident for "unlicensed levitation and a rogue Tuesday."',
    'Spellbook returned to library 300 years late. Fine waived, because time is weird.',
  );
  if (o.satellite > 0) n.push(
    'Satellite beams down the exact time; ground crews "feel oddly judged."',
    'Space agency confirms: the atomic clocks are fine, the astronauts are "about a second older."',
    'Orbiting clocks report that, up there, "everything is a little faster."',
  );
  if (o.observatory > 0) n.push(
    'Astronomers discover a new star; it is, they say, "pretty fashionably late."',
    'Telescope turned on neighbor\'s clock tower. "Strictly for science."',
    'Comet arrives right on time, which is, frankly, suspicious.',
  );
  if (o.portal > 0) n.push(
    "Portal opens in downtown; out steps a man who says he's \"late. Very late.\"",
    'Interdimensional clocks agree on one thing: it is, always, clock o\' clock.',
    'Customs seizes shipment of "forbidden hours." Hours say they have rights.',
  );
  if (g.run.bank < 15) n.push('URGENT: midnight imminent. Citizens advised to click.', 'Experts recommend "clicking the clock, like, right now."');
  if (sps >= 1) n.push('Clock appears to be running backwards. Owners describe it as "fine, actually."');
  if (g.run.bank >= 3600) n.push('Bedtime postponed indefinitely. Children rejoice.');
  if (g.run.bank >= 86400) n.push('Local clock is now behind by more than a day. "Yesterday called," it says. "It wants its hour back."');
  if (g.run.bank >= 31536000) n.push('Calendar company announces "a surprising number of extra pages."');
  if (g.all.deaths > 0) n.push('Witnesses claim the clock struck midnight, then "un-struck" it.', 'Ghost reports "unfinished business, mostly clicking."');
  return n;
}

// ====================================================================
// changelog
// ====================================================================
export const CHANGELOG = [
  {
    v: '0.3.1',
    date: 'October 10, 2026',
    notes: [
      'Added the <b>Satellite</b> (5.1 billion seconds, 260,000/s), which stores atomic clocks in orbit. It has eight upgrades, six achievements, and a view of the Earth.',
      'The <b>Observatory</b> now sits where the Alchemy Lab would: 75 billion seconds, 1.6 million/s.',
      'The "Full roster" achievement now wants one of all eleven buildings.',
    ],
  },
  {
    v: '0.3.0',
    date: 'October 10, 2026',
    notes: [
      'Eight new buildings: <b>Clock Farm</b>, <b>Clock Mine</b>, <b>Clock Factory</b>, <b>Bank</b>, <b>Temple</b>, <b>Warlock House</b>, <b>Observatory</b> and <b>Portal</b>. Each has its own ward, hall, or dimension in the middle panel.',
      'Upgrades! Tiered upgrades for every building double its output, and a new line of Hand upgrades makes clicking and cursors stronger.',
      'More than a hundred new achievements, every one with something to say.',
      'The <b>news</b> ticker can be clicked. It will tell you something else.',
      'The clock keeps running while you are in another tab. Close the tab, and it waits for you.',
      'The game saves itself every 30 seconds.',
    ],
  },
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
      'Added achievements, statistics and <b>Syrup</b>, which seeps out beneath the clock.',
      'The Mythos is sealed. For now.',
    ],
  },
];

// ====================================================================
// nurse names
// ====================================================================
const FIRST = ['Jennifer', 'Jessica', 'Sarah', 'Emily', 'Amanda', 'Ashley', 'Megan', 'Lauren', 'Rebecca', 'Michelle', 'Laura', 'Karen', 'Susan', 'Linda', 'Mary', 'Patricia', 'Barbara', 'Nancy', 'Lisa', 'Heather', 'Amy', 'Melissa', 'Stephanie', 'Rachel', 'Angela', 'Kelly', 'Christine', 'Elizabeth', 'Julie', 'Katie'];
const LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Baker', 'Turner', 'Parker', 'Collins', 'Cooper'];
export function randomName(taken = []) {
  for (let i = 0; i < 40; i++) {
    const name = `${FIRST[Math.floor(Math.random() * FIRST.length)]} ${LAST[Math.floor(Math.random() * LAST.length)]}`;
    if (!taken.includes(name)) return name;
  }
  return `${FIRST[Math.floor(Math.random() * FIRST.length)]} ${LAST[Math.floor(Math.random() * LAST.length)]}`;
}

// ====================================================================
// helpers
// ====================================================================
// "13 years", "1 minute", "13.8 billion years": used in achievement descriptions
function dur$(s) {
  if (s >= YEAR * 1e6) {
    const y = s / YEAR;
    return y >= 1e9 ? `${+(y / 1e9).toFixed(1)} billion years` : y >= 1e6 ? `${+(y / 1e6).toFixed(1)} million years` : `${n$(y)} years`;
  }
  const U = [['year', YEAR], ['week', WEEK], ['day', DAY], ['hour', HOUR], ['minute', MIN], ['second', 1]];
  for (const [name, v] of U) {
    if (s >= v && s % v === 0) { const k = s / v; return `${n$(k)} ${name}${k === 1 ? '' : 's'}`; }
  }
  for (const [name, v] of U) if (s >= v) { const k = Math.round(s / v); return `${n$(k)} ${name}${k === 1 ? '' : 's'}`; }
  return `${s} seconds`;
}
