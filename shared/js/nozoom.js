// スマホで画面が拡大されないようにする（5本と入口で共通）
//   iPhone は「拡大禁止」の設定を無視するので、ボタンの連打・2本指での同時押し（A と B など）を「拡大」と受け取ってしまう
//   → 2本指の操作と、すばやい2度押しの拡大を止める。万一拡大されたら、元の大きさに戻す
(() => {
  const meta = document.querySelector('meta[name=viewport]');
  const BASE = 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no';
  if (meta) meta.content = BASE;
  document.documentElement.style.touchAction = 'manipulation';   // 2度押しで拡大しない（iPhone・Android）

  const stop = (e) => { if (e.cancelable) e.preventDefault(); };
  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, stop, { passive: false });   // iPhone の2本指の拡大
  // 2本目の指が触れた時・ゲームの操作パッドの上では、スマホの操作（拡大・スクロール・長押しのメニュー）をさせない
  //   （ボタンの処理は pointerdown で動いているので、ここで止めても押した扱いは変わらない）
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1 || e.target.closest('.pad, [data-nozoom]')) stop(e);
  }, { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) stop(e); }, { passive: false });
  // ボタン以外の所（画面・背景）をすばやく2度押した時の拡大を止める
  let last = 0;
  document.addEventListener('touchend', (e) => {
    const now = e.timeStamp;
    if (now - last < 400 && !e.target.closest('button, a, input, select, textarea, label, [role=button], .wcard, .item, .cab')) stop(e);
    last = now;
  }, { passive: false });
  document.addEventListener('dblclick', stop, { passive: false });

  // 万一拡大されたら、元の大きさに戻す（拡大の上限を一瞬 1 にすると、iPhone は元に戻る）
  const vv = window.visualViewport;
  if (vv && meta) {
    let fixing = false;
    vv.addEventListener('resize', () => {
      if (fixing || vv.scale <= 1.01) return;
      fixing = true;
      meta.content = BASE + ', minimum-scale=1';
      setTimeout(() => { meta.content = BASE; fixing = false; }, 400);
    });
  }
})();
