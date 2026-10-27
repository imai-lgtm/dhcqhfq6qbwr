// りゅうがしばく — ベルトスクロールの本体
// 画面は 256×240（ファミコンと同じ）。座標：x＝横、y＝床の奥行き（足元）、z＝高さ（上がマイナス）
(() => {
  'use strict';
  const D = window.DATA, A = window.AUDIO;
  const $ = (id) => document.getElementById(id);
  const app = $('app');
  const Q = new URLSearchParams(location.search);
  const FAST = Q.has('fast');     // テスト用：待ち時間を短くする
  const W = 256, H = 240, GRAV = .32;
  const FT = D.FLOOR.top, FB = D.FLOOR.bottom;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, FAST ? Math.min(ms, 150) : ms));
  const until = (fn) => new Promise((r) => { const t = setInterval(() => { if (fn()) { clearInterval(t); r(); } }, 50); });

  // ───── 画面の形 ─────
  const LAYOUT = { port: { W: 390, H: 844 }, land: { W: 1280, H: 720 } };
  // スマホ縦は、横幅を画面にぴったり合わせ、縦の長さは画面の形に合わせて伸び縮みさせる（680〜900）
  const portH = () => Math.round(Math.max(680, Math.min(900, innerHeight * 390 / innerWidth)));
  function fit() {
    const land = innerWidth > innerHeight * 1.05;
    if (!land) LAYOUT.port.H = portH();
    const L = land ? LAYOUT.land : LAYOUT.port;
    app.classList.toggle('land', land);
    app.style.width = L.W + 'px'; app.style.height = L.H + 'px'; app.style.setProperty('--H', L.H + 'px');
    app.style.setProperty('--s', Math.min(innerWidth / L.W, innerHeight / L.H));
    if (!land) {
      const padH = Math.max(262, Math.min(372, L.H - 472));               // コントローラーの高さ
      const avail = L.H - 16 - padH - 14 - 38;                               // テレビに使える高さ
      const s = Math.min(1.4, (avail - 66) / 240);                           // ゲーム画面の拡大率
      const tvH = Math.round(240 * s + 66);
      const v = { '--padH': padH, '--tvH': tvH, '--recH': Math.round(240 * s + 12), '--nesL': Math.round((390 - 256 * s) / 2), '--cabT': 38 + tvH, '--cabH': L.H - 16 - padH - 38 - tvH };
      for (const [k, x] of Object.entries(v)) app.style.setProperty(k, x + 'px');
      app.style.setProperty('--nesS', s.toFixed(3));
      document.getElementById('pad').classList.toggle('short', padH < 330);
    }
  }
  addEventListener('resize', fit);
  fit();

  // ───── 音 ─────
  A.init({
    se: ['tap', 'start', 'swing', 'hit_light', 'hit_mid', 'hit_heavy', 'harisen', 'kick_heavy', 'down', 'falldown', 'jump', 'land',
      'item_get', 'eat', 'text_impact', 'title_impact', 'hajime', 'metal_logo', 'kira', 'snore', 'throw', 'paper', 'fanfare', 'cracker',
      'cheer', 'wrong', 'levelup', 'cursor', 'chin', 'brick', 'door_open', 'rank', 'despair', 'warp', 'hyoushigi'],
    voice: ['ryu_start', 'ryu_kiwami', 'ryu_oops', 'miya_down', 'soma_sleep', 'soma_wake', 'shacho_intro', 'shacho_noeffect', 'shacho_daruma', 'shacho_birthday'],
  });
  const muteBtn = $('mute');
  const syncMute = () => muteBtn.classList.toggle('off', A.muted);
  muteBtn.addEventListener('click', () => { A.unlock(); A.setMuted(!A.muted); syncMute(); });
  syncMute();

  // ───── 記録 ─────
  const SAVE_KEY = 'ryuga_save_v1';
  const save = { best: 0, bestRank: -1 };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (_) { }
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) { } };

  // ───── 絵（背景・ドット絵） ─────
  const IMG = {};
  function loadImg(key, src) { const im = new Image(); im.onload = () => { im.ok = true; }; im.src = src; IMG[key] = im; return im; }
  ['stage1', 'stage2', 'stage3', 'ending'].forEach((k) => loadImg(k, `assets/bg/${k}.png`));
  const SPR = {};   // キャラ名 → { img, w, h, idx: {フレーム名: 番号} }
  (function loadSprites() {
    const s = document.createElement('script');
    s.src = 'assets/sprites/sprites.js';
    s.onload = () => {
      for (const [name, m] of Object.entries(window.SPRITES || {})) {
        const idx = {};
        (m.frames || []).forEach((f, i) => { idx[f] = i; });
        SPR[name] = { img: loadImg('spr_' + name, 'assets/sprites/' + (m.file || name + '.png')), w: m.w || 56, h: m.h || 56, idx };
      }
    };
    document.head.appendChild(s);   // まだ無いときは四角で代わりに描く
  })();

  const cv = $('cv'), ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // 足元 (x, y) に、右向き基準の絵を描く。frames は候補を順に探す
  function sprite(name, frames, x, y, face) {
    const s = SPR[name];
    if (!s || !s.img.ok) return false;
    let i;
    for (const f of frames) if (f in s.idx) { i = s.idx[f]; break; }
    if (i === undefined) i = 0;
    const top = y - (s.h - 1);
    if (face < 0) {
      ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1);
      ctx.drawImage(s.img, i * s.w, 0, s.w, s.h, -Math.floor(s.w / 2), top, s.w, s.h);
      ctx.restore();
    } else ctx.drawImage(s.img, i * s.w, 0, s.w, s.h, x - Math.floor(s.w / 2), top, s.w, s.h);
    return true;
  }
  // ドット絵がまだ無い時の代わり（体と頭の四角）
  const FB_COL = { ryu: ['#f8f8f8', '#2a1a10'], naka: ['#2858b8', '#3a2a20'], dani: ['#e0e0e0', '#101010'], miya: ['#d8a040', '#c8c8c8'],
    soma: ['#405890', '#201810'], shacho: ['#303030', '#302018'], okusan: ['#f0a8b8', '#402818'] };
  function fallback(name, x, y, face, st) {
    const [body, head] = FB_COL[name] || ['#888', '#444'];
    if (st && st.startsWith('down')) { ctx.fillStyle = body; ctx.fillRect(x - 14, y - 8, 22, 8); ctx.fillStyle = head; ctx.fillRect(x + 8 * -face - 4, y - 9, 10, 9); return; }
    ctx.fillStyle = '#203060'; ctx.fillRect(x - 6, y - 16, 12, 16);
    ctx.fillStyle = body; ctx.fillRect(x - 8, y - 34, 16, 18);
    ctx.fillStyle = '#e8b088'; ctx.fillRect(x - 5, y - 44, 10, 10);
    ctx.fillStyle = head; ctx.fillRect(x - (name === 'ryu' ? 8 : 6), y - (name === 'ryu' ? 50 : 46), name === 'ryu' ? 16 : 12, name === 'ryu' ? 8 : 4);
    if (/punch|kick|attack|throw/.test(st || '')) { ctx.fillStyle = '#fff'; ctx.fillRect(face > 0 ? x + 8 : x - 22, y - 30, 14, 4); }
  }
  // 小物（箱・ロッカー・アイテム・飛び道具）
  function object(name, frame, x, y, face = 1) {
    if (sprite(name, [frame, name], x, y, face)) return;
    for (const s of Object.keys(SPR)) if (frame in SPR[s].idx && sprite(s, [frame], x, y, face)) return;
    const c = { box: '#a07038', box_broken: '#6a4a24', locker_closed: '#8890a0', locker_open: '#5a6070', ramen: '#f0c040', daruma: '#d82010',
      fukuzasa: '#40a040', karaage: '#a85818', paper: '#f8f8f8' }[frame] || '#888';
    const sz = { box: [24, 18], box_broken: [26, 6], locker_closed: [20, 24], locker_open: [20, 24] }[frame] || [8, 8];
    ctx.fillStyle = c; ctx.fillRect(x - sz[0] / 2, y - sz[1], sz[0], sz[1]);
  }

  // ───── 入力（キーボード・画面のボタン） ─────
  const K = { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, c: 0 };
  const P = {};   // このフレームで押された瞬間
  const KEYMAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
    KeyZ: 'a', KeyJ: 'a', Enter: 'a', KeyX: 'b', KeyK: 'b', Space: 'b', KeyC: 'c', KeyL: 'c' };
  function press(k) { if (!K[k]) P[k] = 1; K[k] = 1; }
  function release(k) { K[k] = 0; }
  addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); togglePause(); return; }
    const k = KEYMAP[e.code];
    if (!k) return;
    e.preventDefault();
    if (e.repeat) return;
    A.unlock();
    if (scene === 'title' && (e.code === 'Enter' || e.code === 'KeyZ' || e.code === 'Space')) { begin(); return; }
    press(k);
  });
  addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) release(k); });
  addEventListener('blur', () => { for (const k in K) K[k] = 0; });

  const dpad = $('dpad');
  const dpadEl = { u: dpad.querySelector('.u'), d: dpad.querySelector('.d'), l: dpad.querySelector('.l'), r: dpad.querySelector('.r') };
  function setDir(k, on) { if (on && !K[k]) press(k); else if (!on && K[k]) release(k); dpadEl[k].classList.toggle('on', !!on); }
  function dpadMove(ev) {
    const r = dpad.getBoundingClientRect();
    const dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * .1) { ['u', 'd', 'l', 'r'].forEach((k) => setDir(k, false)); return; }
    const sec = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;   // 0:右 1:右下 2:下 … 7:右上（8方向）
    setDir('r', sec === 0 || sec === 1 || sec === 7); setDir('d', sec >= 1 && sec <= 3);
    setDir('l', sec >= 3 && sec <= 5); setDir('u', sec >= 5 && sec <= 7);
  }
  let dpadId = null;
  dpad.addEventListener('pointerdown', (ev) => { ev.preventDefault(); A.unlock(); dpadId = ev.pointerId; dpad.setPointerCapture(ev.pointerId); dpadMove(ev); });
  dpad.addEventListener('pointermove', (ev) => { if (ev.pointerId === dpadId) dpadMove(ev); });
  const dpadEnd = (ev) => { if (ev.pointerId !== dpadId) return; dpadId = null; ['u', 'd', 'l', 'r'].forEach((k) => setDir(k, false)); };
  dpad.addEventListener('pointerup', dpadEnd);
  dpad.addEventListener('pointercancel', dpadEnd);
  document.querySelectorAll('.btns button').forEach((b) => {
    const k = b.dataset.k || 'c';
    b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); A.unlock(); press(k); b.classList.add('on'); });
    const up = () => { release(k); b.classList.remove('on'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });
  $('nes').addEventListener('pointerdown', () => { A.unlock(); P.tap = 1; });
  // START＝ポーズ、SELECT＝音のオン/オフ
  function togglePause() {
    if (scene !== 'play' || !G || !G.st) return;
    if (G.pause === 'pause') { G.pause = null; $('pausebox').classList.remove('on'); A.se('tap'); }
    else if (!G.pause) { G.pause = 'pause'; for (const k in K) K[k] = 0; $('pausebox').classList.add('on'); A.se('tap'); }
  }
  $('btnPause').addEventListener('pointerdown', (ev) => { ev.preventDefault(); A.unlock(); togglePause(); });
  $('btnSelect').addEventListener('pointerdown', (ev) => { ev.preventDefault(); A.unlock(); A.setMuted(!A.muted); syncMute(); });

  // ───── 画面の切りかえ ─────
  let scene = 'title';
  function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); }
  function setScene(n) { scene = n; $('nes').classList.toggle('ending', n === 'ending'); }

  // ───── ゲームの状態 ─────
  let G = null, TB = null, CARD = null, E = null;
  const textLog = [];
  function newGame() {
    return {
      t: 0, si: 0, st: null, cam: 0, wave: 0, locked: false, en: [], pr: [], drops: [], fx: [], props: [], engaged: new Set(),
      items: new Set((Q.get('items') || '').split(',').filter((k) => k in D.ITEMS)), seen: new Set(),
      score: 0, ko: 0, combo: 0, comboT: 0, maxCombo: 0, deaths: 0, stop: 0, shake: 0, flash: 0, gold: 0,
      pause: 'story', boss: null, bossT: 0, retry: false, hint: null, cleared: false, uid: 0, noEffT: 0, goldShown: false,
      p: { x: 30, y: 200, z: 0, vx: 0, vy: 0, vz: 0, face: 1, hp: D.PLAYER.hp, max: D.PLAYER.hp, gauge: 0, st: 'idle', ft: 0, inv: 0, hit: new Set(), buf: false },
    };
  }
  const hasAll = () => G.items.has('daruma') && G.items.has('fukuzasa');

  // ───── 吹き出し文字・メッセージ ─────
  const pops = $('pops');
  function pop(text, o, color = '#ffd23a') {
    const el = document.createElement('div');
    el.className = 'pop'; el.textContent = text; el.style.color = color;
    el.style.left = Math.round(o.x - G.cam) + 'px';
    el.style.top = Math.round(o.y + (o.z || 0) - 58) + 'px';
    el.style.translate = '-50% 0';
    pops.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
  function msg(text) { const m = $('msg'); m.textContent = text; m.classList.remove('on'); void m.offsetWidth; m.classList.add('on'); }
  function fx(kind, x, y, z) { G.fx.push({ kind, x, y, z: z || 0, t: 0 }); }

  // ───── 文字の箱（ファミコンの会話） ─────
  // lines：文字列、または { t: 文字, v: 声, se: 効果音, choice: true（A/B で選ぶ） }
  function say(lines) {
    return new Promise((res) => {
      const prev = G.pause;
      G.pause = 'text';
      TB = { lines, i: 0, n: 0, age: 0, res: (v) => { G.pause = prev === 'text' ? null : prev; res(v); } };
      showLine();
    });
  }
  function showLine() {
    const L = TB.lines[TB.i];
    TB.cur = typeof L === 'string' ? { t: L } : L;
    textLog.push(TB.cur.t); if (textLog.length > 60) textLog.shift();   // テスト用：出た文字の記録
    TB.n = 0; TB.age = 0;
    if (TB.cur.v) A.voice(TB.cur.v);
    if (TB.cur.se) A.se(TB.cur.se);
    $('tbText').textContent = '';
    $('textbox').classList.add('on');
  }
  function tbStep() {
    const len = TB.cur.t.length;
    const before = Math.floor(TB.n);
    if (TB.n < len) TB.n = Math.min(len, TB.n + (FAST ? 99 : .75));
    const now = Math.floor(TB.n);
    if (now !== before) { $('tbText').textContent = TB.cur.t.slice(0, now); if (now % 4 === 0 && now < len) A.se('cursor', { vol: .18 }); }
    TB.age++;
    if (TB.age < 8) return;
    const finish = (v) => { $('textbox').classList.remove('on'); const r = TB.res; TB = null; r(v); };
    if (TB.cur.choice) {
      if (TB.n < len) { if (P.a || P.b || P.tap) TB.n = len; return; }
      if (P.a || P.tap) { A.se('tap'); finish(true); } else if (P.b) { A.se('tap'); finish(false); }
      return;
    }
    if (P.a || P.b || P.tap || (FAST && TB.age > 12)) {
      if (TB.n < len) { TB.n = len; $('tbText').textContent = TB.cur.t; return; }
      TB.i++;
      if (TB.i >= TB.lines.length) finish(true); else showLine();
    }
  }

  // ───── 名前テロップ（龍が如く風） ─────
  function card(type) {
    return new Promise((res) => {
      const c = D.CARDS[type], el = $('card'), prev = G.pause;
      G.pause = 'card';
      $('cardImg').src = `assets/photo/${c.photo}.webp`;
      $('cardRole').textContent = c.role; $('cardName').innerHTML = c.name.replace(/・/g, '・<wbr>'); $('cardCatch').textContent = c.catch;   // 名前は「・」の所でだけ改行する
      el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
      A.se('text_impact');
      CARD = { t: 0, done: () => { if (!CARD) return; CARD = null; el.classList.remove('on'); G.pause = prev === 'card' ? null : prev; res(); } };
      setTimeout(() => CARD && CARD.done(), FAST ? 250 : 2800);
    });
  }

  // ───── 主人公 ─────
  const ATK = {
    punch1: { len: 15, a0: 3, a1: 7, reach: 30, dmg: D.ATTACK.punch1, next: 'punch2', se: 'hit_light' },
    punch2: { len: 15, a0: 3, a1: 7, reach: 32, dmg: D.ATTACK.punch2, next: 'kick', se: 'hit_mid' },
    kick: { len: 26, a0: 6, a1: 12, reach: 40, dmg: D.ATTACK.kick, kd: true, se: 'harisen' },
    jumpkick: { reach: 36, dmg: D.ATTACK.jumpkick, kd: true, se: 'harisen' },
  };
  const ATTACKING = ['punch1', 'punch2', 'kick', 'jump', 'jumpkick'];
  function setP(st) { const p = G.p; p.st = st; p.ft = 0; p.hit = new Set(); p.buf = false; }
  function updPlayer() {
    const p = G.p;
    p.ft++;
    if (p.inv > 0) p.inv--;
    if (p.z < 0 || p.vz < 0) {
      p.vz += GRAV; p.z += p.vz; p.x += p.vx; p.y = clamp(p.y + p.vy, FT, FB);
      if (p.z >= 0) {
        p.z = 0; p.vz = 0; p.vx = 0; p.vy = 0;
        if (p.st === 'jump' || p.st === 'jumpkick') { setP('land'); A.se('land', { vol: .4 }); }
        else if (p.st === 'down') { A.se('falldown', { vol: .5 }); fx('dust', p.x, p.y); p.ft = 0; }
      }
    }
    const dx = (K.r ? 1 : 0) - (K.l ? 1 : 0), dy = (K.d ? 1 : 0) - (K.u ? 1 : 0);
    const kiwami = P.c || (K.a && K.b && (P.a || P.b));
    if (kiwami && p.gauge >= 100 && ['idle', 'walk', 'land', 'punch1', 'punch2', 'kick'].includes(p.st)) { startKiwami(); return; }
    switch (p.st) {
      case 'land': if (p.ft < 5) break;   // 着地のすき
      // fallthrough
      case 'idle': case 'walk':
        if (P.c) pop('ゲージが たりない', p, '#9cf');
        if (P.a) { setP('punch1'); A.se('swing', { vol: .5, rate: 1.1 }); break; }
        if (P.b) { setP('jump'); p.vz = -4.6; p.vx = dx * 1.5; p.vy = dy * .6; A.se('jump', { vol: .5 }); break; }
        if (dx || dy) {
          p.x += dx * D.PLAYER.speed; p.y += dy * D.PLAYER.speedY;
          if (dx) p.face = dx;
          if (p.st !== 'walk') setP('walk');
        } else if (p.st !== 'idle') setP('idle');
        break;
      case 'punch1': case 'punch2': case 'kick': {
        const a = ATK[p.st];
        if (p.st === 'kick' && p.ft === a.a0) p.x += p.face * 3;
        if (p.ft >= a.a0 && p.ft <= a.a1) attackCheck(a);
        if (P.a && p.ft >= 2) p.buf = true;
        if (a.next && p.buf && p.ft >= a.len - 6) { setP(a.next); A.se('swing', { vol: .5, rate: a.next === 'kick' ? .8 : 1.2 }); }
        else if (p.ft >= a.len) setP('idle');
        break;
      }
      case 'jump': if (P.a) { setP('jumpkick'); A.se('swing', { vol: .5, rate: .9 }); } break;
      case 'jumpkick': attackCheck(ATK.jumpkick); break;
      case 'hurt': if (p.ft >= 18) setP('idle'); break;
      case 'down':
        if (p.z < 0) break;
        if (p.hp <= 0) { if (p.ft === 90) playerDied(); }
        else if (p.ft >= 50) { setP('idle'); p.inv = 70; }
        break;
    }
    p.y = clamp(p.y, FT, FB);
    p.x = clamp(p.x, G.cam + 10, Math.min(G.cam + W - 10, G.st.w - 10));
    if (p.z >= -8) pushOut(p);
  }
  // 机などの「入れない所」から押し出す（いちばん近い辺へ）
  function pushOut(o) {
    for (const b of G.st.blocks || []) {
      if (o.x <= b.x0 || o.x >= b.x1 || o.y <= b.y0 || o.y >= b.y1) continue;
      const dl = o.x - b.x0, dr = b.x1 - o.x, dd = b.y1 - o.y, m = Math.min(dl, dr, dd);
      if (m === dd) o.y = b.y1; else if (m === dl) o.x = b.x0; else o.x = b.x1;
    }
  }
  function attackCheck(a) {
    const p = G.p;
    for (const e of G.en) {
      if (p.hit.has(e) || !hittable(e)) continue;
      const rx = (e.x - p.x) * p.face;
      if (rx < -6 || rx > a.reach || Math.abs(e.y - p.y) > 10 || Math.abs(e.z - p.z) > 26) continue;
      p.hit.add(e);
      hitEnemy(e, a.dmg, a.kd, a.se, p.face);
    }
    for (const o of G.props) {
      if (o.broken || p.hit.has(o)) continue;
      const rx = (o.x - p.x) * p.face;
      if (rx < -8 || rx > a.reach + 6 || Math.abs(o.y - p.y) > 14) continue;
      p.hit.add(o);
      hitProp(o);
    }
  }
  function gainGauge(n) {
    const p = G.p, was = p.gauge;
    p.gauge = Math.min(100, p.gauge + n);
    if (was < 100 && p.gauge >= 100) { A.se('levelup', { vol: .6 }); pop('極しばき OK！', p, '#ffd23a'); }
  }
  function hurtPlayer(dmg, kd, dir) {
    const p = G.p;
    if (p.inv > 0 || p.st === 'down' || p.st === 'kiwami' || Q.has('god')) return false;
    p.hp = Math.max(0, p.hp - dmg);
    G.combo = 0; gainGauge(5);
    A.se(kd ? 'hit_heavy' : 'hit_mid'); G.shake = 5; G.stop = 3; G.flash = 4;
    fx('hit', p.x, p.y, p.z - 26);
    if (p.hp <= 0 || kd) { setP('down'); p.vz = -2.6; p.vx = dir * 1.6; p.vy = 0; }
    else { setP('hurt'); p.x += dir * 3; }
    return true;
  }

  // ───── 極しばき（ゲージ満タンの必殺技） ─────
  async function startKiwami() {
    const p = G.p;
    p.gauge = 0; setP('kiwami'); p.inv = 999;
    G.pause = 'kiwami'; G.kiwamiT = 0;
    A.se('title_impact'); A.voice('ryu_kiwami');
    const k = $('kiwami'); k.classList.remove('on'); void k.offsetWidth; k.classList.add('on');
    await wait(950);
    G.pause = null;
    for (const e of G.en) {
      if (e.dead || e.x < G.cam - 8 || e.x > G.cam + W + 8) continue;
      hitEnemy(e, D.ATTACK.kiwami, true, 'kick_heavy', e.x >= p.x ? 1 : -1, true);
    }
    for (const o of G.props) if (!o.broken && o.x > G.cam && o.x < G.cam + W) { o.hp = 1; hitProp(o); }
    G.shake = 20; G.flash = 0;
    setP('idle'); p.inv = 40;
  }

  // ───── 敵 ─────
  function spawn(type, x, y) {
    const d = D.ENEMY[type];
    const e = { type, d, x, y, z: 0, vx: 0, vz: 0, face: -1, hp: d.hp, max: d.hp, st: 'idle', ft: 0, cool: rnd(30, 80), inv: 0,
      poseCool: 60, poise: 0, slot: ++G.uid, dead: false, gone: false };
    if (type === 'soma') { e.phase = 'sleep'; e.pt = 0; e.sleepLen = 330; e.punish = 0; e.st = 'sleep'; }
    G.en.push(e);
    return e;
  }
  function setE(e, st) { e.st = st; e.ft = 0; e.hitDone = false; }
  const hittable = (e) => !e.dead && e.st !== 'down' && e.inv <= 0;

  function hitEnemy(e, dmg, kd, se, dir, big) {
    if (!big && e.type === 'dani' && e.st === 'pose') { pop('MISS', e, '#9cf'); A.se('kira', { vol: .5 }); return; }
    if (!big && e.type === 'soma' && e.phase !== 'sleep') { pop('ん？', e, '#f88'); somaPunish(e, true); return; }
    if (e.type === 'shacho' && !hasAll()) { noEffect(e); return; }
    if (e.type === 'naka' && e.st === 'sleep') { dmg *= 2; pop('ねてる×2', e, '#ff8'); }
    if (e.type === 'shacho' && !G.goldShown) { G.goldShown = true; msg(D.TEXT.gold); A.se('kira'); G.gold = 90; }
    e.hp -= dmg;
    G.stop = big ? 10 : 4; G.shake = Math.max(G.shake, kd ? 6 : 2);
    A.se(se);
    fx(big ? 'big' : 'hit', e.x, e.y, e.z - 26);
    if (!big) gainGauge(7);
    G.combo++; G.comboT = 90; G.maxCombo = Math.max(G.maxCombo, G.combo);
    G.score += 10 * Math.min(G.combo, 10);
    if (G.combo >= 3) pop(`${G.combo} HIT`, { x: G.p.x, y: G.p.y, z: G.p.z - 14 }, '#fff');
    if (e.hp <= 0) { e.hp = 0; e.dead = true; knock(e, dir); defeated(e); return; }
    if (e.type === 'soma') { if (Math.random() < .3) pop('ぐぅ…', e, '#ccc'); return; }   // 寝たまま
    if (e.d.boss) {
      e.poise += dmg;
      if (big || (kd && e.poise >= 4)) { e.poise = 0; knock(e, dir); }
      else if (e.st !== 'windup' && e.st !== 'attack' && e.st !== 'throw') { setE(e, 'hurt'); e.stun = 8; }
      return;
    }
    if (kd) knock(e, dir);
    else { setE(e, 'hurt'); e.stun = 16; e.x += dir * 3; }
  }
  function knock(e, dir) {
    setE(e, 'down');
    if (e.type === 'soma') { e.vz = -1.5; return; }
    e.vz = -2.8; e.vx = dir * 1.8;
  }
  function defeated(e) {
    G.ko++; G.score += e.d.score;
    if (e.type === 'miya') { A.voice('miya_down'); pop('まだまだ、現役やで……', e, '#fff'); }
    if (e.type === 'soma') { pop('……すぴー', e, '#fff'); G.chair = { x: e.x, y: e.y - .5 }; }
    if (e.d.boss) { G.stop = 30; G.shake = 16; A.se('hit_heavy'); }
  }
  function noEffect(e) {
    e.laughT = 40;
    pop(D.TEXT.noEffect, e, '#ccc');
    A.se('chin', { vol: .5 });
    fx('hit', e.x, e.y, e.z - 30);
    const now = performance.now();
    if (now - G.noEffT > 3500) { G.noEffT = now; A.voice('shacho_noeffect'); }
  }

  function updEnemy(e) {
    e.ft++;
    if (e.inv > 0) e.inv--;
    if (e.cool > 0) e.cool--;
    if (e.poseCool > 0) e.poseCool--;
    if (e.laughT > 0) e.laughT--;
    if (e.z < 0 || e.vz < 0) {
      e.vz += GRAV; e.z += e.vz; e.x += e.vx;
      if (e.z >= 0) {
        e.z = 0; e.vz = 0; e.vx = 0;
        if (e.st === 'down') { A.se('falldown', { vol: .45 }); G.shake = Math.max(G.shake, 3); fx('dust', e.x, e.y); e.ft = 0; }
      }
      return;
    }
    if (e.st === 'down') {
      if (e.dead) { if (e.ft > 70) e.gone = true; }
      else if (e.ft >= 50) { setE(e, e.type === 'soma' ? 'sleep' : 'idle'); e.inv = 40; }
      return;
    }
    if (e.st === 'hurt') { if (e.ft >= (e.stun || 14)) setE(e, 'idle'); return; }
    if (e.type === 'soma') return somaAI(e);
    const p = G.p, dx = p.x - e.x, dy = p.y - e.y;
    switch (e.st) {
      case 'windup': if (e.ft >= e.d.windup) { setE(e, 'attack'); A.se('swing', { vol: .4, rate: .9 }); } return;
      case 'attack': {
        if (e.ft >= 2 && e.ft <= 7 && !e.hitDone) {
          const rx = (p.x - e.x) * e.face;
          if (rx >= -4 && rx <= e.d.reach + 2 && Math.abs(dy) <= 10 && p.z > -18) { e.hitDone = true; hurtPlayer(e.d.dmg, e.type === 'shacho', e.face); }
        }
        if (e.ft >= 16) { setE(e, 'idle'); e.cool = e.d.cool * rnd(.7, 1.3); }
        return;
      }
      case 'sleep': if (e.ft >= 160) { setE(e, 'idle'); pop('はっ！', e, '#fff'); } return;
      case 'pose': if (e.ft >= 45) setE(e, 'idle'); return;
      case 'call': if (e.ft >= 45) setE(e, 'idle'); return;
      case 'throw':
        if (e.ft === 18) { G.pr.push({ kind: 'karaage', x: e.x + e.face * 14, y: e.y, z: -24, vx: e.face * 2.2, vy: 0, dmg: 1, t: 0 }); A.se('throw', { vol: .6 }); }
        if (e.ft >= 34) { setE(e, 'idle'); e.cool = 100; }   // からあげを投げた後は少し休む
        return;
    }
    // ここから：うろうろ・近づく
    e.face = dx >= 0 ? 1 : -1;
    if (e.type === 'naka' && Math.random() < 1 / 420) { setE(e, 'sleep'); pop(D.TEXT.nakaSleep, e, '#fff'); A.se('snore', { vol: .35 }); return; }
    if (e.type === 'dani' && e.poseCool <= 0 && ATTACKING.includes(p.st) && Math.abs(dx) < 46 && Math.abs(dy) < 14) {
      e.poseCool = 140;
      if (Math.random() < .4) { setE(e, 'pose'); pop(D.TEXT.daniPose, e, '#9cf'); A.se('kira', { vol: .6 }); return; }
    }
    if (e.type === 'miya' && Math.abs(dx) > 70 && e.cool <= 0 && Math.random() < .03) { setE(e, 'throw'); pop('からあげ！', e, '#fc8'); return; }
    if (e.type === 'shacho') {
      G.bossT++;
      if (!e.called && ((hasAll() && e.hp < e.max * .6) || (!hasAll() && G.bossT > 700))) {
        e.called = true; setE(e, 'call');
        spawn('dani', G.cam - 30, 175); spawn('dani', G.cam + W + 30, 215);
        pop('来い、ダニエル！', e, '#fff');
      }
    }
    const engaged = G.engaged.has(e);
    const side = dx >= 0 ? -1 : 1;
    const tx = p.x + side * (engaged ? e.d.reach - 8 : 66);
    const ty = engaged ? p.y : clamp(p.y + (e.slot % 2 ? 24 : -24), FT, FB);
    const mx = Math.abs(tx - e.x) > 2 ? Math.sign(tx - e.x) : 0, my = Math.abs(ty - e.y) > 2 ? Math.sign(ty - e.y) * .7 : 0;
    e.x += mx * e.d.speed; e.y = clamp(e.y + my * e.d.speed, FT, FB);
    if ((mx || my) && e.st !== 'walk') setE(e, 'walk');
    else if (!mx && !my && e.st !== 'idle') setE(e, 'idle');
    if (engaged && e.cool <= 0 && p.st !== 'down' && Math.abs(dx) <= e.d.reach && Math.abs(dy) <= 6) setE(e, 'windup');
  }

  // 颯馬（中部支店長）：寝ている間だけしばける。起きている時に動くと書類が飛んでくる
  function somaAI(e) {
    const p = G.p;
    e.face = -1;
    if (e.st === 'throw') {
      if (e.ft === 10) {
        const dx = p.x - e.x, sp = 2.0, n = Math.max(1, Math.abs(dx) / sp);   // 書類は少しゆっくり（よけられる）
        G.pr.push({ kind: 'paper', x: e.x - 10, y: e.y, z: -26, vx: Math.sign(dx || -1) * sp, vy: clamp((p.y - e.y) / n, -1.2, 1.2), dmg: e.d.dmg, t: 0 });
        A.se('paper');
      }
      if (e.ft >= 26) setE(e, 'awake');
      return;
    }
    e.pt++;
    if (e.phase === 'sleep') {
      if (e.st !== 'sleep') setE(e, 'sleep');
      if (e.pt >= e.sleepLen) { e.phase = 'stir'; e.pt = 0; setE(e, 'stir'); pop('！？', e, '#f88'); A.se('chin', { vol: .6 }); }
    } else if (e.phase === 'stir') {
      if (e.pt >= 60) {   // 「！？」の合図から1秒で起きる
        e.phase = 'awake'; e.pt = 0; setE(e, 'awake');
        if (!e.saidWake) { e.saidWake = true; A.voice('soma_wake'); msg('起きている間は、じっとして！'); }
        pop('……ん？', e, '#fff');
      }
    } else {
      if (e.punish > 0) e.punish--;
      const moving = K.l || K.r || K.u || K.d || ATTACKING.includes(p.st);
      if (Math.abs(p.x - e.x) < 140 && moving && p.st !== 'down') somaPunish(e);
      if (e.pt >= 100) { e.phase = 'sleep'; e.pt = 0; e.sleepLen = rnd(290, 370);   // 寝ている時間 約5〜6秒・起きている時間 約1.7秒
        setE(e, 'sleep'); pop(D.TEXT.nakaSleep, e, '#fff'); A.se('snore', { vol: .4 }); }
    }
    if (!e.called && e.hp <= e.max / 2) {
      e.called = true;
      spawn('naka', G.cam + W + 30, 196);   // 応援は1人
      pop('……おうえん、よんどこ……', e, '#fff');
    }
  }
  function somaPunish(e, hit) {
    if (e.punish > 0 && !hit) return;
    e.punish = 90;   // 書類が続けて飛んでくる間隔（1.5秒）
    if (e.phase === 'stir') { e.phase = 'awake'; e.pt = 0; }
    setE(e, 'throw');
    pop('動いたな……', e, '#f88');
  }

  // ───── 飛び道具・小物・アイテム ─────
  function updProj() {
    const p = G.p;
    for (const q of G.pr) {
      q.t++; q.x += q.vx; q.y += q.vy;
      if (Math.abs(q.x - p.x) < 10 && Math.abs(q.y - p.y) < 8 && p.z > -20 && hurtPlayer(q.dmg, false, Math.sign(q.vx))) q.gone = true;
      if (q.x < G.cam - 24 || q.x > G.cam + W + 24 || q.t > 300) q.gone = true;
    }
    G.pr = G.pr.filter((q) => !q.gone);
  }
  function hitProp(o) {
    o.hp--; o.shake = 8;
    A.se('hit_light', { vol: .6 });
    if (o.hp > 0) return;
    o.broken = true;
    A.se(o.t === 'locker' ? 'door_open' : 'brick');
    fx('dust', o.x, o.y);
    const got = o.item && o.item !== 'ramen' && G.items.has(o.item);
    if (o.item && !got) G.drops.push({ kind: o.item, x: o.x + (o.t === 'locker' ? 0 : 8 * G.p.face), y: Math.min(o.y + (o.t === 'locker' ? 12 : 4), FB), z: -14, vz: -2.4 });
    else pop('からっぽ', o, '#ccc');
  }
  function updDrops() {
    const p = G.p;
    for (const it of G.drops) {
      if (it.z < 0 || it.vz < 0) { it.vz += GRAV; it.z += it.vz; if (it.z >= 0) { it.z = 0; it.vz = 0; } continue; }
      if (!it.gone && p.st !== 'down' && p.z > -8 && Math.abs(it.x - p.x) < 12 && Math.abs(it.y - p.y) < 9) { it.gone = true; pickup(it); }
    }
    G.drops = G.drops.filter((it) => !it.gone);
  }
  function pickup(it) {
    const p = G.p;
    if (it.kind === 'ramen') {
      const heal = D.ITEMS.ramen.heal;
      p.hp = Math.min(p.max, p.hp + heal); G.score += 100;
      A.se('eat'); pop(`ラーメン 体力+${heal}`, p, '#8f8');
      return;
    }
    G.items.add(it.kind); G.score += 1000;
    if (G.hint === it.kind) G.hint = null;
    A.se('item_get');
    say([`${D.ITEMS[it.kind].name}を 手に入れた！`, it.kind === 'daruma' ? '……なんで ダンボールに だるまが？' : '……なんで ロッカーに 福笹が？']);
  }

  // ───── カメラとウェーブ（画面が止まって、全員しばくまで進めない） ─────
  function updCam() {
    const st = G.st, p = G.p, nw = st.waves[G.wave];
    let max = st.w - W;
    if (G.locked) max = G.cam; else if (nw) max = Math.min(max, nw.x);
    G.cam = Math.min(Math.max(G.cam, p.x - 110), max);
    if (!G.locked && nw && G.cam >= nw.x) startWave(nw);
  }
  async function startWave(w) {
    G.locked = true;
    $('go').classList.remove('on');
    for (const s of w.enemies) { const e = spawn(s.t, w.x + s.dx, s.y); if (w.boss) G.boss = e; }
    if (w.boss) { A.bgm('boss'); G.bossT = 0; }
    const news = [...new Set(w.enemies.map((s) => s.t))].filter((t) => !G.seen.has(t));
    for (const t of news) { G.seen.add(t); await card(t); }
    if (w.boss) await bossIntro(G.boss);
  }
  async function bossIntro(e) {
    if (e.type === 'soma') {
      await say([{ t: '颯馬「……むにゃ……あと5分……。」', v: 'soma_sleep' }, '（寝ている間しか しばけない。\n起きている時に動くと、書類が飛んでくる！）']);
    } else if (e.type === 'shacho') {
      await say([{ t: '社長「龍……よう来たな。」', v: 'shacho_intro' }, '社長「奥さんは、この奥や。\n返してほしけりゃ、わしを しばいてみい。」']);
    } else if (e.type === 'miya') msg('焼肉の においがする……');
  }
  function checkWave() {
    if (!G.locked || G.pause) return;
    if (G.en.some((e) => !e.gone)) return;
    const w = G.st.waves[G.wave];
    G.locked = false; G.wave++;
    if (w.boss) { stageClear(); return; }
    const go = $('go'); go.classList.add('on'); A.se('cursor', { vol: .6 });
    setTimeout(() => go.classList.remove('on'), 2600);
  }

  // ───── ステージの流れ ─────
  async function startStage(i, first) {
    G.si = i; G.st = D.STAGES[i];
    Object.assign(G, { chair: null, cam: 0, wave: 0, locked: false, en: [], pr: [], drops: [], fx: [], boss: null, bossT: 0, stop: 0, shake: 0 });
    G.props = G.st.props.map((o) => ({ ...o, hp: o.t === 'locker' ? 3 : 2, broken: false, shake: 0 }));
    const p = G.p;
    Object.assign(p, { x: 30, y: 200, z: 0, vx: 0, vy: 0, vz: 0, face: 1, hp: p.max, inv: 0 });
    setP('idle');
    G.pause = 'stage';
    pops.innerHTML = '';
    $('stNum').textContent = `STAGE ${i + 1}`; $('stName').textContent = G.st.name;
    $('stageTitle').classList.add('on');
    A.bgm(null); A.se('hyoushigi');
    await wait(1900);
    $('stageTitle').classList.remove('on');
    A.bgm(G.st.bgm);
    if (i === 0 && first) await say([{ t: '龍之介「……しばいたる。」', v: 'ryu_start' }]);
    if (G.hint) msg(G.hint === 'daruma' ? 'ダンボール箱を しばいてみよう' : 'ロッカーを しばいてみよう');
    G.pause = null;
  }
  async function stageClear() {
    G.pause = 'clear'; G.boss = null;
    A.stopBgm(300); A.se('fanfare');
    setP('win');
    const bonus = G.p.hp * 100;
    G.score += bonus;
    msg(`STAGE CLEAR！\n体力ボーナス ${bonus}`);
    await wait(3200);
    if (G.si === 2) { ending(); return; }
    let next = G.si + 1;
    if (G.retry && hasAll()) next = 2;   // 取りに戻った物がそろったら、社長室へ直行
    startStage(next);
  }
  async function playerDied() {
    G.pause = 'dead'; G.deaths++;
    A.stopBgm(200);
    if (G.boss && G.boss.type === 'shacho' && !hasAll()) { shachoHint(); return; }
    A.bgm('gameover');
    const ok = await say(['龍之介は 力つきた……', { t: 'A：つづける（このステージの最初から）\nB：あきらめる', choice: true }]);
    if (ok) startStage(G.si); else result();
  }
  // 社長は、だるまと福笹を両方持っていないと しばけない（ここでネタばらし）
  async function shachoHint() {
    const miss = ['daruma', 'fukuzasa'].filter((k) => !G.items.has(k));
    await wait(600);
    const ok = await say([
      miss.includes('daruma') ? { t: '社長「' + D.TEXT.hint + '」', v: 'shacho_daruma' } : '社長「……福笹、持ってへんやろ？」',
      '社長「心電通はな、神頼みも本気なんや。」',
      ...miss.map((k) => `（${D.ITEMS[k].name}は、${D.ITEMS[k].note}にあるらしい……）`),
      { t: 'A：取りに戻る　B：あきらめる', choice: true },
    ]);
    if (!ok) { result(); return; }
    G.retry = true; G.hint = miss[0];
    startStage(miss[0] === 'daruma' ? 0 : 1);
  }

  // ───── エンディング ─────
  const ROLL = ['りゅうが しばく', '', '― しばかれた人たち ―', '', '中島 貴久（寝る人）', 'ボリバー・ダニエル（ポーズの人）', '宮本 吉康（焼肉の人）',
    '颯馬（寝る支店長）', '山本 雅希（黒幕・祝う人）', '', '― 祝ってくれた人 ―', '', '奥さん', '', '― しばいた人 ―', '', '龍之介', '', 'おんがく　魔王魂', '',
    'せいさく　株式会社 心電通', '', '', '龍くん、おめでとう。'];
  async function ending() {
    setScene('ending'); G.pause = 'ending'; G.cam = 0;
    E = { roll: -1, done: false, t: 0 };
    A.bgm('ending');
    await say([{ t: '……。' }]);
    E.party = true;   // 奥の扉から、奥さんとみんなが出てくる
    await say([{ t: D.TEXT.ending[0], se: 'cracker' }, D.TEXT.ending[1]]);
    E.gift = true; A.se('kira');
    await say([{ t: '社長「……誕生日、おめでとう。龍。」', v: 'shacho_birthday' }, '社長「奥さんに頼まれてな。\nみんなで準備しとったんや。」',
      { t: '龍之介「……しばいてもうた。」', v: 'ryu_oops' }]);
    A.se('cheer');
    E.roll = 0;
    await until(() => E.done);
    G.cleared = true;
    result();
  }
  function endingStep() {
    if (E.roll < 0) return;
    E.roll += (K.a || K.b || FAST) ? 3 : .45;
    if (E.roll > ROLL.length * 14 + 150) { E.t++; if (E.t > 150 || P.a || P.tap || FAST) E.done = true; }
  }

  // ───── 結果 ─────
  function rankIndex() { return G.cleared ? (G.deaths === 0 ? 4 : 3) : G.si; }
  function result() {
    scene = 'result'; G.pause = 'result';
    const ri = rankIndex(), rk = D.RANKS[ri];
    $('rName').textContent = rk.name; $('rNote').textContent = rk.note;
    $('rScore').textContent = G.score.toLocaleString(); $('rKo').textContent = G.ko; $('rCombo').textContent = G.maxCombo;
    save.best = Math.max(save.best, G.score); save.bestRank = Math.max(save.bestRank, ri); store();
    if (!G.cleared) A.bgm('gameover');
    show('result');
    const n = $('rName'); n.classList.remove('stamp'); void n.offsetWidth; n.classList.add('stamp');
    A.se('rank');
  }
  $('btnRetry').addEventListener('click', () => { A.se('tap'); startGame(0, true); });
  $('btnTitle').addEventListener('click', () => { A.se('tap'); toTitle(); });
  $('btnSave').addEventListener('click', () => { A.se('tap'); saveImage(); });
  async function saveImage() {
    const rk = D.RANKS[rankIndex()];
    const draw = async (withPhoto) => {
      const c = document.createElement('canvas'); c.width = 720; c.height = 960;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(360, 300, 50, 360, 400, 700); g.addColorStop(0, '#4a0c0a'); g.addColorStop(1, '#050205');
      x.fillStyle = g; x.fillRect(0, 0, 720, 960);
      x.strokeStyle = '#e8b84a'; x.lineWidth = 6; x.strokeRect(24, 24, 672, 912);
      x.textAlign = 'center';
      x.font = '92px Boku, serif'; x.fillStyle = '#e8b84a'; x.fillText('りゅうがしばく', 360, 140);
      if (withPhoto) { const im = new Image(); im.src = $('rPic').src; await im.decode(); const h = 360, w = im.width * h / im.height; x.drawImage(im, 360 - w / 2, 170, w, h); }
      x.font = '30px Maru, sans-serif'; x.fillStyle = '#d9c7a0'; x.fillText('あなたは', 360, 590);
      x.font = '62px Boku, serif'; x.fillStyle = '#fff'; x.fillText(rk.name, 360, 670);
      x.font = '38px Dela, sans-serif'; x.fillStyle = '#ffd23a'; x.fillText(`${G.score.toLocaleString()}点　${G.ko}人しばいた`, 360, 770);
      x.font = '26px Maru, sans-serif'; x.fillStyle = '#b9a98a'; x.fillText('株式会社 心電通', 360, 890);
      return c.toDataURL('image/png');
    };
    let url;
    try { url = await draw(true); } catch (_) { url = await draw(false); }
    const a = document.createElement('a'); a.href = url; a.download = 'ryuga-shibaku.png'; a.click();
  }

  // ───── タイトル ─────
  let busy = false;
  function toTitle() {
    scene = 'title'; busy = false;
    show('title');
    $('title').classList.remove('pix'); $('crumble').classList.remove('on'); $('crumble').innerHTML = '';
    $('best').textContent = save.best ? `ベストスコア ${save.best.toLocaleString()} 点` + (save.bestRank >= 0 ? `　／　${D.RANKS[save.bestRank].name}` : '') : '';
    A.bgm('title');
  }
  $('title').addEventListener('pointerdown', () => { A.unlock(); if (scene === 'title') A.bgm('title'); });
  $('btnStart').addEventListener('click', () => begin());
  $('btnCredits').addEventListener('click', () => { A.se('tap'); scene = 'credits'; show('credits'); });
  $('btnCreditsOk').addEventListener('click', () => { A.se('tap'); scene = 'title'; show('title'); });
  // 高画質のタイトルが、ファミコン画質に崩れてゲームが始まる
  async function begin() {
    if (busy || scene !== 'title') return;
    busy = true;
    A.unlock(); A.stopBgm(200); A.se('metal_logo');
    const t = $('title'), cr = $('crumble');
    t.classList.add('pix');
    const land = app.classList.contains('land'), cw = land ? 1280 : 390, ch = land ? 720 : LAYOUT.port.H, bs = land ? 64 : 30;
    let html = '';
    for (let y = 0; y < ch; y += bs) for (let x = 0; x < cw; x += bs) {
      html += `<i style="left:${x}px;top:${y}px;width:${bs}px;height:${bs}px;animation-delay:${Math.round(Math.random() * 500 + (y / ch) * 300)}ms"></i>`;
    }
    cr.innerHTML = html; cr.classList.add('on');
    await wait(1100);
    startGame(0);
  }
  let lastStart = -1e9;
  async function startGame(si, skipOpening) {
    if (performance.now() - lastStart < 1500) return;   // ボタンの2度押しで、ゲームが2つ同時に始まらないように
    lastStart = performance.now();
    G = newGame(); E = null; TB = null; CARD = null;
    setScene('play'); show('play'); busy = false;
    $('textbox').classList.remove('on'); $('card').classList.remove('on'); $('go').classList.remove('on'); $('pausebox').classList.remove('on');
    if (!skipOpening) { A.bgm(null); await say(D.TEXT.opening.map((t, i) => (i === 0 ? { t, se: 'hyoushigi' } : t))); }
    startStage(si, si === 0);
  }

  // ───── 毎フレームの更新 ─────
  function world() {
    if (G.stop > 0) { G.stop--; return; }
    G.t++;
    const p = G.p;
    const alive = G.en.filter((e) => !e.dead && e.type !== 'soma');
    const near = alive.filter((e) => !e.d.boss).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
    G.engaged = new Set([...alive.filter((e) => e.d.boss), ...near.slice(0, 2)]);
    updPlayer();
    for (const e of G.en) updEnemy(e);
    for (const a of G.en) for (const b of G.en) {   // 敵同士が重ならないように
      if (a === b || a.dead || b.dead || a.type === 'soma' || b.type === 'soma') continue;
      if (Math.abs(a.x - b.x) < 10 && Math.abs(a.y - b.y) < 6) a.y = clamp(a.y + (a.y >= b.y ? .4 : -.4), FT, FB);
    }
    for (const e of G.en) {   // 一度画面に入った敵は、画面の外に出ない（ふっ飛ばしても見失わない）
      if (e.type === 'soma') continue;
      if (e.x > G.cam + 12 && e.x < G.cam + W - 12) e.shown = true;
      e.x = e.shown ? clamp(e.x, G.cam + 10, G.cam + W - 10) : clamp(e.x, G.cam - 40, G.cam + W + 40);
      if (e.z >= 0) pushOut(e);
    }
    G.en = G.en.filter((e) => !e.gone);
    if (G.boss && G.boss.gone) G.boss = null;
    updProj(); updDrops();
    for (const f of G.fx) f.t++;
    G.fx = G.fx.filter((f) => f.t < 16);
    for (const o of G.props) if (o.shake > 0) o.shake--;
    updCam();
    checkWave();
    if (G.comboT > 0 && --G.comboT === 0) G.combo = 0;
    const ok = G.st.okusan;
    if (ok && G.boss && G.t % 420 === 200 && ok.x > G.cam && ok.x < G.cam + W) pop(['がんばってー♪', 'あなたー、ファイトー♪', '（もぐもぐ）'][(G.t / 420 | 0) % 3], { x: ok.x, y: ok.y + 6 }, '#fbc');
  }
  function step() {
    if (TB) tbStep();
    else if (CARD) { if (++CARD.t > 25 && (P.a || P.b || P.tap)) CARD.done(); }
    if (scene === 'play' && G && G.st && !G.pause) world();
    else if (G && G.pause === 'kiwami') G.kiwamiT++;
    if (scene === 'ending' && E) endingStep();
    if (G) { if (G.shake > 0 && !G.pause) G.shake--; if (G.flash > 0) G.flash--; if (G.gold > 0) G.gold--; }
    for (const k in P) delete P[k];
  }

  // ───── 描く ─────
  const STATE_FRAMES = {
    idle: (t) => ['idle' + ((t / 30 | 0) % 2), 'idle0', 'idle'],
    walk: (t) => ['walk' + ((t / 8 | 0) % 4), 'walk' + ((t / 8 | 0) % 2), 'idle0'],
    land: () => ['idle0'],
    punch1: (t) => (t < 2 ? ['idle0'] : ['punch1', 'attack']),
    punch2: (t) => (t < 2 ? ['idle0'] : ['punch2', 'punch1', 'attack']),
    kick: (t) => (t < 4 ? ['punch2', 'idle0'] : ['kick', 'attack']),
    jump: () => ['jump'],
    jumpkick: () => ['jumpkick', 'jump'],
    hurt: () => ['hurt'],
    down: (t, z) => (z < 0 || t < 6 ? ['down0', 'hurt'] : ['down1', 'down0']),
    kiwami: (t) => ['kiwami' + ((t / 5 | 0) % 2), 'kiwami'],
    win: () => ['win', 'idle0'],
    windup: () => ['windup', 'attack0', 'idle0'],
    attack: () => ['attack', 'attack1', 'punch1', 'idle0'],
    sleep: (t) => ['sleep' + ((t / 40 | 0) % 2), 'sleep', 'sleep0', 'idle0'],
    pose: (t) => ['pose' + ((t / 8 | 0) % 2), 'pose0', 'idle0'],
    throw: (t, z, type) => { const i = t < (type === 'soma' ? 10 : 18) ? 0 : 1; return ['throw' + i, 'attack' + i, 'idle0']; },
    stir: (t) => ((t / 6 | 0) % 2 ? ['wake'] : ['sleep0']),
    awake: () => ['wake', 'idle0'],
    call: () => ['call', 'idle0'],
    laugh: () => ['laugh', 'idle0'],
    gift: () => ['gift', 'idle0'],
    sit: (t) => ['sit' + ((t / 40 | 0) % 2), 'sit0', 'idle0'],
    cheer: (t) => ['cheer' + ((t / 30 | 0) % 2), 'cheer0', 'idle0'],
  };
  function drawChar(name, o, st, ft) {
    const x = Math.round(o.x - G.cam), y = Math.round(o.y + o.z);
    if ((st === 'idle' || st === 'walk') && o.laughT > 0) st = 'laugh';
    const frames = (STATE_FRAMES[st] || STATE_FRAMES.idle)(ft, o.z, name);
    if (name === 'miya' && o.face < 0 && sprite('miya_l', frames, x, y, 1)) return;   // 胸の「66」が鏡文字にならないように
    if (!sprite(name, frames, x, y, o.face)) fallback(name, x, y, o.face, frames[0]);
    if ((st === 'sleep' || st === 'stir') && (ft >> 5) % 2 === 0) object('props', 'zzz', x + 12 * o.face, y - 40);
  }
  function shadow(o, w = 20) {
    const x = Math.round(o.x - G.cam), y = Math.round(o.y);
    const s = o.z < 0 ? Math.max(.5, 1 + o.z / 60) : 1, ww = Math.round(w * s);
    ctx.globalAlpha = .4; ctx.fillStyle = '#000';
    ctx.fillRect(x - ww / 2, y - 1, ww, 3); ctx.fillRect(x - ww / 2 + 3, y - 2, ww - 6, 5);
    ctx.globalAlpha = 1;
  }
  function drawBg() {
    const im = IMG[G.st.bg];
    if (im && im.ok) { ctx.drawImage(im, Math.round(G.cam), 0, W, H, 0, 0, W, H); return; }
    ctx.fillStyle = '#101028'; ctx.fillRect(0, 0, W, FT - 6);
    ctx.fillStyle = '#383848'; ctx.fillRect(0, FT - 6, W, H - FT + 6);
    ctx.fillStyle = '#2a2a38';
    for (let x = -(G.cam % 32); x < W; x += 32) ctx.fillRect(x, FT - 6, 2, H);
  }
  function drawFx(f) {
    const x = Math.round(f.x - G.cam), y = Math.round(f.y + f.z);
    const sf = f.kind === 'dust' ? ['dust' + (f.t < 8 ? 0 : 1)] : f.kind === 'big' ? ['kiwami' + ((f.t >> 2) % 2)] : ['hit' + Math.min(2, f.t / 3 | 0)];
    if (f.kind !== 'dust' && f.t > 9) return;
    if (sprite('fx', sf, x, y + (f.kind === 'dust' ? 2 : 24), 1)) return;
    if (f.kind === 'dust') {
      ctx.fillStyle = '#c8c0b0';
      for (let i = 0; i < 4; i++) { const d = f.t * 1.2 + i * 2; ctx.fillRect(x - d - 2, y - 3 - i, 3, 2); ctx.fillRect(x + d, y - 3 - i, 3, 2); }
      return;
    }
    const r = (f.kind === 'big' ? 16 : 9) * Math.min(1, (f.t + 2) / 5);
    if (f.t > 10) return;
    ctx.fillStyle = f.t < 3 ? '#fff' : '#ffd23a';
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4 + (f.kind === 'big' ? f.t * .1 : 0), len = a % 2 ? r * .6 : r;
      for (let k = 3; k < len; k += 2) ctx.fillRect(Math.round(x + Math.cos(ang) * k), Math.round(y + Math.sin(ang) * k), 2, 2);
    }
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  function drawSparkle(x, y) {
    if ((performance.now() / 200 | 0) % 2 && sprite('props', ['star'], x, y + 12, 1)) return;
    const t = performance.now() / 120, s = 2 + Math.round(Math.abs(Math.sin(t)) * 3);
    ctx.fillStyle = '#fff8a0';
    ctx.fillRect(x - s, y, s * 2 + 1, 1); ctx.fillRect(x, y - s, 1, s * 2 + 1);
    ctx.fillRect(x - 1, y - 1, 3, 3);
  }
  function drawWorld() {
    ctx.save();
    if (G.shake) ctx.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2)));
    drawBg();
    const list = [];
    for (const o of G.props) list.push({ y: o.y, k: 'prop', o });
    for (const o of G.drops) list.push({ y: o.y, k: 'drop', o });
    for (const o of G.en) list.push({ y: o.y, k: 'en', o });
    for (const o of G.pr) list.push({ y: o.y, k: 'pr', o });
    list.push({ y: G.p.y + .1, k: 'p', o: G.p });
    if (G.chair) list.push({ y: G.chair.y, k: 'chair', o: G.chair });
    if (G.st.okusan) list.push({ y: G.st.okusan.y, k: 'oku', o: { ...G.st.okusan, z: 0, face: -1 } });
    for (const it of list) if (it.k !== 'prop' && it.k !== 'chair') shadow(it.o, it.k === 'drop' || it.k === 'pr' ? 10 : 20);
    list.sort((a, b) => a.y - b.y);
    for (const { k, o } of list) {
      if (k === 'oku') { drawChar('okusan', o, 'sit', G.t); continue; }
      if (k === 'chair') { sprite('soma', ['chair'], Math.round(o.x - G.cam), Math.round(o.y), -1); continue; }
      if (k === 'prop') {
        const x = Math.round(o.x - G.cam) + (o.shake ? (o.shake % 2 ? 1 : -1) : 0);
        object('props', o.broken ? (o.t === 'locker' ? 'locker_open' : 'box_broken') : (o.t === 'locker' ? 'locker_closed' : 'box'), x, Math.round(o.y));
        if (!o.broken && o.item && o.item === G.hint) drawSparkle(x + 6, Math.round(o.y) - (o.t === 'locker' ? 48 : 24));
      } else if (k === 'drop') {
        object('items', o.kind, Math.round(o.x - G.cam), Math.round(o.y + o.z));
      } else if (k === 'pr') {
        object('items', o.kind, Math.round(o.x - G.cam), Math.round(o.y + o.z), Math.sign(o.vx) || 1);
      } else if (k === 'en') {
        if (o.dead && o.ft > 30 && o.z >= 0 && (o.ft >> 2) % 2) continue;
        if (o.inv > 0 && (o.inv >> 2) % 2) continue;
        drawChar(o.type, o, o.st, o.ft);
        if (o.type === 'shacho' && G.gold > 0 && (G.gold >> 2) % 2) drawSparkle(Math.round(o.x - G.cam), Math.round(o.y - 50));
      } else {
        if (o.inv > 0 && o.st !== 'kiwami' && (o.inv >> 2) % 2) continue;
        drawChar('ryu', o, o.st, o.ft);
      }
    }
    for (const f of G.fx) drawFx(f);
    ctx.restore();
    if (G.pause === 'kiwami') {
      const t = G.kiwamiT || 0;
      // 白く光るのは最初の1回だけ（点滅は光に敏感な人に負担になるため、1秒に3回以上は光らせない）
      ctx.fillStyle = t < 6 ? `rgba(255,255,255,${(.7 * (1 - t / 6)).toFixed(2)})` : 'rgba(40,0,0,.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd23a';
      for (let i = 0; i < 14; i++) { const y = (i * 37 + t * 9) % H; ctx.fillRect(0, y, W, 1); }
      drawChar('ryu', G.p, 'kiwami', t);
    }
    if (G.flash) { ctx.fillStyle = 'rgba(255,0,0,.25)'; ctx.fillRect(0, 0, W, H); }
  }
  function drawOpening() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const im = IMG.stage1;
    if (im && im.ok) { ctx.globalAlpha = .35; ctx.drawImage(im, 0, 0, W, H, 0, 0, W, H); ctx.globalAlpha = 1; }
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, 0, W, H);
    const o = { x: 128, y: 150, z: 0, face: 1 };
    const save0 = G.cam; G.cam = 0; drawChar('ryu', o, 'idle', performance.now() / 16 | 0); G.cam = save0;
  }
  function drawEnding() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const im = IMG.ending;
    if (im && im.ok) ctx.drawImage(im, 0, 0);
    else { ctx.fillStyle = '#182040'; ctx.fillRect(0, 0, W, FT); ctx.fillStyle = '#505868'; ctx.fillRect(0, FT, W, H - FT); }
    const t = performance.now() / 16 | 0;
    G.cam = 0;
    const party = E && E.party;
    const cast = [['shacho', 146, 172, -1, E && E.gift ? 'gift' : 'down'], ['ryu', 100, 173, 1, E && E.roll >= 0 ? 'win' : 'idle']];
    if (party) cast.push(['naka', 30, 163, 1, 'idle'], ['soma', 58, 160, 1, 'sleep'], ['okusan', 188, 168, -1, 'cheer'], ['dani', 220, 162, -1, 'pose'], ['miya', 242, 172, -1, 'idle']);
    cast.sort((a, b) => a[2] - b[2]);
    for (const [n, x, y, f, st] of cast) { const o = { x, y, z: 0, face: f }; shadow(o); drawChar(n, o, st, st === 'down' ? 99 : t); }
    if (E && E.roll >= 0) {
      ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(0, 0, W, H);
      ctx.font = '8px Dot, monospace'; ctx.textAlign = 'center';
      const base = H - E.roll;
      ROLL.forEach((line, i) => {
        const y = base + i * 14;
        if (y < -10 || y > H + 10) return;
        ctx.fillStyle = i === 0 ? '#ffd23a' : line.startsWith('―') ? '#e8b84a' : '#fff';
        ctx.fillText(line, W / 2, y);
      });
      if (base + ROLL.length * 14 < H / 2 - 10) { ctx.fillStyle = '#ffd23a'; ctx.font = '16px Dot, monospace'; ctx.fillText('THE END', W / 2, H / 2); }
    }
  }
  // HUD（画面の上の体力・ゲージ）：変わった時だけ書きかえる
  const hudMemo = {};
  function setHud(key, fn, val) { if (hudMemo[key] !== val) { hudMemo[key] = val; fn(val); } }
  function hud() {
    const p = G.p;
    setHud('hp', (v) => { $('hpBar').style.width = v + '%'; }, Math.round(p.hp / p.max * 100));
    setHud('g', (v) => { $('gaugeBar').style.width = v + '%'; $('gaugeWrap').classList.toggle('full', v >= 100); $('btnK').classList.toggle('ready', v >= 100); }, Math.round(p.gauge));
    setHud('sc', (v) => { $('hScore').textContent = v; }, String(G.score).padStart(6, '0'));
    setHud('it', (v) => { $('hItems').innerHTML = v; }, ['daruma', 'fukuzasa'].filter((k) => G.items.has(k)).map((k) => `<i class="chip ${k}">${k === 'daruma' ? 'だるま' : '福笹'}</i>`).join(''));
    const b = G.boss && !G.boss.gone ? G.boss : null;
    setHud('bo', (v) => { $('bossHud').classList.toggle('on', !!v); $('nes').classList.toggle('boss-on', !!v); $('bossName').textContent = v; }, b ? D.CARDS[b.type].name : '');
    if (b) setHud('bh', (v) => { $('bossBar').style.width = v + '%'; }, Math.round(b.hp / b.max * 100));
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (!G) return;
    if (scene === 'ending') drawEnding();
    else if (scene === 'play') { if (G.st) drawWorld(); else drawOpening(); }
    else return;
    hud();
  }

  // タイトルの火の粉（下から舞い上がる）
  const ecv = $('embers'), ectx = ecv.getContext('2d'), embers = [];
  function drawEmbers(dt) {
    const w = app.classList.contains('land') ? 1280 : 390, h = app.classList.contains('land') ? 720 : LAYOUT.port.H;
    if (ecv.width !== w || ecv.height !== h) { ecv.width = w; ecv.height = h; }
    while (embers.length < (w > 400 ? 90 : 55)) {
      embers.push({ x: Math.random() * w, y: h + Math.random() * h, r: rnd(.6, 2.4), vy: rnd(18, 60), sway: rnd(.4, 1.6), ph: Math.random() * 6, life: rnd(.5, 1) });
    }
    ectx.clearRect(0, 0, w, h);
    const t = performance.now() / 1000;
    for (const e of embers) {
      e.y -= e.vy * dt; e.x += Math.sin(t * e.sway + e.ph) * 12 * dt;
      if (e.y < -10) { e.y = h + 10; e.x = Math.random() * w; }
      const fade = Math.min(1, e.y / (h * .5)) * e.life * (.6 + .4 * Math.sin(t * 6 + e.ph));
      ectx.globalAlpha = Math.max(0, fade);
      const sz = e.r * 9;
      ectx.drawImage(e.r > 1.8 ? GLOW[0] : GLOW[1], e.x - sz / 2, e.y - sz / 2, sz, sz);
    }
    ectx.globalAlpha = 1;
  }

  // 火の粉の光の絵（光のにじみを毎回計算するとスマホが重いので、先に1回だけ作る）
  const GLOW = ['#ffb35a', '#ff7a2a'].map((c) => {
    const g = document.createElement('canvas'); g.width = g.height = 32;
    const x = g.getContext('2d'), rg = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, '#fff3d0'); rg.addColorStop(.18, c); rg.addColorStop(.45, 'rgba(255,106,16,.35)'); rg.addColorStop(1, 'rgba(255,106,16,0)');
    x.fillStyle = rg; x.fillRect(0, 0, 32, 32); return g;
  });

  // 60fps 固定で進める
  let last = performance.now(), acc = 0;
  function loop(now) {
    const dt = Math.min(100, now - last);
    acc += dt; last = now;
    let n = 0;
    if (dt > 12 && dt < 22) { if (!window.GC_HOLD) step(); acc = 0; n = 1; }   // 60Hzの画面：1コマに1回ずつ（0回・2回が混ざる「カクッ」を防ぐ）
    else while (acc >= 1000 / 60 && n < 4) { if (!window.GC_HOLD) step(); acc -= 1000 / 60; n++; }   // ゲーセンに戻る確認の間は止める
    if (n === 4) acc = 0;
    if (scene === 'title') drawEmbers(dt / 1000);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // テスト用の窓口
  window.RYU = {
    get G() { return G; },
    ending: () => ending(),
    textLog,
    state: () => ({
      scene, pause: G && G.pause, stage: G && G.si, wave: G && G.wave, locked: G && G.locked, cam: G && Math.round(G.cam),
      p: G && { x: Math.round(G.p.x), y: Math.round(G.p.y), z: Math.round(G.p.z), hp: G.p.hp, st: G.p.st, gauge: G.p.gauge, face: G.p.face },
      en: G ? G.en.filter((e) => !e.dead).map((e) => ({ type: e.type, x: Math.round(e.x), y: Math.round(e.y), hp: e.hp, st: e.st, phase: e.phase })) : [],
      props: G ? G.props.map((o) => ({ t: o.t, x: o.x, y: o.y, broken: o.broken, item: o.item })) : [],
      drops: G ? G.drops.map((d) => ({ kind: d.kind, x: Math.round(d.x), y: Math.round(d.y) })) : [],
      items: G ? [...G.items] : [], score: G && G.score, deaths: G && G.deaths, text: TB ? TB.cur.t : null, choice: !!(TB && TB.cur.choice), card: !!CARD,
    }),
  };

  // 始まり：?stage=2 などで、その面から（テスト・確認用）
  // 途中で切りかえる絵は、先に読み込んでおく（切りかえた瞬間に前の絵が一瞬出たり、消えたりしないように）
  const PRELOAD = ['assets/photo/naka.webp', 'assets/photo/dani.webp', 'assets/photo/miya.webp', 'assets/photo/soma.webp', 'assets/photo/shacho.webp', 'assets/photo/ryu.webp'].map((s) => { const i = new Image(); i.src = s; if (i.decode) i.decode().catch(() => { }); return i; });
  const qs = parseInt(Q.get('stage'), 10);
  if (qs >= 1 && qs <= 3) startGame(qs - 1, true); else toTitle();
})();
