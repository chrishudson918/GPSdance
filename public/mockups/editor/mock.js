/* Editor mockups: clickable, with fake audio. Shared by a.html, b.html and c.html.
 *
 * This is a throwaway design mockup, not app code: plain JavaScript, no build step,
 * no libraries, nothing loaded from outside. The page's <body data-option="A|B|C">
 * picks the layout (see CONFIGS). Everything is drawn from the `state` object;
 * edits change `state` and call render(). Undo keeps JSON copies of `state`.
 */
'use strict';
(() => {
  // ---------- Options ----------
  const OPT = (document.body.dataset.option || 'A').toUpperCase();
  const CONFIGS = {
    A: { tagline: 'Toolbar on top · song settings beside each row', rowH: 72, headW: 220, settings: 'rowhead',
      colors: ['#4f8cff', '#ff9f43', '#2ed47a', '#c86bfa', '#ff5e7e', '#22c7d6'] },
    B: { tagline: 'Toolbar on the left · tall rows · song settings in a pop-up', rowH: 100, headW: 150, settings: 'dialog',
      colors: ['#86a8e7', '#e0b07d', '#8fc3a8', '#b9a3e3', '#e6a3a3', '#86c5cf'] },
    C: { tagline: 'Toolbar at the bottom · slim rows · settings strip for the picked song', rowH: 54, headW: 170, settings: 'strip',
      colors: ['#00e5ff', '#ff3df2', '#b6ff00', '#ffb000', '#7c5cff', '#ff5c5c'] },
  };
  const CFG = CONFIGS[OPT] || CONFIGS.A;
  const RULER_H = 44, FX_H = 44, TOP_H = 18;

  // ---------- Icons (inline SVG, 24x24) ----------
  const ICONS = {
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
    add: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    split: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.6 7.6L20 18M8.6 16.4L20 6"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    fade: '<path d="M3 19L11 6v13z"/><path d="M13 6l8 13h-8z"/>',
    speed: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/>',
    trans: '<rect x="2" y="5" width="12" height="7" rx="1.5"/><rect x="10" y="12" width="12" height="7" rx="1.5"/>',
    sfx: '<path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z"/>',
    censor: '<path d="M4 5h16v10H9l-5 4z"/><path d="M9 8l6 4M15 8l-6 4"/>',
    section: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/>',
    export: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  };
  const icon = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
  const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = (t, tenths) => {
    t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60;
    return tenths ? `${m}:${s.toFixed(1).padStart(4, '0')}` : `${m}:${String(Math.floor(s)).padStart(2, '0')}`;
  };

  // ---------- Fake audio shapes (deterministic noise) ----------
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
  function noise(seed, x) { const i = Math.floor(x), f = x - i, a = hash(seed * 7919 + i), b = hash(seed * 7919 + i + 1), u = f * f * (3 - 2 * f); return a + (b - a) * u; }
  function amp(s, t) {
    const sect = 0.5 + 0.5 * noise(s.seed + 3, t / 12);
    const beat = 0.72 + 0.28 * Math.abs(Math.sin(Math.PI * t * s.bpm / 60));
    const fine = 0.45 + 0.55 * noise(s.seed, t * 9);
    let a = sect * beat * fine;
    if (t < 4) a *= t / 4;
    if (t > s.dur - 6) a *= Math.max(0, (s.dur - t) / 6);
    return Math.min(1, a);
  }
  function ampFine(s, t) { // speech-like bumps for the censor close-up
    return amp(s, t) * (0.3 + 0.7 * Math.pow(Math.sin(t * Math.PI * 3.3 + noise(s.seed + 9, t) * 3), 2)) * (0.6 + 0.4 * noise(s.seed + 11, t * 60));
  }

  // ---------- State ----------
  let uid = 100;
  const nid = (p) => p + (++uid);
  const state = {
    title: 'Spring Showcase - Varsity',
    songs: [
      { id: 's1', name: 'Neon Skyline', dur: 212, bpm: 124, bpmGuess: 124, speed: 100, vol: 0, seed: 11, color: 0 },
      { id: 's2', name: 'Run It Back', dur: 188, bpm: 128, bpmGuess: 128, speed: 100, vol: 0, seed: 23, color: 1 },
      { id: 's3', name: 'Golden Hour Drums', dur: 160, bpm: 96, bpmGuess: 96, speed: 125, vol: 2, seed: 37, color: 2 },
      { id: 's4', name: 'Midnight Bounce', dur: 200, bpm: 120, bpmGuess: 120, speed: 100, vol: 0, seed: 47, color: 3 },
    ],
    clips: [
      { id: 'c1', song: 's1', srcIn: 8, srcOut: 92, start: 0, fadeIn: 2, fadeOut: 0 },
      { id: 'c2', song: 's2', srcIn: 30, srcOut: 110, start: 80, fadeIn: 0, fadeOut: 0 },
      { id: 'c3', song: 's3', srcIn: 20, srcOut: 95, start: 157, fadeIn: 0, fadeOut: 0 },
      { id: 'c4', song: 's4', srcIn: 40, srcOut: 110, start: 215, fadeIn: 0, fadeOut: 4 },
    ],
    trans: { 'c1|c2': { type: 'crossfade' }, 'c2|c3': { type: 'beat' }, 'c3|c4': { type: 'sfx', sfx: 'Riser' } },
    sfx: [{ id: 'x1', name: 'Boom hit', start: 284, dur: 2.5 }],
    markers: [
      { id: 'm1', t: 0, name: 'Opening' }, { id: 'm2', t: 34, name: 'Turn sequence' }, { id: 'm3', t: 80, name: 'Chorus' },
      { id: 'm4', t: 157, name: 'Floor work' }, { id: 'm5', t: 215, name: 'Big finish' },
    ],
    censors: [{ id: 'w1', song: 's2', t: 56, len: 0.45 }, { id: 'w2', song: 's4', t: 71.3, len: 0.4 }],
    lock: false, mixBpm: 124, level: true,
  };
  const ui = { sel: null, playhead: 0, playing: false, zoom: 3, snap: true };
  const undoStack = [], redoStack = [];

  const song = (id) => state.songs.find((s) => s.id === id);
  const clip = (id) => state.clips.find((c) => c.id === id);
  const colorOf = (s) => CFG.colors[s.color % CFG.colors.length];
  const sp = (s) => (state.lock ? (state.mixBpm / s.bpm) * 100 : s.speed); // effective speed, %
  const effBpm = (s) => Math.round(s.bpm * sp(s) / 100);
  const clipDur = (c) => (c.srcOut - c.srcIn) * 100 / sp(song(c.song));
  const clipEnd = (c) => c.start + clipDur(c);
  const mixEnd = () => Math.max(0, ...state.clips.map(clipEnd), ...state.sfx.map((x) => x.start + x.dur));
  const selClip = () => (ui.sel && ui.sel.kind === 'clip' ? clip(ui.sel.id) : null);

  function snapshot() { return JSON.stringify(state); }
  function pushUndo() { undoStack.push(snapshot()); if (undoStack.length > 300) undoStack.shift(); redoStack.length = 0; }
  function restore(json) { const o = JSON.parse(json); Object.keys(o).forEach((k) => { state[k] = o[k]; }); }
  function undo() { if (!undoStack.length) return toast('Nothing to undo.'); redoStack.push(snapshot()); restore(undoStack.pop()); checkSel(); render(); }
  function redo() { if (!redoStack.length) return toast('Nothing to redo.'); undoStack.push(snapshot()); restore(redoStack.pop()); checkSel(); render(); }
  function checkSel() {
    const s = ui.sel; if (!s) return;
    const ok = s.kind === 'clip' ? clip(s.id) : s.kind === 'sfx' ? state.sfx.find((x) => x.id === s.id)
      : s.kind === 'marker' ? state.markers.find((m) => m.id === s.id) : transitions().find((t) => t.key === s.id);
    if (!ok) ui.sel = null;
  }

  /** Every place where two songs overlap in time = one transition. */
  function transitions() {
    const out = [], cs = [...state.clips].sort((a, b) => a.start - b.start);
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i], b = cs[j]; if (a.song === b.song) continue;
      const s = Math.max(a.start, b.start), e = Math.min(clipEnd(a), clipEnd(b));
      if (e - s > 0.05) { const key = a.id + '|' + b.id, t = state.trans[key] || { type: 'crossfade' }; out.push({ key, a, b, s, e, type: t.type, sfx: t.sfx }); }
    }
    return out;
  }

  /** Move clip b (and every clip that starts after it) so it overlaps a by `len` seconds. */
  function setOverlap(a, b, len) {
    const delta = (clipEnd(a) - len) - b.start, from = b.start;
    state.clips.forEach((c) => { if (c === b || c.start > from + 0.001) c.start = Math.max(0, c.start + delta); });
  }

  // ---------- Page skeleton ----------
  const app = document.getElementById('app');
  const TOOLS = [
    { id: 'play', label: 'Play', icon: 'play' }, 'sep',
    { id: 'add', label: 'Add song', icon: 'add' },
    { id: 'split', label: 'Split', icon: 'split', need: 'clip' },
    { id: 'delete', label: 'Delete', icon: 'trash', need: 'any' }, 'sep',
    { id: 'fade', label: 'Fade', icon: 'fade', need: 'clip' },
    { id: 'speed', label: 'Speed', icon: 'speed', need: 'clip' },
    { id: 'trans', label: 'Transition', icon: 'trans', need: 'cliptrans' },
    { id: 'sfx', label: 'Sound effect', icon: 'sfx' },
    { id: 'censor', label: 'Censor', icon: 'censor', need: 'clip' },
    { id: 'section', label: 'Section', icon: 'section' },
  ];
  const opts = ['A', 'B', 'C'].map((o) => `<a href="${o.toLowerCase()}.html" class="${o === OPT ? 'on' : ''}">${o}</a>`).join('');
  app.innerHTML = `
    <div class="banner"><b>MOCKUP, option ${OPT}:</b> ${CFG.tagline}. Clicks work; there is no real sound.
      <span class="flex"></span>Compare: ${opts} <a href="index.html">All options</a></div>
    <div class="header">
      <span class="logo">GPSdance</span>
      <input class="proj" id="h-title" aria-label="Project name">
      <span class="saved" id="h-saved">Saved to Drive</span>
      <button class="btn" id="h-undo" title="Undo (Ctrl+Z)">${icon('undo', 16)} Undo</button>
      <button class="btn" id="h-redo" title="Redo (Ctrl+Y)">${icon('redo', 16)} Redo</button>
      <span class="time" id="h-time"></span>
      <span class="flex"></span>
      <label class="tog" title="Every song is sped up or slowed down to this BPM"><input type="checkbox" id="h-lock"> One tempo</label>
      <input type="number" class="bpm-in" id="h-bpm" min="60" max="200" aria-label="Mix BPM"><span class="muted" style="font-size:12px">BPM</span>
      <label class="tog" title="Make all songs the same loudness"><input type="checkbox" id="h-level"> Same loudness</label>
      <button class="btn" id="h-save">${icon('cloud', 16)} Save</button>
      <button class="btn primary" id="h-export">${icon('export', 16)} Export</button>
    </div>
    <div class="toolbar" id="toolbar">${TOOLS.map((t) => (t === 'sep' ? '<span class="tb-sep"></span>'
      : `<button class="tb ${t.id === 'play' ? 'play' : ''}" data-tool="${t.id}" title="${t.label}">${icon(t.icon)}<span>${t.label}</span></button>`)).join('')}
      <span class="tb-hint" id="tb-hint"></span></div>
    <div class="main"><div class="tl-scroll" id="tl"></div></div>
    ${CFG.settings === 'strip' ? '<div class="strip" id="strip"></div>' : ''}`;
  const tl = document.getElementById('tl');
  const $ = (id) => document.getElementById(id);

  // One CSS class per song holds its waveform picture, so redraws stay cheap.
  const waveStyle = document.createElement('style');
  document.head.appendChild(waveStyle);
  const waveDone = new Set();
  function ensureWaves() {
    let css = '';
    state.songs.forEach((s) => {
      if (waveDone.has(s.id)) return; waveDone.add(s.id);
      const step = 0.25; let d = '';
      for (let t = 0; t < s.dur; t += step) { const h = Math.max(1, amp(s, t) * 46); d += `M${(t / step).toFixed(0)} ${(50 - h).toFixed(1)}h0.75v${(2 * h).toFixed(1)}h-0.75z`; }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(s.dur / step)} 100" preserveAspectRatio="none"><path d="${d}" fill="${colorOf(s)}" fill-opacity="0.85"/></svg>`;
      css += `.wave-${s.id}{background-image:url("data:image/svg+xml,${encodeURIComponent(svg)}")}\n`;
    });
    if (css) waveStyle.textContent += css;
  }

  // ---------- Rendering ----------
  function render() { renderHeader(); renderToolbar(); renderTimeline(); if (CFG.settings === 'strip') renderStrip(); }

  function renderHeader() {
    if (document.activeElement !== $('h-title')) $('h-title').value = state.title;
    $('h-undo').disabled = !undoStack.length; $('h-redo').disabled = !redoStack.length;
    $('h-lock').checked = state.lock; $('h-bpm').value = state.mixBpm; $('h-bpm').disabled = !state.lock;
    $('h-level').checked = state.level;
    updateTime();
  }
  function updateTime() { $('h-time').innerHTML = `${fmt(ui.playhead, true)} <small>/ ${fmt(mixEnd())}</small>`; }

  function renderToolbar() {
    const c = selClip(), any = !!ui.sel, tr = ui.sel && ui.sel.kind === 'trans';
    document.querySelectorAll('[data-tool]').forEach((b) => {
      const t = TOOLS.find((x) => x.id === b.dataset.tool);
      const ok = !t.need || (t.need === 'clip' && c) || (t.need === 'any' && any) || (t.need === 'cliptrans' && (c || tr));
      b.classList.toggle('dim', !ok);
    });
    const p = document.querySelector('[data-tool="play"]');
    p.innerHTML = `${icon(ui.playing ? 'pause' : 'play')}<span>${ui.playing ? 'Pause' : 'Play'}</span>`;
    const hint = $('tb-hint');
    if (hint) hint.textContent = c ? `${song(c.song).name} is picked. Drag its edges to trim, the white dots to fade.` : 'Click a song to pick it. Space = play/pause.';
  }

  function rulerHTML(total, pps) {
    const steps = [1, 2, 5, 10, 15, 30, 60, 120];
    const step = steps.find((s) => s * pps >= 64) || 120, minor = step / (step >= 10 ? 5 : 2);
    let h = '';
    for (let t = 0; t <= total; t += minor) {
      const major = Math.abs(t / step - Math.round(t / step)) < 1e-6;
      h += `<div class="tick ${major ? '' : 'minor'}" style="left:${t * pps}px">${major ? fmt(t) : ''}</div>`;
    }
    return h;
  }

  function rowHeadHTML(s) {
    const col = colorOf(s);
    const name = `<div class="rh-name"><span class="dot"></span>${esc(s.name)}</div>`;
    if (CFG.settings === 'rowhead') {
      const locked = state.lock;
      return `${name}
        <div class="rh-line"><span class="rh-lab">Speed</span>
          <button class="mini" data-act="spd-" data-song="${s.id}" ${locked ? 'disabled' : ''} title="Slower">−</button>
          <span class="rh-val">${Math.round(sp(s))}%</span>
          <button class="mini" data-act="spd+" data-song="${s.id}" ${locked ? 'disabled' : ''} title="Faster">+</button></div>
        <div class="rh-line2"><button class="linkbtn" data-act="bpm" data-song="${s.id}" title="Fix the BPM">${effBpm(s)} BPM ${icon('edit', 11)}</button>
          <span class="rh-lab">Vol</span>
          <button class="mini" data-act="vol-" data-song="${s.id}" title="Quieter">−</button>
          <span class="rh-val">${s.vol > 0 ? '+' : ''}${s.vol}</span>
          <button class="mini" data-act="vol+" data-song="${s.id}" title="Louder">+</button></div>`;
    }
    if (CFG.settings === 'dialog') {
      return `${name}<div class="rh-sub">${effBpm(s)} BPM · ${Math.round(sp(s))}%</div>
        <button class="btn small" style="margin-top:8px" data-act="settings" data-song="${s.id}">${icon('gear', 13)} Settings</button>`;
    }
    void col;
    return `${name}<div class="rh-sub">${effBpm(s)} BPM · ${Math.round(sp(s))}%</div>`;
  }

  function clipHTML(c, trs, pps) {
    const s = song(c.song), speed = sp(s) / 100, w = Math.max(4, clipDur(c) * pps), H = CFG.rowH - 8 - 2 - TOP_H;
    const selCls = ui.sel && ui.sel.kind === 'clip' && ui.sel.id === c.id ? 'sel' : '';
    const fullW = (s.dur / speed) * pps, off = (c.srcIn / speed) * pps;
    const beatPx = (60 / effBpm(s)) * pps;
    const beats = beatPx >= 7 ? `<div class="clip-beats" style="background:repeating-linear-gradient(90deg,rgba(255,255,255,.08) 0 1px,transparent 1px ${beatPx}px)"></div>` : '';
    let svg = '';
    const fi = Math.min(c.fadeIn, clipDur(c)) * pps, fo = Math.min(c.fadeOut, clipDur(c)) * pps;
    if (fi > 0) svg += `<polygon points="0,0 ${fi},0 0,${H}" fill="rgba(0,0,0,.55)"/><line x1="0" y1="${H}" x2="${fi}" y2="0" stroke="#fff" stroke-width="1.5"/>`;
    if (fo > 0) svg += `<polygon points="${w - fo},0 ${w},0 ${w},${H}" fill="rgba(0,0,0,.55)"/><line x1="${w - fo}" y1="0" x2="${w}" y2="${H}" stroke="#fff" stroke-width="1.5"/>`;
    trs.forEach((t) => {
      if (t.a !== c && t.b !== c) return;
      const x1 = (t.s - c.start) * pps, x2 = (t.e - c.start) * pps;
      const col = t.type === 'beat' ? '#7df9ff' : t.type === 'sfx' ? '#ffd166' : '#ffffff';
      const out = t.a === c; // this clip fades out across the overlap
      svg += `<rect x="${x1}" y="0" width="${x2 - x1}" height="${H}" fill="${col}" fill-opacity=".12"/>`;
      svg += out ? `<polygon points="${x1},0 ${x2},${H} ${x2},0" fill="rgba(0,0,0,.45)"/><line x1="${x1}" y1="0" x2="${x2}" y2="${H}" stroke="${col}" stroke-width="2"/>`
        : `<polygon points="${x1},0 ${x2},0 ${x1},${H}" fill="rgba(0,0,0,.45)"/><line x1="${x1}" y1="${H}" x2="${x2}" y2="0" stroke="${col}" stroke-width="2"/>`;
      if (t.type === 'beat') for (let x = x1; x <= x2; x += Math.max(6, beatPx)) svg += `<line x1="${x}" y1="${H - 8}" x2="${x}" y2="${H}" stroke="${col}" stroke-width="2"/>`;
    });
    const cens = state.censors.filter((w2) => w2.song === s.id && w2.t + w2.len > c.srcIn && w2.t < c.srcOut)
      .map((w2) => `<div class="censor" style="left:${((w2.t - c.srcIn) / speed) * pps}px;width:${(w2.len / speed) * pps}px" title="Censored word (plays backward)"></div>`).join('');
    const label = `${Math.round(sp(s))}% · ${effBpm(s)} BPM`;
    return `<div class="clip ${selCls}" data-clip="${c.id}" style="left:${c.start * pps}px;width:${w}px;--c:${colorOf(s)}">
      <div class="clip-top"><span>${esc(s.name)}</span>${w > 150 ? `<span class="clip-sp">${label}</span>` : ''}</div>
      <div class="clip-wave wave-${s.id}" style="background-size:${fullW}px 100%;background-position:${-off}px 0"></div>
      ${beats}<svg width="${w}" height="${H}">${svg}</svg>${cens}
      <div class="h-trim l" data-h="trimL" title="Drag to trim the start"></div><div class="h-trim r" data-h="trimR" title="Drag to trim the end"></div>
      <div class="h-fade l" data-h="fadeIn" style="left:${fi}px" title="Drag to fade in"></div>
      <div class="h-fade r" data-h="fadeOut" style="right:${fo}px" title="Drag to fade out"></div></div>`;
  }

  function renderTimeline() {
    ensureWaves();
    const pps = ui.zoom, H = CFG.rowH, n = state.songs.length;
    const total = Math.max(mixEnd() + 60, (tl.clientWidth - CFG.headW) / pps);
    const W = Math.ceil(total * pps), trs = transitions();
    const sl = tl.scrollLeft, st = tl.scrollTop;
    let h = `<div class="tl-inner" style="width:${CFG.headW + W}px">`;
    h += `<div class="ruler-row"><div class="corner" style="width:${CFG.headW}px">
        <button class="btn" data-act="zout" title="Zoom out">−</button><button class="btn" data-act="zin" title="Zoom in">+</button>
        <label class="tog" title="Trims and moves stick to beats and song edges"><input type="checkbox" data-act="snap" ${ui.snap ? 'checked' : ''}> Snap</label></div>
      <div class="ruler" data-zone="ruler" style="width:${W}px">${rulerHTML(total, pps)}
        ${state.markers.map((m) => `<div class="marker ${ui.sel && ui.sel.kind === 'marker' && ui.sel.id === m.id ? 'sel' : ''}" data-marker="${m.id}" style="left:${m.t * pps}px" title="Section: drag to move, double-click to rename">${esc(m.name)}</div>`).join('')}
        <div class="ph-head" id="ph-head" style="left:${ui.playhead * pps}px"></div></div></div>`;
    const selSong = selClip() ? selClip().song : null;
    state.songs.forEach((s) => {
      h += `<div class="row" style="height:${H}px"><div class="rowhead ${selSong === s.id ? 'sel' : ''}" data-rowsong="${s.id}" style="width:${CFG.headW}px;--c:${colorOf(s)}">${rowHeadHTML(s)}</div>
        <div class="lane" data-zone="lane" style="width:${W}px">${state.clips.filter((c) => c.song === s.id).map((c) => clipHTML(c, trs, pps)).join('')}</div></div>`;
    });
    h += `<div class="row fx-row" style="height:${FX_H}px"><div class="rowhead" style="width:${CFG.headW}px"><div class="rh-name">${icon('sfx', 14)} Sound effects</div></div>
      <div class="lane" data-zone="lane" style="width:${W}px">${state.sfx.map((x) => `<div class="sfxclip ${ui.sel && ui.sel.kind === 'sfx' && ui.sel.id === x.id ? 'sel' : ''}" data-sfx="${x.id}" style="left:${x.start * pps}px;width:${Math.max(64, x.dur * pps)}px" title="${esc(x.name)}">${esc(x.name)}</div>`).join('')}</div></div>`;
    // Overlay: section lines, transition chips, playhead.
    const rowTop = (sid) => RULER_H + state.songs.findIndex((s) => s.id === sid) * H;
    h += `<div class="overlay" style="left:${CFG.headW}px;width:${W}px;height:${RULER_H + n * H + FX_H + n + 1}px">`;
    h += state.markers.map((m) => `<div class="mline" style="left:${m.t * pps}px"></div>`).join('');
    trs.forEach((t) => {
      const y = Math.max(rowTop(t.a.song), rowTop(t.b.song)) + (Math.abs(rowTop(t.a.song) - rowTop(t.b.song)) === H ? -13 : 10);
      const label = t.type === 'beat' ? `Beat-matched ${(t.e - t.s).toFixed(1)}s` : t.type === 'sfx' ? `${esc(t.sfx || 'Effect')} ${(t.e - t.s).toFixed(1)}s` : `Crossfade ${(t.e - t.s).toFixed(1)}s`;
      h += `<div class="tchip ${t.type === 'crossfade' ? '' : t.type} ${ui.sel && ui.sel.kind === 'trans' && ui.sel.id === t.key ? 'sel' : ''}" data-trans="${t.key}" style="left:${((t.s + t.e) / 2) * pps}px;top:${y}px" title="Click, then press Transition to change it">${label}</div>`;
    });
    h += `<div class="ph-line" id="ph-line" style="left:${ui.playhead * pps}px"></div></div></div>`;
    tl.innerHTML = h;
    tl.scrollLeft = sl; tl.scrollTop = st;
  }

  function updatePlayhead() {
    const x = ui.playhead * ui.zoom;
    const a = $('ph-head'), b = $('ph-line');
    if (a) a.style.left = x + 'px'; if (b) b.style.left = x + 'px';
    updateTime();
  }

  // ---------- Settings strip (option C) ----------
  function renderStrip() {
    const el = $('strip'), c = selClip();
    if (!c) { el.innerHTML = '<span class="empty">Click a song on the timeline to see its settings here (speed, beat, volume, fades).</span>'; return; }
    const s = song(c.song);
    el.innerHTML = `<span class="grp"><span class="dot" style="--c:${colorOf(s)}"></span><b>${esc(s.name)}</b></span>
      <span class="grp"><span class="lab">Speed</span><input type="range" id="st-speed" min="50" max="150" step="1" ${state.lock ? 'disabled' : ''}><span class="val" id="st-speedv"></span></span>
      <span class="grp"><span class="lab">Beat</span><span class="val" id="st-bpm"></span><button class="btn small" id="st-fix">${icon('edit', 12)} Fix</button></span>
      <span class="grp"><span class="lab">Volume</span><input type="range" id="st-vol" min="-12" max="12" step="1"><span class="val" id="st-volv"></span></span>
      <span class="grp"><span class="lab">Fade in</span><input type="number" id="st-fi" min="0" max="15" step="0.5"><span class="lab">Fade out</span><input type="number" id="st-fo" min="0" max="15" step="0.5"><span class="lab">sec</span></span>`;
    const upd = () => {
      $('st-speed').value = Math.round(sp(s)); $('st-speedv').textContent = Math.round(sp(s)) + '%';
      $('st-bpm').textContent = effBpm(s) + ' BPM';
      $('st-vol').value = s.vol; $('st-volv').textContent = (s.vol > 0 ? '+' : '') + s.vol;
      $('st-fi').value = c.fadeIn; $('st-fo').value = c.fadeOut;
    };
    bindUndoable($('st-speed'), (v) => { s.speed = +v; upd(); renderTimeline(); updateTime(); });
    bindUndoable($('st-vol'), (v) => { s.vol = +v; upd(); });
    $('st-fi').addEventListener('change', (e) => { pushUndo(); c.fadeIn = clamp(+e.target.value || 0, 0, clipDur(c) / 2); render(); });
    $('st-fo').addEventListener('change', (e) => { pushUndo(); c.fadeOut = clamp(+e.target.value || 0, 0, clipDur(c) / 2); render(); });
    $('st-fix').onclick = () => bpmDialog(s.id);
    upd();
  }

  function bindUndoable(el, apply) {
    let started = false;
    el.addEventListener('input', () => { if (!started) { pushUndo(); started = true; renderHeader(); } apply(el.value); });
    el.addEventListener('change', () => { started = false; });
  }

  // ---------- Small UI helpers ----------
  let toastTimer = 0;
  function toast(msg, ms = 3200) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), ms);
  }

  function openDialog({ title, body, buttons = [{ label: 'Close', primary: true }], wide, onClose }) {
    const back = document.createElement('div');
    back.className = 'dlg-back';
    back.innerHTML = `<div class="dlg ${wide ? 'wide' : ''}" role="dialog" aria-label="${esc(title)}"><h2>${title}</h2><div class="dlg-body">${body}</div><div class="dlg-foot"></div></div>`;
    const foot = back.querySelector('.dlg-foot');
    let closed = false;
    const close = () => { if (closed) return; closed = true; back.remove(); if (onClose) onClose(); };
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.className = 'btn' + (b.primary ? ' primary' : '');
      el.textContent = b.label;
      if (b.id) el.id = b.id;
      el.onclick = () => { if (b.action && b.action() === false) return; close(); };
      foot.appendChild(el);
    });
    back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
    document.body.appendChild(back);
    return { el: back, close, q: (sel) => back.querySelector(sel) };
  }

  // ---------- Dialogs ----------
  function songDialog(songId) {
    const s = song(songId);
    const d = openDialog({
      title: `Song settings: ${esc(s.name)}`,
      body: `<div class="field"><div class="field-lab">Speed <span id="sd-sp"></span></div>
          <input type="range" id="sd-speed" min="50" max="150" step="1"><div class="hint" id="sd-sphint"></div></div>
        <div class="field"><div class="field-lab">Beat <span id="sd-bpm"></span></div>
          <button class="btn" id="sd-fix">${icon('edit', 15)} Fix the BPM</button>
          <div class="hint">The app finds the beat by itself. Fix it here if it guessed wrong.</div></div>
        <div class="field"><div class="field-lab">Volume <span id="sd-vol"></span></div>
          <input type="range" id="sd-volume" min="-12" max="12" step="1"><div class="hint" id="sd-volhint"></div></div>`,
      buttons: [{ label: 'Done', primary: true }],
      onClose: render,
    });
    const upd = () => {
      d.q('#sd-speed').value = Math.round(sp(s)); d.q('#sd-speed').disabled = state.lock;
      d.q('#sd-sp').textContent = Math.round(sp(s)) + '%';
      d.q('#sd-sphint').textContent = state.lock ? `Set by "One tempo" (${state.mixBpm} BPM). Turn that off to change it here.`
        : `100% = normal. The pitch stays the same. Now ${effBpm(s)} BPM (the song itself is ${s.bpm} BPM).`;
      d.q('#sd-bpm').textContent = `${s.bpm} BPM`;
      d.q('#sd-volume').value = s.vol; d.q('#sd-vol').textContent = s.vol === 0 ? 'no change' : (s.vol > 0 ? 'louder +' : 'quieter ') + s.vol;
      d.q('#sd-volhint').textContent = state.level ? '"Same loudness" is on, so this is a small change on top of it.' : 'Move right for louder, left for quieter.';
    };
    bindUndoable(d.q('#sd-speed'), (v) => { s.speed = +v; upd(); renderTimeline(); updateTime(); });
    bindUndoable(d.q('#sd-volume'), (v) => { s.vol = +v; upd(); renderTimeline(); });
    d.q('#sd-fix').onclick = () => bpmDialog(s.id, upd);
    upd();
  }

  function bpmDialog(songId, after) {
    const s = song(songId); let val = s.bpm; const taps = [];
    const d = openDialog({
      title: `Fix the BPM: ${esc(s.name)}`,
      body: `<p class="p">The app guessed <b>${s.bpmGuess} BPM</b>. Now set to <b id="bd-now"></b>.</p>
        <div class="row-btns"><button class="btn big" id="bd-tap">Tap here along with the beat</button><span class="hint" id="bd-taps">Tap 4 or more times.</span></div>
        <div class="row-btns"><label>Or type it: <input type="number" class="num" id="bd-in" min="40" max="240" step="0.5"> BPM</label>
          <button class="btn" id="bd-half">Half (÷2)</button><button class="btn" id="bd-dbl">Double (×2)</button>
          <button class="btn" id="bd-reset">Back to the app's guess</button></div>
        <p class="hint">A common mix-up: the app hears 160 when the song feels like 80. Half and Double fix that.</p>`,
      buttons: [{ label: 'Cancel' }, {
        label: 'Use this BPM', primary: true,
        action: () => { pushUndo(); s.bpm = val; render(); if (after) after(); toast(`${s.name} is now ${val} BPM.`); },
      }],
    });
    const show = () => { d.q('#bd-now').textContent = val + ' BPM'; d.q('#bd-in').value = val; };
    d.q('#bd-tap').onclick = () => {
      const now = performance.now();
      if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
      taps.push(now); if (taps.length > 9) taps.shift();
      if (taps.length >= 4) {
        const avg = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
        val = Math.round(600000 / avg) / 10; show();
        d.q('#bd-taps').textContent = `${taps.length} taps: about ${val} BPM`;
      } else d.q('#bd-taps').textContent = `${taps.length} tap${taps.length > 1 ? 's' : ''}… keep going`;
    };
    d.q('#bd-in').onchange = (e) => { val = clamp(+e.target.value || s.bpm, 40, 240); show(); };
    d.q('#bd-half').onclick = () => { val = Math.round(val * 5) / 10; show(); };
    d.q('#bd-dbl').onclick = () => { val = clamp(val * 2, 40, 240); show(); };
    d.q('#bd-reset').onclick = () => { val = s.bpmGuess; show(); };
    show();
  }

  function fadeDialog(c) {
    const s = song(c.song); pushUndo(); const before = snapshot();
    const d = openDialog({
      title: `Fade: ${esc(s.name)}`,
      body: `<div class="field"><div class="field-lab">Fade in <span id="fd-iv"></span></div><input type="range" id="fd-in" min="0" max="10" step="0.5"></div>
        <div class="field"><div class="field-lab">Fade out <span id="fd-ov"></span></div><input type="range" id="fd-out" min="0" max="10" step="0.5"></div>
        <p class="hint">0 = no fade. You can also drag the white dots at the top corners of the song.</p>`,
      buttons: [{ label: 'Done', primary: true }],
      onClose: () => { if (snapshot() === before) undoStack.pop(); render(); },
    });
    const upd = () => {
      d.q('#fd-in').value = c.fadeIn; d.q('#fd-out').value = c.fadeOut;
      d.q('#fd-iv').textContent = c.fadeIn ? c.fadeIn + ' sec' : 'none'; d.q('#fd-ov').textContent = c.fadeOut ? c.fadeOut + ' sec' : 'none';
    };
    d.q('#fd-in').oninput = (e) => { c.fadeIn = +e.target.value; upd(); renderTimeline(); };
    d.q('#fd-out').oninput = (e) => { c.fadeOut = +e.target.value; upd(); renderTimeline(); };
    upd();
  }

  function transDialog(key) {
    const t0 = transitions().find((t) => t.key === key); if (!t0) return;
    const a = t0.a, b = t0.b, sa = song(a.song), sb = song(b.song);
    pushUndo(); const before = snapshot();
    const cur = state.trans[key] || (state.trans[key] = { type: 'crossfade' });
    const card = (type, title, text) => `<label class="card" data-type="${type}"><input type="radio" name="tt" value="${type}"><span><b>${title}</b><span class="muted">${text}</span></span></label>`;
    const d = openDialog({
      title: `Transition: ${esc(sa.name)} → ${esc(sb.name)}`,
      body: `<div class="cards">
          ${card('crossfade', 'Crossfade', 'One song fades out while the next fades in.')}
          ${card('beat', 'Beat-matched', 'The beats of both songs line up across the change.')}
          ${card('sfx', 'Sound-effect bridge', 'A sound effect (whoosh, riser, boom…) plays over the change.')}</div>
        <div class="row-btns"><label>Length: <input type="number" class="num" id="td-len" min="0.5" max="16" step="0.5"> seconds</label>
          <span class="hint">Or drag ${esc(sb.name)} left or right on the timeline.</span></div>
        <div class="row-btns" id="td-sfx"><span>Effect: <b id="td-sfxname"></b></span><button class="btn" id="td-pick">Choose…</button></div>
        <p class="hint" id="td-beat"></p>`,
      buttons: [{ label: 'Remove transition', action: () => { setOverlap(a, b, 0); delete state.trans[key]; ui.sel = null; toast('The songs now play back to back.'); } },
        { label: 'Done', primary: true }],
      onClose: () => { if (snapshot() === before) undoStack.pop(); checkSel(); render(); },
    });
    const upd = () => {
      d.el.querySelectorAll('.card').forEach((c) => { const on = c.dataset.type === cur.type; c.classList.toggle('on', on); c.querySelector('input').checked = on; });
      const t = transitions().find((x) => x.key === key);
      d.q('#td-len').value = t ? +(t.e - t.s).toFixed(1) : 0;
      d.q('#td-sfx').style.display = cur.type === 'sfx' ? '' : 'none';
      d.q('#td-sfxname').textContent = cur.sfx || 'none yet';
      d.q('#td-beat').textContent = cur.type === 'beat'
        ? (effBpm(sa) === effBpm(sb) ? `Both songs are at ${effBpm(sa)} BPM, so the beats line up.`
          : `${sa.name} is ${effBpm(sa)} BPM and ${sb.name} is ${effBpm(sb)} BPM. During the change the app eases one into the other so the beats stay together.`) : '';
    };
    d.el.querySelectorAll('.card').forEach((c) => c.addEventListener('click', () => {
      cur.type = c.dataset.type; if (cur.type === 'sfx' && !cur.sfx) cur.sfx = 'Whoosh'; upd(); renderTimeline();
    }));
    d.q('#td-len').onchange = (e) => { setOverlap(a, b, clamp(+e.target.value || 0.5, 0.5, 16)); upd(); renderTimeline(); updateTime(); };
    d.q('#td-pick').onclick = () => sfxPicker((fx) => { cur.sfx = fx.name; upd(); renderTimeline(); }, 'Pick the bridge effect');
    upd();
  }

  const SFX_LIB = [
    { name: 'Whoosh', len: 1.2, src: 'Built-in' }, { name: 'Riser', len: 4, src: 'Built-in' }, { name: 'Boom hit', len: 2.5, src: 'Built-in' },
    { name: 'Record scratch', len: 0.8, src: 'Built-in' }, { name: 'Cymbal swell', len: 3, src: 'Built-in' }, { name: 'Clap stack', len: 1, src: 'Built-in' },
    { name: 'Team chant', len: 3.5, src: 'My Drive' }, { name: 'Air horn', len: 1.5, src: 'My Drive' },
    { name: 'GPS Dance stinger', len: 2, src: 'District library' }, { name: 'Crowd cheer', len: 5, src: 'District library' }, { name: 'Bass drop', len: 2.2, src: 'District library' },
  ];
  function sfxPicker(onPick, title = 'Add a sound effect') {
    let tab = 'All';
    const d = openDialog({
      title, wide: true,
      body: `<div class="tabs">${['All', 'Built-in', 'My Drive', 'District library'].map((t) => `<button class="tab" data-tab="${t}">${t}</button>`).join('')}
          <input class="txt" id="sx-q" placeholder="Search" style="width:200px;margin-left:auto"></div>
        <div class="list" id="sx-list"></div>
        <p class="hint">Built-in effects come with the app. "My Drive" shows effects you added from your Google Drive. The district library is a shared Drive folder.</p>`,
      buttons: [{ label: 'Cancel' }],
    });
    const draw = () => {
      d.el.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
      const q = d.q('#sx-q').value.toLowerCase();
      const items = SFX_LIB.filter((x) => (tab === 'All' || x.src === tab) && x.name.toLowerCase().includes(q));
      d.q('#sx-list').innerHTML = items.map((x, i) => `<div class="li"><button class="btn small" data-prev="${i}" title="Listen">${icon('play', 12)}</button>
        <span>${esc(x.name)}</span><span class="muted">${x.len}s</span><span class="badge">${x.src}</span><button class="btn small primary" data-use="${i}">Use</button></div>`).join('')
        || '<div class="li"><span></span><span class="muted">Nothing found.</span></div>';
      d.el.querySelectorAll('[data-use]').forEach((b) => { b.onclick = () => { onPick(items[+b.dataset.use]); d.close(); }; });
      d.el.querySelectorAll('[data-prev]').forEach((b) => {
        b.onclick = () => { b.innerHTML = icon('pause', 12); toast(`Playing "${items[+b.dataset.prev].name}" (mockup: no sound)`, 1500); setTimeout(() => { b.innerHTML = icon('play', 12); }, items[+b.dataset.prev].len * 1000); };
      });
    };
    d.el.querySelectorAll('.tab').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; draw(); }; });
    d.q('#sx-q').oninput = draw;
    draw();
  }

  function censorDialog(c) {
    const s = song(c.song), speed = sp(s) / 100;
    let center = ui.playhead >= c.start && ui.playhead <= clipEnd(c) ? c.srcIn + (ui.playhead - c.start) * speed : (c.srcIn + c.srcOut) / 2;
    let span = 6, selId = null, listenT = null, drag = null;
    pushUndo(); const before = snapshot();
    const d = openDialog({
      title: `Censor a word: ${esc(s.name)}`, wide: true,
      body: `<p class="p">Drag across the word you want to hide. That part will play <b>backward</b>. The red boxes are words already hidden.</p>
        <div class="cz-wrap"><canvas id="cz"></canvas></div>
        <div class="cz-bar"><button class="btn" id="cz-l">◀ Earlier</button><button class="btn" id="cz-r">Later ▶</button>
          <button class="btn" id="cz-zi">Zoom in</button><button class="btn" id="cz-zo">Zoom out</button><span class="sp"></span><span class="hint" id="cz-range"></span></div>
        <div class="cz-bar" id="cz-edit"><b>Picked word:</b>
          <span>Start</span><button class="btn small" data-n="s-">◀</button><button class="btn small" data-n="s+">▶</button>
          <span>End</span><button class="btn small" data-n="e-">◀</button><button class="btn small" data-n="e+">▶</button>
          <button class="btn" id="cz-listen">${icon('play', 14)} Listen</button><button class="btn danger" id="cz-del">Remove</button>
          <span class="hint" id="cz-info"></span></div>`,
      buttons: [{ label: 'Done', primary: true }],
      onClose: () => { if (snapshot() === before) undoStack.pop(); render(); },
    });
    const cv = d.q('#cz'), ctx = cv.getContext('2d');
    const lo = () => clamp(center - span / 2, c.srcIn, Math.max(c.srcIn, c.srcOut - span));
    const tAt = (x) => lo() + (x / cv.clientWidth) * span;
    const words = () => state.censors.filter((w) => w.song === s.id);
    function draw() {
      const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, Hc = cv.clientHeight;
      cv.width = W * dpr; cv.height = Hc * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0c0d10'; ctx.fillRect(0, 0, W, Hc);
      const t0 = lo(), x = (t) => ((t - t0) / span) * W;
      ctx.font = '11px system-ui'; ctx.fillStyle = '#8d94a1'; ctx.strokeStyle = '#2a2e37';
      for (let t = Math.ceil(t0 * 2) / 2; t < t0 + span; t += 0.5) { ctx.beginPath(); ctx.moveTo(x(t), 0); ctx.lineTo(x(t), Hc); ctx.stroke(); if (t % 1 === 0) ctx.fillText(fmt(t), x(t) + 3, 12); }
      words().forEach((w) => {
        ctx.fillStyle = w.id === selId ? 'rgba(255,70,70,.55)' : 'rgba(255,70,70,.3)';
        ctx.fillRect(x(w.t), 18, x(w.t + w.len) - x(w.t), Hc - 18);
        ctx.strokeStyle = '#ff8080'; ctx.lineWidth = w.id === selId ? 2 : 1; ctx.strokeRect(x(w.t), 18, x(w.t + w.len) - x(w.t), Hc - 18); ctx.lineWidth = 1;
      });
      ctx.fillStyle = colorOf(s); const mid = 18 + (Hc - 18) / 2;
      for (let px = 0; px < W; px += 2) { const a = ampFine(s, t0 + (px / W) * span) * (Hc - 26) / 2; ctx.fillRect(px, mid - a, 1.4, a * 2 + 1); }
      if (drag) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x(Math.min(drag.a, drag.b)), 18, Math.abs(x(drag.b) - x(drag.a)), Hc - 18); }
      if (listenT != null) { ctx.fillStyle = '#fff'; ctx.fillRect(x(listenT), 0, 2, Hc); }
      d.q('#cz-range').textContent = `Showing ${fmt(t0, true)} to ${fmt(t0 + span, true)} of the song`;
      const w = words().find((v) => v.id === selId);
      d.q('#cz-edit').classList.toggle('off', !w);
      d.q('#cz-info').textContent = w ? `${fmt(w.t, true)}, ${w.len.toFixed(2)} sec long` : '';
    }
    cv.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect(), t = tAt(e.clientX - r.left);
      const hit = words().find((w) => t >= w.t && t <= w.t + w.len);
      if (hit) { selId = hit.id; draw(); return; }
      drag = { a: t, b: t }; cv.setPointerCapture(e.pointerId); draw();
    });
    cv.addEventListener('pointermove', (e) => { if (!drag) return; const r = cv.getBoundingClientRect(); drag.b = tAt(clamp(e.clientX - r.left, 0, r.width)); draw(); });
    cv.addEventListener('pointerup', () => {
      if (!drag) return;
      const t = Math.min(drag.a, drag.b), len = Math.abs(drag.b - drag.a); drag = null;
      if (len > 0.05) { const w = { id: nid('w'), song: s.id, t, len }; state.censors.push(w); selId = w.id; }
      draw();
    });
    d.q('#cz-l').onclick = () => { center -= span / 2; center = clamp(center, c.srcIn + span / 2, c.srcOut); draw(); };
    d.q('#cz-r').onclick = () => { center += span / 2; center = clamp(center, c.srcIn, c.srcOut - span / 2); draw(); };
    d.q('#cz-zi').onclick = () => { span = Math.max(2, span / 1.5); draw(); };
    d.q('#cz-zo').onclick = () => { span = Math.min(20, span * 1.5); draw(); };
    d.el.querySelectorAll('[data-n]').forEach((b) => {
      b.onclick = () => {
        const w = words().find((v) => v.id === selId); if (!w) return; const k = 0.05;
        if (b.dataset.n === 's-') { w.t -= k; w.len += k; } if (b.dataset.n === 's+' && w.len > 2 * k) { w.t += k; w.len -= k; }
        if (b.dataset.n === 'e-' && w.len > 2 * k) w.len -= k; if (b.dataset.n === 'e+') w.len += k;
        draw();
      };
    });
    d.q('#cz-del').onclick = () => { state.censors = state.censors.filter((v) => v.id !== selId); selId = null; draw(); };
    d.q('#cz-listen').onclick = () => {
      const w = words().find((v) => v.id === selId); if (!w) return;
      const from = w.t - 1, to = w.t + w.len + 1, t0 = performance.now();
      toast('Listening… the red part plays backward (mockup: no sound)', (to - from) * 1000);
      const step = (now) => { listenT = from + (now - t0) / 1000; if (listenT > to || !document.body.contains(cv)) { listenT = null; draw(); return; } draw(); requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    requestAnimationFrame(draw);
  }

  function markerDialog(m) {
    const quick = ['Intro', 'Verse', 'Chorus', 'Turn sequence', 'Floor work', 'Big finish', 'Bow'];
    const d = openDialog({
      title: m ? 'Rename section' : `New section at ${fmt(ui.playhead, true)}`,
      body: `<p class="p">Sections show up in the Player, so dancers can jump straight to them.</p>
        <input class="txt" id="mk-name" placeholder="Section name, e.g. Chorus" value="${m ? esc(m.name) : ''}">
        <div class="row-btns" style="margin-top:10px">${quick.map((q) => `<button class="btn small" data-q="${q}">${q}</button>`).join('')}</div>`,
      buttons: [{ label: 'Cancel' }, {
        label: m ? 'Rename' : 'Add section', primary: true,
        action: () => {
          const name = d.q('#mk-name').value.trim(); if (!name) { d.q('#mk-name').focus(); return false; }
          pushUndo();
          if (m) m.name = name; else { const nm = { id: nid('m'), t: ui.playhead, name }; state.markers.push(nm); ui.sel = { kind: 'marker', id: nm.id }; }
          render();
        },
      }],
    });
    d.el.querySelectorAll('[data-q]').forEach((b) => { b.onclick = () => { d.q('#mk-name').value = b.dataset.q; }; });
    setTimeout(() => d.q('#mk-name').focus(), 0);
  }

  const DRIVE_FILES = [
    { name: 'Glow Up Anthem.mp3', dur: 204 }, { name: 'Stomp Clap Intro.wav', dur: 48 }, { name: 'Sunset Drive (clean).mp3', dur: 231 },
    { name: 'Bassline Ballet.m4a', dur: 178 }, { name: 'Hype Countdown.mp3', dur: 72 },
  ];
  function addSongFlow() {
    let pick = 0;
    const d = openDialog({
      title: 'Add a song from Google Drive', wide: true,
      body: `<p class="hint" style="margin-top:0">In the real app this is Google's own file picker. Pick a song:</p>
        <div class="list">${DRIVE_FILES.map((f, i) => `<div class="li pick" data-i="${i}"><span>♪</span><span>${esc(f.name)}</span><span class="muted">${fmt(f.dur)}</span></div>`).join('')}</div>`,
      buttons: [{ label: 'Cancel' }, { label: 'Add', primary: true, action: () => { setTimeout(() => gettingReady(DRIVE_FILES[pick]), 0); } }],
    });
    const mark = () => d.el.querySelectorAll('.li.pick').forEach((r) => r.classList.toggle('on', +r.dataset.i === pick));
    d.el.querySelectorAll('.li.pick').forEach((r) => { r.onclick = () => { pick = +r.dataset.i; mark(); }; });
    mark();
  }
  function gettingReady(f) {
    const name = f.name.replace(/\.(mp3|wav|m4a)$/i, '').replace(/ \(clean\)/, '');
    const d = openDialog({
      title: 'Getting it ready…',
      body: `<p class="p" id="gr-step">Opening ${esc(f.name)}…</p><div class="progress"><div id="gr-bar"></div></div><p class="hint">This can take a few seconds on a Chromebook.</p>`,
      buttons: [],
    });
    let p = 0;
    const iv = setInterval(() => {
      p += 4; d.q('#gr-bar').style.width = p + '%';
      if (p === 40) d.q('#gr-step').textContent = 'Finding the beat…';
      if (p === 80) d.q('#gr-step').textContent = 'Drawing the waveform…';
      if (p >= 100) {
        clearInterval(iv); d.close(); pushUndo();
        const bpm = 100 + Math.round(hash(uid) * 40);
        const s = { id: nid('s'), name, dur: f.dur, bpm, bpmGuess: bpm, speed: 100, vol: 0, seed: uid, color: state.songs.length };
        const len = Math.min(60, f.dur - 10), last = state.clips.length ? Math.max(...state.clips.map(clipEnd)) : 4;
        const c = { id: nid('c'), song: s.id, srcIn: Math.min(10, f.dur / 4), srcOut: Math.min(10, f.dur / 4) + len, start: Math.max(0, last - 4), fadeIn: 0, fadeOut: 0 };
        state.songs.push(s); state.clips.push(c); ui.sel = { kind: 'clip', id: c.id };
        render(); tl.scrollLeft = c.start * ui.zoom - 200; tl.scrollTop = tl.scrollHeight;
        toast(`Added ${name} (${bpm} BPM). It overlaps the song before it by 4 seconds, so they crossfade. Drag it to change that.`, 5000);
      }
    }, 90);
  }

  function exportFlow() {
    let fmtSel = 'MP3', dest = 'drive';
    const d = openDialog({
      title: 'Export the finished mix',
      body: `<div class="field"><div class="field-lab">File type</div><div class="cards">
          <label class="card" data-f="MP3"><input type="radio" name="ef"><span><b>MP3</b><span class="muted">Smaller file. Plays everywhere. Best for most uses.</span></span></label>
          <label class="card" data-f="WAV"><input type="radio" name="ef"><span><b>WAV</b><span class="muted">Full quality, much bigger file.</span></span></label></div></div>
        <div class="field"><div class="field-lab">Where</div><div class="cards">
          <label class="card" data-d="drive"><input type="radio" name="ed"><span><b>Save to Google Drive</b><span class="muted">Next to the project file.</span></span></label>
          <label class="card" data-d="dl"><input type="radio" name="ed"><span><b>Download to this computer</b><span class="muted">Goes to your Downloads folder.</span></span></label></div></div>`,
      buttons: [{ label: 'Cancel' }, { label: 'Start', primary: true, action: () => { setTimeout(() => exportProgress(fmtSel, dest), 0); } }],
    });
    const upd = () => {
      d.el.querySelectorAll('[data-f]').forEach((c) => { const on = c.dataset.f === fmtSel; c.classList.toggle('on', on); c.querySelector('input').checked = on; });
      d.el.querySelectorAll('[data-d]').forEach((c) => { const on = c.dataset.d === dest; c.classList.toggle('on', on); c.querySelector('input').checked = on; });
    };
    d.el.querySelectorAll('[data-f]').forEach((c) => c.addEventListener('click', () => { fmtSel = c.dataset.f; upd(); }));
    d.el.querySelectorAll('[data-d]').forEach((c) => c.addEventListener('click', () => { dest = c.dataset.d; upd(); }));
    upd();
  }
  function exportProgress(f, dest) {
    let p = 0, iv = 0;
    const d = openDialog({
      title: `Making your ${f}…`,
      body: `<p class="p" id="ex-step">Putting the songs together…</p><div class="progress"><div id="ex-bar"></div></div><p class="hint" id="ex-pct">0%</p>`,
      buttons: [{ label: 'Cancel', action: () => { clearInterval(iv); toast('Export canceled.'); } }],
    });
    iv = setInterval(() => {
      p += 2; d.q('#ex-bar').style.width = p + '%'; d.q('#ex-pct').textContent = p + '%';
      if (p === 40) d.q('#ex-step').textContent = f === 'MP3' ? 'Making the MP3…' : 'Writing the WAV…';
      if (p === 90) d.q('#ex-step').textContent = dest === 'drive' ? 'Saving to Google Drive…' : 'Almost done…';
      if (p >= 100) {
        clearInterval(iv); d.close();
        openDialog({ title: 'Done', body: `<p class="p">${dest === 'drive' ? `Saved to Google Drive as <b>${esc(state.title)}.${f.toLowerCase()}</b>.` : `Downloaded <b>${esc(state.title)}.${f.toLowerCase()}</b>.`}</p>`, buttons: [{ label: 'OK', primary: true }] });
      }
    }, 120);
  }

  // ---------- Toolbar actions ----------
  function needClip(what) {
    const c = selClip(); if (!c) toast(`Click a song on the timeline first, then press ${what}.`);
    return c;
  }
  const ACTIONS = {
    play: togglePlay,
    add: addSongFlow,
    split() {
      const c = needClip('Split'); if (!c) return;
      if (ui.playhead <= c.start + 0.2 || ui.playhead >= clipEnd(c) - 0.2) return toast('Move the white line (the playhead) inside the song where you want to cut. Click the ruler to move it.', 4500);
      pushUndo();
      const s = song(c.song), cut = c.srcIn + (ui.playhead - c.start) * sp(s) / 100;
      const nb = { ...c, id: nid('c'), srcIn: cut, start: ui.playhead, fadeIn: 0 };
      c.srcOut = cut; c.fadeOut = 0;
      Object.keys(state.trans).forEach((k) => { if (k.startsWith(c.id + '|')) { state.trans[nb.id + k.slice(c.id.length)] = state.trans[k]; delete state.trans[k]; } });
      state.clips.push(nb); ui.sel = { kind: 'clip', id: nb.id };
      render(); toast('Split in two. Drag a piece to move it, or press Delete to remove it.');
    },
    delete() {
      const s = ui.sel; if (!s) return toast('Click something on the timeline first (a song, a section, an effect or a transition).');
      pushUndo();
      if (s.kind === 'clip') {
        const c = clip(s.id); state.clips = state.clips.filter((x) => x !== c);
        Object.keys(state.trans).forEach((k) => { if (k.split('|').includes(c.id)) delete state.trans[k]; });
        if (!state.clips.some((x) => x.song === c.song)) state.songs = state.songs.filter((x) => x.id !== c.song);
      } else if (s.kind === 'sfx') state.sfx = state.sfx.filter((x) => x.id !== s.id);
      else if (s.kind === 'marker') state.markers = state.markers.filter((x) => x.id !== s.id);
      else if (s.kind === 'trans') { const t = transitions().find((x) => x.key === s.id); if (t) setOverlap(t.a, t.b, 0); delete state.trans[s.id]; }
      ui.sel = null; render(); toast('Deleted. Undo brings it back.');
    },
    fade() { const c = needClip('Fade'); if (c) fadeDialog(c); },
    speed() {
      const c = needClip('Speed'); if (!c) return;
      if (CFG.settings === 'strip') { const st = $('strip'); st.classList.remove('flash'); void st.offsetWidth; st.classList.add('flash'); $('st-speed') && $('st-speed').focus(); }
      else songDialog(c.song);
    },
    trans() {
      if (ui.sel && ui.sel.kind === 'trans') return transDialog(ui.sel.id);
      const c = needClip('Transition'); if (!c) return;
      const mine = transitions().filter((t) => t.a === c || t.b === c);
      const t = mine.find((x) => x.a === c) || mine[0];
      if (t) { ui.sel = { kind: 'trans', id: t.key }; render(); return transDialog(t.key); }
      const next = state.clips.filter((x) => x.song !== c.song && x.start >= c.start).sort((x, y) => x.start - y.start)[0];
      openDialog({
        title: 'No transition yet',
        body: `<p class="p">A transition happens where two songs overlap. Drag the next song left so it overlaps this one.</p>`,
        buttons: [{ label: 'Close' }].concat(next ? [{
          label: 'Overlap 4 seconds for me', primary: true,
          action: () => { pushUndo(); setOverlap(c, next, 4); const k = transitions().find((x) => x.a === c && x.b === next); render(); if (k) { ui.sel = { kind: 'trans', id: k.key }; render(); transDialog(k.key); } },
        }] : []),
      });
    },
    sfx() {
      sfxPicker((fx) => {
        pushUndo(); const x = { id: nid('x'), name: fx.name, start: ui.playhead, dur: fx.len };
        state.sfx.push(x); ui.sel = { kind: 'sfx', id: x.id }; render(); toast(`Added "${fx.name}" at ${fmt(ui.playhead, true)}. Drag it to move it.`);
      });
    },
    censor() { const c = needClip('Censor'); if (c) censorDialog(c); },
    section() { markerDialog(null); },
  };

  // ---------- Playback (fake: only the playhead moves) ----------
  let lastT = 0;
  function togglePlay() {
    ui.playing = !ui.playing;
    if (ui.playing) { if (ui.playhead >= mixEnd() - 0.1) ui.playhead = 0; lastT = performance.now(); requestAnimationFrame(tick); }
    renderToolbar();
  }
  function tick(now) {
    if (!ui.playing) return;
    ui.playhead += (now - lastT) / 1000; lastT = now;
    if (ui.playhead >= mixEnd()) { ui.playhead = mixEnd(); ui.playing = false; renderToolbar(); }
    updatePlayhead();
    const x = ui.playhead * ui.zoom, view = tl.clientWidth - CFG.headW;
    if (x > tl.scrollLeft + view - 40) tl.scrollLeft = x - 60;
    if (ui.playing) requestAnimationFrame(tick);
  }

  // ---------- Pointer: select, drag, trim, fade, scrub ----------
  let drag = null, raf = 0;
  const timeAt = (clientX) => (clientX - tl.getBoundingClientRect().left - CFG.headW + tl.scrollLeft) / ui.zoom;
  const scheduleRender = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderTimeline(); updateTime(); if (CFG.settings === 'strip') renderStrip(); }); };
  function select(sel) { ui.sel = sel; render(); }

  tl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const t = e.target;
    if (t.closest('button, input, label, .corner')) return;
    const row = t.closest('[data-rowsong]');
    if (row) { const c = state.clips.filter((x) => x.song === row.dataset.rowsong).sort((x, y) => x.start - y.start)[0]; if (c) select({ kind: 'clip', id: c.id }); return; }
    const chip = t.closest('[data-trans]'); if (chip) { select({ kind: 'trans', id: chip.dataset.trans }); return; }
    const mk = t.closest('[data-marker]');
    if (mk) { const m = state.markers.find((x) => x.id === mk.dataset.marker); select({ kind: 'marker', id: m.id }); pushUndo(); drag = { kind: 'marker', obj: m, x0: e.clientX, orig: m.t, undo: true }; return; }
    const fx = t.closest('[data-sfx]');
    if (fx) { const x = state.sfx.find((v) => v.id === fx.dataset.sfx); select({ kind: 'sfx', id: x.id }); pushUndo(); drag = { kind: 'sfx', obj: x, x0: e.clientX, orig: x.start, undo: true }; return; }
    const cl = t.closest('[data-clip]');
    if (cl) {
      const h = t.closest('[data-h]'), c = clip(cl.dataset.clip);
      select({ kind: 'clip', id: c.id }); pushUndo();
      drag = { kind: 'clip', h: h ? h.dataset.h : 'move', obj: c, x0: e.clientX, orig: { ...c }, undo: true };
      e.preventDefault(); return;
    }
    if (t.closest('[data-zone]')) {
      ui.playhead = clamp(timeAt(e.clientX), 0, mixEnd()); drag = { kind: 'playhead' };
      if (t.closest('[data-zone="lane"]')) select(null); else updatePlayhead();
    }
  });

  function snapMove(start, dur, self) {
    if (!ui.snap) return start;
    const edges = [0, ui.playhead, ...state.markers.map((m) => m.t)];
    state.clips.forEach((c) => { if (c !== self) edges.push(c.start, clipEnd(c)); });
    const lim = 8 / ui.zoom;
    for (const e of edges) { if (Math.abs(start - e) < lim) return e; if (Math.abs(start + dur - e) < lim) return e - dur; }
    return start;
  }
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = (e.clientX - (drag.x0 || 0)) / ui.zoom;
    if (drag.kind === 'playhead') { ui.playhead = clamp(timeAt(e.clientX), 0, mixEnd()); updatePlayhead(); return; }
    if (Math.abs(e.clientX - drag.x0) > 2) drag.moved = true;
    if (!drag.moved) return;
    if (drag.kind === 'marker') drag.obj.t = clamp(drag.orig + dx, 0, mixEnd());
    if (drag.kind === 'sfx') drag.obj.start = Math.max(0, drag.orig + dx);
    if (drag.kind === 'clip') {
      const c = drag.obj, o = drag.orig, s = song(c.song), k = sp(s) / 100, beat = 60 / s.bpm;
      const snapSrc = (v) => (ui.snap ? Math.round(v / beat) * beat : v);
      if (drag.h === 'move') c.start = Math.max(0, snapMove(o.start + dx, clipDur(c), c));
      if (drag.h === 'trimL') { c.srcIn = clamp(snapSrc(o.srcIn + dx * k), 0, c.srcOut - 1); c.start = o.start + (c.srcIn - o.srcIn) / k; if (c.start < 0) { c.srcIn -= c.start * k; c.start = 0; } }
      if (drag.h === 'trimR') c.srcOut = clamp(snapSrc(o.srcOut + dx * k), c.srcIn + 1, s.dur);
      if (drag.h === 'fadeIn') c.fadeIn = Math.round(clamp(o.fadeIn + dx, 0, clipDur(c) / 2) * 10) / 10;
      if (drag.h === 'fadeOut') c.fadeOut = Math.round(clamp(o.fadeOut - dx, 0, clipDur(c) / 2) * 10) / 10;
    }
    scheduleRender();
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    if (drag.undo && !drag.moved) undoStack.pop();
    const wasClip = drag.kind === 'clip' && drag.moved;
    drag = null; render();
    if (wasClip) { const n = transitions().length; if (n !== lastTransCount) toast(n > lastTransCount ? 'The songs overlap now, so they crossfade. Click the label between them to change it.' : 'The songs no longer overlap: no transition there now.', 4000); }
    lastTransCount = transitions().length;
  });
  let lastTransCount = transitions().length;

  tl.addEventListener('dblclick', (e) => {
    const mk = e.target.closest('[data-marker]'); if (mk) return markerDialog(state.markers.find((m) => m.id === mk.dataset.marker));
    const ch = e.target.closest('[data-trans]'); if (ch) return transDialog(ch.dataset.trans);
    const cl = e.target.closest('[data-clip]');
    if (cl && CFG.settings !== 'strip') songDialog(clip(cl.dataset.clip).song);
  });

  // Buttons inside the timeline (row headers, zoom, snap).
  tl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, s = b.dataset.song && song(b.dataset.song);
    if (a === 'zin' || a === 'zout') { const mid = (tl.scrollLeft + (tl.clientWidth - CFG.headW) / 2) / ui.zoom; ui.zoom = clamp(ui.zoom * (a === 'zin' ? 1.5 : 1 / 1.5), 0.8, 80); renderTimeline(); tl.scrollLeft = mid * ui.zoom - (tl.clientWidth - CFG.headW) / 2; return; }
    if (a === 'snap') { ui.snap = b.checked; return; }
    if (a === 'settings') return songDialog(s.id);
    if (a === 'bpm') return bpmDialog(s.id);
    pushUndo();
    if (a === 'spd-') s.speed = clamp(s.speed - 5, 50, 150);
    if (a === 'spd+') s.speed = clamp(s.speed + 5, 50, 150);
    if (a === 'vol-') s.vol = clamp(s.vol - 1, -12, 12);
    if (a === 'vol+') s.vol = clamp(s.vol + 1, -12, 12);
    render();
  });

  document.getElementById('toolbar').addEventListener('click', (e) => { const b = e.target.closest('[data-tool]'); if (b) ACTIONS[b.dataset.tool](); });

  // Header controls.
  $('h-undo').onclick = undo; $('h-redo').onclick = redo;
  $('h-title').onchange = (e) => { pushUndo(); state.title = e.target.value.trim() || 'Untitled mix'; render(); };
  $('h-lock').onchange = (e) => { pushUndo(); state.lock = e.target.checked; render(); toast(state.lock ? `Every song now plays at ${state.mixBpm} BPM.` : 'Each song keeps its own speed again.'); };
  $('h-bpm').onchange = (e) => { pushUndo(); state.mixBpm = clamp(+e.target.value || 124, 60, 200); render(); };
  $('h-level').onchange = (e) => { pushUndo(); state.level = e.target.checked; render(); toast(state.level ? 'All songs will play at the same loudness.' : 'Songs keep their own loudness.'); };
  $('h-save').onclick = () => { $('h-saved').textContent = 'Saving…'; setTimeout(() => { $('h-saved').textContent = 'Saved to Drive ✓'; }, 900); };
  $('h-export').onclick = exportFlow;

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.dlg-back') || e.target.closest('input')) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (ui.sel) ACTIONS.delete(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  });
  window.addEventListener('resize', () => renderTimeline());

  // Start zoomed so the whole mix fits.
  ui.zoom = clamp((tl.clientWidth - CFG.headW - 40) / (mixEnd() + 10), 0.8, 80);
  render();
})();
