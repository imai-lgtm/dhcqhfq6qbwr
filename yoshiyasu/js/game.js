// よしやす — 宮本さんと60秒しりとり
(() => {
  const D = window.DATA, A = window.AUDIO, X = D.dict();
  const $ = (s) => document.querySelector(s);
  const P = new URLSearchParams(location.search);
  const FAST = P.has('fast') ? 0.3 : 1;            // テスト用：待ち時間を短くする（制限時間は短くしない）
  const sleep = (ms) => new Promise(r => setTimeout(r, ms * FAST));
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rand(a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const app = $('#app');
  const GAME_SEC = 60, PENALTY = 5;

  // ───── 画面の形（縦長＝スマホ／横長＝PC・スマホ横向き） ─────
  const LAYOUT = { port: { W: 390, H: 844, miya: { x: 195, y: 300 } }, land: { W: 1280, H: 720, miya: { x: 340, y: 390 } } };
  let L = LAYOUT.port, scale = 1;
  function fit() {
    const land = innerWidth > innerHeight * 1.05;
    const next = land ? LAYOUT.land : LAYOUT.port;
    const changed = next !== L;
    L = next;
    app.classList.toggle('land', land);
    app.style.width = L.W + 'px'; app.style.height = L.H + 'px';
    scale = Math.min(innerWidth / L.W, innerHeight / L.H);
    app.style.setProperty('--s', scale);
    if (changed || !$('#bg').innerHTML) $('#bg').innerHTML = window.BG.izakaya(L.W, L.H);
  }
  addEventListener('resize', fit);
  function at(el) {
    const a = app.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: (r.left - a.left) / scale, y: (r.top - a.top) / scale, w: r.width / scale, h: r.height / scale };
  }

  // ───── 保存（この端末のブラウザの中だけ） ─────
  const SAVE_KEY = 'yoshi_save_v1';
  let save = { cards: [], best: 0, howto: false, practiced: false };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (_) { }
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) { } };

  const show = (id) => document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  const overlay = (id, on) => $('#' + id).classList.toggle('on', on);

  // ───── 音 ─────
  A.init({
    se: ['tap', 'tap2', 'start', 'hyoushigi', 'kotsudumi', 'correct', 'wrong', 'beep', 'harisen', 'tsukkomi', 'card_deal', 'card_put',
      'collapse', 'flash', 'kanpai', 'gong', 'despair', 'rank', 'paper', 'kira', 'fanfare', 'cracker', 'chanchan', 'boyoyon', 'timer', 'doon', 'drunk'],
    voice: ['start', 'gari', 'gari_ok', 'n_oops', 'nanyattakke', 'sukiyanen', 'seyaseya', 'akanyatsu', 'wasureta', 'oi'],
  });
  const muteBtn = $('#mute');
  const syncMute = () => muteBtn.classList.toggle('off', A.muted);
  muteBtn.addEventListener('click', () => { A.unlock(); A.setMuted(!A.muted); syncMute(); });
  syncMute();
  document.addEventListener('pointerdown', () => A.unlock(), { once: true });

  // ───── タイトル ─────
  function toTitle() {
    show('title');
    $('#albumCount').textContent = `${save.cards.length}/${D.CARDS.length}`;
    $('#best').textContent = save.best ? `ベストスコア ${save.best} 点` : '';
    $('#btnStart').classList.add('pulse');
    A.bgm('title');
  }
  $('#btnStart').addEventListener('click', async () => {
    A.unlock(); A.se('start'); A.voice('start');
    if (!save.howto) { overlay('howto', true); return; }
    await sleep(500);
    startGame();
  });
  $('#btnHowtoOk').addEventListener('click', () => { A.se('tap'); save.howto = true; store(); overlay('howto', false); startGame(); });
  $('.t-miya').addEventListener('click', () => {
    A.unlock(); A.voice(pick(['start', 'gari', 'seyaseya', 'oi'])); A.se('boyoyon', { vol: .5 });
    $('.t-miya').animate([{ scale: '1 1' }, { scale: '1.08 .9' }, { scale: '.96 1.06' }, { scale: '1 1' }], { duration: 450 });
  });
  $('#btnAlbum').addEventListener('click', () => { A.se('tap'); openAlbum('title'); });
  $('#btnCredits').addEventListener('click', () => { A.se('tap'); overlay('credits', true); });
  $('#btnCreditsOk').addEventListener('click', () => { A.se('tap'); overlay('credits', false); });
  addEventListener('keydown', (e) => { if (e.key === 'Enter' && $('#title').classList.contains('on') && !$('#howto').classList.contains('on')) $('#btnStart').click(); });

  // ───── 宮本さんの見た目・吹き出し ─────
  const miyaEl = $('#miya'), bubble = $('#bubble'), sayEl = $('#say'), cardsEl = $('#cards'), akanBtn = $('#akan');
  let baseFace = 'grin';
  const face = (f) => miyaEl.querySelectorAll('img').forEach(i => i.classList.toggle('on', i.dataset.f === f));
  function sayWord(w, cls = '') {
    bubble.className = 'bubble pop ' + cls;
    sayEl.innerHTML = w === 'がり' ? '<span class="gari">……ガリ</span>' : `${w.slice(0, -1)}<span class="end">${w.slice(-1)}</span>`;
  }
  function sayText(t, cls = '') { bubble.className = 'bubble pop small ' + cls; sayEl.textContent = t; }
  function hop(cls = 'hop') { miyaEl.classList.remove('hop', 'hit'); void miyaEl.offsetWidth; miyaEl.classList.add(cls); }
  function history(w, who) {
    const h = $('#history');
    const s = document.createElement('span');
    s.textContent = w === 'がり' ? 'ガリ' : w;
    if (who === 'miya') s.className = 'me';
    h.appendChild(s);
    while (h.children.length > 14) h.firstChild.remove();
    return s;
  }
  function telop(t) { const e = $('#telop'); e.textContent = t; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); }
  function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  function popAt(el, text) {
    const r = el ? at(el) : { x: L.miya.x - 40, y: L.miya.y, w: 80, h: 0 };
    const e = document.createElement('div'); e.className = 'pop'; e.textContent = text;
    e.style.left = (r.x + r.w / 2 - 30) + 'px'; e.style.top = (r.y - 10) + 'px';
    app.appendChild(e); setTimeout(() => e.remove(), 950);
  }
  const COLORS = ['#f0441f', '#1c8fd3', '#7bc142', '#ffd21f', '#ff5fb4', '#ffffff'];
  function confetti(n, x0 = L.W / 2, y0 = L.H / 2) {
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div'); c.className = 'confetti'; c.style.background = COLORS[i % COLORS.length];
      c.style.left = x0 + 'px'; c.style.top = y0 + 'px'; app.appendChild(c);
      const dx = (Math.random() - .5) * 360, up = 120 + Math.random() * 200;
      c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${dx * .6}px,${-up}px) rotate(${Math.random() * 360}deg)`, offset: .35 },
        { transform: `translate(${dx}px,${-up + 420}px) rotate(${Math.random() * 900}deg)`, opacity: 0 }], { duration: 1400 + Math.random() * 600, easing: 'cubic-bezier(.2,.6,.4,1)' }).finished.then(() => c.remove());
    }
  }

  // ───── 言葉の選び方 ─────
  const left = (c, used) => (X.byStart[c] || []).filter(w => !used.has(w)).length;
  // c から始まる、まだ使っていない言葉のうち、次に続けやすいもの（上位半分）からランダム
  function pickValid(c, used, preferMiya) {
    let cand = (X.byStart[c] || []).filter(w => !used.has(w));
    if (!cand.length) return null;
    cand.sort((a, b) => left(X.last(b), used) - left(X.last(a), used));
    let top = cand.slice(0, Math.max(1, Math.ceil(cand.length / 2))).filter(w => left(X.last(w), new Set([...used, w])) > 0);
    if (!top.length) top = cand.slice(0, 1);
    if (preferMiya) {
      const card = top.filter(w => D.CARDS.some(k => k.word === w && !save.cards.includes(k.id)));
      if (card.length && Math.random() < .7) return pick(card);
      const fav = top.filter(w => X.miya.has(w));
      if (fav.length && Math.random() < .75) return pick(fav);
    }
    return pick(top);
  }
  // カード：正解1枚＋罠（濁点ちがい・「ん」で終わる・もう使った）
  function buildCards(c, n, used, exclude = '') {
    const ok = pickValid(c, used, false);
    const traps = [];
    const sib = X.siblings(c).flatMap(s => [...(X.byStart[s] || []), ...(X.nByStart[s] || [])]).filter(w => !used.has(w));
    const nw = (X.nByStart[c] || []);
    const usedSame = [...used].filter(w => X.first(w) === c && w !== ok);
    const pools = shuffle([sib, nw, usedSame].filter(p => p.length));
    for (const p of pools) { if (traps.length >= n - 1) break; const w = pick(p); if (w !== ok && w !== exclude && !traps.includes(w)) traps.push(w); }
    while (traps.length < n - 1) {   // 足りなければ、ほかの文字から始まる言葉
      const w = pick(X.usable);
      if (X.first(w) !== c && w !== ok && w !== exclude && !traps.includes(w)) traps.push(w);
    }
    return shuffle([{ w: ok, ok: true }, ...traps.map(w => ({ w, ok: false }))]);
  }

  // ───── ゲーム ─────
  let G = null;
  let onAct = null;   // カード・アカンを押した時に呼ぶ
  function showCards(list, opt = {}) {
    cardsEl.className = 'cards' + (opt.dim ? ' dim' : '');
    cardsEl.innerHTML = '';
    list.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'wcard deal';
      b.style.animationDelay = (i * 60 * FAST) + 'ms';
      b.dataset.w = c.w; b.dataset.ok = c.ok ? '1' : '';
      b.innerHTML = `${c.w}${X.comm.has(c.w) ? '<span class="comm">⚡通信</span>' : ''}`;
      cardsEl.appendChild(b);
    });
    A.se('card_deal', { vol: .5 });
  }
  cardsEl.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.wcard');
    if (!b || !onAct) return;
    const f = onAct; onAct = null; A.se('tap2'); f({ kind: 'card', el: b, w: b.dataset.w, ok: !!b.dataset.ok });
  });
  akanBtn.addEventListener('pointerdown', () => {
    akanBtn.classList.remove('swing'); void akanBtn.offsetWidth; akanBtn.classList.add('swing');
    if (!onAct) return;
    const f = onAct; onAct = null; f({ kind: 'akan' });
  });
  // 押されるのを待つ。時間切れのあとは待たずにすぐ「timeup」を返す
  const waitAct = () => new Promise(res => { if (G.phase === 'over') { res({ kind: 'timeup' }); return; } onAct = res; G.wake = res; });

  function addScore(pts, el, label) {
    if (G.spurt) pts *= 2;
    G.score += pts;
    const s = $('#score'); s.textContent = G.score;
    s.parentElement.classList.remove('bump'); void s.parentElement.offsetWidth; s.parentElement.classList.add('bump');
    popAt(el, `${label ? label + ' ' : ''}+${pts}`);
  }
  function penalty() {
    G.timeLeft = Math.max(0, G.timeLeft - PENALTY);
    G.miss++;
    const m = $('#minus'); m.classList.remove('on'); void m.offsetWidth; m.classList.add('on');
    A.se('wrong', { vol: .6 }); flash();
  }
  function unlock(id) {
    if (!D.CARDS.some(c => c.id === id) || save.cards.includes(id)) return;
    save.cards.push(id); G.newCards.push(id); store();
  }

  let lastStart = -1e9;
  async function startGame() {
    if (performance.now() - lastStart < 1500) return;   // ボタンの2度押しで、ゲームが2つ同時に始まらないように
    lastStart = performance.now();
    G = { score: 0, chain: 0, tsukkomi: 0, miss: 0, used: new Set(), miyaSaid: [], need: null, timeLeft: GAME_SEC, running: false, gari: 0,
      statue: false, spurt: false, newCards: [], phase: 'practice', lastTurn: '' };
    show('play');
    $('#play').classList.remove('tipsy');
    baseFace = 'grin'; face('grin');
    $('#history').innerHTML = ''; cardsEl.innerHTML = '';
    $('#score').textContent = '0';
    setTimerUI();
    A.bgm('play');
    if (!save.practiced || P.has('practice')) { await practice(); if (!G) return; }
    G.used = new Set(); G.miyaSaid = []; G.need = null; G.chain = 0; G.phase = 'main';
    $('#history').innerHTML = '';
    telop('本番スタート！\n60秒');
    A.se('hyoushigi'); setTimeout(() => A.se('kotsudumi'), 300 * FAST);
    await sleep(1200);
    runTimer();
    await loop();
  }

  // ───── 練習（時間なし）：ふつう → 「ん」のうっかり → ガリ ─────
  async function practice() {
    const banner = $('#practice');
    const fingerOn = (el) => { document.querySelectorAll('.finger').forEach(f => f.remove()); const f = document.createElement('div'); f.className = 'finger'; f.textContent = '👆'; el.appendChild(f); };
    const used = new Set();
    // 1. ふつう
    G.lastTurn = 'p_ok';
    let w = 'すいか'; used.add(w); history(w, 'miya'); sayWord(w); face('grin');
    banner.innerHTML = '練習①　宮本さんの言葉の<b style="color:#d8361b">最後の文字「か」</b>から<br>始まるカードをタップ！'; banner.classList.add('on');
    let cards = buildCards('か', 2, used); showCards(cards); await sleep(300);
    fingerOn(cardsEl.querySelector('[data-ok="1"]'));
    let ans;
    while (true) { ans = await waitAct(); if (ans.kind === 'card' && ans.ok) break; A.se('beep'); sayText('ちゃうちゃう、\n指のところのやつ'); }
    ans.el.classList.add('right'); A.se('correct', { vol: .6 }); A.voice('seyaseya'); history(ans.w, 'me'); used.add(ans.w); hop();
    await sleep(900);
    // 2. 「ん」で終わるうっかり
    const c2 = X.last(ans.w);
    w = (X.nByStart[c2] || []).find(x => D.MIYA_N.includes(x)) || (X.nByStart[c2] || [])[0] || 'らーめん';
    G.lastTurn = 'p_n';
    sayWord(w); history(w, 'miya');
    banner.innerHTML = '練習②　「ん」で終わった！ルール違反です。<br><b style="color:#d8361b">アカン！</b>を押してツッコもう';
    showCards(buildCards(c2, 2, used), { dim: true }); await sleep(300);
    fingerOn(akanBtn);
    while (true) { ans = await waitAct(); if (ans.kind === 'akan') break; A.se('beep'); sayText('ちゃうちゃう、\nアカン！ボタンや'); }
    A.se('harisen'); hop('hit'); face('blank'); A.voice('n_oops'); sayText('…あ、ほんまや');
    $('#history').lastChild.className = 'bad';
    await sleep(1300);
    // 3. ガリ
    G.lastTurn = 'p_gari';
    face('eat'); sayWord('がり'); history('がり', 'miya'); A.voice('gari');
    banner.innerHTML = '練習③　「ガリ」だけは、なぜかOK！<br>ツッコまずに<b style="color:#d8361b">「り」</b>から続けよう';
    showCards(buildCards('り', 2, used)); await sleep(300);
    fingerOn(cardsEl.querySelector('[data-ok="1"]'));
    while (true) { ans = await waitAct(); if (ans.kind === 'card' && ans.ok) break; A.se('beep'); sayText(ans.kind === 'akan' ? 'ガリはええねん' : 'ちゃうちゃう、\n指のところのやつ'); if (ans.kind === 'akan') A.voice('gari_ok'); }
    ans.el.classList.add('right'); A.se('correct', { vol: .6 }); face('grin'); hop();
    document.querySelectorAll('.finger').forEach(f => f.remove());
    banner.classList.remove('on');
    save.practiced = true; store();
    await sleep(800);
  }

  // ───── 60秒の時計 ─────
  let timerRaf = 0;
  function setTimerUI() {
    const k = G.timeLeft / GAME_SEC;
    $('#timeBar').style.transform = `scaleX(${k})`;
    $('#timeBar').classList.toggle('warn', G.timeLeft <= 10);
    $('#timeNum').textContent = Math.ceil(G.timeLeft);
    $('#timer').classList.toggle('hurry', G.timeLeft <= 10 && G.running);
  }
  function runTimer() {
    G.running = true;
    let prev = performance.now();
    const step = (t) => {
      if (!G || !G.running) return;
      if (window.GC_HOLD) { prev = t; timerRaf = requestAnimationFrame(step); return; }   // ゲーセンに戻る確認の間は止める
      G.timeLeft = Math.max(0, G.timeLeft - (t - prev) / 1000);
      prev = t;
      setTimerUI();
      if (G.timeLeft <= 10 && !G.spurt) lastSpurt();
      if (G.timeLeft <= 0) { timeUp(); return; }
      timerRaf = requestAnimationFrame(step);
    };
    timerRaf = requestAnimationFrame(step);
  }
  const elapsed = () => GAME_SEC - G.timeLeft;
  function lastSpurt() {
    G.spurt = true;
    telop('ラストスパート！\n点数2倍');
    A.bgmSpeed(1.3); A.se('drunk', { vol: .6 });
    $('#play').classList.add('tipsy');
    baseFace = 'tipsy';
  }
  function timeUp() {
    if (!G.running) return;
    G.running = false;
    G.phase = 'over';
    cancelAnimationFrame(timerRaf);
    onAct = null;
    if (G.wake) G.wake({ kind: 'timeup' });
  }

  // ───── 宮本さんの番 → プレイヤーの番、をくり返す ─────
  function planMiya() {
    const t = elapsed();
    if (!G.statue && t > 22 && t < 45 && Math.random() < .15) return { type: 'statue' };
    const bugRate = t < 15 ? 0 : t < 35 ? .33 : .5;
    if (G.need && G.gari < 3 && t > 15 && Math.random() < .14 && left('り', G.used) > 0) return { type: 'gari', w: 'がり' };
    if (G.need && Math.random() < bugRate) {
      const kinds = ['n', 'disconnect'];
      if (G.miyaSaid.length) kinds.push('repeat');
      const k = pick(kinds);
      if (k === 'n') {
        const same = (X.nByStart[G.need] || []);
        return { type: 'n', w: pick(same.filter(w => D.MIYA_N.includes(w)).concat(same).slice(0, 4).concat(same.length ? [] : D.MIYA_N)) };
      }
      if (k === 'repeat') return { type: 'repeat', w: pick(G.miyaSaid) };
      const cand = [...X.miya].filter(w => X.usable.includes(w) && X.first(w) !== G.need && !G.used.has(w));
      return { type: 'disconnect', w: pick(cand.length ? cand : X.usable.filter(w => X.first(w) !== G.need)) };
    }
    const w = G.need ? pickValid(G.need, G.used, true) : pick([...X.miya].filter(w => X.usable.includes(w)));
    if (!w) return left('り', G.used) ? { type: 'gari', w: 'がり' } : { type: 'end' };
    return { type: 'ok', w };
  }

  async function loop() {
    while (G && G.running) {
      const turn = planMiya();
      if (turn.type === 'end') { timeUp(); break; }
      if (turn.type === 'statue') { await statueEvent(); continue; }
      const r = await miyaTurn(turn);
      if (r === 'timeup') break;
    }
    if (G) await forget();
  }

  async function miyaTurn(turn) {
    G.lastTurn = turn.type;
    const w = turn.w;
    const isBug = ['n', 'disconnect', 'repeat'].includes(turn.type);
    face(turn.type === 'gari' ? 'eat' : baseFace);
    sayWord(w);
    const hs = history(w, 'miya');
    D.CARDS.forEach(c => { if (c.word === w) unlock(c.id); });
    if (turn.type === 'gari') { A.voice('gari'); G.gari++; }
    if (turn.type === 'ok') { G.used.add(w); G.miyaSaid.push(w); }
    // 次に始める文字（うっかりの時は、それっぽい文字でカードを出して迷わせる）
    const base = turn.type === 'ok' ? X.last(w) : turn.type === 'gari' ? 'り' : turn.type === 'n' ? G.need : X.last(w);
    const nCards = elapsed() < 15 ? 2 : 3;
    const cards = buildCards((X.byStart[base] || []).length ? base : G.need, nCards, G.used, w);
    await sleep(160);
    showCards(cards);

    while (true) {
      const act = await waitAct();
      if (act.kind === 'timeup') return 'timeup';
      if (isBug) {
        if (act.kind === 'akan') {
          // ツッコミ成功
          A.se('harisen'); hop('hit'); face('blank');
          G.tsukkomi++;
          addScore(2, akanBtn, 'ツッコミ');
          hs.className = 'bad';
          bubble.classList.add('strike');
          const v = { n: 'n_oops', disconnect: 'nanyattakke', repeat: 'sukiyanen' }[turn.type];
          A.voice(v);
          await sleep(500);
          sayText(pick(D.EXCUSE[turn.type]), 'angry');
          await sleep(900);
          return 'ok';
        }
        // カードを押してしまった（本当はアカン！）
        penalty();
        act.el.classList.add('wrong');
        akanBtn.classList.remove('show'); void akanBtn.offsetWidth; akanBtn.classList.add('show');
        face('smug'); A.voice('akanyatsu'); sayText('今のはアカン！やろ', 'angry');
        hs.className = 'bad';
        await sleep(1300);
        return 'ok';
      }
      // ふつう・ガリの時
      if (act.kind === 'akan') {
        penalty();
        face('smug');
        if (turn.type === 'gari') { A.voice('gari_ok'); sayText('ガリはええねん', 'angry'); }
        else { A.voice('akanyatsu'); sayText('それアカンやつや', 'angry'); }
        await sleep(900);
        sayWord(w);   // もう一度、カードから選んでもらう
        face(turn.type === 'gari' ? 'eat' : baseFace);
        continue;
      }
      if (act.ok) {
        act.el.classList.add('right');
        A.se('card_put'); A.se('correct', { vol: .5 });
        const comm = X.comm.has(act.w);
        addScore((comm ? 3 : 1) + (turn.type === 'gari' ? 1 : 0), act.el, comm ? '⚡通信' : turn.type === 'gari' ? 'ガリ見逃し' : '');
        if (comm) A.se('kira', { vol: .6 });
        G.used.add(act.w); G.chain++; G.need = X.last(act.w);
        history(act.w, 'me');
        face('peace'); hop();
        if (G.chain % 3 === 1) A.voice('seyaseya');
        await sleep(420);
        face(baseFace);
        return 'ok';
      }
      // 罠のカードを押した → 正解を見せて、そのまま続ける
      penalty();
      act.el.classList.add('wrong');
      const right = cardsEl.querySelector('[data-ok="1"]');
      if (right) right.classList.add('show');
      face('smug'); A.voice('akanyatsu');
      const why = !X.first(act.w).startsWith(X.first(right.dataset.w)) ? `「${X.first(right.dataset.w)}」からやで` : X.last(act.w) === 'ん' ? '「ん」で終わっとる' : 'それ、さっき出たで';
      sayText(why, 'angry');
      await sleep(1300);
      G.used.add(right.dataset.w); G.chain++; G.need = X.last(right.dataset.w);
      history(right.dataset.w, 'me');
      face(baseFace);
      return 'ok';
    }
  }

  // ───── 隠しイベント：27万円のそっくりオブジェ ─────
  async function statueEvent() {
    G.statue = true;
    G.lastTurn = 'statue';
    cardsEl.innerHTML = '';
    face('statue'); A.se('doon');
    sayText('……');
    telop('そっくりオブジェ\n（27万円）にすり替わった！');
    const res = await Promise.race([waitAct(), sleep(3200).then(() => ({ kind: 'wait' }))]);
    onAct = null;
    if (res.kind === 'timeup') return;
    if (res.kind === 'wait') {
      face('grin'); sayText('こんちわ'); A.se('kira');
      addScore(3, null, 'じっと待てた');
      unlock('statue');
    } else {
      penalty(); sayText('オブジェにツッコんでも…', 'angry');
    }
    await sleep(900);
    face(baseFace);
  }

  // ───── 時間切れ：宮本さん、全部忘れる ─────
  async function forget() {
    cancelAnimationFrame(timerRaf);
    onAct = null;
    cardsEl.className = 'cards off';
    A.se('gong');
    telop('そこまで！');
    await sleep(1200);
    A.stopBgm(300);
    show('forget');
    const fw = $('#fWords'); fw.innerHTML = '';
    const words = [...document.querySelectorAll('#history span')].map(s => s.textContent).slice(-12);
    words.forEach((w, i) => {
      const s = document.createElement('span'); s.textContent = w;
      s.style.left = (20 + (i % 3) * (L.W / 3.2)) + 'px'; s.style.top = (L.H * .45 + Math.floor(i / 3) * 36) + 'px';
      fw.appendChild(s);
    });
    $('#fBubble').classList.remove('on'); $('#fTelop').classList.remove('on');
    await sleep(500);
    $('#fBubble').classList.add('on');
    const vlen = await A.voice('wasureta');
    await sleep(Math.max(1800, vlen + 300));
    A.se('collapse'); A.se('despair', { vol: .5 });
    fw.querySelectorAll('span').forEach((s, i) => s.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${(Math.random() - .5) * 120}px, ${L.H}px) rotate(${(Math.random() - .5) * 200}deg)`, opacity: .3 }],
      { duration: 1400 + i * 60, delay: i * 70, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }));
    await sleep(1600);
    $('#fTelop').classList.add('on');
    A.se('chanchan');
    await sleep(2200);
    showResult();
  }

  // ───── 結果 ─────
  const rankOf = (s) => [...D.RANKS].reverse().find(r => s >= r.min);
  async function showResult() {
    show('result');
    A.bgm('result', { vol: .8 });
    if (G.score >= 40) unlock('oi');
    const rk = rankOf(G.score), best = G.score > save.best;
    if (best) { save.best = G.score; store(); }
    $('#rMiya').src = G.score >= 30 ? 'assets/photo/miya_peace.webp' : G.score >= 10 ? 'assets/photo/miya_grin.webp' : 'assets/photo/miya_blank.webp';
    $('#rName').textContent = ''; $('#rNote').textContent = '';
    ['rScore', 'rChain', 'rTsukkomi'].forEach(id => $('#' + id).textContent = '0');
    const nw = $('#rNew');
    const shown = G.newCards.slice(0, 4), more = G.newCards.length - shown.length;
    nw.innerHTML = G.newCards.length ? `<p>図鑑に ${G.newCards.length}枚 追加！</p><div class="row">${shown.map(id => `<img src="assets/album/${id}.jpg" alt="">`).join('')}${more > 0 ? `<b style="align-self:center;font-family:Dela;color:#141a2a">+${more}</b>` : ''}</div>` : '';
    if (G.newCards.includes('oi')) A.voice('oi');
    await sleep(400);
    await countUp($('#rScore'), G.score, 700);
    await countUp($('#rChain'), G.chain, 400);
    await countUp($('#rTsukkomi'), G.tsukkomi, 400);
    A.se('rank');
    const nm = $('#rName'); nm.textContent = rk.name; nm.classList.toggle('long', rk.name.length > 7);
    nm.classList.remove('stamp'); void nm.offsetWidth; nm.classList.add('stamp');
    $('#rNote').innerHTML = rk.note + (best && G.score ? '<br><span class="r-best">ベストスコア更新！</span>' : '');
    if (G.score >= 30) { A.se('fanfare', { vol: .6 }); confetti(40, L.W / 2, L.H * .35); }
  }
  function countUp(el, to, ms) {
    return new Promise(res => {
      const t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / (ms * FAST)); el.textContent = Math.round(to * k); if (k < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
  }
  $('#btnRetry').addEventListener('click', () => { A.se('start'); A.voice('start'); startGame(); });
  $('#btnTitle').addEventListener('click', () => { A.se('tap'); G = null; toTitle(); });
  $('#btnResAlbum').addEventListener('click', () => { A.se('tap'); openAlbum('result'); });
  $('#btnSave').addEventListener('click', () => { A.se('tap'); saveImage(); });

  async function saveImage() {
    const rk = rankOf(G.score);
    const draw = async (withPhoto) => {
      const cv = document.createElement('canvas'); cv.width = 720; cv.height = 960;
      const x = cv.getContext('2d');
      x.fillStyle = '#fff8ec'; x.fillRect(0, 0, 720, 960);
      [['#f0441f', 22], ['#141a2a', 30], ['#1c8fd3', 8], ['#7bc142', 12]].reduce((px, [col, w]) => { x.fillStyle = col; x.fillRect(px, 0, w, 960); return px + w; }, 0);
      x.textAlign = 'center'; x.fillStyle = '#141a2a';
      x.font = '96px Boku, serif'; x.fillText('よしやす', 380, 130);
      if (withPhoto) { const im = new Image(); im.src = $('#rMiya').src; await im.decode(); const h = 380, w = im.width * h / im.height; x.drawImage(im, 380 - w / 2, 160, w, h); }
      x.font = '30px Maru, sans-serif'; x.fillStyle = '#8a7a64'; x.fillText('あなたは宮本さんの', 380, 600);
      x.font = '56px Boku, serif'; x.fillStyle = '#f0441f'; x.fillText(rk.name, 380, 680);
      x.font = '40px Dela, sans-serif'; x.fillStyle = '#141a2a'; x.fillText(`${G.score}点　${G.chain}回つないだ`, 380, 780);
      x.font = '26px Maru, sans-serif'; x.fillStyle = '#8a7a64'; x.fillText('株式会社 心電通', 380, 900);
      return cv.toDataURL('image/png');
    };
    let url;
    try { url = await draw(true); } catch (_) { url = await draw(false); }
    const a = document.createElement('a'); a.href = url; a.download = 'yoshiyasu.png'; a.click();
  }

  // ───── 宮本さん図鑑 ─────
  let albumFrom = 'title';
  function openAlbum(from) {
    albumFrom = from;
    show('album');
    $('#aCount').textContent = `${save.cards.length}/${D.CARDS.length}`;
    $('#aGrid').innerHTML = D.CARDS.map(c => save.cards.includes(c.id)
      ? `<button class="a-cell" data-id="${c.id}"><img src="assets/album/${c.id}.jpg" alt=""><p>${c.name}</p></button>`
      : `<div class="a-cell lock"><span>？</span><small>${c.hidden ? '（ひみつ）' : `「${c.word.slice(0, 1)}…」`}</small></div>`).join('');
  }
  $('#aGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.a-cell[data-id]');
    if (!b) return;
    A.se('paper');
    const c = D.CARDS.find(k => k.id === b.dataset.id);
    $('#aCard').innerHTML = `<img src="assets/album/${c.id}.jpg" alt=""><h3>${c.name}</h3><p>${c.note}</p><span class="ac-close">タップでとじる</span>`;
    overlay('aModal', true);
  });
  $('#aModal').addEventListener('click', () => overlay('aModal', false));
  $('#btnAlbumBack').addEventListener('click', () => { A.se('tap'); if (albumFrom === 'result') show('result'); else toTitle(); });

  // ───── テスト用：今押すべきもの ─────
  window.YOSHI = {
    get G() { return G; },
    // 'akan'＝アカン！を押す／'wait'＝何も押さない／それ以外＝正解のカードの言葉
    expect() {
      if (!G || !onAct) return null;
      const t = G.lastTurn;
      if (['n', 'disconnect', 'repeat', 'p_n'].includes(t)) return 'akan';
      if (t === 'statue') return 'wait';
      const ok = cardsEl.querySelector('[data-ok="1"]');
      return ok ? ok.dataset.w : null;
    },
  };

  // 途中で切りかえる絵は、先に読み込んでおく（切りかえた瞬間に前の絵が一瞬出たり、消えたりしないように）
  const PRELOAD = ['assets/photo/miya_peace.webp', 'assets/photo/miya_grin.webp', 'assets/photo/miya_blank.webp'].map((s) => { const i = new Image(); i.src = s; if (i.decode) i.decode().catch(() => { }); return i; });
  fit();
  toTitle();
  if (P.has('play')) startGame();
})();
