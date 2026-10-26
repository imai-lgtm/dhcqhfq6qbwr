// 5本共通：どの画面からでも「心電通ゲームセンター」のトップに戻れるボタン（左上の🏠。右上の音ボタンと対）
// 遊んでいる途中は確認を出し、その間は window.GC_HOLD = true（各ゲームはこの間、時間を止める）
(() => {
  const app = document.getElementById('app') || document.body;
  const css = document.createElement('style');
  css.textContent = `
.gc-home { position: absolute; left: 10px; top: 10px; z-index: 60; width: 40px; height: 40px; padding: 0; border-radius: 50%; display: none; align-items: center; justify-content: center;
  font-size: 19px; line-height: 1; border: 0; background: rgba(255,255,255,.85); box-shadow: 0 2px 8px rgba(0,0,0,.2); cursor: pointer; }
.gc-home.on { display: flex; }
.gc-modal { position: absolute; inset: 0; z-index: 70; display: none; align-items: center; justify-content: center; background: rgba(5,3,10,.72); }
.gc-modal.on { display: flex; }
.gc-card { width: 300px; max-width: 86%; padding: 22px 18px 18px; border-radius: 16px; text-align: center; color: #fff; font-family: 'Maru', sans-serif; font-weight: 700;
  background: linear-gradient(#1d1533, #120c22); border: 3px solid #ffcf4a; box-shadow: 0 0 0 4px #120c22, 0 12px 30px rgba(0,0,0,.6); }
.gc-t { margin: 0 0 8px; font-size: 18px; }
.gc-s { margin: 0 0 18px; font-size: 12px; color: #cfc6e6; line-height: 1.6; }
.gc-row { display: flex; gap: 10px; }
.gc-row button { flex: 1; padding: 12px 0; border-radius: 12px; font: inherit; font-size: 16px; color: #fff; border: 0; cursor: pointer; }
.gc-yes { background: #e0242c; box-shadow: 0 4px 0 #7a0c10; }
.gc-no { background: #2c3e8f; box-shadow: 0 4px 0 #141f52; }`;
  document.head.appendChild(css);

  const btn = document.createElement('button');
  btn.className = 'gc-home';
  btn.setAttribute('aria-label', 'ゲームセンターに戻る');
  btn.textContent = '🏠';
  btn.title = 'ゲームセンターに戻る';
  const mute = document.getElementById('mute');   // 右上の音ボタンと同じ見た目にそろえる
  if (mute) { const cs = getComputedStyle(mute); btn.style.background = cs.background; btn.style.border = cs.border; btn.style.boxShadow = cs.boxShadow; }
  const modal = document.createElement('div');
  modal.className = 'gc-modal';
  modal.innerHTML = '<div class="gc-card"><p class="gc-t">ゲームセンターに戻る？</p><p class="gc-s">遊んでいるとちゅうの分は<br>記録されません。</p>'
    + '<div class="gc-row"><button class="gc-yes">もどる</button><button class="gc-no">つづける</button></div></div>';
  app.append(btn, modal);

  // ゲーム本体にタップ・キーが伝わらないようにする
  for (const el of [btn, modal]) for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'mousedown', 'click']) el.addEventListener(ev, (e) => e.stopPropagation());
  addEventListener('keydown', (e) => { if (window.GC_HOLD) { e.stopImmediatePropagation(); if (e.code === 'Escape') close(); } }, true);

  const visible = (id) => { const s = document.getElementById(id); return !!(s && s.classList.contains('on')); };
  const goHome = () => { location.href = '../#floor'; };   // ゲーセンの店内（ゲーム選択）へ
  function close() { modal.classList.remove('on'); window.GC_HOLD = false; }
  btn.addEventListener('click', () => {
    try { window.AUDIO && AUDIO.se('tap'); } catch (_) { }
    if (!visible('play')) { goHome(); return; }   // 遊んでいない画面なら、そのまま戻る
    window.GC_HOLD = true;
    modal.classList.add('on');
  });
  modal.querySelector('.gc-yes').addEventListener('click', goHome);
  modal.querySelector('.gc-no').addEventListener('click', () => { try { window.AUDIO && AUDIO.se('tap'); } catch (_) { } close(); });

  // タイトル（下に「← ゲーム一覧」がある）とクレジットの間は隠す
  const sync = () => btn.classList.toggle('on', !visible('title') && !visible('credits'));
  new MutationObserver(sync).observe(app, { subtree: true, attributes: true, attributeFilter: ['class'] });
  sync();
})();
