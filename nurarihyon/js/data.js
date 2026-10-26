// ぬらりひょん — ブロック・レベル・称号
window.DATA = {
  COLS: 8, ROWS: 15,
  // 7種類の形（4マス）。顔と枠の色は形ごとに決まっている
  PIECES: {
    I: { face: 'eba', color: '#e8402a', cells: [[0, 1], [1, 1], [2, 1], [3, 1]], size: 4 },
    O: { face: 'miya', color: '#f2b51c', cells: [[1, 0], [2, 0], [1, 1], [2, 1]], size: 4 },
    T: { face: 'shacho', color: '#24345c', cells: [[1, 0], [0, 1], [1, 1], [2, 1]], size: 3 },
    S: { face: 'naka', color: '#3fae49', cells: [[1, 0], [2, 0], [0, 1], [1, 1]], size: 3 },
    Z: { face: 'soma', color: '#e85a9c', cells: [[0, 0], [1, 0], [1, 1], [2, 1]], size: 3 },
    L: { face: 'dani', color: '#f07b1f', cells: [[2, 0], [0, 1], [1, 1], [2, 1]], size: 3 },
    J: { face: 'ryu', color: '#2fa6d8', cells: [[0, 0], [0, 1], [1, 1], [2, 1]], size: 3 },
    // 龍之介ブロック（2マス・光る）。置いた列の税を全部食べる
    R: { face: 'ryu', color: '#f4c430', cells: [[0, 0], [0, 1]], size: 2, special: true },
  },
  NAMES: { eba: '江原さん', miya: '宮本さん', shacho: '社長', naka: '中島さん', soma: '颯馬さん', dani: 'ダニエルさん', ryu: '龍之介さん' },

  // レベル：必要な列・落ちる速さ（1段の秒数）・ぬらりひょんが来る間隔（置いたブロックの数、0＝来ない）・龍之介ブロックの間隔（ブロック数）
  LEVELS: [
    { lines: 4, fall: .80, tax: 0, ryu: 0 },
    { lines: 5, fall: .68, tax: 7, ryu: 9 },
    { lines: 6, fall: .56, tax: 6, ryu: 8 },
    { lines: 7, fall: .46, tax: 5, ryu: 7 },
    { lines: 8, fall: .38, tax: 4, ryu: 6 },
  ],
  POINTS: [0, 100, 300, 500, 800],   // 同時に消した列の数ごと（×レベル）
  TAX_EAT: 50,

  LINES: {
    nura: ['ちょっと、\nよろしいですか…', 'お茶、いただきますね…', 'これは…\n経費ですか？', 'ここも、\n見せてもらえます？'],
    ryu: '税は全部、\n俺が引き受けた！',
    clear1: '配線完了！', clearN: 'まとめて完了！',
  },

  RANKS: [
    { lv: 0, name: '被害者の会・新会員', note: 'まずは愚痴から始めましょう。' },
    { lv: 3, name: '経理の見習い', note: '税の置き場所がわかってきました。' },
    { lv: 4, name: '決算の鬼', note: '決算前の心電通に欠かせない人材です。' },
    { lv: 5, name: '節税の達人', note: 'あと一歩で、ぬらりひょんが帰ります。' },
    { lv: 6, name: '心電通・税務担当', note: '龍之介さんと並ぶ、税の引き受け役です。' },
  ],
};
