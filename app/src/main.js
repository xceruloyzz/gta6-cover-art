// Neon Boulevard's editor: photo slots, layout and grade pickers, caption fields, panel
// pan/zoom on the preview, and PNG export in the three post sizes. Photos are read on
// the user's own machine and never uploaded; a `?shot=` query instead sets up a fixed
// scene for a screenshot (see shots.js).

import { drawCover, layoutPanels, LAYOUTS, GRADES, SIZES, TITLE_STYLES, blankPanel } from './cover.js';
import { runShot } from './shots.js';

const preview = document.getElementById('preview');
const status = document.getElementById('status');
const filePicker = document.getElementById('filePicker');

/** The whole cover state; panels are indexed by layout slot (up to 9 for the mosaic). */
const state = {
  layout: 'hero-trio',
  grade: 'vice-sunset',
  size: '1080x1080',
  title: 'Sunset Heist',
  subtitle: 'Neon Bay nights',
  tagline: 'Est. 2026',
  titleStyle: 'sunset',
  frame: true,
  photos: [],
  panels: Array.from({ length: 9 }, () => blankPanel()),
  selected: 0,
};

let lastPanels = [];
let lastInner = { x: 0, y: 0, w: 0, h: 0 };

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  const size = SIZES[state.size];
  const scale = 760 / Math.max(size.w, size.h);
  preview.width = Math.round(size.w * scale);
  preview.height = Math.round(size.h * scale);
  const drawn = drawCover(preview, state, {
    preview: true,
    selected: state.selected,
    fixedSize: { w: preview.width, h: preview.height },
  });
  lastPanels = drawn.panels;
  lastInner = drawn.inner;
}

function setStatus(text) {
  status.textContent = text;
}

/* ---------- photo slots ---------- */

const slotsEl = document.getElementById('photoSlots');
let activeSlot = 0;

function renderSlots() {
  slotsEl.innerHTML = '';
  for (let i = 0; i < 4; i += 1) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = `slot${state.photos[i] ? ' filled' : ''}${activeSlot === i ? ' active' : ''}`;
    slot.title = state.photos[i] ? `Photo ${i + 1}: ${state.photos[i].name}` : `Add photo ${i + 1}`;
    if (state.photos[i]) slot.style.backgroundImage = `url("${state.photos[i].thumb}")`;
    else slot.textContent = '+';
    slot.addEventListener('click', (event) => {
      if (event.target.classList.contains('slot-x')) return;
      activeSlot = i;
      renderSlots();
      if (!state.photos[i]) filePicker.click();
    });
    if (state.photos[i]) {
      const remove = document.createElement('span');
      remove.className = 'slot-x';
      remove.textContent = '×';
      remove.title = 'Remove this photo';
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        removePhoto(i);
      });
      slot.appendChild(remove);
    }
    slotsEl.appendChild(slot);
  }
  renderPanelPhotoSelect();
}

function removePhoto(index) {
  state.photos.splice(index, 1);
  for (const panel of state.panels) {
    if (panel.photo === index) panel.photo = -1;
    else if (panel.photo > index) panel.photo -= 1;
  }
  if (activeSlot > 0 && activeSlot >= state.photos.length) activeSlot = state.photos.length - 1;
  renderSlots();
  redraw();
}

async function addPhotoFile(file, slotIndex) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  const photo = { img, name: file.name, thumb: url };
  state.photos[slotIndex] = photo;
  // Fill the first empty panel with the new photo, or the selected panel.
  const target = state.panels.findIndex((p) => p.photo === -1);
  const into = state.panels[state.selected]?.photo === -1 ? state.selected : target;
  if (into >= 0) state.panels[into].photo = slotIndex;
  activeSlot = slotIndex;
  renderSlots();
  redraw();
  setStatus(`Loaded ${file.name}.`);
}

filePicker.addEventListener('change', async () => {
  const file = filePicker.files[0];
  if (file) await addPhotoFile(file, activeSlot);
  filePicker.value = '';
});

