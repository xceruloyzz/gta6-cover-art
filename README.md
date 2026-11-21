# Neon Boulevard — GTA-style Cover Maker

[![Make.fun — gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/xceruloyzz/gta6-cover-art/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/xceruloyzz/gta6-cover-art/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An offline web app that turns your photos and a caption into GTA-style multi-panel
cover art — a Vice City sunset or neon colour grade, bold condensed lettering, and a
PNG export in the common post sizes. Your photos never leave your machine.

## Try it

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome.

## What it does

- **Any photo** — add up to four of your own photos (or try the two built-in samples),
  and fill several panels with one photo or several.
- **Crop and position per panel** — click a panel to select it, drag its photo to move
  it, scroll or use the slider to zoom, and pick which photo each panel shows.
- **Six layouts** — Hero Trio, Quad Grid, Strip Three, Full Bleed, Tilted Snaps and
  Mosaic Nine, the classic multi-panel poster look.
- **Five colour grades** — Vice Sunset, Neon Night, Miami Heat, Palm Noir and Golden
  Hour, each with film grain and a vignette.
- **Poster-ink treatment** — every graded photo is posterised into flat ink levels
  with darkened edge lines, so panels read as printed poster art, not photographs
  (it can be switched off in the caption controls).
- **Caption lettering** — a dedicated title block with a halftone strip, a huge
  gradient title (in three styles: sunset gradient, white block, neon glow), a
  script subtitle, a row of heat stars, a diagonal COVER STAR badge ribbon and a
  tracked-out tagline, all editable.
- **Fast export** — one click exports a PNG in 1080×1080, 1080×1350, 1920×1080 or
  the 1080×1920 story size, or all sizes at once.

## How it is built

- `app/` is plain static files with no build step: `index.html`, `style.css`, and ES
  modules under `app/src/` (`cover.js` draws the cover on canvas, `main.js` wires the
  editor, `shots.js` sets up fixed scenes for screenshots). No network request: every
  font and sample photo is a file under `app/`.
- The lettering uses Noto Sans Condensed Black and Noto Serif Display Black Italic,
  both under the SIL Open Font License (see `app/fonts/OFL.txt`). No Rockstar Games
  logo, wordmark, artwork or font is used anywhere; the design, city name and titles
  are invented.
- `main.ts` (Node 22, standard library only) hands the app in: it copies `app/` and
  `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored
  make.fun library in `vendor/makefun-app.ts`.

## Screenshots

`shots.json` lists the four screenshots in `screenshots/`: the exported landscape
cover first, then the editor with a photo loaded, then portrait and square covers.
Each is a genuine render of this app in headless Chrome, served from `app/` with
`node serve.ts`.

## License

MIT — see [LICENSE](LICENSE).
