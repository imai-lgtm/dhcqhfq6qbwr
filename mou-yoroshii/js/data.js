// ゲームの中身（アイテム・ステージ・お願いの言葉・アルバムの文）
// 元ネタは心電通HPのブログ「江原部長日記」ほか
window.DATA = (() => {
  // アイテム：id は assets/items/<id>.svg と同じ
  const ITEMS = {
    nipper: 'ニッパー', pliers: 'ペンチ', crimper: 'LAN圧着工具', lan_tester: 'LANテスター', calculator: '電卓',
    helmet_black: '黒ヘルメット', helmet_white: '白ヘルメット', kyatatsu: '脚立', hashigo: 'はしご', seal: 'シール',
    daikon: 'おでんの大根', hanpen: 'はんぺん', konnyaku: 'こんにゃく', tonkatsu: 'とんかつ', croquette: 'コロッケ',
    maguro_don: 'マグロ丼', tekkamaki: '鉄火巻き', takoyaki_30: 'たこ焼き30個', takoyaki_6: 'たこ焼き6個',
    akashiyaki: '明石焼き', champon_l: 'ちゃんぽん大盛り', champon_n: 'ちゃんぽん並', wanko: 'わんこそば', dogfood: 'ドッグフード',
    ice_cream: 'アイス', ice_cube: '氷', banana: 'バナナ', cucumber: 'きゅうり', soda_grape: 'グレープソーダ', soda_orange: 'オレンジソーダ',
    pajama_big: '特注パジャマ', pajama_n: 'ふつうのパジャマ', kousho: '高所作業車', bicycle: '自転車',
    mic: 'マイク', sausage_half: '半分のソーセージ', sausage_whole: 'まるごとソーセージ', gacha: 'ガチャガチャ', vending: '自動販売機',
    tanuki: '狸の置物', maneki: '招き猫', beer: '生ビール', oolong: 'ウーロン茶',
    gown: 'ホテルのガウン', bath_towel: 'バスタオル', fruit_plate: 'フルーツ盛り', fake_flower: '造花',
    perm_flyer: 'パーマ屋さんのチラシ', barikan: 'バリカン', gacha_5000: '5000円ガチャ', gacha_500: '500円ガチャ',
  };

  // ステージ：q は問題の候補（毎回4問をランダムに選ぶ）
  // say=吹き出しの言葉 / ans=正解 / trap=紛らわしい選択肢 / voice=声の番号 / after=正解のあとの一言
  const STAGES = [
    {
      id: 1, name: '朝の現場', sub: '東大阪の工事現場', bgm: 'stage1', time: 9, ring: 5,
      intro: '江原部長が「あれ取って」と言います。言われた品物をタップして渡そう。', mood: 'smile',
      q: [
        { say: 'ニッパー取って', ans: 'nipper', trap: ['pliers'] },
        { say: 'LANの圧着のやつ', ans: 'crimper', trap: ['pliers', 'nipper'] },
        { say: 'テスター！', ans: 'lan_tester', trap: ['calculator'] },
        { say: '黒いヘルメット', ans: 'helmet_black', trap: ['helmet_white'] },
        { say: '脚立', ans: 'kyatatsu', trap: ['hashigo'] },
        { say: 'シール無いねんけど', ans: 'seal', trap: ['calculator'], after: { text: '…最初から無かったで？', voice: 'saishokara', face: 'down', mark: 'anger' } },
      ],
      fill: ['nipper', 'pliers', 'crimper', 'lan_tester', 'calculator', 'helmet_black', 'helmet_white', 'kyatatsu', 'hashigo', 'seal'],
    },
    {
      id: 2, name: 'お昼ごはん', sub: '江原さんが一番元気な時間', bgm: 'stage2', time: 8, ring: 6,
      intro: 'お昼ごはん。お願いの言い方が、ちょっと雑になります。', mood: 'want',
      q: [
        { say: 'おでんの、まるいやつ', ans: 'daikon', trap: ['hanpen', 'konnyaku'], voice: 'areyaare', pre: 'あれや、あれ…' },
        { say: 'カツや、カツ', ans: 'tonkatsu', trap: ['croquette'] },
        { say: 'マグロのやつ、丼で', ans: 'maguro_don', trap: ['tekkamaki'] },
        { say: 'たこ焼き、30個', ans: 'takoyaki_30', trap: ['takoyaki_6'] },
        { say: '明石の', ans: 'akashiyaki', trap: ['takoyaki_6', 'takoyaki_30'], voice: 'areyaare', pre: 'あれや、あれ…' },
        { say: 'ちゃんぽん、大盛りな', ans: 'champon_l', trap: ['champon_n'] },
        { say: 'わんこの…そばな', ans: 'wanko', trap: ['dogfood'], voice: 'areyaare', pre: 'あれや、あれ…' },
      ],
      fill: ['daikon', 'hanpen', 'konnyaku', 'tonkatsu', 'croquette', 'maguro_don', 'tekkamaki', 'takoyaki_30', 'takoyaki_6', 'akashiyaki', 'champon_l', 'champon_n', 'wanko', 'dogfood'],
    },
    {
      id: 3, name: '午後（眠い）', sub: 'お昼を食べたら、眠くなる', bgm: 'stage3', time: 7.5, ring: 7, sleepy: true,
      intro: 'お腹いっぱいで、お願いが寝言になります。社長が割り込んできても、江原さんが先です。', mood: 'down', shacho: true,
      q: [
        { say: '…ぁ…ぃす…', ans: 'ice_cream', trap: ['ice_cube'] },
        { say: '…ばなな…', ans: 'banana', trap: ['cucumber'] },
        { say: '…ふぁんた…ぐれ…', ans: 'soda_grape', trap: ['soda_orange'], voice: 'fanta' },
        { say: '…ぱじゃま…とくちゅうの…', ans: 'pajama_big', trap: ['pajama_n'] },
        { say: '…たかいとこ…のれるやつ…', ans: 'kousho', trap: ['bicycle'] },
      ],
      fill: ['ice_cream', 'ice_cube', 'banana', 'cucumber', 'soda_grape', 'soda_orange', 'pajama_big', 'pajama_n', 'kousho', 'bicycle'],
    },
    {
      id: 4, name: '夜の打ち上げ', sub: '難波・カラオケスナック', bgm: 'stage4', time: 7.5, ring: 7, spin: true,
      intro: '酔っぱらって、品物がぐるぐる回ります。', mood: 'laugh', shacho: true,
      q: [
        { say: 'マイク！歌うで！', ans: 'mic', trap: ['banana'] },
        { say: 'ソーセージ、ちゃんと半分にしてな', ans: 'sausage_half', trap: ['sausage_whole'] },
        { say: 'ガチャや！エバもする〜', ans: 'gacha', trap: ['vending'], voice: 'ebamosuru' },
        { say: 'たぬき…', ans: 'tanuki', trap: ['maneki'] },
        { say: 'とりあえず、生！', ans: 'beer', trap: ['oolong'] },
      ],
      fill: ['mic', 'banana', 'sausage_half', 'sausage_whole', 'gacha', 'vending', 'tanuki', 'maneki', 'beer', 'oolong'],
    },
    {
      id: 5, name: 'エバの夢', sub: '豪華ホテルの一室', bgm: 'stage5', time: 8, ring: 8, silent: true,
      intro: 'もう何も言いません。夢に浮かぶ品物が、モザイクからだんだん見えてきます。早く当てるほど高得点。', mood: 'smile', koji: true,
      q: [
        { hint: 'ハンガーにかかった服を、じっと見ている', ans: 'gown', trap: ['bath_towel'], after: { text: '（帯がちぎれそうやけど…着る）', face: 'laugh' } },
        { hint: '豪華な果物を思い浮かべて、よだれ', ans: 'fruit_plate', trap: ['fake_flower'] },
        { hint: '髪をさわって、おしゃれなパーマにしたそう', ans: 'perm_flyer', trap: ['barikan'] },
        { hint: 'いちばん豪華なガチャを、うっとり見ている', ans: 'gacha_5000', trap: ['gacha_500'] },
      ],
      fill: ['gown', 'bath_towel', 'fruit_plate', 'fake_flower', 'perm_flyer', 'barikan', 'gacha_5000', 'gacha_500'],
    },
  ];

  // 正解したときの一言（声は2種類を交互に）
  const PRAISE = [
    { text: 'それやがな〜', voice: 'soreyagana' },
    { text: 'わかってるやん', voice: 'wakatteruyan' },
  ];
  const PRAISE_TEXT_ONLY = ['これこれ', 'ええやん', 'ほんまそれ', 'さすがやな', 'ようわかっとる'];

  const RANKS = [
    { min: 0, name: '初対面の人', note: '江原さんとは、まだ他人です。' },
    { min: 5, name: '現場の後輩', note: '工具くらいは渡せるようになりました。' },
    { min: 10, name: '出張の相棒', note: '一緒にご飯に行ける仲です。' },
    { min: 15, name: 'エバ検定 一級', note: '目線だけで通じ合える域です。' },
    { min: 20, name: '27年の相棒（社長級）', note: '江原さんのことは、全部わかっています。' },
  ];

  // アルバムのカード（正解したアイテムが貯まる）。photo は assets/album/<id>.jpg
  const CARDS = [
    { id: 'nipper', note: '通信工事の必需品。ケーブルを切ったり、皮をむいたり。' },
    { id: 'crimper', note: 'LANケーブルの先にコネクタを付ける道具。心電通は新人向けに付け方の動画もYouTubeに上げています。' },
    { id: 'lan_tester', photo: true, note: '配線がちゃんとつながっているか調べる道具。江原部長日記64「電話キヒモ工場長」では、特殊な電話キヒモを2000本作る依頼に挑みました。' },
    { id: 'helmet_black', photo: true, note: '2021年「新ヘルメッツ」。お昼休みに江原さんとヘルメットを新調。今回からブラックヘルメットに。' },
    { id: 'kyatatsu', note: '高い所の工事に欠かせない相棒。心電通は石切さんで毎年安全祈願をして「10年無事故」です。' },
    { id: 'seal', note: '江原部長日記25。現場で毎回「シール無い」となる。言い分を聞くと「最初から無かった」。' },
    { id: 'daikon', note: '江原部長日記85。おでんが食べられる日、エバはご機嫌。心電通では期の始まりにおでんを食べるのが縁起物です。' },
    { id: 'tonkatsu', photo: true, note: '日本橋の名店「こけし」。社長が25年前に、当時の師匠・江原先生に教えてもらったお店です。' },
    { id: 'maguro_don', photo: true, note: '江原部長日記81「大好きマグロ丼」。マグロの像に抱きついて離れません。' },
    { id: 'takoyaki_30', photo: true, note: '江原部長日記22。仕事帰りにアメリカ村で、たこ焼き30個をペロリ。' },
    { id: 'akashiyaki', note: '江原部長日記16。出張先で明石焼きを食べてニコニコ。年始の「明石焼き食べ始め」は心電通の縁起物です。' },
    { id: 'champon_l', photo: true, note: '江原部長日記6。長崎旅行帰りで風邪気味でも、神戸でちゃんぽん大盛り。' },
    { id: 'wanko', photo: true, note: '江原部長日記56「わんこ！わんこ！わんこそば！！」。出石でお椀を積み上げました。' },
    { id: 'ice_cream', photo: true, note: '江原部長日記79「エバアイス」。お腹いっぱいになったら、毎日アイスを食べるのが日課。' },
    { id: 'banana', photo: true, note: '江原部長日記59「ご機嫌バナナ」。バナナを与えると、もっとご機嫌に。' },
    { id: 'soda_grape', note: '江原部長日記88。夢を叶えたいのか、ファンタグレープを飲むエバ男。' },
    { id: 'pajama_big', note: '年に一度の健康診断。江原さんは毎年なぜか特注のパジャマ姿で登場します。' },
    { id: 'kousho', photo: true, note: '江原部長日記48「改造人間エバーン」。歩かなくても良い乗り物＝高所作業車を手に入れた。' },
    { id: 'mic', photo: true, note: '江原部長日記4。忘年会の2次会カラオケで、かっこよく熱唱。' },
    { id: 'sausage_half', photo: true, note: '2022年「amは久しぶりの二人飲み」。めっちゃ真剣にソーセージを分けるエバヤン。' },
    { id: 'gacha', note: '2022年「七夕まつり 渚のガチャガチャ編」。2000円ガチャに挑戦して、結果は惨敗。' },
    { id: 'tanuki', photo: true, note: '江原部長日記84「エバ狸」。大狸にシンパシーを感じる江原さん。' },
    { id: 'beer', note: '月に一度の飲み会。まずは「とりあえず」。' },
    { id: 'gown', note: '江原部長日記88「エバの夢・男の夢」。豪華ホテルのガウン。「サイズデカいから着れるわ」…帯がちぎれそう。' },
    { id: 'fruit_plate', note: 'エバの夢。豪華ホテルの夜。' },
    { id: 'perm_flyer', photo: true, note: '江原部長日記87。おしゃれなパーマ屋さんに行きたいと七夕にお願い。優しい社長が叶えました。' },
    { id: 'gacha_5000', photo: true, note: '江原部長日記89「エバの愛5000円編」。「エバもする〜」とドンキで大騒ぎ。' },
    { id: 'koji', photo: true, special: '江原浩二くん', note: '2023年。江原顧問がなかなか会社に来られないので、みんなで迎え入れた「江原浩二くん」。浩一くんにそっくり。' },
    { id: 'yoroshii', photo: true, special: 'もうよろしいですわ', note: '江原部長日記51。お昼が終わると眠くなり、家で寝たいから2050年の未来に「もう、よろしいですわ」と言って帰ってしまいました。' },
  ];

  // エンディングで流れる写真
  const ENDING = [
    { img: 'end_thumbs', cap: '2021　プレゼン発表の日' },
    { img: 'end_towerdon', cap: '東京スカイツリーのタワー丼' },
    { img: 'mic', cap: '忘年会の2次会カラオケ' },
    { img: 'end_helmet', cap: '現場で頑張るエバチョン' },
    { img: 'maguro_don', cap: '大好きマグロ' },
    { img: 'wanko', cap: 'わんこそば' },
    { img: 'end_laugh', cap: 'エバとお昼' },
    { img: 'end_nigaoe', cap: '東京タワーで描いてもらった似顔絵' },
  ];

  return { ITEMS, STAGES, PRAISE, PRAISE_TEXT_ONLY, RANKS, CARDS, ENDING };
})();