document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', async () => {
    const name = button.dataset.sample;
    let free = state.photos.findIndex((p) => !p);
    if (free === -1) free = state.photos.length < 4 ? state.photos.length : 0;
    const img = await loadImage(`samples/${name}.jpg`);
    state.photos[free] = { img, name: `${name}.jpg`, thumb: `samples/${name}.jpg` };
    const target = state.panels.findIndex((p) => p.photo === -1);
    if (target >= 0) state.panels[target].photo = free;
    activeSlot = free;
    renderSlots();
    redraw();
    setStatus(`Loaded the ${name} sample photo.`);
  });
});

/* ---------- layout, grade, caption, size ---------- */

const layoutRow = document.getElementById('layoutRow');
for (const [id, layout] of Object.entries(LAYOUTS)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'layout-btn';
  button.setAttribute('aria-pressed', String(state.layout === id));
  button.title = layout.blurb;
  const thumb = document.createElement('span');
  thumb.className = 'layout-thumb';
  for (const panel of layoutPanels(id, 56, 40)) {
    const cell = document.createElement('i');
    cell.style.left = `${(panel.x / 56) * 100}%`;
    cell.style.top = `${(panel.y / 40) * 100}%`;
    cell.style.width = `${(panel.w / 56) * 100}%`;
    cell.style.height = `${(panel.h / 40) * 100}%`;
    if (panel.rot) cell.style.transform = `rotate(${panel.rot}deg)`;
    thumb.appendChild(cell);
  }
  button.appendChild(thumb);
  button.appendChild(document.createTextNode(layout.name));
  button.addEventListener('click', () => {
    state.layout = id;
    state.selected = 0;
    document.querySelectorAll('.layout-btn').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    button.setAttribute('aria-pressed', 'true');
    renderPanelPhotoSelect();
    redraw();
  });
  layoutRow.appendChild(button);
}

const gradeRow = document.getElementById('gradeRow');
for (const [id, grade] of Object.entries(GRADES)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'grade-btn';
  button.setAttribute('aria-pressed', String(state.grade === id));
  const swatch = document.createElement('span');
  swatch.className = 'grade-swatch';
  swatch.style.background = `linear-gradient(135deg, ${grade.overlay[0]}, ${grade.overlay[1]})`;
  button.appendChild(swatch);
  button.appendChild(document.createTextNode(grade.name));
  button.addEventListener('click', () => {
    state.grade = id;
    document.querySelectorAll('.grade-btn').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    button.setAttribute('aria-pressed', 'true');
    redraw();
  });
  gradeRow.appendChild(button);
}

const titleStyleRow = document.getElementById('titleStyleRow');
for (const [id, style] of Object.entries(TITLE_STYLES)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chip';
  button.setAttribute('aria-pressed', String(state.titleStyle === id));
  button.textContent = style.name;
  button.addEventListener('click', () => {
    state.titleStyle = id;
    document.querySelectorAll('#titleStyleRow .chip').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    button.setAttribute('aria-pressed', 'true');
    redraw();
  });
  titleStyleRow.appendChild(button);
}

document.getElementById('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
document.getElementById('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
document.getElementById('taglineInput').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
document.getElementById('frameToggle').addEventListener('change', (e) => { state.frame = e.target.checked; redraw(); });

const sizeRow = document.getElementById('sizeRow');
for (const [id, size] of Object.entries(SIZES)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'size-btn';
  button.setAttribute('aria-pressed', String(state.size === id));
  button.innerHTML = `${size.label} <small>· ${size.w}×${size.h}</small>`;
  button.addEventListener('click', () => {
    state.size = id;
    document.querySelectorAll('.size-btn').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    button.setAttribute('aria-pressed', 'true');
    redraw();
  });
  sizeRow.appendChild(button);
}

/* ---------- selected panel ---------- */

const panelPhoto = document.getElementById('panelPhoto');
const panelZoom = document.getElementById('panelZoom');
const zoomValue = document.getElementById('zoomValue');

function renderPanelPhotoSelect() {
  const current = state.panels[state.selected]?.photo ?? -1;
  panelPhoto.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '-1';
  empty.textContent = 'Empty (sunset art)';
  panelPhoto.appendChild(empty);
  state.photos.forEach((photo, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `Photo ${i + 1} — ${photo.name}`;
    panelPhoto.appendChild(option);
  });
  panelPhoto.value = String(current);
  const placement = state.panels[state.selected];
  if (placement) {
    panelZoom.value = String(placement.zoom);
    zoomValue.textContent = `${Math.round(placement.zoom * 100)}%`;
  }
}

panelPhoto.addEventListener('change', () => {
  state.panels[state.selected].photo = Number(panelPhoto.value);
  redraw();
});
panelZoom.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(panelZoom.value);
  zoomValue.textContent = `${Math.round(Number(panelZoom.value) * 100)}%`;
  redraw();
});
document.getElementById('panelReset').addEventListener('click', () => {
  const placement = state.panels[state.selected];
  placement.zoom = 1;
  placement.ox = 0;
  placement.oy = 0;
  renderPanelPhotoSelect();
  redraw();
});

