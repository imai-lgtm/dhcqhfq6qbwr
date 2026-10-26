// 背景：出張帰りの居酒屋（SVG）。縦長でも横長でも描けるように幅と高さを受け取る
window.BG = (() => {
  function izakaya(W, H) {
    const G = H - (W > H ? 120 : 170);   // カウンターの高さ
    let wall = '';
    for (let x = 0; x < W; x += 30) wall += `<rect x="${x}" y="0" width="26" height="${G}" fill="${(x / 30) % 2 ? '#7a4a2a' : '#74452680'}"/><rect x="${x + 26}" y="0" width="4" height="${G}" fill="#5a3218"/>`;
    // 壁のお品書き（短冊）
    const menu = ['やきとり', 'えだまめ', 'ほっけ', 'からあげ', 'おでん', 'たこやき', 'いかやき', 'ひやしとまと', 'だしまき', 'くしかつ'];
    let tanzaku = '';
    const n = Math.floor((W - 40) / 46);
    for (let i = 0; i < n; i++) {
      const x = 24 + i * 46, txt = menu[i % menu.length];
      tanzaku += `<g transform="translate(${x} 38) rotate(${(i % 3 - 1) * 1.5})"><rect width="34" height="150" fill="#fbf3dc" stroke="#c9b48a" stroke-width="2"/>`;
      tanzaku += `<text x="17" y="16" writing-mode="tb" font-family="Boku, serif" font-size="19" fill="#2b1d14" letter-spacing="1">${txt}</text><rect x="3" y="132" width="28" height="14" fill="#d8361b"/></g>`;
    }
    const lantern = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="-34" width="6" height="16" fill="#2b1d14"/><ellipse rx="30" ry="42" fill="#e8402a" stroke="#2b1d14" stroke-width="4"/>${[-26, -13, 0, 13, 26].map(yy => `<path d="M-28 ${yy} Q0 ${yy + 6} 28 ${yy}" stroke="#a82313" stroke-width="2" fill="none"/>`).join('')}<text y="10" text-anchor="middle" font-family="Boku, serif" font-size="30" fill="#fff">酒</text><rect x="-16" y="-46" width="32" height="8" rx="2" fill="#2b1d14"/><rect x="-16" y="38" width="32" height="8" rx="2" fill="#2b1d14"/></g>`;
    const bottle = (x) => `<g transform="translate(${x} ${G - 6})"><rect x="-11" y="-70" width="22" height="70" rx="6" fill="#3d6b3a" stroke="#2b1d14" stroke-width="3"/><rect x="-5" y="-92" width="10" height="24" fill="#3d6b3a" stroke="#2b1d14" stroke-width="3"/><rect x="-9" y="-50" width="18" height="24" fill="#fbf3dc"/></g>`;
    const mug = (x) => `<g transform="translate(${x} ${G + 40})"><rect x="-18" y="-46" width="36" height="46" rx="4" fill="#ffc63a" stroke="#2b1d14" stroke-width="3"/><path d="M-20 -46 q0 -16 20 -14 q20 -2 20 14 z" fill="#fff" stroke="#2b1d14" stroke-width="3"/><path d="M18 -36 h8 a6 6 0 0 1 0 22 h-8" fill="none" stroke="#2b1d14" stroke-width="4"/></g>`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="ywarm" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#ffd58a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd58a" stop-opacity="0"/></radialGradient>
      <linearGradient id="yc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4e"/><stop offset="1" stop-color="#8a5226"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="#5a3218"/>${wall}
      <rect y="${G - 120}" width="${W}" height="14" fill="#4a2810"/>
      ${tanzaku}
      <rect width="${W}" height="${H}" fill="url(#ywarm)"/>
      ${lantern(40, W > H ? 300 : 330, .9)}${lantern(W - 40, W > H ? 300 : 330, .9)}
      ${bottle(W - 120)}${bottle(W - 90)}${bottle(110)}
      <rect y="${G}" width="${W}" height="${H - G}" fill="url(#yc)"/><rect y="${G}" width="${W}" height="10" fill="#e0a868"/>
      ${mug(70)}${mug(W - 70)}
    </svg>`;
  }
  return { izakaya };
})();
