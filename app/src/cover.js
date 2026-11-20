// Neon Boulevard's cover renderer: draws a multi-panel GTA-style poster cover onto any
// 2D canvas, at any size. A cover is a set of photo panels in one of six layouts, each
// photo graded with a Vice City sunset or neon colour grade, plus a bold condensed title,
// a script subtitle and a small tagline, finished with film grain and a vignette.
// Everything is drawn with the plain canvas API; the only assets are two OFL fonts
// (display.ttf for the title, script.ttf for the subtitle) and the user's own photos.

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Landscape 1920 x 1080' },
};

export const LAYOUTS = {
  'hero-trio': { name: 'Hero Trio', panels: 4, blurb: 'One big hero photo, three stacked beside it' },
  quad: { name: 'Quad Grid', panels: 4, blurb: 'Four equal panels' },
  'strip-three': { name: 'Strip Three', panels: 3, blurb: 'Three tall columns' },
  'full-bleed': { name: 'Full Bleed', panels: 1, blurb: 'One photo, edge to edge' },
  tilted: { name: 'Tilted Snaps', panels: 3, blurb: 'Three tilted snapshot cards on a dusk sky' },
  mosaic: { name: 'Mosaic Nine', panels: 9, blurb: 'A nine-panel contact grid' },
};

export const GRADES = {
  'vice-sunset': {
    name: 'Vice Sunset', saturate: 1.28, contrast: 1.08, brightness: 1.0,
    overlay: ['#ff7e2a', '#ff2d78'], overlayAlpha: 0.5, tint: '#ff9a5c', tintAlpha: 0.1,
  },
  'neon-night': {
    name: 'Neon Night', saturate: 1.32, contrast: 1.14, brightness: 0.94,
    overlay: ['#00e5c7', '#ff2d92'], overlayAlpha: 0.48, tint: '#16264a', tintAlpha: 0.14,
  },
  'miami-heat': {
    name: 'Miami Heat', saturate: 1.38, contrast: 1.12, brightness: 1.02,
    overlay: ['#ffd23e', '#ff5e3a'], overlayAlpha: 0.48, tint: '#ffcf7d', tintAlpha: 0.1,
  },
  'palm-noir': {
    name: 'Palm Noir', saturate: 0.22, contrast: 1.28, brightness: 1.0,
    overlay: ['#9a8a76', '#232338'], overlayAlpha: 0.42, tint: '#6a6258', tintAlpha: 0.1,
  },
  'golden-hour': {
    name: 'Golden Hour', saturate: 1.18, contrast: 1.05, brightness: 1.06,
    overlay: ['#ffb347', '#ff8c42'], overlayAlpha: 0.42, tint: '#ffd9a0', tintAlpha: 0.1,
  },
};

export const TITLE_STYLES = {
  sunset: { name: 'Sunset gradient' },
  white: { name: 'White block' },
  neon: { name: 'Neon glow' },
};

/** A blank per-panel photo placement: which photo, how far zoomed, how far panned. */
export function blankPanel() {
  return { photo: -1, zoom: 1, ox: 0, oy: 0 };
}

/** The panel rectangles of a layout, in pixels, inside a cover of w by h. */
export function layoutPanels(layoutId, w, h) {
  const g = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  const third = (n) => (n - 2 * g) / 3;
  switch (layoutId) {
    case 'hero-trio': {
      const heroW = Math.round((w - g) * 0.615);
      const sideW = w - heroW - g;
      const sideH = Math.round((h - 2 * g) / 3);
      return [
        { x: 0, y: 0, w: heroW, h },
        { x: heroW + g, y: 0, w: sideW, h: sideH },
        { x: heroW + g, y: sideH + g, w: sideW, h: sideH },
        { x: heroW + g, y: 2 * (sideH + g), w: sideW, h: h - 2 * (sideH + g) },
      ];
    }
    case 'quad': {
      const cw = Math.round((w - g) / 2);
      const ch = Math.round((h - g) / 2);
      return [
        { x: 0, y: 0, w: cw, h: ch },
        { x: cw + g, y: 0, w: w - cw - g, h: ch },
        { x: 0, y: ch + g, w: cw, h: h - ch - g },
        { x: cw + g, y: ch + g, w: w - cw - g, h: h - ch - g },
      ];
    }
    case 'strip-three': {
      const cw = third(w);
      return [
        { x: 0, y: 0, w: cw, h },
        { x: cw + g, y: 0, w: cw, h },
        { x: 2 * (cw + g), y: 0, w: w - 2 * (cw + g), h },
      ];
    }
    case 'full-bleed':
      return [{ x: 0, y: 0, w, h }];
    case 'tilted': {
      const cardW = Math.min(w * 0.44, h * 0.34);
      const cardH = cardW * 1.28;
      return [
        { x: w * 0.06, y: h * 0.05, w: cardW, h: cardH, rot: -5 },
        { x: w - cardW - w * 0.06, y: h * 0.16, w: cardW, h: cardH, rot: 4 },
        { x: w * 0.5 - cardW / 2, y: h * 0.47, w: cardW, h: cardH, rot: -2 },
      ];
    }
    case 'mosaic': {
      const cw = third(w);
      const ch = third(h);
      const out = [];
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          out.push({
            x: col * (cw + g),
            y: row * (ch + g),
            w: col === 2 ? w - 2 * (cw + g) : cw,
            h: row === 2 ? h - 2 * (ch + g) : ch,
          });
        }
      }
      return out;
    }
    default:
      return [{ x: 0, y: 0, w, h }];
  }
}

