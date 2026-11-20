// Neon Boulevard — the entrypoint for gta6-cover-art-01 (Node 22, standard library only).
//
// The app is plain static files under app/ (index.html plus its ES modules, fonts and
// sample photos; nothing loads over the network), and this program hands it in: it copies
// app/ and screenshots/ from beside this file into /output (or MAKEFUN_OUTPUT_DIR outside
// the grader) and writes /output/dossier.json with the vendored make.fun library, so the
// judge reads the app's source and screenshots from the dossier.
//
// Run it locally to check the hand-in:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Run it twice into two directories and diff them: the two runs must be byte-identical.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (the kit's reference/gate.json): text_max_bytes shapes the
// dossier's bytes; the other caps refuse an entry the scorer would refuse — more than 4
// screenshots or one over 256 KiB, more than 993 files in app/ or 48 MiB of app files in
// all, or a path under app/ over 1000 bytes — and app/ counts beside /output's own
// 1000-entry cap, which its screenshots/ and dossier.json share.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function handIn() {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
  }
  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_LIMITS));
}

handIn();
