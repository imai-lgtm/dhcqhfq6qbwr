// 寝坊 — 文字・称号・絵の中の位置
window.DATA = {
  TIME: 90,            // 持ち時間（秒）
  PENALTY: { hit: 3, spark: 2, dadSeen: 5, grandmaMiss: 3 },
  COFFEE: 2,           // 缶コーヒーで増える秒数
  FIX_MEMO: 2400,      // インターホンの端子のラベルが見えている時間（ミリ秒）

  // 道中の障害物：画像・表示の大きさ（px）・当たり判定を内側に縮める量
  OBSTACLES: [
    { id: 'obs_cone', w: 58, h: 72, pad: 10 },
    { id: 'obs_dog', w: 112, h: 64, pad: 14 },
    { id: 'obs_trash', w: 78, h: 62, pad: 10 },
    { id: 'obs_bike', w: 118, h: 56, pad: 14 },
    { id: 'obs_sign', w: 64, h: 80, pad: 10 },
  ],

  // 中島家の玄関（house_front.svg の 390×520 の中の位置）
  HOUSE: {
    glass: { x: 195, y: 196, w: 76, h: 142 },     // すりガラス
    door: { x: 172, y: 162, w: 122, h: 290 },     // ドアが開いた時の入口
    intercom: { x: 316, y: 260, w: 46, h: 68 },   // インターホン子機（押しやすいよう少し大きめ）
    bush: { x: 14, y: 372, w: 160, h: 120 },      // 隠れた時の自分
  },
  // インターホンの中（intercom_open.svg の 320×300 の中の位置）
  FIX: {
    terminals: [{ c: 'red', x: 76, y: 88 }, { c: 'blue', x: 76, y: 128 }, { c: 'white', x: 76, y: 168 }, { c: 'green', x: 76, y: 208 }],
    wires: [{ c: 'white', x: 142, y: 222 }, { c: 'red', x: 168, y: 230 }, { c: 'green', x: 194, y: 224 }, { c: 'blue', x: 220, y: 232 }],
    color: { red: '#e8402a', blue: '#2f7fd8', white: '#f4f4f4', green: '#3fae49' },
  },

  LINES: {
    broken: '……（鳴らない）',
    dadSeen: '朝からうるさいわ！\nどこの誰や！',
    dadHidden: '……誰もおらんがな。',
    grandmaMiss: '……気のせいやな。',
    grandmaOk: 'あら、たかちゃんの会社の人？\nちょっと待ってな、起こしてくるわ',
    wake: 'たかちゃん！起きなはれ！',
    sorry: 'すんません！\n……寝てました',
    shacho: '……もうええ。\n今日、中島は休みや。',
  },

  RANKS: [
    { min: -1, name: '社長に電話で怒られる人', note: '中島さんは昼まで寝ました。' },
    { min: 1, name: 'ギリギリ集合', note: '間に合ったけど、汗だくです。' },
    { min: 15, name: '頼れる新人', note: '中島さんの起こし方がわかってきました。' },
    { min: 30, name: '中島係', note: '寝坊したら、まずあなたが呼ばれます。' },
    { min: 45, name: '中島家の顔なじみ', note: 'おばあちゃんに名前を覚えられました。' },
  ],
};