let grainTile = null;

/** A small tile of monochrome noise, reused for the film grain over every cover. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(160, 160);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 30;
  }
  tctx.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

/** Draws one photo into a panel-sized offscreen canvas, graded, and returns it. */
function gradedPhoto(photo, panel, grade) {
  const pw = Math.max(2, Math.round(panel.w));
  const ph = Math.max(2, Math.round(panel.h));
  const off = document.createElement('canvas');
  off.width = pw;
  off.height = ph;
  const octx = off.getContext('2d');
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(pw / iw, ph / ih) * panel.zoom;
  const dw = iw * base;
  const dh = ih * base;
  const dx = (pw - dw) / 2 + panel.ox * pw;
  const dy = (ph - dh) / 2 + panel.oy * ph;
  octx.filter = `saturate(${grade.saturate}) contrast(${grade.contrast}) brightness(${grade.brightness})`;
  octx.drawImage(photo, dx, dy, dw, dh);
  octx.filter = 'none';
  const wash = octx.createLinearGradient(0, 0, 0, ph);
  wash.addColorStop(0, grade.overlay[0]);
  wash.addColorStop(1, grade.overlay[1]);
  octx.globalCompositeOperation = 'overlay';
  octx.globalAlpha = grade.overlayAlpha;
  octx.fillStyle = wash;
  octx.fillRect(0, 0, pw, ph);
  octx.globalCompositeOperation = 'soft-light';
  octx.globalAlpha = grade.tintAlpha;
  octx.fillStyle = grade.tint;
  octx.fillRect(0, 0, pw, ph);
  octx.globalCompositeOperation = 'source-over';
  octx.globalAlpha = 1;
  return off;
}

