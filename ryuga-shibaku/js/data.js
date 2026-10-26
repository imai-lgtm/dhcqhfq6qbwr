// りゅうがしばく — ステージ・敵・セリフ
// 画面は 256×240（ファミコンと同じ）。歩ける床は y=150〜232
window.DATA = {
  FLOOR: { top: 156, bottom: 228 },
  PLAYER: { hp: 16, speed: 1.25, speedY: .85 },

  // 敵の強さ（hp：体力、dmg：攻撃の痛さ、speed：歩く速さ、reach：攻撃が届く距離）
  ENEMY: {
    naka: { hp: 6, dmg: 1, speed: .55, reach: 24, windup: 26, cool: 70, score: 100 },
    dani: { hp: 7, dmg: 1, speed: .7, reach: 24, windup: 22, cool: 60, score: 120 },
    miya: { hp: 34, dmg: 2, speed: .5, reach: 26, windup: 30, cool: 60, score: 1000, boss: true },
    soma: { hp: 22, dmg: 2, speed: 0, reach: 70, windup: 0, cool: 0, score: 1500, boss: true },
    shacho: { hp: 46, dmg: 2, speed: .65, reach: 36, windup: 34, cool: 55, score: 3000, boss: true },
  },
  // 攻撃の強さ
  ATTACK: { punch1: 1, punch2: 1, kick: 2, jumpkick: 2, kiwami: 7 },

  // 名前テロップ（初めて出てきた時に、画面が止まって出る）
  CARDS: {
    naka: { name: '中島 貴久', role: '心電通 工事部', catch: 'どこでも寝れる男', photo: 'naka' },
    dani: { name: 'ボリバー・ダニエル', role: '心電通 工事部', catch: '決めポーズの間は無敵', photo: 'dani' },
    miya: { name: '宮本 吉康', role: '心電通 66歳', catch: '焼肉バウンドマン', photo: 'miya' },
    soma: { name: '颯馬', role: '心電通 中部支店長', catch: 'どこでも寝る支店長', photo: 'soma' },
    shacho: { name: '山本 雅希', role: '株式会社 心電通 代表取締役', catch: '黒幕', photo: 'shacho' },
  },

  // ステージ：背景・幅・敵の出てくる場所（x に来たら画面が止まって、全部倒すまで進めない）
  STAGES: [
    {
      id: 1, name: '心電町・夜のネオン街', bg: 'stage1', w: 1024, bgm: 'stage1',
      waves: [
        { x: 0, enemies: [{ t: 'naka', dx: 200, y: 175 }, { t: 'naka', dx: 230, y: 215 }] },
        { x: 240, enemies: [{ t: 'naka', dx: 220, y: 170 }, { t: 'dani', dx: -30, y: 210 }] },
        { x: 500, enemies: [{ t: 'dani', dx: 220, y: 175 }, { t: 'dani', dx: 240, y: 215 }, { t: 'naka', dx: -30, y: 195 }] },
        { x: 768, boss: true, enemies: [{ t: 'miya', dx: 200, y: 195 }] },
      ],
      // ダンボール箱：1つに安全祈願だるま
      props: [{ t: 'box', x: 330, y: 168, item: 'ramen' }, { t: 'box', x: 610, y: 222, item: null }, { t: 'box', x: 690, y: 166, item: 'daruma' }],
    },
    {
      id: 2, name: '中部支店（名古屋）', bg: 'stage2', w: 768, bgm: 'stage2',
      waves: [
        { x: 0, enemies: [{ t: 'naka', dx: 210, y: 180 }, { t: 'dani', dx: 230, y: 210 }] },
        { x: 220, enemies: [{ t: 'naka', dx: 220, y: 170 }, { t: 'naka', dx: 240, y: 215 }, { t: 'dani', dx: -30, y: 195 }] },
        { x: 440, boss: true, enemies: [{ t: 'soma', dx: 180, y: 212 }] },
      ],
      // ロッカー：1つに布施えびすの福笹
      props: [{ t: 'locker', x: 300, y: 160, item: 'ramen' }, { t: 'locker', x: 452, y: 160, item: 'fukuzasa' }],
      // 入れない所（支店長の大きな机）
      blocks: [{ x0: 554, x1: 686, y0: 150, y1: 204 }],
    },
    {
      id: 3, name: '新社屋・社長室', bg: 'stage3', w: 768, bgm: 'stage3',
      // 社長室の奥で、連れ去られたはずの奥さんがイスに座って応援している（伏線）
      okusan: { x: 715, y: 162 },
      waves: [
        { x: 0, enemies: [{ t: 'dani', dx: 210, y: 178 }, { t: 'dani', dx: 230, y: 214 }] },
        { x: 240, enemies: [{ t: 'naka', dx: 220, y: 172 }, { t: 'naka', dx: -30, y: 214 }, { t: 'dani', dx: 240, y: 196 }] },
        { x: 512, boss: true, enemies: [{ t: 'shacho', dx: 190, y: 192 }] },
      ],
      props: [{ t: 'box', x: 420, y: 220, item: 'ramen' }],
    },
  ],

  ITEMS: {
    daruma: { name: '安全祈願だるま', note: 'STAGE 1 のダンボール箱の中' },
    fukuzasa: { name: '布施えびすの福笹', note: 'STAGE 2 のロッカーの中' },
    ramen: { name: 'ラーメン', heal: 6 },
  },

  TEXT: {
    opening: [
      '決算の日。',
      '龍之介部長の奥さんが、何者かに連れ去られた。',
      '残されていたのは一枚のメモ。\n「返してほしければ、新社屋の社長室まで来い」',
    ],
    nakaSleep: 'ZZZ…',
    daniPose: 'キラーン！',
    noEffect: '効かへんなぁ',
    gold: '心電通は、神頼みも本気です',
    hint: '……だるま、持ってへんやろ？',
    ending: [
      '社長室の奥の扉が開いて、クラッカーの音。',
      '奥さん「龍くん、お誕生日おめでとう！」',
    ],
  },

  RANKS: [
    { min: 0, name: '新入りのしばき屋', note: 'STAGE 1 で力つきました。' },
    { min: 1, name: '中部支店の用心棒', note: 'STAGE 2 まで、しばきました。' },
    { min: 2, name: '社長室までは来た男', note: '黒幕の顔は見ました。' },
    { min: 3, name: '龍部長（漢）', note: '心電通を、しばき切りました。' },
    { min: 4, name: 'しばきの神', note: '一度も倒れずに、しばき切りました。' },
  ],
};