function hitPanel(clientX, clientY) {
  const rect = preview.getBoundingClientRect();
  const px = ((clientX - rect.left) / rect.width) * preview.width;
  const py = ((clientY - rect.top) / rect.height) * preview.height;
  const lx = px - lastInner.x;
  const ly = py - lastInner.y;
  for (let i = lastPanels.length - 1; i >= 0; i -= 1) {
    const p = lastPanels[i];
    if (lx >= p.x && lx <= p.x + p.w && ly >= p.y && ly <= p.y + p.h) return i;
  }
  return -1;
}

let dragging = false;
let dragMoved = false;
let lastX = 0;
let lastY = 0;

preview.addEventListener('pointerdown', (event) => {
  const hit = hitPanel(event.clientX, event.clientY);
  if (hit < 0) return;
  state.selected = hit;
  renderPanelPhotoSelect();
  redraw();
  dragging = true;
  dragMoved = false;
  lastX = event.clientX;
  lastY = event.clientY;
  preview.setPointerCapture(event.pointerId);
});
preview.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const rect = preview.getBoundingClientRect();
  const placement = state.panels[state.selected];
  const panel = lastPanels[state.selected];
  if (!placement || !panel) return;
  const dx = ((event.clientX - lastX) / rect.width) * preview.width;
  const dy = ((event.clientY - lastY) / rect.height) * preview.height;
  if (Math.abs(dx) + Math.abs(dy) > 0) dragMoved = true;
  placement.ox += dx / panel.w;
  placement.oy += dy / panel.h;
  lastX = event.clientX;
  lastY = event.clientY;
  redraw();
});
preview.addEventListener('pointerup', () => { dragging = false; });
preview.addEventListener('wheel', (event) => {
  event.preventDefault();
  const hit = hitPanel(event.clientX, event.clientY);
  if (hit < 0) return;
  state.selected = hit;
  const placement = state.panels[hit];
  placement.zoom = Math.min(3, Math.max(1, placement.zoom * (event.deltaY < 0 ? 1.08 : 0.93)));
  renderPanelPhotoSelect();
  redraw();
}, { passive: false });
preview.addEventListener('dragover', (event) => event.preventDefault());
preview.addEventListener('drop', async (event) => {
  event.preventDefault();
  const file = event.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  const free = state.photos.length < 4 ? state.photos.length : 0;
  await addPhotoFile(file, free);
});

/* ---------- export ---------- */

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function exportSize(sizeId) {
  return new Promise((resolve) => {
    const size = SIZES[sizeId];
    const canvas = document.createElement('canvas');
    drawCover(canvas, state, { fixedSize: { w: size.w, h: size.h } });
    canvas.toBlob((blob) => {
      downloadBlob(blob, `neon-boulevard-${size.w}x${size.h}.png`);
      resolve();
    }, 'image/png');
  });
}

document.getElementById('exportBtn').addEventListener('click', async () => {
  await exportSize(state.size);
  setStatus(`Saved neon-boulevard-${SIZES[state.size].w}x${SIZES[state.size].h}.png`);
});
document.getElementById('exportAllBtn').addEventListener('click', async () => {
  for (const sizeId of Object.keys(SIZES)) {
    // eslint-disable-next-line no-await-in-loop
    await exportSize(sizeId);
  }
  setStatus('Saved all three sizes.');
});

/* ---------- start ---------- */

renderSlots();
renderPanelPhotoSelect();
redraw();

Promise.all([
  document.fonts.load('900 100px "Cover Display"'),
  document.fonts.load('900 100px "Cover Script"'),
]).catch(() => {}).finally(() => redraw());

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state,
    loadImage,
    redraw,
    setStatus,
    renderSlots,
    renderPanelPhotoSelect,
  });
}