/** Draws the retro sun (a slatted disc) used where a panel has no photo yet. */
function drawEmptyPanel(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  sky.addColorStop(0, '#2b1055');
  sky.addColorStop(0.55, '#7597de');
  sky.addColorStop(0.75, grade.overlay[0]);
  sky.addColorStop(1, grade.overlay[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  const r = Math.min(w, h) * 0.26;
  const cx = x + w / 2;
  const cy = y + h * 0.42;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const sun = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  sun.addColorStop(0, '#ffe259');
  sun.addColorStop(1, '#ff5e3a');
  ctx.fillStyle = sun;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = sky;
  for (let i = 0; i < 4; i += 1) {
    const sy = cy + r * 0.08 + i * r * 0.22;
    ctx.fillRect(cx - r, sy, r * 2, r * 0.07 + i * r * 0.02);
  }
  ctx.restore();
}

/** Splits a title into at most two lines that fit maxWidth at the given size. */
function wrapTitle(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [''];
  for (const word of words) {
    const trial = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !lines[lines.length - 1]) {
      lines[lines.length - 1] = trial;
    } else if (lines.length === 1) {
      lines.push(word);
    } else {
      lines[1] = `${lines[1]} ${word}`;
    }
  }
  return lines;
}

/** Draws the title block: script subtitle, bold condensed title, tagline, badge. */
function drawTitleBlock(ctx, w, h, state, frameInset) {
  const left = frameInset + w * 0.045;
  const right = w - frameInset - w * 0.045;
  const maxTextW = right - left;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const tagline = (state.tagline || '').trim().toUpperCase();

  const scrim = ctx.createLinearGradient(0, h * 0.58, 0, h - frameInset);
  scrim.addColorStop(0, 'rgba(12, 4, 22, 0)');
  scrim.addColorStop(0.55, 'rgba(12, 4, 22, 0.55)');
  scrim.addColorStop(1, 'rgba(12, 4, 22, 0.85)');
  ctx.fillStyle = scrim;
  ctx.fillRect(frameInset, h * 0.58, w - 2 * frameInset, h - frameInset - h * 0.58);

  // Accent rule drawn above the title block: orange to pink.
  const rule = ctx.createLinearGradient(left, 0, left + w * 0.18, 0);
  rule.addColorStop(0, '#ffb347');
  rule.addColorStop(0.5, '#ff7e2a');
  rule.addColorStop(1, '#ff2d78');

  // Title: shrink until it fits on at most two lines. The last line's baseline sits
  // just above the tagline; earlier lines stack above it, subtitle above those.
  const lastBaseline = h - frameInset - h * 0.055;
  let size = Math.max(24, h * 0.115);
  let lines = [];
  if (title) {
    while (size > 20) {
      ctx.font = `900 ${size}px "Cover Display", "Arial Narrow", sans-serif`;
      try { ctx.letterSpacing = '0.01em'; } catch { /* older canvas: no letter spacing */ }
      lines = wrapTitle(ctx, title, maxTextW);
      const tooWide = lines.some((line) => ctx.measureText(line).width > maxTextW);
      if (!tooWide && lines.length <= 2) break;
      size -= 2;
    }
  }
  const lineHeight = size * 0.98;
  const firstBaseline = lastBaseline - (lines.length - 1) * lineHeight;
  if (subtitle) {
    const subSize = Math.max(18, h * 0.032);
    ctx.font = `900 ${subSize}px "Cover Script", Georgia, serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(255, 45, 120, 0.8)';
    ctx.shadowBlur = subSize * 0.35;
    ctx.fillStyle = '#ff8fd0';
    const subBaseline = lines.length
      ? firstBaseline - lineHeight - subSize * 0.25
      : lastBaseline - subSize * 0.25;
    ctx.fillText(subtitle, left, subBaseline);
    ctx.shadowBlur = 0;
    ctx.fillStyle = rule;
    ctx.fillRect(left, subBaseline - subSize * 1.4 - h * 0.02, w * 0.18, Math.max(3, h * 0.004));
  } else if (lines.length) {
    ctx.fillStyle = rule;
    ctx.fillRect(left, firstBaseline - lineHeight - h * 0.018, w * 0.18, Math.max(3, h * 0.004));
  }
  if (lines.length) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    lines.forEach((line, i) => {
      const y = firstBaseline + i * lineHeight;
      const fill = ctx.createLinearGradient(0, y - size, 0, y + size * 0.2);
      if (state.titleStyle === 'white') {
        fill.addColorStop(0, '#ffffff');
        fill.addColorStop(1, '#ffe9f4');
      } else if (state.titleStyle === 'neon') {
        fill.addColorStop(0, '#ffffff');
        fill.addColorStop(1, '#d9fbff');
      } else {
        fill.addColorStop(0, '#ffe259');
        fill.addColorStop(0.5, '#ff7e2a');
        fill.addColorStop(1, '#ff2d78');
      }
      ctx.lineWidth = Math.max(2, size * 0.045);
      ctx.strokeStyle = 'rgba(18, 4, 26, 0.9)';
      ctx.strokeText(line, left, y);
      if (state.titleStyle === 'neon') {
        ctx.shadowColor = '#ff2d92';
        ctx.shadowBlur = size * 0.28;
        ctx.fillStyle = fill;
        ctx.fillText(line, left, y);
        ctx.shadowColor = '#00e5c7';
        ctx.shadowBlur = size * 0.12;
        ctx.fillText(line, left, y);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = fill;
        ctx.fillText(line, left, y);
      }
    });
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }

  // Tagline, tracked out, bottom-left; badge pill, top-right.
  if (tagline) {
    const tagSize = Math.max(11, h * 0.018);
    ctx.font = `700 ${tagSize}px "Cover Display", "Arial Narrow", sans-serif`;
    try { ctx.letterSpacing = '0.42em'; } catch { /* ignore */ }
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(tagline, left, h - frameInset - h * 0.022);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }
  const badgeText = 'NEON BAY';
  const badgeSize = Math.max(12, h * 0.02);
  ctx.font = `900 ${badgeSize}px "Cover Display", "Arial Narrow", sans-serif`;
  const badgeW = ctx.measureText(badgeText).width + badgeSize * 2.1;
  const badgeH = badgeSize * 2.1;
  const bx = w - frameInset - w * 0.045 - badgeW;
  const by = frameInset + h * 0.032;
  ctx.save();
  ctx.translate(bx + badgeW / 2, by + badgeH / 2);
  ctx.rotate(-0.06);
  ctx.translate(-badgeW / 2, -badgeH / 2);
  ctx.fillStyle = 'rgba(12, 4, 22, 0.72)';
  ctx.strokeStyle = '#ff2d78';
  ctx.lineWidth = Math.max(2, h * 0.002);
  ctx.beginPath();
  ctx.roundRect(0, 0, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeW / 2, badgeH / 2 + badgeSize * 0.06);
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` (which is resized to the state's export size
 * unless `fixedSize` is given). `state` holds layout, grade, title, subtitle, tagline,
 * titleStyle, frame, photos (images) and panels (per-panel placements). When `preview`
 * is true, the selected panel gets an outline and empty panels get a hint.
 */
export function drawCover(canvas, state, options = {}) {
  const size = SIZES[state.size] ?? SIZES['1080x1080'];
  const w = options.fixedSize?.w ?? size.w;
  const h = options.fixedSize?.h ?? size.h;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] ?? GRADES['vice-sunset'];
  const frame = state.frame !== false;
  const inset = frame ? Math.max(6, Math.round(Math.min(w, h) * 0.016)) : 0;

  ctx.fillStyle = frame ? '#fdfbf7' : '#14101c';
  ctx.fillRect(0, 0, w, h);

  const inner = { x: inset, y: inset, w: w - 2 * inset, h: h - 2 * inset };
  const panels = layoutPanels(state.layout, inner.w, inner.h);
  const gutterColor = frame ? '#fdfbf7' : '#14101c';

  if (state.layout === 'tilted') {
    const sky = ctx.createLinearGradient(inner.x, inner.y, inner.x, inner.y + inner.h);
    sky.addColorStop(0, '#1b0f3a');
    sky.addColorStop(0.5, '#7b2d8b');
    sky.addColorStop(0.8, '#ff5e3a');
    sky.addColorStop(1, '#ffb347');
    ctx.fillStyle = sky;
    ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
  } else {
    ctx.fillStyle = gutterColor;
    ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
  }

  panels.forEach((panel, i) => {
    const placement = state.panels[i] ?? blankPanel();
    const rect = {
      x: inner.x + panel.x,
      y: inner.y + panel.y,
      w: panel.w,
      h: panel.h,
    };
    ctx.save();
    if (panel.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((panel.rot * Math.PI) / 180);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      ctx.shadowColor = 'rgba(10, 4, 20, 0.55)';
      ctx.shadowBlur = Math.max(8, w * 0.012);
      ctx.shadowOffsetY = Math.max(4, h * 0.006);
      ctx.fillStyle = '#fdfbf7';
      const pad = Math.max(6, Math.min(rect.w, rect.h) * 0.045);
      ctx.fillRect(-pad, -pad, rect.w + pad * 2, rect.h + pad * 2);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    } else {
      // Plain panels draw in their own translated space, so the photo lands in
      // this panel and not at the canvas origin.
      ctx.translate(rect.x, rect.y);
    }
    ctx.beginPath();
    if (panel.rot) ctx.roundRect(0, 0, rect.w, rect.h, Math.max(4, w * 0.004));
    else ctx.rect(0, 0, rect.w, rect.h);
    ctx.clip();
    const photo = placement.photo >= 0 ? state.photos[placement.photo]?.img ?? null : null;
    if (photo) {
      const graded = gradedPhoto(photo, { w: rect.w, h: rect.h, ...placement }, grade);
      ctx.drawImage(graded, 0, 0, rect.w, rect.h);
    } else {
      drawEmptyPanel(ctx, { x: 0, y: 0, w: rect.w, h: rect.h }, grade);
      if (options.preview) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = `700 ${Math.max(14, rect.h * 0.045)}px "Cover Display", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('+ ADD A PHOTO', rect.w / 2, rect.h / 2);
      }
    }
    ctx.restore();
    if (options.preview && options.selected === i) {
      ctx.save();
      if (panel.rot) {
        ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
        ctx.rotate((panel.rot * Math.PI) / 180);
        ctx.translate(-rect.w / 2, -rect.h / 2);
        ctx.strokeStyle = '#00e5c7';
        ctx.lineWidth = Math.max(3, w * 0.004);
        ctx.strokeRect(-4, -4, rect.w + 8, rect.h + 8);
      } else {
        ctx.strokeStyle = '#00e5c7';
        ctx.lineWidth = Math.max(3, w * 0.004);
        ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
      }
      ctx.restore();
    }
  });

  // Film grain, then a vignette, over the panels only.
  ctx.save();
  ctx.beginPath();
  ctx.rect(inner.x, inner.y, inner.w, inner.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
  ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
  ctx.globalCompositeOperation = 'source-over';
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(10, 5, 20, 0)');
  vig.addColorStop(1, 'rgba(10, 5, 20, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
  ctx.restore();

  drawTitleBlock(ctx, w, h, state, inset);
  return { panels, inner };
}
