# Clockie Clicker

It is one minute to midnight. Click the clock to wind its second hand back,
and spend the seconds you save on help. If the clock ever strikes twelve, you die.

An idle/clicker browser game in the spirit of *Cookie Clicker*. Plain HTML, CSS and
JavaScript modules, no build step. Every texture is pixel art generated at runtime
(`js/art.js`), with RotSprite-style rotation for the clock hands and cursors (`js/pixel.js`).

## Play locally

```bash
node dev-server.mjs
```

Then open http://localhost:5173. Art preview sheet: `/dev/art-sheet.html`.

## How it works

- **Time is the currency.** Your bank is the number of seconds left until midnight.
  The clock eats one second every second; clicking it gives one back.
- **Buildings** follow Cookie Clicker's pricing: `price = ceil(base × 1.15^owned)`,
  bulk buys sum the series, selling refunds 25%.
  - Cursor: 15 s, winds back 0.1 s/s. Pointing hands (assets/hand.png) orbit the clock in rings of 50; the arrow is for clicking.
  - Nurse: 90 s, winds back 1 s/s. Each has an ordinary name, and they get their own ward in the middle panel.
- **Achievements** fill the **Syrup** by 4% each; every 25 pours a new flavor.
- Time keeps passing while the tab is in the background (closing the tab pauses it). The game autosaves to `localStorage` every 30 seconds.

Console: `Clockie.state`, `Clockie.give(seconds)`, `Clockie.setOwned('farm', 10)`, `Clockie.buyUpgrade('farm-0')`.

## Layout

| file | what |
| --- | --- |
| `js/pixel.js` | pixel buffers, sprites, noise, dithering, 3x5 font, rotation |
| `js/art.js` | clock, clock hands, hand-cursor rotation, nurse, syrup jar, icons, wood and wallpaper textures |
| `js/data.js` | buildings, achievements, syrup flavors, news, changelog |
| `js/game.js` | state, loop, rendering, store, menus, saving |
