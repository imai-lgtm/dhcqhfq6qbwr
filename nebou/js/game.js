// 寝坊 — 中島さんを起こしに行け（道中 → インターホン修理 → ピンポン）
(() => {
  const D = window.DATA, A = window.AUDIO;
  const $ = (s) => document.querySelector(s);
  const P = new URLSearchParams(location.search);
  const FAST = P.has('fast') ? 0.4 : 1;            // テスト用：演出の待ち時間を短くする
  const sleep = (ms) => new Promise(r => setTimeout(r, ms * FAST));
  const rand = (a, b) => a + Math.random() * (b - a);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const app = $('#app');

  // ───── 画面の形（縦長＝スマホ／横長＝PC・スマホ横向き） ─────
  const LAYOUT = { port: { W: 390, H: 844, runX: 70, runH: 128, ground: 214, house: { x: 0, y: 140 } }, land: { W: 1280, H: 720, runX: 220, runH: 150, ground: 186, house: { x: 445, y: 120 } } };
  let L = LAYOUT.port, scale = 1;
  // スマホ縦は、横幅を画面にぴったり合わせ、縦の長さは画面の形に合わせて伸び縮みさせる（680〜900）
  const portH = () => Math.round(Math.max(680, Math.min(900, innerHeight * 390 / innerWidth)));
  function fit() {
    const land = innerWidth > innerHeight * 1.05;
    if (!land) LAYOUT.port.H = portH();
    L = land ? LAYOUT.land : LAYOUT.port;
    app.classList.toggle('land', land);
    app.style.width = L.W + 'px'; app.style.height = L.H + 'px'; app.style.setProperty('--H', L.H + 'px');
    scale = Math.min(innerWidth / L.W, innerHeight / L.H);
    app.style.setProperty('--s', scale);
  }
  addEventListener('resize', fit);

  // ───── 保存・画面・音 ─────
  const SAVE_KEY = 'nebou_save_v1';
  let save = { best: -1, howto: false };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (_) { }
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) { } };
  const show = (id) => document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  const overlay = (id, on) => $('#' + id).classList.toggle('on', on);
  const scene = (id) => document.querySelectorAll('.scene').forEach(s => s.classList.toggle('on', s.id === id));

  A.init({
    se: ['tap', 'start', 'jump', 'land', 'falldown', 'kira', 'doorchime', 'beep', 'spark', 'step_heavy', 'step_cute', 'door_open', 'alarm',
      'phone_ring', 'phone_pick', 'snore', 'ramen', 'speedup', 'correct', 'wrong', 'rank', 'fanfare', 'chanchan', 'boyoyon', 'hyoushigi', 'timer', 'dog'],
    voice: [],
  });
  const muteBtn = $('#mute');
  const syncMute = () => muteBtn.classList.toggle('off', A.muted);
  muteBtn.addEventListener('click', (e) => { e.stopPropagation(); A.unlock(); A.setMuted(!A.muted); syncMute(); });
  syncMute();
  document.addEventListener('pointerdown', () => A.unlock(), { once: true });

  function toTitle() {
    show('title');
    $('#best').textContent = save.best >= 0 ? `ベスト：${save.best}秒のこし` : '';
    A.bgm('title');
  }
  $('#btnStart').addEventListener('click', async () => {
    A.unlock(); A.se('start');
    if (!save.howto) { overlay('howto', true); return; }
    await sleep(400); startGame();
  });
  $('#btnHowtoOk').addEventListener('click', () => { A.se('tap'); save.howto = true; store(); overlay('howto', false); startGame(); });
  $('#btnCredits').addEventListener('click', () => { A.se('tap'); overlay('credits', true); });
  $('#btnCreditsOk').addEventListener('click', () => { A.se('tap'); overlay('credits', false); });

  // ───── 共通の小物 ─────
  function telop(t) { const e = $('#telop'); e.textContent = t; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); }
  function flash(red) { const f = $('#flash'); f.classList.toggle('red', !!red); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  function guide(t) { const g = $('#guide'); g.textContent = t || ''; g.classList.toggle('on', !!t); }
  function timeChange(sec) {
    G.left = Math.max(0, Math.min(D.TIME + 30, G.left + sec));
    const m = $('#minus'); m.textContent = (sec > 0 ? '+' : '−') + Math.abs(sec) + '秒';
    m.classList.toggle('plus', sec > 0); m.classList.remove('on'); void m.offsetWidth; m.classList.add('on');
    if (sec < 0) flash(true);
    drawClock();
  }
  function drawClock() {
    $('#timeNum').textContent = Math.ceil(G.left);
    $('.clock').classList.toggle('hurry', G.left <= 15);
    // 見守りカメラの時計：6:58 から、持ち時間が減るほど進む
    const m = 58 + Math.floor((D.TIME - G.left) / 15);
    $('#camTime').textContent = `0${6 + Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
    $('#pcam').classList.toggle('deep', G.left < 40);
  }

  // ───── ゲームの状態と持ち時間 ─────
  let G = null, clockRaf = 0;
  let lastStart = -1e9;
  function startGame() {
    if (performance.now() - lastStart < 1500) return;   // ボタンの2度押しで、ゲームが2つ同時に始まらないように
    lastStart = performance.now();
    G = { left: D.TIME, hits: 0, coffee: 0, phase: 'run', over: false, paused: false, rings: 0 };
    show('play'); scene('run'); guide('');
    $('#pcam').classList.remove('grandma', 'shake');
    $('#camImg').src = 'assets/photo/cam_sleep.jpg';
    drawClock();
    let prev = performance.now();
    cancelAnimationFrame(clockRaf);
    const tick = (t) => {
      if (!G || G.over) return;
      const dt = Math.min(.1, (t - prev) / 1000); prev = t;
      if (!G.paused && !window.GC_HOLD) {   // ゲーセンに戻る確認の間は止める
        G.left = Math.max(0, G.left - dt);
        drawClock();
        if (G.left <= 0) { fail(); return; }
      }
      clockRaf = requestAnimationFrame(tick);
    };
    clockRaf = requestAnimationFrame(tick);
    runPhase();
  }

  // ═════ 場面① 道中 ═════
  const runEl = $('#run'), runner = $('#runner'), objsEl = $('#objs');
  let R = null;
  function jump() {
    if (!R || !R.on || R.y > 0 || R.fallT > 0) return;
    R.vy = 980; R.jumps++;
    A.se('jump', { vol: .5 });
    if (R.hint) { R.hint = false; $('#jumpHint').classList.remove('on'); R.slow = false; }
  }
  runEl.addEventListener('pointerdown', (e) => { if (e.target.closest('.mute')) return; jump(); });
  addEventListener('keydown', (e) => { if ((e.code === 'Space' || e.key === 'ArrowUp') && G && G.phase === 'run') { e.preventDefault(); jump(); } });

  function runPhase() {
    G.phase = 'run';
    A.bgm('run');
    objsEl.innerHTML = ''; $('#layPoles').innerHTML = '';
    R = { on: true, y: 0, vy: 0, speed: 330, dist: 0, goal: 9000, nextAt: 520, objs: [], frame: 0, ft: 0, fallT: 0, hurtT: 0, hint: true, slow: true, jumps: 0, houses: 0, poles: 0, ground: 0 };
    $('#runBar').style.width = '0';
    let prev = performance.now();
    return new Promise(done => {
      const step = (t) => {
        if (!G || G.over) return;
        const dt = Math.min(.05, (t - prev) / 1000); prev = t;
        if (!G.paused && !window.GC_HOLD) runStep(dt);
        if (R.dist >= R.goal && !R.objs.some(o => o.x > L.runX - 40)) { R.on = false; arrive().then(done); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  function spawn() {
    const o = Math.random() < .2 ? { coffee: true, w: 46, h: 62, pad: 0, y: Math.random() < .5 ? 150 : 16 } : { ...D.OBSTACLES[Math.floor(Math.random() * D.OBSTACLES.length)], y: 0 };
    const el = document.createElement('img');
    el.src = `assets/art/${o.coffee ? 'item_coffee' : o.id}.svg`;
    el.style.width = o.w + 'px'; el.style.height = o.h + 'px';
    objsEl.appendChild(el);
    R.objs.push({ ...o, el, x: L.W + 20 });
  }
  function runStep(dt) {
    // 速さ：最初の障害物はゆっくり（ジャンプの練習）、だんだん速く
    const target = R.slow ? 170 : Math.min(560, 330 + R.dist / 40);
    R.speed += (target - R.speed) * Math.min(1, dt * 2);
    const v = R.fallT > 0 ? R.speed * .35 : R.speed;
    R.dist += v * dt;
    // 背景を流す
    R.houses += v * .35 * dt; R.poles += v * .75 * dt; R.ground += v * dt;
    $('#layHouses').style.backgroundPositionX = -R.houses + 'px';
    const lay = $('#layPoles'), gap = L.W > 1000 ? 640 : 560;
    if (!lay.children.length) for (let i = 0; i < Math.ceil(L.W / gap) + 2; i++) { const im = document.createElement('img'); im.src = 'assets/art/bg_pole.svg'; lay.appendChild(im); }
    [...lay.children].forEach((im, i) => { const x = ((i * gap - R.poles) % (lay.children.length * gap) + lay.children.length * gap) % (lay.children.length * gap) - gap / 2; im.style.transform = `translateX(${x}px)`; });
    $('.r-ground').style.backgroundPositionX = -R.ground + 'px';
    $('#runBar').style.width = Math.min(100, R.dist / R.goal * 100) + '%';
    // 障害物を出す
    if (R.dist < R.goal - 400 && R.dist >= R.nextAt) {
      spawn();
      R.nextAt = R.dist + rand(380, 620) * (R.speed / 400);
      if (R.hint && R.objs.length === 1) $('#jumpHint').classList.add('on');
    }
    // 最初の障害物を越えたら（跳ばなくても）練習はおしまい
    if (R.slow && R.objs[0] && R.objs[0].x < L.runX - 90) { R.slow = false; R.hint = false; $('#jumpHint').classList.remove('on'); }
    // ジャンプ
    if (R.y > 0 || R.vy > 0) { R.y += R.vy * dt; R.vy -= 2800 * dt; if (R.y <= 0) { R.y = 0; R.vy = 0; A.se('land', { vol: .3 }); } }
    // 走りのコマ
    R.fallT = Math.max(0, R.fallT - dt); R.hurtT = Math.max(0, R.hurtT - dt);
    R.ft += dt * v / 330;
    if (R.ft > .09) { R.ft = 0; R.frame = (R.frame + 1) % 3; }
    runner.src = `assets/art/${R.fallT > 0 ? 'runner_fall' : R.y > 0 ? 'runner_jump' : 'runner_' + (R.frame + 1)}.svg`;
    runner.style.transform = `translateY(${-R.y}px)`;
    // 動かす・当たり判定
    const rx1 = L.runX + 22, rx2 = L.runX + L.runH * .62;
    for (const o of R.objs) {
      o.x -= v * dt;
      o.el.style.transform = `translate(${o.x}px, ${-o.y}px)`;
      if (o.done) continue;
      const ox1 = o.x + o.pad, ox2 = o.x + o.w - o.pad;
      if (ox2 < rx1 || ox1 > rx2) continue;
      if (o.coffee) {
        const top = R.y + L.runH * .9;
        if (R.y < o.y + o.h && top > o.y) { o.done = true; o.el.remove(); G.coffee++; A.se('kira', { vol: .7 }); timeChange(D.COFFEE); }
      } else if (R.y < o.h - o.pad - 6 && R.hurtT <= 0) {
        o.done = true; G.hits++;
        R.fallT = .55; R.hurtT = 1.1;
        runner.classList.remove('hurt'); void runner.offsetWidth; runner.classList.add('hurt');
        A.se('falldown', { vol: .7 });
        if (o.id === 'obs_dog') A.se('dog', { vol: .6 });
        timeChange(-D.PENALTY.hit);
      }
    }
    R.objs = R.objs.filter(o => { if (o.x < -160) { o.el.remove(); return false; } return true; });
  }
  async function arrive() {
    A.se('speedup', { vol: .6 });
    telop('中島家に着いた！');
    await sleep(1100);
    await doorPhase();
  }

  // ═════ 場面②③ 中島家の玄関 ═════
  const H = D.HOUSE, px = (r) => ({ left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
  function placeHouse() {
    Object.assign($('#glass').style, px(H.glass));
    Object.assign($('#doorway').style, px(H.door));
    Object.assign($('#intercomBtn').style, px(H.intercom));
    Object.assign($('#bushMe').style, px(H.bush));
  }
  const bubble = (t, angry) => { const b = $('#dBubble'); b.textContent = t; b.className = 'd-bubble on' + (angry ? ' angry' : ''); };
  const bubbleOff = () => $('#dBubble').classList.remove('on');
  let doorAct = null;   // ピンポン・隠れるを押したときに呼ぶ
  $('#btnRing').addEventListener('click', () => { if (doorAct) doorAct('ring'); });
  $('#intercomBtn').addEventListener('click', () => { if (doorAct) doorAct('ring'); });
  $('#btnHide').addEventListener('click', () => { if (doorAct) doorAct('hide'); });
  const waitDoor = (allowed) => new Promise(res => { doorAct = (a) => { if (!allowed.includes(a)) return; doorAct = null; res(a); }; });
  const btns = (ring, hide) => {
    $('#btnRing').parentElement.classList.remove('off');
    $('#btnRing').style.opacity = ring ? '' : '.4'; $('#btnRing').style.pointerEvents = ring ? '' : 'none';
    $('#btnHide').style.opacity = hide ? '' : '.4'; $('#btnHide').style.pointerEvents = hide ? '' : 'none';
  };

  async function doorPhase() {
    G.phase = 'door';
    scene('door'); placeHouse();
    A.bgm('door', { vol: .8 });
    $('#bushMe').classList.remove('on'); $('#doorway').classList.remove('on'); bubbleOff();
    // まずはインターホン → 鳴らない
    guide('インターホンを押そう');
    $('#btnRing').classList.add('glow'); $('#intercomBtn').classList.add('glow');
    btns(true, false);
    await waitDoor(['ring']);
    $('#btnRing').classList.remove('glow'); $('#intercomBtn').classList.remove('glow');
    guide('');
    A.se('beep'); bubble(D.LINES.broken);
    await sleep(1100);
    bubbleOff();
    if (G.over) return;
    await fixPhase();
    if (G.over) return;
    await ringPhase();
  }

  // ───── インターホン修理：同じ色の線と端子をつなぐ ─────
  // 端子のラベルは最初の数秒だけ見えて、そのあとかすれて読めなくなる（並びは毎回ちがう）→ 覚えてつなぐ
  async function fixPhase() {
    G.phase = 'fix';
    overlay('fix', true);
    const dots = $('#fixDots'), lines = $('#fixLines'), title = $('#fixT');
    dots.innerHTML = ''; lines.innerHTML = '';
    const F = D.FIX, pct = (p) => ({ left: (p.x / 320 * 100) + '%', top: (p.y / 300 * 100) + '%' });
    // 端子の位置はそのまま、色の並びだけ入れかえる
    const colors = shuffle(F.terminals.map(t => t.c));
    const terms = F.terminals.map((t, i) => ({ ...t, c: colors[i] }));
    let sel = null, left = 4;
    const mk = (p, kind) => {
      const d = document.createElement('button');
      d.className = 'fix-dot ' + kind; d.dataset.c = p.c; d.dataset.kind = kind;
      Object.assign(d.style, pct(p));
      if (kind === 'term') d.innerHTML = `<i style="background-color:${F.color[p.c]}"></i>`;
      dots.appendChild(d);
      return { p, d };
    };
    const wireEls = F.wires.map(p => mk(p, 'wire'));
    const termEls = terms.map(p => mk(p, 'term'));
    // 覚える時間
    dots.classList.add('locked');
    title.innerHTML = 'インターホンが壊れている！<br>端子のラベルを<b>覚えて！</b>　<span class="cd" id="fixCd">3</span>';
    for (let n = 3; n > 0; n--) { $('#fixCd').textContent = n; A.se('tap', { vol: .4 }); await sleep(D.FIX_MEMO / 3); if (G.over) return; }
    termEls.forEach(t => t.d.classList.add('dirty'));
    A.se('paper', { vol: .6 });
    title.innerHTML = '……ラベルがかすれて読めない！<br><b>同じ色の線と端子</b>を、記憶でつなごう';
    dots.classList.remove('locked');
    const peek = (d) => { d.classList.remove('dirty'); clearTimeout(d._t); d._t = setTimeout(() => { if (!d.classList.contains('done')) d.classList.add('dirty'); }, 900); };
    await new Promise(done => {
      const pick = (kind, el) => {
        if (G.over || el.d.classList.contains('done')) return;
        if (!sel || sel.kind === kind) {   // 1つ目（同じ種類をもう一度押したら選び直し）。線からでも端子からでもよい
          dots.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
          el.d.classList.add('sel'); sel = { kind, ...el }; A.se('tap'); return;
        }
        const w = kind === 'wire' ? el : sel, t = kind === 'term' ? el : sel;
        w.d.classList.remove('sel'); t.d.classList.remove('sel'); sel = null;
        if (w.p.c === t.p.c) {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const mx = (w.p.x + t.p.x) / 2;
          path.setAttribute('d', `M${w.p.x} ${w.p.y} C${mx} ${w.p.y + 30} ${mx} ${t.p.y - 30} ${t.p.x} ${t.p.y}`);
          path.setAttribute('stroke', F.color[t.p.c]);
          lines.appendChild(path);
          w.d.classList.add('done'); t.d.classList.add('done'); t.d.classList.remove('dirty');
          left--;
          A.se('correct', { vol: .5 });
          if (left === 0) done();
        } else {
          A.se('spark'); flash(); timeChange(-D.PENALTY.spark); G.fixMiss = (G.fixMiss || 0) + 1;
          t.d.classList.remove('bad'); void t.d.offsetWidth; t.d.classList.add('bad');
          peek(t.d);   // まちがえた端子の色が一瞬だけ見える（ヒント）
        }
      };
      wireEls.forEach(el => el.d.addEventListener('click', () => pick('wire', el)));
      termEls.forEach(el => el.d.addEventListener('click', () => pick('term', el)));
      G.fixDone = done;
    });
    if (G.over) return;
    await sleep(250);
    A.se('doorchime');
    telop('直った！');
    await sleep(700);
    overlay('fix', false);
  }

  // ───── ピンポン：影を見て、お父さんなら隠れる・おばあちゃんなら待つ ─────
  async function ringPhase() {
    G.phase = 'ring';
    // お父さんが1〜2回先に出てきて、そのあとおばあちゃん（1回目は必ずお父さん）
    G.queue = [...Array(1 + (Math.random() < .5 ? 1 : 0)).fill('dad'), 'grandma'];
    while (!G.over) {
      G.rings++;
      if (G.rings === 1) guide('ドアのすりガラスの影を見て判断！\nお父さん（大きい）なら「隠れる」\nおばあちゃん（小さい・杖）なら何も押さずに待つ');
      btns(true, false);
      const a = await waitDoor(['ring']);
      if (G.over) return;
      A.se('doorchime');
      // 誰が来るか：順番待ちの列の先頭。うまくさばけた時だけ次の人へ進む（運ではなく腕で進む）
      const who = G.queue[0];
      G.who = who; G.hidden = false;
      btns(false, false);
      await sleep(450);
      if (G.over) return;
      // 影が近づいてくる
      const sh = $('#shadow');
      sh.src = `assets/art/${who}_shadow.svg`;
      const steps = $('#steps');
      steps.textContent = who === 'dad' ? 'ドスドスドス…' : 'トコトコ…';
      steps.classList.add('on');
      const stepTimer = setInterval(() => A.se(who === 'dad' ? 'step_heavy' : 'step_cute', { vol: who === 'dad' ? .6 : .5 }), 520);
      A.se(who === 'dad' ? 'step_heavy' : 'step_cute', { vol: .6 });
      sh.animate([{ opacity: 0, transform: 'scale(.7)' }, { opacity: .92, transform: 'scale(1)' }], { duration: 1500 * FAST, fill: 'forwards', easing: 'ease-in' });
      btns(false, true);
      G.decide = true;
      const tOpen = performance.now();
      const r = await Promise.race([waitDoor(['hide']), sleep(1700).then(() => 'open')]);
      G.decide = false;
      doorAct = null;
      clearInterval(stepTimer);
      steps.classList.remove('on');
      if (r === 'hide') { G.hidden = true; $('#bushMe').classList.add('on'); A.se('tap'); await sleep(Math.max(0, 1700 - (performance.now() - tOpen) / FAST)); }
      btns(false, false);
      if (G.over) return;
      // ドアが開く
      A.se('door_open', { vol: .6 });
      sh.getAnimations().forEach(x => x.cancel()); sh.style.opacity = 0;
      $('#person').src = `assets/art/${who}.svg`;
      $('#doorway').classList.add('on');
      if (who === 'dad' && !G.hidden) { bubble(D.LINES.dadSeen, true); timeChange(-D.PENALTY.dadSeen); }
      else if (who === 'dad') { bubble(D.LINES.dadHidden); G.queue.shift(); }
      else if (G.hidden) { bubble(D.LINES.grandmaMiss); timeChange(-D.PENALTY.grandmaMiss); }
      else { guide(''); bubble(D.LINES.grandmaOk); await sleep(1600); return clear(); }
      if (G.rings === 1) guide('');
      await sleep(1600);
      $('#doorway').classList.remove('on'); $('#bushMe').classList.remove('on'); bubbleOff();
    }
  }

  // ═════ 起床（クリア） ═════
  async function clear() {
    if (G.over) return;
    G.paused = true; G.phase = 'clear';
    A.stopBgm(400);
    const cam = $('#pcam');
    cam.classList.add('grandma');
    bubble(D.LINES.wake);
    A.se('alarm', { vol: .7 });
    await sleep(900);
    cam.classList.add('shake');
    await sleep(900);
    A.stopSe('alarm');
    G.over = true;
    show('end'); $('#end').classList.remove('fail');
    ['eNaka', 'eRamen', 'ePhone', 'eCam', 'eBubble', 'eTelop'].forEach(id => $('#' + id).classList.remove('on'));
    $('#eNaka').classList.add('on'); A.se('boyoyon');
    await sleep(300);
    $('#eBubble').textContent = D.LINES.sorry; $('#eBubble').classList.add('on');
    await sleep(1900);
    $('#eTelop').textContent = '現場、間に合った！'; $('#eTelop').classList.add('on');
    A.se('fanfare', { vol: .6 });
    await sleep(1500);
    $('#eNaka').classList.remove('on'); $('#eBubble').classList.remove('on');
    $('#eRamen').classList.add('on'); A.se('ramen', { vol: .7 });
    $('#eTelop').textContent = '夜間工事明けの\nラーメンは格別。';
    await sleep(2400);
    showResult(Math.ceil(G.left));
  }

  // ═════ 時間切れ（失敗） ═════
  async function fail() {
    if (G.over) return;
    G.over = true;
    doorAct = null; if (R) R.on = false;
    A.stopBgm(0);
    show('end'); $('#end').classList.add('fail');
    ['eNaka', 'eRamen', 'ePhone', 'eCam', 'eBubble', 'eTelop'].forEach(id => $('#' + id).classList.remove('on'));
    $('#ePhone').classList.add('on');
    A.se('phone_ring');
    await sleep(1900);
    A.stopSe('phone_ring'); A.se('phone_pick');
    $('#eBubble').textContent = D.LINES.shacho; $('#eBubble').classList.add('on');
    await sleep(2300);
    $('#ePhone').classList.remove('on'); $('#eBubble').classList.remove('on');
    $('#eCam').classList.add('on'); A.se('snore', { vol: .7 });
    await sleep(1400);
    $('#eTelop').textContent = '中島さんは、\n昼まで寝ました。'; $('#eTelop').classList.add('on');
    A.se('chanchan');
    await sleep(2400);
    A.stopSe('snore');
    showResult(-1);
  }

  // ═════ 結果 ═════
  const rankOf = (s) => [...D.RANKS].reverse().find(r => s >= r.min);
  async function showResult(left) {
    show('result');
    A.bgm('result', { vol: .8 });
    const rk = rankOf(left), best = left > save.best;
    if (best) { save.best = left; store(); }
    G.result = left;
    $('#rPic').src = left >= 0 ? 'assets/photo/naka_awake.webp' : 'assets/photo/naka_body.webp';
    $('#rName').textContent = ''; $('#rNote').textContent = '';
    await countUp($('#rLeft'), Math.max(0, left), 600);
    await countUp($('#rHit'), G.hits, 300);
    await countUp($('#rCoffee'), G.coffee, 300);
    A.se('rank');
    const nm = $('#rName'); nm.textContent = rk.name; nm.classList.toggle('long', rk.name.length > 8); nm.classList.remove('stamp'); void nm.offsetWidth; nm.classList.add('stamp');
    $('#rNote').innerHTML = rk.note + (best && left >= 0 ? '<br><span class="r-best">ベスト更新！</span>' : '');
  }
  function countUp(el, to, ms) {
    return new Promise(res => {
      const t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / (ms * FAST)); el.textContent = Math.round(to * k); if (k < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
  }
  $('#btnRetry').addEventListener('click', () => { A.se('start'); startGame(); });
  $('#btnTitle').addEventListener('click', () => { A.se('tap'); G = null; toTitle(); });
  $('#btnSave').addEventListener('click', () => { A.se('tap'); saveImage(); });
  async function saveImage() {
    const left = G.result, rk = rankOf(left);
    const draw = async (withPhoto) => {
      const cv = document.createElement('canvas'); cv.width = 720; cv.height = 960;
      const x = cv.getContext('2d');
      x.fillStyle = '#fff8ec'; x.fillRect(0, 0, 720, 960);
      [['#f0441f', 22], ['#141a2a', 30], ['#1c8fd3', 8], ['#7bc142', 12]].reduce((p, [c, w]) => { x.fillStyle = c; x.fillRect(p, 0, w, 960); return p + w; }, 0);
      x.textAlign = 'center'; x.fillStyle = '#141a2a'; x.font = '120px Boku, serif'; x.fillText('寝坊', 380, 150);
      if (withPhoto) { const im = new Image(); im.src = $('#rPic').src; await im.decode(); const h = 360, w = im.width * h / im.height; x.drawImage(im, 380 - w / 2, 190, w, h); }
      x.font = '30px Maru, sans-serif'; x.fillStyle = '#8a7a64'; x.fillText('あなたは', 380, 610);
      x.font = '56px Boku, serif'; x.fillStyle = '#f0441f'; x.fillText(rk.name, 380, 690);
      x.font = '40px Dela, sans-serif'; x.fillStyle = '#141a2a'; x.fillText(left >= 0 ? `${left}秒のこして集合` : '時間切れ', 380, 790);
      x.font = '26px Maru, sans-serif'; x.fillStyle = '#8a7a64'; x.fillText('株式会社 心電通', 380, 900);
      return cv.toDataURL('image/png');
    };
    let url; try { url = await draw(true); } catch (_) { url = await draw(false); }
    const a = document.createElement('a'); a.href = url; a.download = 'nebou.png'; a.click();
  }

  // ───── テスト用 ─────
  window.NEBOU = {
    get G() { return G; },
    // 道中：いちばん近い障害物・缶コーヒーまでの距離
    next() { if (!R || !R.on) return null; const o = R.objs.filter(o => !o.done && o.x + o.w > L.runX).sort((a, b) => a.x - b.x)[0]; return o ? { dx: o.x - L.runX, coffee: !!o.coffee, y: o.y, onGround: R.y <= 0 } : null; },
  };

  // 途中で切りかえる絵は、先に読み込んでおく（切りかえた瞬間に前の絵が一瞬出たり、消えたりしないように）
  const PRELOAD = ['assets/art/runner_1.svg', 'assets/art/runner_2.svg', 'assets/art/runner_3.svg', 'assets/art/runner_jump.svg', 'assets/art/runner_fall.svg', 'assets/art/dad.svg', 'assets/art/grandma.svg', 'assets/art/dad_shadow.svg', 'assets/art/grandma_shadow.svg', 'assets/art/item_coffee.svg', 'assets/art/obs_bike.svg', 'assets/art/obs_cone.svg', 'assets/art/obs_dog.svg', 'assets/art/obs_sign.svg', 'assets/art/obs_trash.svg', 'assets/art/bush_hide.svg', 'assets/photo/naka_awake.webp', 'assets/photo/naka_body.webp'].map((s) => { const i = new Image(); i.src = s; if (i.decode) i.decode().catch(() => { }); return i; });
  fit();
  toTitle();
  if (P.has('play')) startGame();
})();
