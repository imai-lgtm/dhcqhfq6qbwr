// 5本共通の音の部品：BGM・効果音・声
// 使い方：AUDIO.init({ se: ['tap', ...], voice: ['aretotte', ...] })
//   効果音は ../shared/se/<名前>.mp3（5本共通）、声は assets/voice/、BGM は assets/bgm/（ゲームごと）
// スマホで音がずれないように、効果音と声は Web Audio（先に読み込んで、押した瞬間に鳴らす）で鳴らす。
// BGM は長いので audio タグで流し、音量だけ Web Audio を通して変える（iPhone は audio タグの音量が効かないため）。
// このPCでファイルを直接開いた時（file://）は Web Audio で読み込めないので、audio タグだけで鳴らす。
window.AUDIO = (() => {
  const VOL = { bgm: 0.42, se: 0.75, voice: 1.0 };
  const MUTE_KEY = 'shindentsu_mute';
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (_) { }

  const AC = window.AudioContext || window.webkitAudioContext;
  const useWA = !!AC && location.protocol !== 'file:';
  let ctx = null, master = null, seBus = null, voiceBus = null, bgmBus = null;
  if (useWA) {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    seBus = ctx.createGain(); seBus.gain.value = VOL.se; seBus.connect(master);
    voiceBus = ctx.createGain(); voiceBus.gain.value = VOL.voice; voiceBus.connect(master);
    bgmBus = ctx.createGain(); bgmBus.gain.value = 1; bgmBus.connect(master);
    // iPhone：マナーモードでも鳴るように（対応している端末だけ）
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { }
  }

  let cfg = {}, SE_NAMES = [];
  const buf = {};        // 名前 → 読み込んだ音（Web Audio）
  const els = {};        // 名前 → audio タグ（file:// の時の代わり）
  const playing = {};    // 名前 → 鳴っている効果音（止める時用）
  const bgms = {};
  let bgmNow = null, bgmName = '', unlocked = false;

  function mk(src, vol) { const a = new Audio(); a.preload = 'auto'; a.src = src; a.volume = vol; return a; }

  async function loadAll(list) {
    for (const [key, url] of list) {   // 1つずつ読む（いっぺんに読むとスマホが重くなるので）
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const ab = await r.arrayBuffer();
        buf[key] = await new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
      } catch (_) { }
    }
  }

  function init(c = {}) {
    cfg = { seBase: '../shared/se/', voiceBase: 'assets/voice/', bgmBase: 'assets/bgm/', ...c };
    SE_NAMES = cfg.se || [];
    const list = [...SE_NAMES.map((n) => ['se:' + n, `${cfg.seBase}${n}.mp3`]), ...(cfg.voice || []).map((n) => ['v:' + n, `${cfg.voiceBase}${n}.mp3`])];
    if (useWA) loadAll(list);
    else for (const [key, url] of list) { const a = mk(url, key.startsWith('v:') ? VOL.voice : VOL.se); a.addEventListener('error', () => { els[key] = null; }); els[key] = a; }
  }

  // スマホは最初のタップの中でないと音が出ないので、その時に無音を1回鳴らして起こす
  function unlock() {
    if (unlocked || !useWA) { unlocked = true; return; }
    unlocked = true;
    try {
      if (ctx.state !== 'running') ctx.resume();
      const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
    } catch (_) { }
  }
  // 画面を切りかえて戻ってきた時に止まっていたら、起こし直す
  document.addEventListener('visibilitychange', () => { if (useWA && !document.hidden && unlocked && ctx.state !== 'running') ctx.resume(); });

  function se(name, opt = {}) {
    if (muted) return null;
    if (!useWA) {
      const a = els['se:' + name]; if (!a) return null;
      try { const b = a.cloneNode(); b.volume = (opt.vol ?? 1) * VOL.se; b.playbackRate = opt.rate || 1; b.loop = !!opt.loop; b.play().catch(() => { }); (playing[name] = playing[name] || []).push(b); b.onended = () => { playing[name] = (playing[name] || []).filter((x) => x !== b); }; return b; } catch (_) { return null; }
    }
    const b = buf['se:' + name]; if (!b) return null;
    if (ctx.state !== 'running') ctx.resume();
    const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = opt.rate || 1; s.loop = !!opt.loop;
    const g = ctx.createGain(); g.gain.value = opt.vol ?? 1;
    s.connect(g); g.connect(seBus); s.start(0);
    (playing[name] = playing[name] || []).push(s);
    s.onended = () => { playing[name] = (playing[name] || []).filter((x) => x !== s); };
    return s;
  }

  function stopSe(name) {
    for (const s of playing[name] || []) { try { if (s.stop) s.stop(); else s.pause(); s.loop = false; if (s.pause) s.pause(); } catch (_) { } }
    playing[name] = [];
  }

  // 声：鳴らせたら長さ(ms)を返す。無ければ 0。声は重ねない（前のセリフは止める）
  let voiceNow = null;
  function voice(name) {
    if (muted) return Promise.resolve(0);
    if (voiceNow) { try { voiceNow.stop ? voiceNow.stop() : voiceNow.pause(); } catch (_) { } voiceNow = null; }
    if (!useWA) {
      const a = els['v:' + name]; if (!a) return Promise.resolve(0);
      voiceNow = a; a.currentTime = 0;
      return a.play().then(() => (a.duration || 1.2) * 1000).catch(() => 0);
    }
    const b = buf['v:' + name]; if (!b) return Promise.resolve(0);
    if (ctx.state !== 'running') ctx.resume();
    const s = ctx.createBufferSource(); s.buffer = b; s.connect(voiceBus); s.start(0);
    voiceNow = s; s.onended = () => { if (voiceNow === s) voiceNow = null; };
    return Promise.resolve(b.duration * 1000);
  }
  function hasVoice(name) { return useWA ? !!buf['v:' + name] : (!!els['v:' + name] && els['v:' + name].readyState > 0); }

  // BGM：audio タグで流す。音量は Web Audio の「つまみ」で変える
  function bgmTrack(name) {
    let t = bgms[name];
    if (t) return t;
    const a = mk(`${cfg.bgmBase}${name}.mp3`, useWA ? 1 : 0); a.loop = true;
    t = { a, g: null };
    if (useWA) { try { const src = ctx.createMediaElementSource(a); t.g = ctx.createGain(); t.g.gain.value = 0; src.connect(t.g); t.g.connect(bgmBus); } catch (_) { t.g = null; } }
    return (bgms[name] = t);
  }
  function setVol(t, to, ms, done) {
    if (t.g) {
      const now = ctx.currentTime, p = t.g.gain;
      p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(to, now + ms / 1000);
      if (done) setTimeout(done, ms);
      return;
    }
    const a = t.a, from = a.volume, t0 = performance.now();
    const step = (tm) => { const k = Math.min(1, (tm - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k < 1) requestAnimationFrame(step); else if (done) done(); };
    requestAnimationFrame(step);
  }

  function bgm(name, opt = {}) {
    if (name === bgmName && bgmNow && !bgmNow.a.paused) return;
    stopBgm(opt.fade ?? 300);
    bgmName = name;
    if (!name) return;
    const t = bgmTrack(name);
    t.a.currentTime = 0; t.a.playbackRate = 1;
    if (t.g) t.g.gain.value = 0; else t.a.volume = 0;
    bgmNow = t;
    if (muted) return;
    if (useWA && ctx.state !== 'running') ctx.resume();
    t.a.play().catch(() => { });
    setVol(t, VOL.bgm * (opt.vol ?? 1), 500);
  }
  // BGM の速さ（ラストスパートで速くする時など）
  function bgmSpeed(r) { if (bgmNow) bgmNow.a.playbackRate = r; }

  function stopBgm(ms = 300) {
    const t = bgmNow;
    bgmNow = null; bgmName = '';
    if (!t) return;
    if (ms <= 0) { t.a.pause(); return; }
    setVol(t, 0, ms, () => { if (bgmNow !== t) t.a.pause(); });
  }

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch (_) { }
    if (master) master.gain.value = m ? 0 : 1;
    if (m) { if (bgmNow) bgmNow.a.pause(); for (const n of Object.keys(playing)) stopSe(n); if (voiceNow) { try { voiceNow.stop ? voiceNow.stop() : voiceNow.pause(); } catch (_) { } } }
    else if (bgmNow) { if (useWA && ctx.state !== 'running') ctx.resume(); bgmNow.a.play().catch(() => { }); setVol(bgmNow, VOL.bgm, 300); }
  }

  return { init, unlock, se, stopSe, voice, hasVoice, bgm, bgmSpeed, stopBgm, setMuted, get muted() { return muted; } };
})();
