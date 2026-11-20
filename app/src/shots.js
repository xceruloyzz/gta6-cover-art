// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample photo loaded;
// ?shot=cover shows the finished cover alone, edge to edge, at its export size.
// Query knobs: layout, grade, size, title, subtitle, tagline, titleStyle, frame,
// photo and photo2 pick the sample photos (samples/<name>.jpg).
// window.__shotReady is set once the scene has painted, so a screenshot can wait for it.

import { drawCover, LAYOUTS, GRADES, SIZES, TITLE_STYLES, blankPanel } from './cover.js';

function readScene(query) {
  const scene = {};
  if (query.get('layout') && LAYOUTS[query.get('layout')]) scene.layout = query.get('layout');
  if (query.get('grade') && GRADES[query.get('grade')]) scene.grade = query.get('grade');
  if (query.get('size') && SIZES[query.get('size')]) scene.size = query.get('size');
  if (query.get('title') !== null) scene.title = query.get('title');
  if (query.get('subtitle') !== null) scene.subtitle = query.get('subtitle');
  if (query.get('tagline') !== null) scene.tagline = query.get('tagline');
  if (query.get('titleStyle')) scene.titleStyle = query.get('titleStyle');
  if (query.get('frame')) scene.frame = query.get('frame') !== '0';
  return scene;
}

export async function runShot(shot, query, api) {
  const { state, loadImage } = api;
  Object.assign(state, readScene(query));

  // Load the named samples into the first photo slots, in order.
  const names = [query.get('photo') ?? 'pier', query.get('photo2') ?? 'boulevard'];
  state.photos = [];
  for (const name of names) {
    const img = await loadImage(`samples/${name}.jpg`);
    state.photos.push({ img, name: `${name}.jpg`, thumb: `samples/${name}.jpg` });
  }
  // Spread the photos across the layout's panels: the first photo in the hero slot,
  // the second in the rest, so one shot shows a multi-photo cover.
  state.panels = Array.from({ length: 9 }, () => blankPanel());
  const count = { 'hero-trio': 4, quad: 4, 'strip-three': 3, 'full-bleed': 1, tilted: 3, mosaic: 9 }[state.layout] ?? 4;
  for (let i = 0; i < count; i += 1) {
    state.panels[i].photo = i === 0 ? 0 : 1;
  }
  if (state.layout === 'mosaic') {
    for (let i = 0; i < 9; i += 1) state.panels[i].photo = i % 2;
  }
  if (state.layout === 'tilted') {
    state.panels[1].photo = 0;
    state.panels[2].photo = 1;
  }
  // Where one photo fills several panels, crop each panel differently, so the
  // cover reads as a contact sheet rather than the same frame repeated.
  const crops = [
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1.5, ox: 0, oy: -0.14 },
    { zoom: 1.15, ox: 0.08, oy: 0.06 },
    { zoom: 1.9, ox: -0.08, oy: 0.12 },
    { zoom: 1.3, ox: 0, oy: -0.08 },
    { zoom: 1.7, ox: 0.1, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1.45, ox: -0.06, oy: -0.1 },
    { zoom: 1.25, ox: 0.05, oy: 0.08 },
  ];
  state.panels.forEach((panel, i) => {
    if (panel.photo >= 0) Object.assign(panel, crops[i % crops.length]);
  });

  // Keep the editor's text fields in sync with the scene.
  const titleInput = document.getElementById('titleInput');
  const subtitleInput = document.getElementById('subtitleInput');
  const taglineInput = document.getElementById('taglineInput');
  if (titleInput) titleInput.value = state.title;
  if (subtitleInput) subtitleInput.value = state.subtitle;
  if (taglineInput) taglineInput.value = state.tagline;
  document.getElementById('frameToggle').checked = state.frame !== false;
  document.querySelectorAll('.layout-btn').forEach((b, i) => {
    b.setAttribute('aria-pressed', String(Object.keys(LAYOUTS)[i] === state.layout));
  });
  document.querySelectorAll('.grade-btn').forEach((b, i) => {
    b.setAttribute('aria-pressed', String(Object.keys(GRADES)[i] === state.grade));
  });
  document.querySelectorAll('.size-btn').forEach((b, i) => {
    b.setAttribute('aria-pressed', String(Object.keys(SIZES)[i] === state.size));
  });
  document.querySelectorAll('#titleStyleRow .chip').forEach((b, i) => {
    b.setAttribute('aria-pressed', String(Object.keys(TITLE_STYLES)[i] === state.titleStyle));
  });

  await Promise.all([
    document.fonts.load('900 100px "Cover Display"'),
    document.fonts.load('900 100px "Cover Script"'),
  ]).catch(() => {});

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = SIZES[state.size];
    const canvas = document.getElementById('preview');
    drawCover(canvas, state, { fixedSize: { w: size.w, h: size.h } });
  } else {
    api.renderSlots();
    api.renderPanelPhotoSelect();
    api.redraw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
