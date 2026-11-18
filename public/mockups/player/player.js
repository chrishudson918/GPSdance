/* Player mockups: clickable, with fake audio. Shared by a.html, b.html and c.html.
 *
 * A throwaway design mockup, not app code: plain JavaScript, no libraries, nothing
 * loaded from outside. <body data-option="A|B|C"> picks the layout. render() draws
 * the page from `S`; update() runs every frame and only changes the moving parts
 * (time, 8-count, playhead, current section).
 */
'use strict';
(() => {
  const OPT = (document.body.dataset.option || 'A').toUpperCase();
  const TAGLINES = {
    A: 'Waveform of the mix · controls along the bottom · big view stacked',
    B: 'Thick progress bar · controls in the middle · big view in three columns',
    C: 'Big clock · controls on the right · big view with beat dots',
  };
  const COLORS = ['#4f8cff', '#ff9f43', '#2ed47a', '#c86bfa', '#ff5e7e', '#22c7d6'];

  const ICONS = {
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
    loop: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
    prev: '<path d="M6 5v14"/><path d="M19 5L9 12l10 7z" fill="currentColor"/>',
    next: '<path d="M18 5v14"/><path d="M5 5l10 7-10 7z" fill="currentColor"/>',
    big: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    small: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  };
  const icon = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
  const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const fmt = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60); return `${m}:${String(Math.floor(t - m * 60)).padStart(2, '0')}`; };

  // ---------- Fake routines (in the real app: .gpsmix projects from Drive) ----------
  const ROUTINES = {
    r1: { name: 'Varsity – Spring Showcase', dur: 286, bpm: 124, seed: 3, sections: [
      { n: 'Opening', t: 0 }, { n: 'Turn sequence', t: 34 }, { n: 'Chorus', t: 80 }, { n: 'Floor work', t: 157 }, { n: 'Big finish', t: 215 }] },
    r2: { name: 'JV – Hip Hop', dur: 190, bpm: 100, seed: 8, sections: [
      { n: 'Intro', t: 0 }, { n: 'Verse 1', t: 16 }, { n: 'Hit combo', t: 62 }, { n: 'Freestyle', t: 118 }, { n: 'Ending', t: 160 }] },
    r3: { name: 'Pom – Halftime', dur: 150, bpm: 132, seed: 14, sections: [
      { n: 'Entrance', t: 0 }, { n: 'Kick line', t: 28 }, { n: 'Formation change', t: 75 }, { n: 'Finale', t: 120 }] },
  };
  const S = { order: ['r1', 'r2', 'r3'], cur: 'r1', t: 0, playing: false, speed: 100, countIn: 4, loopSec: null, loopCount: true, big: false, setOpen: true, busy: null };
  const R = () => ROUTINES[S.cur];
  const secIndexAt = (r, t) => { let i = 0; r.sections.forEach((s, k) => { if (s.t <= t + 1e-6) i = k; }); return i; };
  const secEnd = (r, i) => (i + 1 < r.sections.length ? r.sections[i + 1].t : r.dur);

  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
  function noise(seed, x) { const i = Math.floor(x), f = x - i, a = hash(seed * 7919 + i), b = hash(seed * 7919 + i + 1), u = f * f * (3 - 2 * f); return a + (b - a) * u; }
  const amp = (r, t) => Math.min(1, (0.45 + 0.55 * noise(r.seed + 3, t / 10)) * (0.45 + 0.55 * noise(r.seed, t * 6)) * (t < 3 ? t / 3 : 1) * (t > r.dur - 5 ? Math.max(0, (r.dur - t) / 5) : 1));

  // ---------- Pieces shared by the layouts ----------
  const playBtn = (cls = '') => `<button class="play ${cls}" data-a="play" title="Play / Pause (Space)">${icon(S.playing ? 'pause' : 'play', cls ? 40 : 30)}</button>`;
  const speedSeg = () => `<span class="grp"><span class="lab">Practice speed</span><span class="seg">${[50, 60, 75, 90, 100].map((v) => `<button data-speed="${v}" class="${S.speed === v ? 'on' : ''}">${v}%</button>`).join('')}</span></span>`;
  const countSeg = () => `<span class="grp"><span class="lab">Count-in</span><span class="seg">${[['Off', 0], ['4', 4], ['8', 8]].map(([l, v]) => `<button data-count="${v}" class="${S.countIn === v ? 'on' : ''}">${l}</button>`).join('')}</span></span>`;
  const loopSw = () => `<label class="switch" title="Only when Count-in is 4 or 8"><input type="checkbox" data-a="loopcount" ${S.loopCount ? 'checked' : ''}> Count-in between loop passes</label>`;
  const secButtons = () => `<div class="secs">${R().sections.map((s, i) => `<div class="sec" data-sec="${i}">
      <button class="sec-go" data-go="${i}" title="Jump here${S.countIn ? ' (with count-in)' : ''}"><b>${esc(s.n)}</b><span>${fmt(s.t)}</span></button>
      <button class="sec-loop ${S.loopSec === i ? 'on' : ''}" data-loop="${i}" title="Loop this section">${icon('loop', 18)}</button></div>`).join('')}</div>`;
  const nowRow = (extra = '') => `<div class="now"><span class="now-name">${esc(R().name)}</span><span class="now-sec js-sec"></span><span class="flex"></span>${extra}</div>`;
  const barSecs = (r) => r.sections.map((s, i) => `<div class="bar-sec" style="left:${(s.t / r.dur) * 100}%;width:${((secEnd(r, i) - s.t) / r.dur) * 100}%;background:${COLORS[i % COLORS.length]}33">${esc(s.n)}</div>`).join('');

  function mainHTML() {
    const r = R();
    if (OPT === 'A') {
      return `${nowRow('<span class="count js-count"></span>')}
        <div class="wave-wrap" data-seek><canvas id="wave"></canvas><div class="bar-fill js-fill" style="background:rgba(255,255,255,.07)"></div><div class="loopzone js-loopzone"></div><div class="ph js-ph"></div></div>
        <div class="times"><span class="js-time"></span><span class="js-left"></span></div>
        ${secButtons()}
        <div class="ctrlbar ctrls">${playBtn()}<span class="tbig js-time" style="font-size:24px;min-width:64px"></span>${speedSeg()}${countSeg()}${loopSw()}</div>`;
    }
    if (OPT === 'B') {
      return `${nowRow('<span class="count js-count"></span>')}
        <div class="bar" data-seek>${barSecs(r)}<div class="bar-fill js-fill"></div><div class="loopzone js-loopzone"></div><div class="ph js-ph"></div></div>
        <div class="times"><span class="js-time"></span><span class="js-left"></span></div>
        <div class="center"><button class="round" data-a="prev" title="Previous section">${icon('prev', 20)}</button>${playBtn('huge')}<button class="round" data-a="next" title="Next section">${icon('next', 20)}</button></div>
        <div class="ctrls">${speedSeg()}${countSeg()}${loopSw()}</div>
        ${secButtons()}`;
    }
    return `<div class="left">${nowRow()}
        <div class="tbig clock"><span class="js-time"></span> <small>/ ${fmt(r.dur)}</small></div>
        <div style="font-size:22px"><span class="now-sec js-sec" style="font-size:22px"></span> <span class="muted">· <span class="js-secleft"></span> left</span></div>
        <div class="count js-count" style="font-size:18px"></div>
        <div class="bar slim" data-seek><div class="bar-fill js-fill"></div><div class="loopzone js-loopzone"></div><div class="ph js-ph"></div></div>
        ${secButtons()}</div>
      <div class="right">
        <div class="center" style="display:flex;justify-content:center;align-items:center;gap:16px"><button class="round" data-a="prev" title="Previous section">${icon('prev', 20)}</button>${playBtn('huge')}<button class="round" data-a="next" title="Next section">${icon('next', 20)}</button></div>
        ${speedSeg()}${countSeg()}${loopSw()}</div>`;
  }

  function bigHTML() {
    let mid;
    if (OPT === 'A') {
      mid = `<div class="sec-name js-sec"></div><div class="cnt js-bigcnt"></div>
        <div class="tm"><span class="js-time"></span> <small>· <span class="js-secleft"></span> left in this section</small></div>`;
    } else if (OPT === 'B') {
      mid = `<div class="big-cols">
          <div><span class="lbl">Section</span><span class="sec-name js-sec"></span></div>
          <div><span class="lbl">8-count · beat</span><span class="cnt js-bigcnt"></span></div>
          <div><span class="lbl">Time</span><span class="tm js-time"></span><span class="tm"><small><span class="js-secleft"></span> left in section</small></span></div></div>`;
    } else {
      mid = `<div class="sec-name js-sec"></div>
        <div class="dots">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<span class="js-dot">${n}</span>`).join('')}</div>
        <div class="tm">8-count <span class="js-eight"></span></div>
        <div class="tm" style="margin-top:14px"><small><span class="js-secleft"></span> left in this section · <span class="js-time"></span> / ${fmt(R().dur)}</small></div>`;
    }
    return `<div class="big"><div class="big-main">${mid}</div>
      <div class="big-bar">${playBtn()}<span class="muted">${esc(R().name)} · Speed ${S.speed}%${S.loopSec != null ? ` · Looping "${esc(R().sections[S.loopSec].n)}"` : ''}</span>
        <span class="flex"></span><button class="btn" data-a="big">${icon('small', 16)} Normal view</button></div></div>`;
  }

  function setlistHTML() {
    return `<aside class="setlist"><div class="sl-head">${icon('list', 18)} Set list<span class="flex"></span><button class="btn small" data-a="set">Hide</button></div>
      <div class="sl-list">${S.order.map((id, i) => `<div class="sl-item ${id === S.cur ? 'cur' : ''}" draggable="true" data-r="${id}">
        <span class="sl-grip" title="Drag to reorder">⋮⋮</span><span class="sl-num">${i + 1}.</span><span class="sl-name">${esc(ROUTINES[id].name)}</span><span class="muted">${fmt(ROUTINES[id].dur)}</span></div>`).join('')}</div>
      <div class="sl-foot">Drag to change the order. When a routine ends, the next one starts right away.<br><br><button class="btn small" data-a="addr">+ Add a routine</button></div></aside>`;
  }

  // ---------- Page ----------
  const app = document.getElementById('app');
  document.body.classList.add('opt-' + OPT.toLowerCase());
  function render() {
    const opts = ['A', 'B', 'C'].map((o) => `<a href="${o.toLowerCase()}.html" class="${o === OPT ? 'on' : ''}">${o}</a>`).join('');
    app.innerHTML = `
      <div class="banner"><b>MOCKUP, Player option ${OPT}:</b> ${TAGLINES[OPT]}. Clicks work; there is no real sound.
        <span class="flex"></span>Compare: ${opts} <a href="index.html">All options</a> <a href="../editor/a.html">Editor</a></div>
      <div class="header"><span class="logo">GPSdance</span><span class="htitle">Player</span><span class="flex"></span>
        <button class="btn ${S.setOpen ? 'on' : ''}" data-a="set">${icon('list', 16)} Set list</button>
        <button class="btn ${S.big ? 'on' : ''}" data-a="big">${icon(S.big ? 'small' : 'big', 16)} ${S.big ? 'Normal view' : 'Big view'}</button>
        <a class="btn" href="../editor/a.html" title="Only shown if you can edit this project">Open in Editor</a></div>
      <div class="body ${S.setOpen ? '' : 'noset'}">${setlistHTML()}<div class="main">${mainHTML()}</div>${S.big ? bigHTML() : ''}<div id="ovl"></div></div>`;
    drawWave(); renderOverlay(); lastBeatKey = ''; lastPlaying = null; update();
  }

  function drawWave() {
    const cv = document.getElementById('wave'); if (!cv) return;
    const r = R(), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    r.sections.forEach((s, i) => {
      const x1 = (s.t / r.dur) * W, x2 = (secEnd(r, i) / r.dur) * W, col = COLORS[i % COLORS.length];
      g.fillStyle = col + '22'; g.fillRect(x1, 0, x2 - x1, H);
      g.fillStyle = col; g.fillRect(x1, 0, 2, H);
      g.font = '600 12px system-ui'; g.fillText(s.n, x1 + 6, 16);
      for (let x = x1; x < x2; x += 3) { const a = amp(r, (x / W) * r.dur) * (H - 40) / 2; g.fillRect(x, H / 2 + 10 - a, 2, a * 2 + 1); }
    });
  }

  let lastBeatKey = '', lastPlaying = null;
  const setAll = (sel, v, html) => document.querySelectorAll(sel).forEach((e) => { if (html) e.innerHTML = v; else e.textContent = v; });
  function update() {
    const r = R(), i = secIndexAt(r, S.t), sec = r.sections[i], end = secEnd(r, i);
    const idx = Math.max(0, Math.floor((S.t - sec.t) * r.bpm / 60)), eight = Math.floor(idx / 8) + 1, beat = (idx % 8) + 1;
    setAll('.js-time', fmt(S.t)); setAll('.js-left', '-' + fmt(r.dur - S.t)); setAll('.js-secleft', fmt(end - S.t));
    setAll('.js-sec', sec.n); setAll('.js-eight', eight);
    setAll('.js-count', `8-count <b>${eight}</b> · beat <b>${beat}</b>`, true);
    const key = `${i}-${eight}-${beat}`;
    if (key !== lastBeatKey) {
      lastBeatKey = key;
      document.querySelectorAll('.js-bigcnt').forEach((e) => { e.innerHTML = `${eight}<span class="dot"> · </span><span class="beat">${beat}</span>`; e.classList.remove('flash'); void e.offsetWidth; if (S.playing) e.classList.add('flash'); });
      document.querySelectorAll('.js-dot').forEach((e, k) => { e.classList.toggle('on', k + 1 === beat); e.classList.toggle('done', k + 1 < beat); });
    }
    const pct = (S.t / r.dur) * 100;
    document.querySelectorAll('.js-ph').forEach((e) => { e.style.left = pct + '%'; });
    document.querySelectorAll('.js-fill').forEach((e) => { e.style.width = pct + '%'; });
    document.querySelectorAll('.js-loopzone').forEach((e) => {
      if (S.loopSec == null) { e.style.display = 'none'; return; }
      const s = r.sections[S.loopSec]; e.style.display = ''; e.style.left = (s.t / r.dur) * 100 + '%'; e.style.width = ((secEnd(r, S.loopSec) - s.t) / r.dur) * 100 + '%';
    });
    document.querySelectorAll('[data-sec]').forEach((e) => e.classList.toggle('cur', +e.dataset.sec === i));
    const playingNow = S.playing || !!S.busy;
    if (playingNow !== lastPlaying) {
      lastPlaying = playingNow;
      document.querySelectorAll('[data-a="play"]').forEach((b) => { b.innerHTML = icon(playingNow ? 'pause' : 'play', b.classList.contains('huge') ? 40 : 30); });
    }
  }

  function renderOverlay() {
    const o = document.getElementById('ovl'); if (!o) return;
    if (!S.busy) { o.className = ''; o.innerHTML = ''; return; }
    o.className = 'ovl';
    if (S.busy.kind === 'ready') { o.innerHTML = `<div><div class="spinner"></div><div style="font-size:26px;font-weight:700">Getting it ready…</div><div class="t">Practice speed ${S.speed}%</div></div>`; return; }
    const labels = S.busy.beats === 4 ? [5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7, 8];
    const k = Math.max(0, S.busy.k || 0);
    o.innerHTML = `<div><div class="n flash">${labels[Math.min(k, labels.length - 1)]}</div><div class="t">Count-in · ${esc(R().sections[secIndexAt(R(), S.t)].n)} starts after ${labels[labels.length - 1]}</div></div>`;
  }

  // ---------- Playback (fake: only time moves) ----------
  function startCount(then) {
    const r = R(), beatReal = (60 / r.bpm) / (S.speed / 100);
    S.busy = { kind: 'count', beats: S.countIn, start: performance.now(), beatReal, k: 0, then };
    renderOverlay(); update();
  }
  function go(i, withCount = true) {
    const r = R(); S.t = r.sections[i].t; S.busy = null;
    if (S.loopSec != null && S.loopSec !== i) S.loopSec = null;
    if (withCount && S.countIn > 0) { S.playing = false; startCount(() => { S.playing = true; }); } else S.playing = true;
    render();
  }
  function nextRoutine() {
    const k = S.order.indexOf(S.cur);
    if (k < S.order.length - 1) { S.cur = S.order[k + 1]; S.t = 0; S.loopSec = null; render(); toast(`Now playing: ${R().name}`); }
    else { S.t = R().dur; S.playing = false; render(); toast('End of the set list.'); }
  }
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (S.busy) {
      if (S.busy.kind === 'count') {
        const k = Math.floor((now - S.busy.start) / (S.busy.beatReal * 1000));
        if (k >= S.busy.beats) { const f = S.busy.then; S.busy = null; f(); renderOverlay(); } else if (k !== S.busy.k) { S.busy.k = k; renderOverlay(); }
      } else if (now >= S.busy.until) { const f = S.busy.then; S.busy = null; f(); renderOverlay(); }
    } else if (S.playing) {
      const r = R(); S.t += dt * S.speed / 100;
      if (S.loopSec != null && S.t >= secEnd(r, S.loopSec)) {
        S.t = r.sections[S.loopSec].t;
        if (S.loopCount && S.countIn > 0) { S.playing = false; startCount(() => { S.playing = true; }); }
      }
      if (S.t >= r.dur) nextRoutine();
    }
    update();
  }
  setInterval(() => tick(performance.now()), 33); // a timer, not requestAnimationFrame: keeps running in hidden test panes too

  let toastTimer = 0;
  function toast(msg, ms = 3000) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), ms);
  }

  // ---------- Clicks ----------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]'), sp = e.target.closest('[data-speed]'), ci = e.target.closest('[data-count]');
    const g = e.target.closest('[data-go]'), lp = e.target.closest('[data-loop]'), seek = e.target.closest('[data-seek]'), ri = e.target.closest('[data-r]');
    if (a) {
      const act = a.dataset.a;
      if (act === 'play') {
        if (S.busy) { S.busy = null; S.playing = false; renderOverlay(); }
        else { if (!S.playing && S.t >= R().dur - 0.05) S.t = 0; S.playing = !S.playing; }
        update(); return;
      }
      if (act === 'big') { S.big = !S.big; render(); return; }
      if (act === 'set') { S.setOpen = !S.setOpen; render(); return; }
      if (act === 'loopcount') { S.loopCount = a.checked; return; }
      if (act === 'addr') { toast('In the real app this opens Google\'s file picker to pick a project.'); return; }
      if (act === 'prev' || act === 'next') {
        const r = R(), i = secIndexAt(r, S.t);
        const to = act === 'next' ? Math.min(r.sections.length - 1, i + 1) : (S.t - r.sections[i].t > 2 || i === 0 ? i : i - 1);
        go(to); return;
      }
    }
    if (sp) {
      const v = +sp.dataset.speed; if (v === S.speed) return;
      const was = S.playing; S.speed = v; S.playing = false;
      S.busy = { kind: 'ready', until: performance.now() + 1300, then: () => { S.playing = was; } };
      render(); return;
    }
    if (ci) { S.countIn = +ci.dataset.count; render(); return; }
    if (lp) {
      const i = +lp.dataset.loop;
      if (S.loopSec === i) { S.loopSec = null; render(); toast('Loop off.'); return; }
      S.loopSec = i; const r = R(), cur = secIndexAt(r, S.t);
      if (cur !== i || !S.playing) go(i); else render();
      toast(`Looping "${r.sections[i].n}".`); return;
    }
    if (g) { go(+g.dataset.go); return; }
    if (seek) {
      const rect = seek.getBoundingClientRect(); S.t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * R().dur;
      if (S.loopSec != null) { const i = secIndexAt(R(), S.t); if (i !== S.loopSec) S.loopSec = null; render(); }
      update(); return;
    }
    if (ri && !e.target.closest('.sl-grip')) { if (ri.dataset.r !== S.cur) { S.cur = ri.dataset.r; S.t = 0; S.loopSec = null; S.busy = null; render(); } }
  });

  // Set list drag-to-reorder.
  let dragId = null;
  document.addEventListener('dragstart', (e) => { const it = e.target.closest('[data-r]'); if (!it) return; dragId = it.dataset.r; it.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
  document.addEventListener('dragover', (e) => { if (dragId && e.target.closest('[data-r]')) e.preventDefault(); });
  document.addEventListener('drop', (e) => {
    const it = e.target.closest('[data-r]'); if (!dragId || !it) return; e.preventDefault();
    const from = S.order.indexOf(dragId); S.order.splice(from, 1);
    const to = S.order.indexOf(it.dataset.r), r = it.getBoundingClientRect();
    S.order.splice(e.clientY > r.top + r.height / 2 ? to + 1 : to, 0, dragId); dragId = null; render();
  });
  document.addEventListener('dragend', () => { dragId = null; document.querySelectorAll('.dragging').forEach((x) => x.classList.remove('dragging')); });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); document.querySelector('[data-a="play"]').click(); }
    if (e.key === 'Escape' && S.big) { S.big = false; render(); }
  });
  window.addEventListener('resize', drawWave);
  render();
})();
