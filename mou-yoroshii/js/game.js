// もうよろしいですわ — ゲームの進行
(() => {
  const D = window.DATA, A = window.AUDIO;
  const $ = (s) => document.querySelector(s);
  const P = new URLSearchParams(location.search);
  const FAST = P.has('fast') ? 0.25 : 1;           // テスト用：待ち時間を短くする
  const sleep = (ms) => new Promise(r => setTimeout(r, ms * FAST));
  const rand = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const app = $('#app');

  // ───── 画面の形：縦長（スマホ）と横長（PC・スマホ横向き）で配置を切り替える ─────
  // 座標はすべて「ゲーム画面の座標」（縦 390×844 / 横 1280×720）。field は縦では上から230px、横では0px
  const LAYOUT = {
    port: { W: 390, H: 844, fieldTop: 230, fieldH: 500, cx: 195, cy: 250, rx: 142, ry: 206, mouth: { x: 195, y: 448 }, eye: { x: 195, y: 180 },
      shachoTo: { x: 330, y: 380 }, hide: [{ x: -26, y: 560, r: 18 }, { x: 318, y: 520, r: -16 }, { x: 300, y: 250, r: -14 }, { x: -18, y: 260, r: 14 }] },
    land: { W: 1280, H: 720, fieldTop: 0, fieldH: 720, cx: 640, cy: 425, rx: 470, ry: 188, mouth: { x: 640, y: 400 }, eye: { x: 640, y: 330 },
      shachoTo: { x: 1060, y: 420 }, hide: [{ x: -20, y: 430, r: 16 }, { x: 1196, y: 400, r: -16 }, { x: 330, y: 610, r: 8 }, { x: 880, y: 620, r: -8 }] },
  };
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
    $('#gaze').setAttribute('viewBox', `0 0 ${L.W} ${L.fieldH}`);
    if (changed && G && G.st) { $('#bg').innerHTML = window.BG[G.st.id](L.W, L.H); placeRing(); }
  }
  addEventListener('resize', fit);
  // 要素の位置を、ゲーム画面の座標で返す
  function at(el) {
    const a = app.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: (r.left - a.left) / scale, y: (r.top - a.top) / scale, w: r.width / scale, h: r.height / scale };
  }

  // ───── 保存（この端末のブラウザの中だけ） ─────
  const SAVE_KEY = 'eba_save_v1';
  let save = { cards: [], best: 0, howto: false };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (_) { }
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) { } };

  // ───── 画面切り替え ─────
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  }
  function overlay(id, on) { $('#' + id).classList.toggle('on', on); }

  // ───── 音のボタン ─────
  const muteBtn = $('#mute');
  const syncMute = () => muteBtn.classList.toggle('off', A.muted);
  muteBtn.addEventListener('click', () => { A.unlock(); A.setMuted(!A.muted); syncMute(); });
  syncMute();
  A.init({
    se: ['tap', 'tap2', 'start', 'koto', 'hyoushigi', 'kotsudumi', 'throw', 'eat', 'correct', 'wrong', 'mokugyo',
      'chin', 'timer', 'walk', 'beep', 'snore', 'shacho', 'drunk', 'fanfare', 'cracker', 'cheer', 'ponpon', 'boyoyon',
      'ipponjime', 'rank', 'paper', 'chanchan', 'kira', 'doon'],
    voice: ['yoroshii_bad', 'yoroshii_good', 'aretotte', 'areyaare', 'soreyagana', 'wakatteruyan', 'fanta',
      'ebamosuru', 'saishokara', 'orenoha'],
  });
  document.addEventListener('pointerdown', () => A.unlock(), { once: true });

  // ───── タイトル ─────
  function toTitle() {
    show('title');
    $('#albumCount').textContent = `${save.cards.length}/${D.CARDS.length}`;
    $('#best').textContent = save.best ? `ベストスコア ${save.best.toLocaleString()} 点` : '';
    $('#btnStart').classList.add('pulse');
    A.bgm('title');
  }
  $('#btnStart').addEventListener('click', async () => {
    A.unlock(); A.se('start'); A.voice('aretotte');
    if (!save.howto) { overlay('howto', true); return; }
    await sleep(500);
    startGame();
  });
  $('#btnHowtoOk').addEventListener('click', () => {
    A.se('tap'); save.howto = true; store(); overlay('howto', false); startGame();
  });
  // タイトルの江原さんを押すと、ひとこと
  $('.t-eba').addEventListener('click', () => {
    A.unlock();
    A.voice(['aretotte', 'soreyagana', 'wakatteruyan', 'ebamosuru'][rand(4)]); A.se('boyoyon', { vol: .5 });
    $('.t-eba').animate([{ scale: '1 1' }, { scale: '1.08 .9' }, { scale: '.96 1.06' }, { scale: '1 1' }], { duration: 450 });
  });
  $('#btnAlbum').addEventListener('click', () => { A.se('tap'); openAlbum('title'); });
  $('#btnCredits').addEventListener('click', () => { A.se('tap'); overlay('credits', true); });
  $('#btnCreditsOk').addEventListener('click', () => { A.se('tap'); overlay('credits', false); });
  // PC：Enter キーでスタート
  addEventListener('keydown', (e) => { if (e.key === 'Enter' && $('#title').classList.contains('on') && !$('#howto').classList.contains('on')) $('#btnStart').click(); });

  // ───── ゲームの状態 ─────
  let G = null;
  const face = (f) => document.querySelectorAll('#eba img').forEach(i => i.classList.toggle('on', i.dataset.f === f));
  const ebaEl = $('#eba'), fx = $('#fx'), ring = $('#ring'), bubble = $('#bubble'), sayEl = $('#say');

  function startGame() {
    const startStage = Math.max(0, Math.min(4, (+P.get('stage') || 1) - 1));
    G = { si: startStage, n: startStage * 4, score: 0, correct: startStage * 4, newCards: [], praise: 0, alive: true };
    // 各ステージ4問。社長の割り込み・浩二くんの入れ替わりの位置もここで決める
    G.plan = D.STAGES.map(st => {
      let qs = shuffle(st.q).slice(0, 4);
      if (st.id === 1) {
        // 1問目（練習）はいちばんわかりやすい「ニッパー」。シールは後半に
        qs = [st.q[0], ...shuffle(st.q.slice(1, 5)).slice(0, 2), Math.random() < .6 ? st.q[5] : shuffle(st.q.slice(1, 5))[0]];
        qs = qs.filter((q, i) => qs.indexOf(q) === i);
        while (qs.length < 4) { const c = st.q[1 + rand(4)]; if (!qs.includes(c)) qs.push(c); }
      }
      const shachoAt = 1 + rand(2);
      return qs.map((q, i) => ({ ...q, shacho: !!st.shacho && i === shachoAt, koji: !!st.koji && i === 3 }));
    });
    show('play');
    setFull(G.correct / 20);
    $('#score').textContent = '0';
    runStages();
  }

  async function runStages() {
    for (; G.si < 5; G.si++) {
      const st = D.STAGES[G.si];
      await stageIntro(st);
      for (let qi = 0; qi < 4; qi++) {
        G.n++;
        const ok = await runQuestion(st, G.plan[G.si][qi], qi);
        if (!ok) return;
      }
      if (G.si < 4) {
        A.se('rank', { vol: .7 });
        telop('ステージクリア！');
        confetti(24, L.mouth.y - 40);
        await sleep(1300);
      }
    }
    await allClear();
  }

  // ───── ステージの始まり ─────
  async function stageIntro(st) {
    G.st = st;
    $('#bg').innerHTML = window.BG[st.id](L.W, L.H);
    $('#play').classList.toggle('drunk', !!st.spin);
    $('#dim').classList.toggle('blink', !!st.sleepy);
    spin(!!st.spin);
    ring.innerHTML = '';
    bubble.style.visibility = 'hidden';
    setBase(st);
    $('#stName').textContent = `${st.id}. ${st.name}`;
    $('#siNum').textContent = `STAGE ${st.id}`;
    $('#siName').textContent = st.name;
    $('#siSub').textContent = st.sub;
    $('#siNote').textContent = st.intro;
    $('#stIntro').classList.remove('on'); void $('#stIntro').offsetWidth;
    $('#stIntro').classList.add('on');
    A.bgm(st.bgm);
    A.se('hyoushigi');
    setTimeout(() => A.se('kotsudumi'), 350 * FAST);
    if (st.spin) setTimeout(() => A.se('drunk'), 700 * FAST);
    if (st.sleepy) setTimeout(() => A.se('snore', { vol: .6 }), 900 * FAST);
    await sleep(st.id === 1 ? 3200 : 2800);
    $('#stIntro').classList.remove('on');
    bubble.style.visibility = '';
  }

  function setBase(st) {
    G.base = st.mood;
    face(st.mood);
    fx.innerHTML = st.sleepy ? '<span class="zzz">Z</span><span class="zzz">z</span><span class="zzz">z</span>' : '';
    ebaEl.classList.toggle('nod', !!st.sleepy);
  }

  // ───── 吹き出し ─────
  let typeToken = 0;
  // 長いセリフは文字を少し小さくして、スマホで変な所で折り返さないようにする
  const sizeCls = (text) => Math.max(...text.split('\n').map(l => l.length)) > 11 ? ' long' : '';
  async function say(text, cls = '') {
    const tok = ++typeToken;
    bubble.className = 'bubble ' + cls + sizeCls(text);
    void bubble.offsetWidth;
    bubble.classList.add('pop');
    sayEl.textContent = '';
    for (const ch of text) {
      if (tok !== typeToken) return;
      sayEl.textContent += ch;
      await sleep(ch === '…' ? 90 : ch === '\n' ? 200 : 40);
    }
  }
  function sayNow(text, cls = '') { ++typeToken; bubble.className = 'bubble pop ' + cls + sizeCls(text); sayEl.textContent = text; }

  // ───── アイテムの輪（名前つき） ─────
  function buildRing(st, q) {
    const n = st.ring;
    const ids = [q.ans, ...q.trap.filter(t => t !== q.ans)];
    for (const f of shuffle(st.fill)) { if (ids.length >= n) break; if (!ids.includes(f)) ids.push(f); }
    const list = shuffle(ids.slice(0, n));
    ring.innerHTML = '';
    ring.dataset.n = n;
    ring.dataset.off = (.5 + (Math.random() - .5) * .5).toFixed(3);   // 真上・真下（江原さんと重なる所）を避ける
    list.forEach((id, i) => {
      const el = document.createElement('button');
      el.className = 'item in';
      el.dataset.id = id;
      el.dataset.i = i;
      el.style.animationDelay = (i * 40 * FAST) + 'ms';
      el.innerHTML = `<div class="plate"><img src="assets/items/${id}.svg" alt=""></div><span class="lbl">${D.ITEMS[id]}</span>`;
      ring.appendChild(el);
    });
    placeRing();
    A.se('kira', { vol: .5 });
  }
  // 酔っぱらいステージでは、品物が楕円の上をゆっくり回る（画面の外に出ないように、輪ごとは回さない）
  let spinPhase = 0, spinRaf = 0;
  function spin(on) {
    cancelAnimationFrame(spinRaf);
    if (!on) { spinPhase = 0; return; }
    const t0 = performance.now();
    const step = (t) => { spinPhase = (t - t0) / 11000 * Math.PI * 2; placeRing(); spinRaf = requestAnimationFrame(step); };
    spinRaf = requestAnimationFrame(step);
  }
  function placeRing() {
    const n = +ring.dataset.n || 1, off = +ring.dataset.off || .5;
    ring.querySelectorAll('.item').forEach(el => {
      const a = -Math.PI / 2 + (+el.dataset.i + off) * Math.PI * 2 / n + spinPhase;
      el.style.left = (L.cx + Math.cos(a) * L.rx) + 'px';
      el.style.top = (L.cy + Math.sin(a) * L.ry) + 'px';
    });
  }
  function clearRing() {
    ring.querySelectorAll('.item').forEach((el, i) => { el.classList.remove('in'); el.style.animationDelay = (i * 20) + 'ms'; el.classList.add('out'); });
  }

  // アイテムを押すのを待つ。onPick は押された時に呼ぶ（null なら受け付けない）
  let onPick = null;
  ring.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.item');
    if (!el || el.classList.contains('disabled')) return;
    if (!onPick) { el.animate([{ scale: '1' }, { scale: '.92' }, { scale: '1' }], { duration: 160 }); return; }
    const f = onPick; onPick = null;
    A.se('tap2');
    f(el);
  });

  // 押したアイテムを江原さん（など）の口元へ飛ばす
  async function fly(el, target) {
    const r = at(el.querySelector('img'));
    const f = document.createElement('img');
    f.className = 'flyer';
    f.src = el.querySelector('img').src;
    f.style.left = r.x + 'px'; f.style.top = r.y + 'px'; f.style.width = r.w + 'px'; f.style.height = r.h + 'px';
    app.appendChild(f);
    el.style.visibility = 'hidden';
    A.se('throw');
    const dx = target.x - r.x - r.w / 2, dy = target.y - r.y - r.h / 2;
    await f.animate([
      { transform: 'translate(0,0) scale(1) rotate(0)' },
      { transform: `translate(${dx * .5}px, ${dy * .5 - 90}px) scale(1.25) rotate(200deg)`, offset: .5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.35) rotate(400deg)` },
    ], { duration: 420 * FAST, easing: 'cubic-bezier(.4,0,.6,1)' }).finished;
    f.remove();
  }

  // ───── 制限時間 ─────
  let timerStop = null;
  function startTimer(sec) {
    const bar = $('#timeBar'), mf = $('#moodFace'), mood = $('#mood');
    const t0 = performance.now(), total = sec * 1000;
    let raf, warned = false, beeped = false, held = 0, holdAt = 0;
    return new Promise(resolve => {
      const tick = (t) => {
        if (window.GC_HOLD) { if (!holdAt) holdAt = t; raf = requestAnimationFrame(tick); return; }   // ゲーセンに戻る確認の間は止める
        if (holdAt) { held += t - holdAt; holdAt = 0; }
        const left = Math.max(0, total - (t - t0 - held) / FAST);
        const k = left / total;
        bar.style.transform = `scaleX(${k})`;
        bar.classList.toggle('warn', k < .35);
        mf.textContent = k > .6 ? '😊' : k > .35 ? '😐' : '😠';
        if (k < .35 && !warned) { warned = true; mood.classList.add('shake'); sweat(true); }
        if (left < 1500 && !beeped) { beeped = true; A.se('timer', { vol: .6 }); }
        G.left = left / 1000;
        if (left <= 0) { stop(); resolve('timeout'); return; }
        raf = requestAnimationFrame(tick);
      };
      const stop = () => { cancelAnimationFrame(raf); mood.classList.remove('shake'); sweat(false); A.stopSe('timer'); timerStop = null; };
      timerStop = () => { stop(); resolve('stopped'); };
      raf = requestAnimationFrame(tick);
    });
  }
  function resetTimerBar() { $('#timeBar').style.transform = 'scaleX(1)'; $('#timeBar').classList.remove('warn'); $('#moodFace').textContent = '😊'; }
  function sweat(on) {
    fx.querySelectorAll('.sweat').forEach(s => s.remove());
    if (!on) return;
    [[44, 40], [200, 30], [190, 80]].forEach(([x, y], i) => {
      const s = document.createElement('div'); s.className = 'sweat'; s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.animationDelay = i * .3 + 's'; fx.appendChild(s);
    });
  }

  // ───── 1問 ─────
  async function runQuestion(st, q, qi) {
    G.q = q;
    const practice = G.n === 1;   // 最初の1問は練習（時間制限なし・指でお手本）
    $('#qNum').textContent = practice ? '練習' : `${G.n}/20`;
    face(G.base);
    resetTimerBar();
    buildRing(st, q);
    await sleep(350);

    if (q.shacho) { const r = await shachoPhase(); if (r !== 'ok') return gameOver(r); }
    if (q.koji) { const r = await kojiPhase(); if (r !== 'ok') return gameOver(r); }

    // お願いを言う（言い始めたら、もう押してよい）
    $('#think').classList.remove('on'); $('#gaze').classList.remove('on');
    const picked = new Promise(res => { onPick = res; });
    let said;
    if (st.silent) {
      said = say('（夢の中で、何か見ている…）', 'silent dream');
      startDream(q);
    } else {
      if (q.voice) A.voice(q.voice);
      said = say(q.pre ? `${q.pre}\n${q.say}` : q.say, st.sleepy ? 'sleepy' : '');
    }

    let first;
    if (practice) {
      // 練習：正解を指で示す。違うものを押しても帰らない
      await said;
      const target = ring.querySelector(`.item[data-id="${q.ans}"]`);
      const fin = document.createElement('div');
      fin.className = 'finger'; fin.textContent = '👆';
      target.appendChild(fin);
      $('#practice').classList.add('on');
      let wait = picked;
      while (true) {
        first = await wait;
        if (first.dataset.id === q.ans) break;
        wait = new Promise(res => { onPick = res; });
        A.se('beep');
        first.animate([{ translate: '0 0' }, { translate: '-8px 0' }, { translate: '8px 0' }, { translate: '0 0' }], { duration: 260 });
        sayNow('ちゃうちゃう、それやない。\n指のところのやつ');
      }
      fin.remove();
      $('#practice').classList.remove('on');
    } else {
      // 文字が出終わってから時間を数える（先に押してもよい）
      const r0 = await Promise.race([picked, said.then(() => 'said')]);
      if (r0 === 'said') {
        dreamT0 = performance.now();   // 夢のモザイクは、時間が動き出してから晴れていく
        const timer = startTimer(q.koji ? 9 : st.time);
        first = await Promise.race([picked, timer]);
      } else first = r0;
      onPick = null;
      if (first === 'timeout') { typeToken++; return gameOver('timeout'); }
      if (timerStop) timerStop();
    }
    onPick = null;
    const el = first;
    const remain = practice ? st.time : (G.left ?? st.time);
    ring.querySelectorAll('.item').forEach(i => i.classList.add('disabled'));
    $('#think').classList.remove('on'); $('#gaze').classList.remove('on');
    await fly(el, L.mouth);
    if (el.dataset.id !== q.ans) { typeToken++; return gameOver('wrong', el.dataset.id); }

    // 正解
    G.correct++;
    const pts = 100 + Math.round(remain * 20);
    addScore(pts, L.mouth);
    A.se('eat'); setTimeout(() => A.se('correct', { vol: .7 }), 120 * FAST);
    ebaEl.classList.remove('happy'); void ebaEl.offsetWidth; ebaEl.classList.add('happy');
    confetti(Math.round(6 + remain * 4));
    setFull(G.correct / 20);
    unlock(q.ans);
    if (q.after) {
      face(q.after.face || 'laugh');
      if (q.after.mark === 'anger') mark('💢', 190, 10);
      const vp = q.after.voice ? A.voice(q.after.voice) : Promise.resolve(0);
      sayNow(q.after.text, q.after.mark === 'anger' ? 'angry' : '');
      const [vlen] = await Promise.all([vp, sleep(1500)]);
      if (vlen > 1500) await sleep(vlen - 1500 + 200);
    } else {
      face('laugh');
      const pr = D.PRAISE[G.praise++ % 2];
      A.voice(pr.voice);
      sayNow(practice ? `${pr.text}\n（この調子で、どんどん渡してな）` : pr.text);
      await sleep(practice ? 2000 : 1000);
    }
    clearRing();
    face(G.base);
    await sleep(260);
    return true;
  }

  function mark(ch, x, y) {
    const m = document.createElement('div'); m.className = 'mark'; m.textContent = ch; m.style.left = x + 'px'; m.style.top = y + 'px';
    fx.appendChild(m); setTimeout(() => m.remove(), 1600);
  }

  // ステージ5：何も言わず、夢に浮かぶ品物がモザイクから少しずつ見えてくる（早く当てるほど高得点）
  let dreamT0 = 0, dreamRaf = 0;
  function startDream(q) {
    cancelAnimationFrame(dreamRaf);
    dreamT0 = 0;
    const cv = $('#dream'), ctx = cv.getContext('2d');
    const small = document.createElement('canvas'), sctx = small.getContext('2d');
    const img = new Image();
    img.src = `assets/items/${q.ans}.svg`;
    const total = D.STAGES[4].time * 1000 * FAST;
    let lastCells = -1;
    const draw = (t) => {
      if (!bubble.classList.contains('dream')) return;   // 正解・失敗で吹き出しが変わったら終わり
      const p = dreamT0 ? Math.min(1, (t - dreamT0) / total) : 0;
      const cells = p > .9 ? 0 : Math.round(4 + 26 * Math.pow(p / .9, 2.2));   // 0 = くっきり。前半はかなり粗い
      if (img.complete && img.naturalWidth && cells !== lastCells) {
        lastCells = cells;
        ctx.clearRect(0, 0, cv.width, cv.height);
        if (cells) {
          small.width = small.height = cells;
          sctx.clearRect(0, 0, cells, cells);
          sctx.drawImage(img, 0, 0, cells, cells);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(small, 0, 0, cv.width, cv.height);
        } else {
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
        }
      }
      dreamRaf = requestAnimationFrame(draw);
    };
    dreamRaf = requestAnimationFrame(draw);
  }

  // ───── 社長の割り込み ─────
  async function shachoPhase() {
    const sh = $('#shacho');
    face('want');
    sayNow('（ワシが先やで…）', 'sleepy');
    sh.classList.add('on');
    A.se('shacho'); A.voice('orenoha');
    const picked = new Promise(res => { onPick = res; });
    const r = await Promise.race([picked, sleep(2600).then(() => 'wait')]);
    onPick = null;
    if (r !== 'wait') {
      await fly(r, L.shachoTo);
      sayNow('社長に先に渡すんか…', 'angry');
      await sleep(900);
      sh.classList.remove('on');
      return 'shacho';
    }
    sh.classList.remove('on');
    addScore(200, L.shachoTo, '社長スルー');
    await sleep(350);
    return 'ok';
  }

  // ───── 江原浩二くんとすり替わり ─────
  async function kojiPhase() {
    face('koji');
    A.se('doon');
    ebaEl.classList.remove('nod');
    sayNow('……');
    telop('すり替わった！？');
    const hd = $('#hiding');
    const s = L.hide[rand(L.hide.length)];
    hd.style.left = s.x + 'px'; hd.style.top = s.y + 'px'; hd.style.rotate = s.r + 'deg';
    await sleep(600);
    hd.classList.add('on');
    sayNow('これは浩二くん（置物）！\n本物を探して！');
    const found = new Promise(res => { hd.onclick = () => res('found'); });
    const picked = new Promise(res => { onPick = res; });
    const timer = startTimer(9);
    const r = await Promise.race([found, picked, timer]);
    onPick = null; hd.onclick = null;
    if (timerStop) timerStop();
    hd.classList.remove('on');
    if (r === 'timeout') return 'timeout';
    if (r !== 'found') {
      await fly(r, L.mouth);
      sayNow('それ、浩二くんや…', 'angry');
      await sleep(900);
      return 'koji';
    }
    A.se('kira');
    unlock('koji');
    face('smile');
    addScore(300, L.mouth, '本物発見');
    sayNow('バレたか');
    await sleep(1000);
    resetTimerBar();
    return 'ok';
  }

  // ───── 点数・満腹度・紙吹雪 ─────
  function addScore(pts, p, label) {
    G.score += pts;
    const s = $('#score');
    s.textContent = G.score.toLocaleString();
    s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');
    const e = document.createElement('div');
    e.className = 'pop-score';
    e.textContent = (label ? label + ' ' : '') + '+' + pts;
    e.style.left = (p.x - 50) + 'px'; e.style.top = (p.y - 140) + 'px';
    app.appendChild(e);
    setTimeout(() => e.remove(), 1000);
  }
  function setFull(k) {
    $('#fullBar').style.width = Math.round(k * 100) + '%';
    $('#fullPct').textContent = Math.round(k * 100) + '%';
  }
  const COLORS = ['#f0441f', '#1c8fd3', '#7bc142', '#ffd21f', '#ff5fb4', '#ffffff'];
  function confetti(n, y0 = L.mouth.y - 60) {
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.background = COLORS[i % COLORS.length];
      c.style.left = (L.W / 2 + (Math.random() - .5) * 60) + 'px'; c.style.top = y0 + 'px';
      app.appendChild(c);
      const dx = (Math.random() - .5) * L.W * 1.1, up = 150 + Math.random() * 250;
      c.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${dx * .6}px, ${-up}px) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: .35 },
        { transform: `translate(${dx}px, ${-up + 520}px) rotate(${Math.random() * 900}deg)`, opacity: 0 },
      ], { duration: 1500 + Math.random() * 700, easing: 'cubic-bezier(.2,.6,.4,1)' }).finished.then(() => c.remove());
    }
  }
  function telop(text) {
    const t = $('#telop');
    t.textContent = text; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
  }
  function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }

  function unlock(id) {
    if (!D.CARDS.some(c => c.id === id)) return;
    if (!save.cards.includes(id)) { save.cards.push(id); G.newCards.push(id); store(); }
  }

  // ───── 失敗 → 帰宅 ─────
  const OVER_LINE = { wrong: '……', timeout: '……遅い', shacho: null, koji: null };
  async function gameOver(reason) {
    G.alive = false;
    spin(false);
    if (timerStop) timerStop();
    onPick = null;
    A.stopBgm(0);
    A.se('wrong');
    flash();
    face('down');
    ebaEl.classList.remove('nod', 'happy');
    if (OVER_LINE[reason]) sayNow(OVER_LINE[reason], 'angry');
    $('#think').classList.remove('on'); $('#gaze').classList.remove('on');
    await sleep(1300);

    // 帰宅画面
    show('over');
    const ob = $('#oBubble'), of = $('#oFace'), ow = $('#oWalk');
    const x0 = L.W / 2 - 45, dist = L.W / 2 + 80;
    ob.classList.remove('on'); ob.style.opacity = ''; of.style.opacity = 1; ow.style.opacity = 0; ow.style.left = x0 + 'px'; ow.style.transform = '';
    $('#oProg').classList.remove('on'); $('#oSkip').classList.remove('on'); $('#oBlack').classList.remove('on'); $('#oBar').style.width = '0';
    await sleep(500);
    ob.classList.add('on');
    const vlen = await A.voice('yoroshii_bad');
    await sleep(Math.max(1900, vlen + 600));

    // ものすごくゆっくり帰る
    ob.classList.remove('on'); ob.style.opacity = 0;
    of.style.opacity = 0;
    await sleep(400);
    ow.style.opacity = 1;
    $('#oProg').classList.add('on');
    $('#oSkip').classList.add('on');
    A.se('walk', { loop: true, rate: .7, vol: .8 });
    const total = 8000 * FAST;
    const t0 = performance.now();
    let turned = false;
    await new Promise(res => {
      const step = (t) => {
        const k = Math.min(1, (t - t0) / total);
        // 45% あたりで一度振り返る
        let walkK = k;
        if (k > .45 && k < .56) { walkK = .45; if (!turned) { turned = true; ow.style.transform = 'scaleX(-1)'; A.stopSe('walk'); } }
        else if (k >= .56) { walkK = .45 + (k - .56) * (.55 / .44); if (turned && ow.style.transform) { ow.style.transform = ''; A.se('walk', { loop: true, rate: .7, vol: .8 }); } }
        ow.style.left = (x0 + walkK * dist) + 'px';
        ow.style.top = (Math.abs(Math.sin(t / 260)) * -8) + 'px';
        $('#oBar').style.width = (k * 100) + '%';
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    A.stopSe('walk');
    $('#oSkip').classList.remove('on');
    $('#oBlack').classList.add('on');
    A.se('mokugyo');
    const ans = G.q && D.ITEMS[G.q.ans];
    $('#oAnswer').textContent = reason === 'shacho' ? '社長より先に、江原さんでした。' : reason === 'koji' ? 'それは江原浩二くん（置物）でした。' : ans ? `正解は「${ans}」でした。` : '';
    await sleep(2300);
    A.se('chin');
    unlock('yoroshii');
    await sleep(1600);
    A.se('chanchan');
    await sleep(900);
    showResult(false);
    return false;
  }
  $('#oSkip').addEventListener('click', () => {
    A.se('beep');
    const t = $('#oToast'); t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
  });

  // ───── 全問クリア ─────
  async function allClear() {
    spin(false);
    A.stopBgm(200);
    clearRing();
    face('laugh');
    setFull(1);
    A.se('ponpon');
    await sleep(500);
    // お腹のボタンが飛ぶ
    const btn = document.createElement('div');
    btn.style.cssText = `position:absolute;left:${L.mouth.x - 9}px;top:${L.mouth.y + 110}px;width:22px;height:22px;border-radius:50%;background:#6b4a2b;border:3px solid #2b1d14;z-index:40;box-shadow:inset 0 0 0 3px #8c6a45`;
    btn.innerHTML = '<i style="position:absolute;left:5px;top:5px;width:3px;height:3px;background:#2b1d14;border-radius:50%;box-shadow:6px 0 #2b1d14,0 6px #2b1d14,6px 6px #2b1d14"></i>';
    app.appendChild(btn);
    A.se('boyoyon');
    btn.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: 'translate(120px,-420px) rotate(900deg)', offset: .6 }, { transform: 'translate(160px,-900px) rotate(1500deg)' }], { duration: 1400, easing: 'ease-out' }).finished.then(() => btn.remove());
    await sleep(900);
    sayNow('もう、よろしいですわ〜（満腹）');
    const vlen = await A.voice('yoroshii_good');
    await sleep(Math.max(1200, vlen));
    A.se('fanfare'); A.se('cracker'); A.se('cheer', { vol: .7 });
    confetti(60, L.mouth.y - 140);
    telop('全問クリア！');
    await sleep(3200);
    await ending();
    showResult(true);
  }

  async function ending() {
    show('ending');
    A.bgm('ending');
    const sl = $('#eSlide'), img = $('#eImg'), cap = $('#eCap');
    for (const s of D.ENDING) {
      img.src = `assets/album/${s.img}.jpg`;
      cap.textContent = s.cap;
      sl.classList.remove('show'); void sl.offsetWidth; sl.classList.add('show');
      await sl.animate([{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .85 }, { opacity: 0 }], { duration: 2600 * FAST, fill: 'forwards' }).finished;
    }
    $('#eFinal').classList.add('on');
    await sleep(5200);
    $('#eLogo').classList.add('on');
    await sleep(1400);
    A.stopBgm(800);
    A.se('ipponjime');
    await sleep(2600);
    $('#eFinal').classList.remove('on'); $('#eLogo').classList.remove('on');
  }

  // ───── 結果 ─────
  function rankOf(c) { return [...D.RANKS].reverse().find(r => c >= r.min); }
  async function showResult(clear) {
    show('result');
    A.bgm('result', { vol: .8 });
    const c = Math.min(20, G.correct), rk = rankOf(c);
    const best = G.score > save.best;
    if (best) { save.best = G.score; store(); }
    $('#rEba').src = clear ? 'assets/photo/eba_laugh.webp' : c >= 10 ? 'assets/photo/eba_smile.webp' : 'assets/photo/eba_down.webp';
    $('#rName').textContent = ''; $('#rNote').textContent = '';
    $('#rCorrect').textContent = '0'; $('#rScore').textContent = '0';
    const nw = $('#rNew');
    const shown = G.newCards.slice(0, 7), more = G.newCards.length - shown.length;
    nw.innerHTML = G.newCards.length ? `<p>アルバムに ${G.newCards.length}枚 追加！</p><div class="row">${shown.map(id => `<img src="${cardIcon(id)}" alt="">`).join('')}${more > 0 ? `<span class="more">+${more}</span>` : ''}</div>` : '';
    await sleep(400);
    await countUp($('#rCorrect'), c, 600);
    await countUp($('#rScore'), G.score, 900);
    A.se('rank');
    const nm = $('#rName'); nm.textContent = rk.name; nm.classList.toggle('long', rk.name.length > 8); nm.classList.remove('stamp'); void nm.offsetWidth; nm.classList.add('stamp');
    $('#rNote').innerHTML = rk.note + (best && G.score ? '<br><span class="r-best">ベストスコア更新！</span>' : '');
  }
  function countUp(el, to, ms) {
    return new Promise(res => {
      const t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / (ms * FAST)); el.textContent = Math.round(to * k).toLocaleString(); if (k < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
  }
  $('#btnRetry').addEventListener('click', () => { A.se('start'); A.voice('aretotte'); startGame(); });
  $('#btnTitle').addEventListener('click', () => { A.se('tap'); toTitle(); });
  $('#btnResAlbum').addEventListener('click', () => { A.se('tap'); openAlbum('result'); });
  $('#btnSave').addEventListener('click', () => { A.se('tap'); saveImage(); });

  // 結果を画像に（file:// で写真が描けない時は、写真なしの版にする）
  async function saveImage() {
    const c = Math.min(20, G.correct), rk = rankOf(c);
    const draw = async (withPhoto) => {
      const cv = document.createElement('canvas'); cv.width = 720; cv.height = 960;
      const x = cv.getContext('2d');
      x.fillStyle = '#fff8ec'; x.fillRect(0, 0, 720, 960);
      [['#f0441f', 22], ['#141a2a', 30], ['#1c8fd3', 8], ['#7bc142', 12]].reduce((px, [col, w]) => { x.fillStyle = col; x.fillRect(px, 0, w, 960); return px + w; }, 0);
      x.textAlign = 'center'; x.fillStyle = '#141a2a';
      x.font = '72px Boku, serif'; x.fillText('もう、よろしいですわ', 380, 120);
      if (withPhoto) {
        const im = new Image(); im.src = $('#rEba').src; await im.decode();
        const h = 380, w = im.width * h / im.height; x.drawImage(im, 380 - w / 2, 150, w, h);
      }
      x.font = '30px Maru, sans-serif'; x.fillStyle = '#8a7a64'; x.fillText('あなたは江原さんの', 380, 600);
      x.font = '64px Boku, serif'; x.fillStyle = '#f0441f'; x.fillText(rk.name, 380, 680);
      x.font = '44px Dela, sans-serif'; x.fillStyle = '#141a2a'; x.fillText(`${c}問正解　${G.score.toLocaleString()}点`, 380, 780);
      x.font = '26px Maru, sans-serif'; x.fillStyle = '#8a7a64'; x.fillText('株式会社 心電通', 380, 900);
      return cv.toDataURL('image/png');
    };
    let url;
    try { url = await draw(true); } catch (_) { url = await draw(false); }
    const a = document.createElement('a'); a.href = url; a.download = 'mou-yoroshii.png'; a.click();
  }

  // ───── アルバム ─────
  let albumFrom = 'title';
  const cardIcon = (id) => {
    const c = D.CARDS.find(k => k.id === id);
    return c && c.special ? `assets/album/${id}.jpg` : `assets/items/${id}.svg`;
  };
  function openAlbum(from) {
    albumFrom = from;
    show('album');
    const g = $('#aGrid');
    $('#aCount').textContent = `${save.cards.length}/${D.CARDS.length}`;
    g.innerHTML = D.CARDS.map(c => {
      const has = save.cards.includes(c.id);
      const name = c.special || D.ITEMS[c.id];
      if (!has) return `<div class="a-cell lock"><span>？</span></div>`;
      const icon = c.special ? `<img src="assets/album/${c.id}.jpg" style="width:100%;border-radius:8px;aspect-ratio:1;object-fit:cover" alt="">` : `<img src="assets/items/${c.id}.svg" alt="">`;
      return `<button class="a-cell ${c.special ? 'special' : ''}" data-id="${c.id}">${icon}<p>${name}</p></button>`;
    }).join('');
  }
  $('#aGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.a-cell[data-id]');
    if (!b) return;
    A.se('paper');
    const c = D.CARDS.find(k => k.id === b.dataset.id);
    const name = c.special || D.ITEMS[c.id];
    $('#aCard').innerHTML = (c.photo ? `<img class="ac-photo" src="assets/album/${c.id}.jpg" alt="">` : `<img class="ac-icon" src="assets/items/${c.id}.svg" alt="">`)
      + `<h3>${name}</h3><p>${c.note}</p><span class="ac-close">タップでとじる</span>`;
    overlay('aModal', true);
  });
  $('#aModal').addEventListener('click', () => overlay('aModal', false));
  $('#btnAlbumBack').addEventListener('click', () => { A.se('tap'); if (albumFrom === 'result') show('result'); else toTitle(); });

  // ───── テスト用 ─────
  window.EBA = {
    get G() { return G; },
    get L() { return L; },
    answer(correct = true) {
      if (!G || !onPick || !G.plan) return false;
      const q = G.plan[G.si][(G.n - 1) % 4];
      const el = ring.querySelector(correct ? `.item[data-id="${q.ans}"]` : `.item:not([data-id="${q.ans}"])`);
      if (el && onPick) { const f = onPick; onPick = null; f(el); return true; }
      return false;
    },
    findKoji() { const h = $('#hiding'); if (h.onclick) { h.onclick(); return true; } return false; },
  };

  fit();
  toTitle();
  if (P.has('play')) startGame();
})();
