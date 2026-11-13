// ぬらりひょん — 北村さん（ぬらりひょん）の顔ブロックを積む落ちものパズル。税務署員の「市」「民」「税」は並べると小爆発
(() => {
  const D = window.DATA, A = window.AUDIO;
  const $ = (s) => document.querySelector(s);
  const P = new URLSearchParams(location.search);
  const FAST = P.has('fast') ? 0.4 : 1;          // テスト用：演出の待ち時間を短くする
  const sleep = (ms) => new Promise(r => setTimeout(r, ms * FAST));
  const app = $('#app');
  const COLS = D.COLS, ROWS = D.ROWS;

  // ───── 画面の形 ─────
  const LAYOUT = { port: { W: 390, H: 844, cell: 30 }, land: { W: 1280, H: 720, cell: 35 } };
  let L = LAYOUT.port, scale = 1;
  const cv = $('#board'), ctx = cv.getContext('2d');
  // スマホ縦は、横幅を画面にぴったり合わせ、縦の長さは画面の形に合わせて伸び縮みさせる（680〜900）
  const portH = () => Math.round(Math.max(680, Math.min(900, innerHeight * 390 / innerWidth)));
  function fit() {
    const land = innerWidth > innerHeight * 1.05;
    if (!land) { LAYOUT.port.H = portH(); LAYOUT.port.cell = Math.min(32, Math.floor((LAYOUT.port.H - 318) / ROWS)); }
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

  // ───── 北村さんの頭（ブロック用） ─────
  // 頭の切り抜きを、頭の色の地にのせた絵。まわりに頭の色の余白（頭の大きさの半分ずつ）を付けて、形に合わせて伸ばして使う
  const HD = D.HEAD;
  const HEADC = document.createElement('canvas');
  const headImg = new Image();
  headImg.onload = () => {
    const w = headImg.width, h = headImg.height;
    HEADC.width = w * 2; HEADC.height = h * 2; HEADC.hw = w; HEADC.hh = h;
    const c = HEADC.getContext('2d');
    const g = c.createRadialGradient(w * 1.08, h * .7, 8, w, h * .95, h * 1.1);
    g.addColorStop(0, HD.skin[0]); g.addColorStop(.45, HD.skin[1]); g.addColorStop(1, HD.skin[2]);
    c.fillStyle = g; c.fillRect(0, 0, HEADC.width, HEADC.height);
    c.drawImage(headImg, w / 2, h / 2);
    HEADC.ok = true; if (G) { draw(); drawNext(); }
  };
  headImg.src = HD.src;
  // 顔（目・メガネ・口のあたり）が、頭の絵のどこにあるか（割合）。ここがブロックのあるマスに乗るように貼る
  const FACE_BOX = { x0: .12, x1: .78, y0: .6, y1: .92 };
  // マスの集まり cells（[x, y] の並び）に、北村さんの頭を1つ貼る。返すのは、各マスが写す頭の範囲 [u, v, du, dv]（頭の絵に対する割合）
  //   形の外枠の中から「顔がブロックのあるマスに乗る」いちばん大きな四角を選び、そこに頭を伸ばして貼る（四角の外のマスは頭の色）
  //   棒を縦にすると頭の長い北村さん、横にすると平たい北村さん。T字はてっぺんの坊主頭がぽこっと出る
  //   2026-11-13 先方「たまにブロックに顔が表示されない」：外枠いっぱいに貼っていたので、L字・J字などの向きによっては顔が空きマスに落ちていた
  function headMap(cells) {
    const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), bw = Math.max(...xs) - x0 + 1, bh = Math.max(...ys) - y0 + 1;
    const filled = new Set(cells.map(([x, y]) => (x - x0) + ',' + (y - y0)));
    let best = null;
    for (let rx = 0; rx < bw; rx++) for (let ry = 0; ry < bh; ry++) for (let rw = 1; rx + rw <= bw; rw++) for (let rh = 1; ry + rh <= bh; rh++) {
      let hit = 0, n = 0;
      for (let i = 0; i <= 6; i++) for (let j = 0; j <= 4; j++) {
        const fx = rx + (FACE_BOX.x0 + (FACE_BOX.x1 - FACE_BOX.x0) * i / 6) * rw, fy = ry + (FACE_BOX.y0 + (FACE_BOX.y1 - FACE_BOX.y0) * j / 4) * rh;
        n++; if (filled.has(Math.floor(fx) + ',' + Math.floor(fy))) hit++;
      }
      // 顔が8割近く乗る四角の中で、いちばん大きいもの（同じ大きさなら、頭の形に近い縦長）
      //   8割で十分なら外枠いっぱいに伸ばす（ぬらり型の、てっぺんまで続く長い頭を残すため）
      const key = [Math.min(hit / n, .78), rw * rh, -Math.abs(rw / rh - .75)];
      const better = !best || key[0] > best.key[0] || (key[0] === best.key[0] && (key[1] > best.key[1] || (key[1] === best.key[1] && key[2] > best.key[2])));
      if (better) best = { key, rx, ry, rw, rh };
    }
    const { rx, ry, rw, rh } = best;
    return cells.map(([cx, cy]) => [(cx - x0 - rx) / rw, (cy - y0 - ry) / rh, 1 / rw, 1 / rh]);
  }
  function faceCells(t, rot) { const def = D.PIECES[t]; return headMap(rotateCells(def.cells, def.size, rot)); }
  // 盤の上の頭ブロックを、つながったかたまりごとに貼り直す（列が消えたり小爆発したりして残ったかけらにも、必ず顔が出るように）
  //   同じ形が2つに分かれたら、それぞれに顔を1つずつ
  function remapHeads() {
    const seen = new Set(), used = new Set();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = G.board[y][x];
      if (!c || c.kanji || seen.has(x + ',' + y)) continue;
      const comp = [], q = [[x, y]];
      seen.add(x + ',' + y);
      while (q.length) {
        const [cx, cy] = q.pop(); comp.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny, nb = G.board[ny] && G.board[ny][nx];
          if (nb && !nb.kanji && nb.pid === c.pid && !seen.has(k)) { seen.add(k); q.push([nx, ny]); }
        }
      }
      const pid = used.has(c.pid) ? ++G.pid : c.pid; used.add(pid);
      const src = headMap(comp);
      comp.forEach(([cx, cy], i) => { G.board[cy][cx] = { pid, src: src[i] }; });
    }
  }

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
    voice: ['officer'],
  });
  const muteBtn = $('#mute');
  const syncMute = () => muteBtn.classList.toggle('off', A.muted);
  muteBtn.addEventListener('click', () => { A.unlock(); A.setMuted(!A.muted); syncMute(); });
  syncMute();
  document.addEventListener('pointerdown', () => A.unlock(), { once: true });

  // タイトル：顔ブロックと「市」「民」「税」が降ってくる
  function rain() {
    const box = $('#tRain'); box.innerHTML = '';
    const pics = ['head', 'assets/art/kanji_shi.svg', 'head', 'assets/art/kanji_min.svg', 'head', 'assets/art/kanji_zei.svg'];
    const shapes = [[30, 92], [92, 30], [46, 46], [64, 40], [38, 70]];   // 棒・寝た棒・四角・T字・L字くらいの形に伸びた頭
    for (let i = 0; i < 14; i++) {
      const im = document.createElement('img');
      if (pics[i % pics.length] === 'head') {
        const [w, h] = shapes[(i / 2 | 0) % shapes.length];
        im.src = D.HEAD.src; im.className = 'head'; im.style.width = w + 'px'; im.style.height = h + 'px';
      } else im.src = pics[i % pics.length];
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

  // 7種類を1回ずつ混ぜて出す（同じ形ばかり続かない）
  function nextType() {
    if (!G.bag.length) G.bag = shuffle(['I', 'O', 'T', 'S', 'Z', 'L', 'J', 'N']);   // N＝ぬらり型
    return G.bag.pop();
  }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function spawn() {
    const t = G.next || nextType();
    G.next = G.kq.length ? (G.kq.shift() || nextType()) : nextType();   // 税務署員が投げ込んだ「市」「民」「税」（null＝間にはさまる普通のブロック）
    const sz = D.PIECES[t].size;
    G.cur = { t, rot: 0, x: Math.floor((COLS - sz) / 2), y: t === 'I' ? -1 : 0 };
    if (D.PIECES[t].kanji) G.cur.x = 3;
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
    const src = def.kanji ? null : faceCells(p.t, p.rot), pid = ++G.pid;
    cells.forEach(([x, y], i) => { G.board[y][x] = def.kanji ? { kanji: def.kanji } : { pid, src: src[i] }; });
    if (!def.kanji) G.landFx = { pid, t: performance.now() };   // 着地で、ぷよっとつぶれる
    A.se('brick', { vol: .6 });
    G.busy = true; G.cur = null;
    await boom();
    await clearLines();
    G.busy = false;
    if (G.over) return;
    if (G.lines >= D.LEVELS[G.lv].lines) { await levelUp(); if (G.over) return; }
    else {
      // 税務署員は、置いたブロックの数で来る（速く遊んでも、ゆっくり遊んでも同じ）
      const lv = D.LEVELS[G.lv];
      if (lv.tax && !def.kanji && !G.kq.length && ++G.sinceTax >= lv.tax) { G.sinceTax = 0; G.busy = true; await officerVisit(); G.busy = false; if (G.over) return; }
    }
    spawn(); draw();
  }

  // 「市」「民」「税」が縦か横に3つ並んだら（順番はバラバラでよい）小爆発。まわり1マスも消えて、上のブロックが落ちる
  //   2026-11-05 打ち合わせ：順番どおりだと先方の社内で1回も爆発させられなかった → 順番は問わない
  const civic3 = (a, b, c) => !!(a && b && c && a !== b && b !== c && a !== c);
  function findCivic() {
    const K = (x, y) => (G.board[y] && G.board[y][x] && G.board[y][x].kanji) || '';
    const hits = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (civic3(K(x, y), K(x + 1, y), K(x + 2, y))) hits.push([[x, y], [x + 1, y], [x + 2, y]]);
      if (civic3(K(x, y), K(x, y + 1), K(x, y + 2))) hits.push([[x, y], [x, y + 1], [x, y + 2]]);
    }
    return hits;
  }
  async function boom() {
    let hits = findCivic();
    while (hits.length) {
      const gone = new Set();
      hits.flat().forEach(([x, y]) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && xx < COLS && yy >= 0 && yy < ROWS && G.board[yy][xx]) gone.add(xx + ',' + yy); } });
      G.boomAt = [...gone].map((k) => k.split(',').map(Number)); G.boomT = performance.now();
      A.se('doon'); A.se('collapse', { vol: .7 }); flash('gold');
      telop(D.LINES.boom); kitaSay();
      draw(); await sleep(520);
      G.boomAt.forEach(([x, y]) => { G.board[y][x] = null; });
      G.boomAt = null;
      const cols = new Set([...gone].map((k) => +k.split(',')[0]));
      for (const x of cols) {   // その列だけ下に詰める
        const stack = []; for (let y = ROWS - 1; y >= 0; y--) if (G.board[y][x]) stack.push(G.board[y][x]);
        for (let y = ROWS - 1, i = 0; y >= 0; y--, i++) G.board[y][x] = stack[i] || null;
      }
      remapHeads();
      G.booms += hits.length; G.score += D.BOOM * (G.lv + 1) * hits.length;
      drawHud(); draw(); await sleep(260);
      hits = findCivic();
    }
  }

  // 横1列そろったら消える。ただし「市」「民」「税」がある列は消えない
  async function clearLines() {
    const full = [];
    for (let y = 0; y < ROWS; y++) if (G.board[y].every(c => c) && !G.board[y].some(c => c.kanji)) full.push(y);
    const blocked = G.board.some(r => r.every(c => c) && r.some(c => c.kanji));
    if (blocked && !G.toldTax) { G.toldTax = true; telop('市・民・税があると\n消えない！'); A.se('despair', { vol: .4 }); }
    if (!full.length) { draw(); return; }
    const fr = $('#flashRows'); fr.innerHTML = '';
    full.forEach(y => { const i = document.createElement('i'); i.style.top = (y / ROWS * 100) + '%'; i.style.height = (100 / ROWS) + '%'; fr.appendChild(i); });
    A.se(full.length > 1 ? 'fanfare' : 'correct', { vol: .55 });
    telop(full.length > 1 ? `${D.LINES.clearN}\n${full.length}列` : D.LINES.clear1);
    await sleep(320);
    G.board = G.board.filter((_, y) => !full.includes(y));
    while (G.board.length < ROWS) G.board.unshift(Array(COLS).fill(null));
    remapHeads();
    G.lines += full.length; G.totalLines += full.length;
    G.score += D.POINTS[Math.min(4, full.length)] * (G.lv + 1);
    fr.innerHTML = '';
    drawHud(); draw();
  }

  // ───── 税務署員：次のブロックを「市」「民」「税」にすり替える（市→民→税の順） ─────
  async function officerVisit() {
    if (!G || G.over) return false;
    const off = $('#nura');
    $('#nBubble').textContent = D.LINES.officer[0];
    A.voice('officer');   // 税務署員の声
    $('#nuraImg').src = 'assets/art/officer_idle.webp';
    off.classList.add('on');
    A.se('ghost', { vol: .6 });
    await sleep(900);
    if (!G || G.over) return true;
    $('#nuraImg').src = 'assets/art/officer_throw.webp';
    A.se('cup_put'); A.se('doon', { vol: .4 });
    // 「市」「民」「税」を3つまとめて投げ込む。順番はバラバラで、間に普通のブロックが gap 個はさまる（null）
    const gap = D.LEVELS[G.lv].gap || 0, ks = shuffle(D.KANJI_ORDER);
    G.kq = ks.flatMap((k, i) => (i ? [...Array(gap).fill(null), k] : [k]));
    G.next = G.kq.shift(); G.visits++; G.taxTotal++;
    drawNext();
    const nx = $('.next'); nx.classList.remove('hit'); void nx.offsetWidth; nx.classList.add('hit');
    kitaSay();
    await sleep(900);
    off.classList.remove('on');
    return true;
  }
  // 北村さん（ぬらりひょん）の口ぐせ
  function kitaSay() {
    const s = $('#kitaSay'); s.classList.remove('on'); void s.offsetWidth; s.classList.add('on');
    clearTimeout(kitaSay.t); kitaSay.t = setTimeout(() => s.classList.remove('on'), 1500);
  }

  // ───── 進行 ─────
  let raf = 0;
  const hold = { left: 0, right: 0, down: 0 };
  let lastStart = -1e9;
  function startGame() {
    if (performance.now() - lastStart < 1500) return;   // ボタンの2度押しで、ゲームが2つ同時に始まらないように
    lastStart = performance.now();
    G = { board: empty(), bag: [], next: null, cur: null, lv: P.has('lv') ? Math.max(0, Math.min(4, +P.get('lv') - 1)) : 0, lines: 0, totalLines: 0, score: 0, booms: 0, taxTotal: 0,
      sinceTax: 0, visits: 0, busy: false, over: false, paused: false, boomAt: null, pid: 0, landFx: null, kq: [] };
    show('play'); fit();
    $('#nura').classList.remove('on'); $('#kitaSay').classList.remove('on');
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
      if (G && G.landFx && t - G.landFx.t < 300) draw();   // 着地の、ぷよっとつぶれる動き
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
    telop(G.lv === 0 ? 'LEVEL 1\nまずは練習（税務署員なし）' : `LEVEL ${G.lv + 1}`);
    A.se('hyoushigi');
  }
  async function levelUp() {
    if (G.lv >= D.LEVELS.length - 1) { await win(); return; }
    G.lv++; G.lines = 0; G.sinceTax = 0;
    A.se('levelup');
    if (G.lv === 3) A.bgm('fast', { vol: .6 });
    drawHud();
    telop(`LEVEL ${G.lv + 1}` + (G.lv === 1 ? '\n税務署員が来るぞ…' : ''));
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
  // 「市」「民」「税」のブロック
  function drawKanji(c, x, y, s, k, alpha = 1) {
    c.save(); c.globalAlpha = alpha;
    const r = s * .16, col = D.KANJI_COLOR[k] || '#6e5a8a';
    roundRect(c, x + 1, y + 1, s - 2, s - 2, r); c.fillStyle = col; c.fill();
    const g = c.createLinearGradient(0, y, 0, y + s); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(.5, 'rgba(255,255,255,0)');
    roundRect(c, x + 3, y + 3, s - 6, s - 6, r * .7); c.fillStyle = g; c.fill();
    roundRect(c, x + 1, y + 1, s - 2, s - 2, r); c.lineWidth = 2.5; c.strokeStyle = '#1b1530'; c.stroke();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `${Math.round(s * .66)}px Boku, serif`; c.fillText(k, x + s / 2, y + s / 2 + s * .04);
    c.restore();
  }
  function drawCell(c, x, y, s, cell, alpha = 1) { if (cell.kanji) drawKanji(c, x, y, s, cell.kanji, alpha); }
  // 北村さんの頭ブロック：同じ形のマスは、つながった1つのかたまり（ぷよぷよのように外側の角だけ丸く、境目に線を引かない）
  //   list＝[{x, y, cell}]（マス目の位置）。ox, oy＝描き始めの位置
  function drawHeads(c, list, s, ox = 0, oy = 0) {
    if (!list.length) return;
    const at = new Map(list.map((o) => [o.x + ',' + o.y, o]));
    const same = (o, dx, dy) => { const n = at.get((o.x + dx) + ',' + (o.y + dy)); return !!n && n.cell.pid === o.cell.pid; };
    const R = s * .42, LW = Math.max(2.5, s * .1);
    // 着地した直後の形は、下を支点に横へふくらんで縦につぶれる
    const fx = G && G.landFx, now = performance.now();
    const squash = {};
    if (fx && now - fx.t < 260) {
      const k = (now - fx.t) / 260, e = Math.sin(Math.PI * k) * (1 - k * .3);
      const mine = list.filter((o) => o.cell.pid === fx.pid);
      if (mine.length) {
        const cx = ox + (Math.min(...mine.map((o) => o.x)) + Math.max(...mine.map((o) => o.x)) + 1) * s / 2;
        const by = oy + (Math.max(...mine.map((o) => o.y)) + 1) * s;
        squash[fx.pid] = { cx, by, sx: 1 + .1 * e, sy: 1 - .16 * e };
      }
    }
    const shape = (o, grow) => {   // 外側の角だけ丸い四角。grow＝外側にふくらませる量
      const up = same(o, 0, -1), dn = same(o, 0, 1), lf = same(o, -1, 0), rt = same(o, 1, 0);
      const g = (inner) => (inner ? .7 : grow);   // つながった側は少しだけ重ねて、すき間を作らない
      const x = ox + o.x * s - g(lf), y = oy + o.y * s - g(up), w = s + g(lf) + g(rt), h = s + g(up) + g(dn);
      const tl = !up && !lf ? R : 0, tr = !up && !rt ? R : 0, br = !dn && !rt ? R : 0, bl = !dn && !lf ? R : 0;
      c.beginPath(); c.moveTo(x + tl, y);
      c.arcTo(x + w, y, x + w, y + h, tr); c.arcTo(x + w, y + h, x, y + h, br);
      c.arcTo(x, y + h, x, y, bl); c.arcTo(x, y, x + w, y, tl); c.closePath();
    };
    const tf = (o) => { const q = squash[o.cell.pid]; if (q) { c.translate(q.cx, q.by); c.scale(q.sx, q.sy); c.translate(-q.cx, -q.by); } };
    // 1回目：ふちどり（外側にふくらませて、こげ茶で塗る）
    for (const o of list) { c.save(); tf(o); shape(o, LW * .5); c.fillStyle = '#2a1506'; c.fill(); c.restore(); }
    // 2回目：頭の絵
    for (const o of list) {
      c.save(); tf(o); shape(o, -LW * .15); c.clip();
      const x = ox + o.x * s, y = oy + o.y * s;
      const far = o.cell.src && (o.cell.src[0] + o.cell.src[2] <= 0 || o.cell.src[0] >= 1 || o.cell.src[1] + o.cell.src[3] <= 0 || o.cell.src[1] >= 1);
      if (HEADC.ok && o.cell.src && !far) {
        const [u, v, du, dv] = o.cell.src, W0 = HEADC.hw, H0 = HEADC.hh;
        const su = Math.max(-.5, Math.min(1.5 - du, u)), sv = Math.max(-.5, Math.min(1.5 - dv, v));
        c.drawImage(HEADC, W0 * (.5 + su), H0 * (.5 + sv), du * W0, dv * H0, x - .7, y - .7, s + 1.4, s + 1.4);
      }   // 頭の絵にかからないマスは、無地の頭の色（頭のふちの線が並ばないように）
      else { c.fillStyle = HD.skin[1]; c.fillRect(x - 1, y - 1, s + 2, s + 2); }
      c.restore();
    }
  }
  function pieceCellsWithFace(p, x = p.x, y = p.y) {
    const def = D.PIECES[p.t], cells = pieceCells(p, p.rot, x, y);
    const src = def.kanji ? null : faceCells(p.t, p.rot);
    return cells.map(([cx, cy], i) => [cx, cy, def.kanji ? { kanji: def.kanji } : { pid: 'cur', src: src[i] }]);
  }
  function draw() {
    const s = L.cell;
    ctx.clearRect(0, 0, COLS * s, ROWS * s);
    // ラックの段（ガイドの線）
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * s + .5); ctx.lineTo(COLS * s, y * s + .5); ctx.stroke(); }
    for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(x * s + .5, 0); ctx.lineTo(x * s + .5, ROWS * s); ctx.stroke(); }
    // 「市」「民」「税」のある列を、うっすら色づけ（そろえても消えない）
    for (let y = 0; y < ROWS; y++) if (G.board[y].some(c => c && c.kanji)) { ctx.fillStyle = 'rgba(184,53,42,.14)'; ctx.fillRect(0, y * s, COLS * s, s); }
    const heads = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const cell = G.board[y][x]; if (!cell) continue;
      if (cell.kanji) drawKanji(ctx, x * s, y * s, s, cell.kanji); else heads.push({ x, y, cell });
    }
    if (G.cur) {
      const gy = ghostY(), kj = D.PIECES[G.cur.t].kanji;
      if (gy !== G.cur.y) pieceCells(G.cur, G.cur.rot, G.cur.x, gy).forEach(([x, y]) => { if (y >= 0) { ctx.save(); roundRect(ctx, x * s + 3, y * s + 3, s - 6, s - 6, 6); ctx.strokeStyle = kj ? D.KANJI_COLOR[kj] : '#e9b21f'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.restore(); } });
      pieceCellsWithFace(G.cur).forEach(([x, y, cell]) => { if (y < 0) return; if (cell.kanji) drawKanji(ctx, x * s, y * s, s, cell.kanji); else heads.push({ x, y, cell }); });
    }
    drawHeads(ctx, heads, s);
    if (G.boomAt) {   // 小爆発
      const k = Math.min(1, (performance.now() - G.boomT) / 500);
      G.boomAt.forEach(([x, y]) => { ctx.save(); ctx.globalAlpha = 1 - k * .6; ctx.fillStyle = k < .3 ? '#fff' : '#ffcf4a'; roundRect(ctx, x * s + 1, y * s + 1, s - 2, s - 2, 6); ctx.fill(); ctx.restore(); });
    }
  }
  function drawNext() {
    const later = G && G.kq ? G.kq.filter(Boolean).map((k) => D.PIECES[k].kanji) : [];
    $('#kqInfo').innerHTML = later.length ? `あとで<br><b>${later.join('<br>')}</b>` : '';   // 縦に並べる（税務署員のふきだしに重ならないように）
    const c = $('#nextCv').getContext('2d'); c.clearRect(0, 0, 120, 120);
    if (!G || !G.next) return;
    const def = D.PIECES[G.next], cells = def.cells, s = def.kanji ? 52 : 26;
    const src = def.kanji ? null : faceCells(G.next, 0);
    const xs = cells.map(a => a[0]), ys = cells.map(a => a[1]);
    const w = (Math.max(...xs) - Math.min(...xs) + 1) * s, h = (Math.max(...ys) - Math.min(...ys) + 1) * s;
    if (def.kanji) { drawKanji(c, (120 - w) / 2, (120 - h) / 2, s, def.kanji); return; }
    drawHeads(c, cells.map(([x, y], i) => ({ x: x - Math.min(...xs), y: y - Math.min(...ys), cell: { pid: 'next', src: src[i] } })), s, (120 - w) / 2, (120 - h) / 2);
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
    [...Array(7)].forEach((_, i, a) => {   // 被害者の会：みんな北村さん
      const ang = -Math.PI / 2 + i * Math.PI * 2 / a.length;
      const im = document.createElement('img'); im.className = 'face'; im.src = 'assets/face/kitamura_sq.jpg';
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
    $('#rPic').src = G.cleared ? 'assets/art/kita_up.webp' : 'assets/art/officer_idle.webp';
    $('#rName').textContent = ''; $('#rNote').textContent = '';
    await countUp($('#rScore'), G.score, 800);
    await countUp($('#rLines'), G.totalLines, 300);
    await countUp($('#rTax'), G.booms, 300);
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
      if (withPic) { const im = new Image(); im.src = $('#rPic').src; await im.decode(); const hh = 364, ww = im.width * hh / im.height; x.drawImage(im, 380 - ww / 2, 180, ww, hh); }
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
    faceCells: (t, rot) => faceCells(t, rot),
    headMap: (cells) => headMap(cells),
    remapHeads: () => remapHeads(),
    drawHeads: (...a) => drawHeads(...a),
    draw: () => draw(),
    best() { const l = this.ranked(); return l ? l[0] || null : null; },
    // 置き方を、よい順に並べて返す（雑な自動プレイ役は、2〜4番目を選ぶこともある）
    ranked() {
      if (!G || !G.cur || G.busy) return null;
      const p = G.cur; const all = [];
      for (let r = 0; r < 4; r++) for (let x = -2; x < COLS + 1; x++) {
        if (!fits(p, r, x, p.y)) continue;
        let y = p.y; while (fits(p, r, x, y + 1)) y++;
        const b = G.board.map(row => row.slice());
        pieceCells(p, r, x, y).forEach(([cx, cy]) => { if (cy >= 0) b[cy][cx] = { face: 'x' }; });
        if (D.PIECES[p.t].kanji) pieceCells(p, r, x, y).forEach(([cx, cy]) => { if (cy >= 0) b[cy][cx] = { kanji: D.PIECES[p.t].kanji }; });
        let lines = 0, holes = 0, agg = 0, bump = 0, hs = [], civic = 0;
        const K = (xx, yy) => (b[yy] && b[yy][xx] && b[yy][xx].kanji) || '';
        for (let yy = 0; yy < ROWS; yy++) for (let xx = 0; xx < COLS; xx++) { if (civic3(K(xx, yy), K(xx + 1, yy), K(xx + 2, yy))) civic++; if (civic3(K(xx, yy), K(xx, yy + 1), K(xx, yy + 2))) civic++; }
        for (let yy = 0; yy < ROWS; yy++) if (b[yy].every(c => c) && !b[yy].some(c => c.kanji)) lines++;
        for (let xx = 0; xx < COLS; xx++) { let h = 0, seen = false; for (let yy = 0; yy < ROWS; yy++) { if (b[yy][xx]) { if (!seen) { h = ROWS - yy; seen = true; } } else if (seen) holes++; } hs.push(h); agg += h; }
        for (let xx = 1; xx < COLS; xx++) bump += Math.abs(hs[xx] - hs[xx - 1]);
        let sc = lines * 8 - holes * 6 - agg * .5 - bump * .4 + civic * 40;
        if (D.PIECES[p.t].kanji) {   // 「市」「民」「税」は、ちがう漢字のとなりに置いて、3つそろえやすくする
          const [[kx, ky]] = pieceCells(p, r, x, y), k = D.PIECES[p.t].kanji;
          if ([K(kx - 1, ky), K(kx + 1, ky), K(kx, ky + 1)].some((n) => n && n !== k)) sc += 20;
          if (K(kx, ky + 1) && K(kx, ky + 1) !== k) sc += 30;   // ちがう漢字の上に縦に積む（市→民→税の順に来るので、同じ列に積めばそろう）
          const any = G.board.some((row) => row.some((c) => c && c.kanji));
          if (any && ![K(kx - 1, ky), K(kx + 1, ky), K(kx, ky + 1)].some(Boolean)) sc -= 12;   // 漢字をばらばらに置かない
        }
        all.push({ sc, r, x });
      }
      return all.sort((a, b) => b.sc - a.sc).map((m) => ({ rot: (m.r - p.rot + 4) % 4, dx: m.x - p.x }));
    },
  };

  // 途中で切りかえる絵は、先に読み込んでおく（切りかえた瞬間に前の絵が一瞬出たり、消えたりしないように）
  const PRELOAD = ['assets/art/officer_idle.webp', 'assets/art/officer_throw.webp', 'assets/art/kita_up.webp', 'assets/face/kitamura_sq.jpg', D.HEAD.src].map((s) => { const i = new Image(); i.src = s; if (i.decode) i.decode().catch(() => { }); return i; });
  fit();
  toTitle();
  if (P.has('play')) startGame();
})();
