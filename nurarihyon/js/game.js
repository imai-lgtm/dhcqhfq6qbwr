// ぬらりひょん — 社員ブロックをラックに積む落ちものパズル
(() => {
  const D = window.DATA, A = window.AUDIO;
  const $ = (s) => document.querySelector(s);
  const P = new URLSearchParams(location.search);
  const FAST = P.has('fast') ? 0.4 : 1;          // テスト用：演出の待ち時間を短くする
  const sleep = (ms) => new Promise(r => setTimeout(r, ms * FAST));
  const app = $('#app');
  const COLS = D.COLS, ROWS = D.ROWS;

  // ───── 画面の形 ─────
  const LAYOUT = { port: { W: 390, H: 844, cell: 35 }, land: { W: 1280, H: 720, cell: 40 } };
  let L = LAYOUT.port, scale = 1;
  const cv = $('#board'), ctx = cv.getContext('2d');
  // スマホ縦は、横幅を画面にぴったり合わせ、縦の長さは画面の形に合わせて伸び縮みさせる（680〜900）
  const portH = () => Math.round(Math.max(680, Math.min(900, innerHeight * 390 / innerWidth)));
  function fit() {
    const land = innerWidth > innerHeight * 1.05;
    if (!land) { LAYOUT.port.H = portH(); LAYOUT.port.cell = Math.min(35, Math.floor((LAYOUT.port.H - 318) / 15)); }
    L = land ? LAYOUT.land : LAYOUT.port;
    app.classList.toggle('land', land);
    app.style.width = L.W + 'px'; app.style.height = L.H + 'px'; app.style.setProperty('--H', L.H + 'px');
    scale = Math.min(innerWidth / L.W, innerHeight / L.H);
    app.style.setProperty('--s', scale);
    const bw = $('#boardWrap').style;   // 盤の大きさ・位置（スマホ縦だけ、マス目に合わせる）
    if (land) { bw.width = bw.height = bw.left = ''; } else { bw.width = COLS * L.cell + 'px'; bw.height = ROWS * L.cell + 'px'; bw.left = (L.W - COLS * L.cell) / 2 + 'px'; }
    const dpr = Math.min(2, (window.devicePixelRatio || 1) * scale + .5);
    cv.width = Math.round(COLS * L.cell * dpr); cv.height = Math.round(ROWS * L.cell * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (G) draw();
  }
  addEventListener('resize', fit);

  // ───── 顔画像・絵 ─────
  const IMG = {};
  ['eba', 'miya', 'shacho', 'naka', 'soma', 'dani', 'ryu'].forEach(f => { const i = new Image(); i.src = `assets/face/${f}.jpg`; IMG[f] = i; });
  const TAX = new Image(); TAX.src = 'assets/art/tax_block.svg';
  const GLOW = new Image(); GLOW.src = 'assets/art/ryu_glow.svg';

  // ───── 保存・画面・音 ─────
  const SAVE_KEY = 'nura_save_v1';
  let save = { best: 0, howto: false };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (_) { }
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) { } };
  const show = (id) => document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  const overlay = (id, on) => $('#' + id).classList.toggle('on', on);
  A.init({
    se: ['tap', 'start', 'cursor', 'brick', 'land', 'correct', 'fanfare', 'kira', 'ghost', 'cup_put', 'eat', 'flash', 'levelup', 'warp', 'wrong',
      'chin', 'chanchan', 'kanpai', 'cheer', 'ipponjime', 'rank', 'despair', 'hyoushigi', 'boyoyon', 'doon'],
    voice: [],
  });
  const muteBtn = $('#mute');
  const syncMute = () => muteBtn.classList.toggle('off', A.muted);
  muteBtn.addEventListener('click', () => { A.unlock(); A.setMuted(!A.muted); syncMute(); });
  syncMute();
  document.addEventListener('pointerdown', () => A.unlock(), { once: true });

  // タイトル：顔ブロックが降ってくる
  function rain() {
    const box = $('#tRain'); box.innerHTML = '';
    const faces = Object.keys(IMG);
    for (let i = 0; i < 14; i++) {
      const im = document.createElement('img');
      im.src = `assets/face/${faces[i % faces.length]}.jpg`;
      im.style.left = (Math.random() * (L.W - 50)) + 'px';
      im.style.animationDuration = (7 + Math.random() * 6) + 's';
      im.style.animationDelay = (-Math.random() * 12) + 's';
      box.appendChild(im);
    }
  }
  function toTitle() {
    show('title'); rain();
    $('#best').textContent = save.best ? `ベストスコア ${save.best.toLocaleString()} 点` : '';
    A.bgm('title', { vol: .8 });
  }
  $('#btnStart').addEventListener('click', async () => {
    A.unlock(); A.se('start');
    if (!save.howto) { overlay('howto', true); return; }
    await sleep(400); startGame();
  });
  $('#btnHowtoOk').addEventListener('click', () => { A.se('tap'); save.howto = true; store(); overlay('howto', false); startGame(); });
  $('#btnCredits').addEventListener('click', () => { A.se('tap'); overlay('credits', true); });
  $('#btnCreditsOk').addEventListener('click', () => { A.se('tap'); overlay('credits', false); });

  // ───── 盤面 ─────
  let G = null;
  const empty = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  function rotateCells(cells, size, r) {
    let c = cells.map(([x, y]) => [x, y]);
    for (let i = 0; i < ((r % 4) + 4) % 4; i++) c = c.map(([x, y]) => [size - 1 - y, x]);
    return c;
  }
  const pieceCells = (p, rot = p.rot, x = p.x, y = p.y) => rotateCells(D.PIECES[p.t].cells, D.PIECES[p.t].size, rot).map(([cx, cy]) => [x + cx, y + cy]);
  const fits = (p, rot = p.rot, x = p.x, y = p.y) => pieceCells(p, rot, x, y).every(([cx, cy]) => cx >= 0 && cx < COLS && cy < ROWS && (cy < 0 || !G.board[cy][cx]));

  // 7種類を1回ずつ混ぜて出す（同じ形ばかり続かない）＋龍之介ブロックをときどき
  function nextType() {
    const lv = D.LEVELS[G.lv];
    // 税がたまってきたら早めに、税がなければ来ない
    if (lv.ryu && G.taxCount > 0 && (G.sinceRyu >= lv.ryu || (G.taxCount >= 3 && G.sinceRyu >= Math.ceil(lv.ryu / 2)))) { G.sinceRyu = 0; return 'R'; }
    if (!G.bag.length) G.bag = shuffle(['I', 'O', 'T', 'S', 'Z', 'L', 'J']);
    G.sinceRyu++;
    return G.bag.pop();
  }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function spawn() {
    const t = G.next || nextType();
    G.next = nextType();
    const sz = D.PIECES[t].size;
    G.cur = { t, rot: 0, x: Math.floor((COLS - sz) / 2), y: t === 'I' ? -1 : 0 };
    G.lockT = 0; G.fallT = 0;
    drawNext();
    if (!fits(G.cur)) { gameOver(); return false; }
    return true;
  }

  // ───── 動かす ─────
  function move(dx) { if (!G || G.busy) return; const p = G.cur; if (fits(p, p.rot, p.x + dx)) { p.x += dx; G.lockT = 0; A.se('cursor', { vol: .25 }); draw(); } }
  function rotate() {
    if (!G || G.busy) return;
    const p = G.cur, r = p.rot + 1;
    for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]]) {   // 壁ぎわでも回せるように少しずらして試す
      if (fits(p, r, p.x + kx, p.y + ky)) { p.rot = r; p.x += kx; p.y += ky; G.lockT = 0; A.se('tap', { vol: .35 }); draw(); return; }
    }
  }
  function softDrop() { if (!G || G.busy) return; const p = G.cur; if (fits(p, p.rot, p.x, p.y + 1)) { p.y++; G.score += 1; G.fallT = 0; drawHud(); draw(); } else lock(); }
  function hardDrop() {
    if (!G || G.busy) return;
    const p = G.cur; let n = 0;
    while (fits(p, p.rot, p.x, p.y + 1)) { p.y++; n++; }
    G.score += n * 2;
    lock();
  }
  const ghostY = () => { const p = G.cur; let y = p.y; while (fits(p, p.rot, p.x, y + 1)) y++; return y; };

  // ───── 置く・消す ─────
  async function lock() {
    const p = G.cur, def = D.PIECES[p.t];
    const cells = pieceCells(p);
    if (cells.some(([, y]) => y < 0)) { gameOver(); return; }
    cells.forEach(([x, y]) => { G.board[y][x] = { face: def.face, color: def.color, special: !!def.special }; });
    A.se('brick', { vol: .6 });
    G.busy = true; G.cur = null;
    if (def.special) await ryuEat(cells);
    await clearLines();
    G.busy = false;
    if (G.over) return;
    if (G.lines >= D.LEVELS[G.lv].lines) { await levelUp(); if (G.over) return; }
    else {
      // ぬらりひょんは、置いたブロックの数で来る（速く遊んでも、ゆっくり遊んでも同じ）
      const lv = D.LEVELS[G.lv];
      if (lv.tax && !def.special && ++G.sinceTax >= lv.tax) { G.sinceTax = 0; G.busy = true; await nuraVisit(); G.busy = false; if (G.over) return; }
    }
    spawn(); draw();
  }

  // 龍之介ブロック：置いた列の税を全部食べて、上のブロックを落とす
  async function ryuEat(cells) {
    const cols = [...new Set(cells.map(([x]) => x))];
    let eaten = 0;
    for (const x of cols) for (let y = 0; y < ROWS; y++) if (G.board[y][x] && G.board[y][x].tax) { G.board[y][x] = null; eaten++; }
    // 龍之介ブロック自身も消える（役目を終える）
    cells.forEach(([x, y]) => { G.board[y][x] = null; });
    for (const x of cols) {   // その列だけ下に詰める
      const stack = []; for (let y = ROWS - 1; y >= 0; y--) if (G.board[y][x]) stack.push(G.board[y][x]);
      for (let y = ROWS - 1, i = 0; y >= 0; y--, i++) G.board[y][x] = stack[i] || null;
    }
    G.taxCount = countTax();
    if (eaten) {
      G.taxEaten += eaten; G.score += eaten * D.TAX_EAT * (G.lv + 1);
      A.se('eat'); A.se('flash', { vol: .6 }); flash('gold');
      const s = $('#ryuSay'); s.classList.remove('on'); void s.offsetWidth; s.classList.add('on');
      draw(); drawHud();
      await sleep(1100);
      s.classList.remove('on');
    } else { A.se('warp', { vol: .5 }); draw(); await sleep(200); }
  }
  const countTax = () => G.board.flat().filter(c => c && c.tax).length;

  // 横1列そろったら消える。ただし税がある列は消えない
  async function clearLines() {
    const full = [];
    for (let y = 0; y < ROWS; y++) if (G.board[y].every(c => c) && !G.board[y].some(c => c.tax)) full.push(y);
    const blocked = G.board.some(r => r.every(c => c) && r.some(c => c.tax));
    if (blocked && !G.toldTax) { G.toldTax = true; telop('税があると\n消えない！'); A.se('despair', { vol: .4 }); }
    if (!full.length) { draw(); return; }
    const fr = $('#flashRows'); fr.innerHTML = '';
    full.forEach(y => { const i = document.createElement('i'); i.style.top = (y / ROWS * 100) + '%'; i.style.height = (100 / ROWS) + '%'; fr.appendChild(i); });
    A.se(full.length > 1 ? 'fanfare' : 'correct', { vol: .55 });
    telop(full.length > 1 ? `${D.LINES.clearN}\n${full.length}列` : D.LINES.clear1);
    await sleep(320);
    G.board = G.board.filter((_, y) => !full.includes(y));
    while (G.board.length < ROWS) G.board.unshift(Array(COLS).fill(null));
    G.lines += full.length; G.totalLines += full.length;
    G.score += D.POINTS[Math.min(4, full.length)] * (G.lv + 1);
    fr.innerHTML = '';
    drawHud(); draw();
  }

  // ───── ぬらりひょん：消せない「税」を置いていく ─────
  async function nuraVisit() {
    if (!G || G.over) return false;
    const nura = $('#nura');
    $('#nBubble').textContent = D.LINES.nura[G.visits++ % D.LINES.nura.length];
    $('#nuraImg').src = 'assets/art/nura_idle.svg';
    nura.classList.add('on');
    A.se('ghost', { vol: .7 });
    await sleep(900);
    if (!G || G.over) return true;
    $('#nuraImg').src = 'assets/art/nura_throw.svg';
    // 積んである所の一番上に置く（今落ちているブロックとぶつからない列、なるべく低い列を少し優先）
    const heights = [...Array(COLS)].map((_, x) => { let y = 0; while (y < ROWS && !G.board[y][x]) y++; return y; });
    const curCols = G.cur ? new Set(pieceCells(G.cur).map(([x]) => x)) : new Set();
    let cands = [...Array(COLS).keys()].filter(x => heights[x] > 3 && !curCols.has(x));
    if (!cands.length) cands = [...Array(COLS).keys()].filter(x => heights[x] > 1);
    if (cands.length) {
      const x = cands[Math.floor(Math.random() * cands.length)];
      const y = heights[x] - 1;
      // 落ちてくる演出
      G.taxFall = { x, y: -1, ty: y };
      const t0 = performance.now();
      await new Promise(res => { const step = (t) => { if (!G || G.over) return res(); const k = Math.min(1, (t - t0) / (380 * FAST)); G.taxFall.y = -1 + (y + 1) * k * k; draw(); if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
      if (!G || G.over) return true;
      G.taxFall = null;
      if (!G.board[y][x]) G.board[y][x] = { tax: true };
      G.taxCount = countTax(); G.taxTotal++;
      A.se('cup_put'); A.se('doon', { vol: .5 });
      if (G.cur && !fits(G.cur)) G.cur.y = Math.max(-2, G.cur.y - 1);
      draw();
    }
    await sleep(700);
    nura.classList.remove('on');
    return true;
  }

  // ───── 進行 ─────
  let raf = 0;
  const hold = { left: 0, right: 0, down: 0 };
  let lastStart = -1e9;
  function startGame() {
    if (performance.now() - lastStart < 1500) return;   // ボタンの2度押しで、ゲームが2つ同時に始まらないように
    lastStart = performance.now();
    G = { board: empty(), bag: [], next: null, cur: null, lv: P.has('lv') ? Math.max(0, Math.min(4, +P.get('lv') - 1)) : 0, lines: 0, totalLines: 0, score: 0, taxEaten: 0, taxTotal: 0, taxCount: 0,
      sinceRyu: 0, sinceTax: 0, visits: 0, busy: false, over: false, paused: false };
    show('play'); fit();
    $('#nura').classList.remove('on'); $('#ryuSay').classList.remove('on');
    drawHud();
    A.bgm('play', { vol: .7 });
    levelBanner();
    spawn(); draw();
    let prev = performance.now();
    cancelAnimationFrame(raf);
    const loop = (t) => {
      if (!G || G.over) return;
      const dt = Math.min(.05, (t - prev) / 1000); prev = t;
      if (!G.busy && !G.paused && !window.GC_HOLD && G.cur) tick(dt);   // ゲーセンに戻る確認の間は止める
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  function tick(dt) {
    const lv = D.LEVELS[G.lv];
    // ボタン押しっぱなしの連続移動
    for (const k of ['left', 'right', 'down']) if (hold[k]) { hold[k] -= dt; if (hold[k] <= 0) { hold[k] = k === 'down' ? .05 : .09; k === 'down' ? softDrop() : move(k === 'left' ? -1 : 1); if (!G || G.busy || !G.cur) return; } }
    // 落下
    G.fallT += dt;
    if (G.fallT >= lv.fall) {
      G.fallT = 0;
      if (fits(G.cur, G.cur.rot, G.cur.x, G.cur.y + 1)) { G.cur.y++; draw(); }
    }
    // 着地してから少し待って固定（ぎりぎりで動かせる）
    if (!fits(G.cur, G.cur.rot, G.cur.x, G.cur.y + 1)) { G.lockT += dt; if (G.lockT >= .5) { lock(); return; } } else G.lockT = 0;
  }
  function levelBanner() {
    telop(G.lv === 0 ? 'LEVEL 1\nまずは練習（税なし）' : `LEVEL ${G.lv + 1}`);
    A.se('hyoushigi');
  }
  async function levelUp() {
    if (G.lv >= D.LEVELS.length - 1) { await win(); return; }
    G.lv++; G.lines = 0; G.sinceTax = 0;
    A.se('levelup');
    if (G.lv === 3) A.bgm('fast', { vol: .6 });
    drawHud();
    telop(`LEVEL ${G.lv + 1}` + (G.lv === 1 ? '\nぬらりひょんが来るぞ…' : ''));
    G.busy = true; await sleep(1300); G.busy = false;
  }

  // ───── 操作 ─────
  const pad = $('#pad');
  pad.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button'); if (!b || !G || G.over) return;
    e.preventDefault(); A.unlock();
    const k = b.dataset.k; b.classList.add('hold');
    if (k === 'left' || k === 'right') { move(k === 'left' ? -1 : 1); hold[k] = .22; }
    else if (k === 'down') { softDrop(); hold.down = .15; }
    else if (k === 'rot') rotate();
    else if (k === 'drop') hardDrop();
  });
  const release = () => { hold.left = hold.right = hold.down = 0; pad.querySelectorAll('.hold').forEach(b => b.classList.remove('hold')); };
  addEventListener('pointerup', release); addEventListener('pointercancel', release);
  const keys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rot', KeyX: 'rot', KeyZ: 'rot', Space: 'drop' };
  addEventListener('keydown', (e) => {
    if (!$('#play').classList.contains('on') || !G || G.over) { if (e.key === 'Enter' && $('#title').classList.contains('on')) $('#btnStart').click(); return; }
    const k = keys[e.code]; if (!k) return;
    e.preventDefault();
    if (e.repeat && (k === 'rot' || k === 'drop')) return;
    if (k === 'left' || k === 'right') move(k === 'left' ? -1 : 1);
    else if (k === 'down') softDrop();
    else if (k === 'rot') rotate();
    else hardDrop();
  });

  // ───── 描く ─────
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function drawCell(c, x, y, s, cell, alpha = 1) {
    c.save(); c.globalAlpha = alpha;
    if (cell.tax) { if (TAX.naturalWidth) c.drawImage(TAX, x + 1, y + 1, s - 2, s - 2); else { roundRect(c, x + 1, y + 1, s - 2, s - 2, 6); c.fillStyle = '#6e5a8a'; c.fill(); } c.restore(); return; }
    const r = s * .18;
    roundRect(c, x + 1, y + 1, s - 2, s - 2, r); c.fillStyle = cell.color; c.fill();
    c.save(); roundRect(c, x + 3, y + 3, s - 6, s - 6, r * .7); c.clip();
    const im = IMG[cell.face]; if (im && im.naturalWidth) c.drawImage(im, x + 3, y + 3, s - 6, s - 6);
    c.restore();
    roundRect(c, x + 1, y + 1, s - 2, s - 2, r); c.lineWidth = 2; c.strokeStyle = '#2b1d14'; c.stroke();
    if (cell.special && GLOW.naturalWidth) c.drawImage(GLOW, x - 3, y - 3, s + 6, s + 6);
    c.restore();
  }
  function draw() {
    const s = L.cell;
    ctx.clearRect(0, 0, COLS * s, ROWS * s);
    // ラックの段（ガイドの線）
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * s + .5); ctx.lineTo(COLS * s, y * s + .5); ctx.stroke(); }
    for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(x * s + .5, 0); ctx.lineTo(x * s + .5, ROWS * s); ctx.stroke(); }
    // 税のある列を、うっすら紫に
    for (let y = 0; y < ROWS; y++) if (G.board[y].some(c => c && c.tax)) { ctx.fillStyle = 'rgba(110,90,138,.18)'; ctx.fillRect(0, y * s, COLS * s, s); }
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (G.board[y][x]) drawCell(ctx, x * s, y * s, s, G.board[y][x]);
    if (G.cur) {
      const def = D.PIECES[G.cur.t], cell = { face: def.face, color: def.color, special: def.special };
      const gy = ghostY();
      if (gy !== G.cur.y) pieceCells(G.cur, G.cur.rot, G.cur.x, gy).forEach(([x, y]) => { if (y >= 0) { ctx.save(); roundRect(ctx, x * s + 3, y * s + 3, s - 6, s - 6, 6); ctx.strokeStyle = def.color; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.restore(); } });
      pieceCells(G.cur).forEach(([x, y]) => { if (y >= 0) drawCell(ctx, x * s, y * s, s, cell); });
    }
    if (G.taxFall) drawCell(ctx, G.taxFall.x * s, G.taxFall.y * s, s, { tax: true });
  }
  function drawNext() {
    const c = $('#nextCv').getContext('2d'); c.clearRect(0, 0, 120, 120);
    const def = D.PIECES[G.next], cells = def.cells, s = 26;
    const xs = cells.map(a => a[0]), ys = cells.map(a => a[1]);
    const w = (Math.max(...xs) - Math.min(...xs) + 1) * s, h = (Math.max(...ys) - Math.min(...ys) + 1) * s;
    cells.forEach(([x, y]) => drawCell(c, (120 - w) / 2 + (x - Math.min(...xs)) * s, (120 - h) / 2 + (y - Math.min(...ys)) * s, s, { face: def.face, color: def.color, special: def.special }));
  }
  function drawHud() {
    $('#lvNum').textContent = G.lv + 1;
    $('#goalNum').textContent = Math.max(0, D.LEVELS[G.lv].lines - G.lines);
    $('#score').textContent = G.score.toLocaleString();
  }
  function telop(t) { const e = $('#telop'); e.textContent = t; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); }
  function flash(kind) { const f = $('#flash'); f.classList.toggle('gold', kind === 'gold'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }

  // ───── おわり ─────
  async function win() {
    G.over = true; G.cleared = true; cancelAnimationFrame(raf);
    A.stopBgm(300);
    telop('LEVEL 5 クリア！'); A.se('fanfare');
    await sleep(1400);
    show('end'); $('#eWin').classList.add('on'); $('#eLose').classList.remove('on');
    A.se('ghost', { vol: .5 });
    await sleep(3000);
    A.se('ipponjime');
    await sleep(2200);
    showResult();
  }
  async function gameOver() {
    if (G.over) return;
    G.over = true; cancelAnimationFrame(raf);
    A.stopBgm(0); A.se('wrong'); flash();
    telop('積み上がった…');
    await sleep(1500);
    show('end'); $('#eLose').classList.add('on'); $('#eWin').classList.remove('on');
    const circle = $('#eCircle');
    circle.querySelectorAll('.face').forEach(f => f.remove());
    Object.keys(IMG).forEach((f, i, a) => {
      const ang = -Math.PI / 2 + i * Math.PI * 2 / a.length;
      const im = document.createElement('img'); im.className = 'face'; im.src = `assets/face/${f}.jpg`;
      im.style.left = (170 + Math.cos(ang) * 135) + 'px'; im.style.top = (170 + Math.sin(ang) * 135) + 'px';
      im.style.animationDelay = (i * 80) + 'ms';
      circle.appendChild(im);
    });
    await sleep(900); A.se('kanpai'); A.se('cheer', { vol: .5 });
    await sleep(2800); A.se('chanchan');
    await sleep(1200);
    showResult();
  }
  const rankOf = () => { const lv = G.cleared ? 6 : G.lv + 1; return [...D.RANKS].reverse().find(r => lv >= r.lv); };
  async function showResult() {
    show('result');
    A.bgm('result', { vol: .7 });
    const rk = rankOf(), best = G.score > save.best;
    if (best) { save.best = G.score; store(); }
    $('#rPic').src = G.cleared ? 'assets/art/nura_bye.svg' : 'assets/art/nura_idle.svg';
    $('#rName').textContent = ''; $('#rNote').textContent = '';
    await countUp($('#rScore'), G.score, 800);
    await countUp($('#rLines'), G.totalLines, 300);
    await countUp($('#rTax'), G.taxEaten, 300);
    A.se('rank');
    const nm = $('#rName'); nm.textContent = rk.name; nm.classList.remove('stamp'); void nm.offsetWidth; nm.classList.add('stamp');
    $('#rNote').innerHTML = `LEVEL ${G.cleared ? '5 クリア' : G.lv + 1 + ' まで'}。` + rk.note + (best && G.score ? '<br><span class="r-best">ベストスコア更新！</span>' : '');
  }
  function countUp(el, to, ms) {
    return new Promise(res => { const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / (ms * FAST)); el.textContent = Math.round(to * k).toLocaleString(); if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
  }
  $('#btnRetry').addEventListener('click', () => { A.se('start'); startGame(); });
  $('#btnTitle').addEventListener('click', () => { A.se('tap'); G = null; toTitle(); });
  $('#btnSave').addEventListener('click', () => { A.se('tap'); saveImage(); });
  async function saveImage() {
    const rk = rankOf();
    const draw2 = async (withPic) => {
      const c2 = document.createElement('canvas'); c2.width = 720; c2.height = 960;
      const x = c2.getContext('2d');
      x.fillStyle = '#fff8ec'; x.fillRect(0, 0, 720, 960);
      [['#f0441f', 22], ['#141a2a', 30], ['#1c8fd3', 8], ['#7bc142', 12]].reduce((p, [c, w]) => { x.fillStyle = c; x.fillRect(p, 0, w, 960); return p + w; }, 0);
      x.textAlign = 'center'; x.fillStyle = '#141a2a'; x.font = '96px Boku, serif'; x.fillText('ぬらりひょん', 380, 140);
      if (withPic) { const im = new Image(); im.src = $('#rPic').src; await im.decode(); x.drawImage(im, 380 - 140, 180, 280, 364); }
      x.font = '30px Maru, sans-serif'; x.fillStyle = '#8a7a64'; x.fillText('あなたは', 380, 610);
      x.font = '54px Boku, serif'; x.fillStyle = '#f0441f'; x.fillText(rk.name, 380, 690);
      x.font = '40px Dela, sans-serif'; x.fillStyle = '#141a2a'; x.fillText(`${G.score.toLocaleString()}点`, 380, 790);
      x.font = '26px Maru, sans-serif'; x.fillStyle = '#8a7a64'; x.fillText('株式会社 心電通', 380, 900);
      return c2.toDataURL('image/png');
    };
    let url; try { url = await draw2(true); } catch (_) { url = await draw2(false); }
    const a = document.createElement('a'); a.href = url; a.download = 'nurarihyon.png'; a.click();
  }

  // ───── テスト用：今のブロックをどこに置くとよいか（自動テストがキー操作で動かす） ─────
  window.NURA = {
    get G() { return G; },
    best() {
      if (!G || !G.cur || G.busy) return null;
      const p = G.cur; let bestM = null;
      for (let r = 0; r < 4; r++) for (let x = -2; x < COLS + 1; x++) {
        if (!fits(p, r, x, p.y)) continue;
        let y = p.y; while (fits(p, r, x, y + 1)) y++;
        const b = G.board.map(row => row.slice());
        pieceCells(p, r, x, y).forEach(([cx, cy]) => { if (cy >= 0) b[cy][cx] = { face: 'x' }; });
        let lines = 0, holes = 0, agg = 0, bump = 0, hs = [];
        for (let yy = 0; yy < ROWS; yy++) if (b[yy].every(c => c) && !b[yy].some(c => c.tax)) lines++;
        for (let xx = 0; xx < COLS; xx++) { let h = 0, seen = false; for (let yy = 0; yy < ROWS; yy++) { if (b[yy][xx]) { if (!seen) { h = ROWS - yy; seen = true; } } else if (seen) holes++; } hs.push(h); agg += h; }
        for (let xx = 1; xx < COLS; xx++) bump += Math.abs(hs[xx] - hs[xx - 1]);
        let sc = lines * 8 - holes * 6 - agg * .5 - bump * .4;
        if (D.PIECES[p.t].special) { const cols = new Set(pieceCells(p, r, x, y).map(([cx]) => cx)); let t = 0; cols.forEach(cx => { for (let yy = 0; yy < ROWS; yy++) if (G.board[yy][cx] && G.board[yy][cx].tax) t++; }); sc = t * 10 - agg * .1; }
        if (!bestM || sc > bestM.sc) bestM = { sc, r, x };
      }
      return bestM && { rot: (bestM.r - p.rot + 4) % 4, dx: bestM.x - p.x };
    },
  };

  // 途中で切りかえる絵は、先に読み込んでおく（切りかえた瞬間に前の絵が一瞬出たり、消えたりしないように）
  const PRELOAD = ['assets/art/nura_idle.svg', 'assets/art/nura_throw.svg', 'assets/art/nura_bye.svg'].map((s) => { const i = new Image(); i.src = s; if (i.decode) i.decode().catch(() => { }); return i; });
  fit();
  toTitle();
  if (P.has('play')) startGame();
})();
