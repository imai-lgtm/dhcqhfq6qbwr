// 5本共通の音の部品：BGM・効果音・声（HTMLAudio。file:// でも鳴るように）
// 使い方：AUDIO.init({ se: ['tap', ...], voice: ['aretotte', ...] })
//   効果音は ../shared/se/<名前>.mp3（5本共通）、声は assets/voice/、BGM は assets/bgm/（ゲームごと）
window.AUDIO = (() => {
  const VOL = { bgm: 0.42, se: 0.75, voice: 1.0 };
  const MUTE_KEY = 'shindentsu_mute';
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (_) { }

  let SE_NAMES = [], cfg = {};
  const pools = {};   // 同じ効果音を重ねて鳴らせるように3つずつ
  const voices = {};
  const bgms = {};
  let bgmNow = null, bgmName = '', bgmRate = 1;
  let unlocked = false;

  function mk(src, vol) {
    const a = new Audio();
    a.preload = 'auto';
    a.src = src;
    a.volume = vol;
    return a;
  }

  function init(c = {}) {
    cfg = { seBase: '../shared/se/', voiceBase: 'assets/voice/', bgmBase: 'assets/bgm/', ...c };
    SE_NAMES = cfg.se || [];
    for (const n of SE_NAMES) pools[n] = { i: 0, list: [0, 1, 2].map(() => mk(`${cfg.seBase}${n}.mp3`, VOL.se)) };
    for (const n of cfg.voice || []) {
      const a = mk(`${cfg.voiceBase}${n}.mp3`, VOL.voice);
      a.addEventListener('error', () => { voices[n] = null; });  // 声がまだ無いときは文字だけ
      voices[n] = a;
    }
  }

  // スマホは最初のタップの中で一度鳴らさないと音が出ないので、その時に全部を起こす
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    const all = [...Object.values(pools).flatMap(p => p.list), ...Object.values(voices).filter(Boolean)];
    for (const a of all) {
      const v = a.volume;
      a.volume = 0;
      const p = a.play();
      if (p && p.then) p.then(() => { a.pause(); a.currentTime = 0; a.volume = v; }).catch(() => { a.volume = v; });
    }
  }

  function se(name, opt = {}) {
    if (muted) return null;
    const p = pools[name];
    if (!p) return null;
    const a = p.list[p.i++ % p.list.length];
    try {
      a.pause(); a.currentTime = 0;
      a.volume = (opt.vol ?? 1) * VOL.se;
      a.playbackRate = opt.rate || 1;
      a.loop = !!opt.loop;
      a.play().catch(() => { });
    } catch (_) { }
    return a;
  }

  function stopSe(name) {
    const p = pools[name];
    if (p) for (const a of p.list) { a.pause(); a.loop = false; }
  }

  // 声：鳴らせたら長さ(ms)を返す。無ければ 0
  let voiceNow = null;
  function voice(name) {
    const a = voices[name];
    if (!a || muted) return Promise.resolve(0);
    try {
      if (voiceNow && voiceNow !== a) voiceNow.pause();   // 声は重ねない（前のセリフは止める）
      voiceNow = a;
      a.pause(); a.currentTime = 0;
      return a.play().then(() => (a.duration || 1.2) * 1000).catch(() => 0);
    } catch (_) { return Promise.resolve(0); }
  }
  function hasVoice(name) { return !!voices[name] && voices[name].readyState > 0; }

  function bgm(name, opt = {}) {
    if (name === bgmName && bgmNow && !bgmNow.paused) return;
    stopBgm(opt.fade ?? 300);
    bgmName = name;
    if (!name) return;
    let a = bgms[name];
    if (!a) { a = bgms[name] = mk(`${cfg.bgmBase}${name}.mp3`, 0); a.loop = true; }
    a.currentTime = 0;
    a.volume = 0;
    a.playbackRate = bgmRate = 1;
    bgmNow = a;
    if (muted) return;
    a.play().catch(() => { });
    fadeTo(a, VOL.bgm * (opt.vol ?? 1), 500);
  }
  // BGM の速さ（ラストスパートで速くする時など）
  function bgmSpeed(r) { bgmRate = r; if (bgmNow) bgmNow.playbackRate = r; }

  function stopBgm(ms = 300) {
    const a = bgmNow;
    bgmNow = null; bgmName = '';
    if (!a) return;
    if (ms <= 0) { a.pause(); return; }
    fadeTo(a, 0, ms, () => a.pause());
  }

  function fadeTo(a, to, ms, done) {
    const from = a.volume, t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    };
    requestAnimationFrame(step);
  }

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch (_) { }
    if (m) { if (bgmNow) bgmNow.pause(); for (const n of SE_NAMES) stopSe(n); }
    else if (bgmNow) { bgmNow.play().catch(() => { }); fadeTo(bgmNow, VOL.bgm, 300); }
  }

  return { init, unlock, se, stopSe, voice, hasVoice, bgm, bgmSpeed, stopBgm, setMuted, get muted() { return muted; } };
})();
