// ステージの背景（SVG）。縦長（スマホ 390×844）でも横長（PC 1280×720）でも描けるように、幅と高さを受け取る
window.BG = (() => {
  const wrap = (W, H, defs, body) =>
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${body}</svg>`;
  const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ground = (W, H) => H - (W > H ? 110 : 144);   // 床・地面の高さ

  // 1 朝の現場
  function genba(W, H) {
    const G = ground(W, H), top = Math.round(H * .3);
    let city = '';
    for (let i = 0, x = 0; x < W; i++, x += 34 + (i % 3) * 4) {
      const h = 110 + ((i * 53) % 90), y = top + 80 - h;
      city += `<rect x="${x}" y="${y}" width="${30 + (i % 3) * 6}" height="${h}" fill="#a9c3d8"/>`;
      for (let wy = y + 12; wy < top + 70; wy += 16) city += `<rect x="${x + 6}" y="${wy}" width="5" height="7" fill="#c9dbea"/><rect x="${x + 17}" y="${wy}" width="5" height="7" fill="#c9dbea"/>`;
    }
    const bx = 40, bw = W - 80;
    let wins = '';
    for (let r = 0; top + 32 + r * 62 < G - 40; r++) for (let c = 0; 18 + c * 62 < bw - 30; c++) wins += `<rect x="${bx + 18 + c * 62}" y="${top + 32 + r * 62}" width="34" height="38" fill="#9fb6c7" opacity=".55"/>`;
    let scaffold = '';
    for (let x = bx - 10; x <= bx + bw + 10; x += 55) scaffold += `<rect x="${x}" y="${top}" width="7" height="${G - top}" fill="#e8762b"/>`;
    for (let y = top + 20; y < G - 10; y += 62) scaffold += `<rect x="${bx - 16}" y="${y}" width="${bw + 32}" height="6" fill="#d9661f"/><rect x="${bx - 16}" y="${y + 6}" width="${bw + 32}" height="3" fill="#b8521a" opacity=".5"/>`;
    let fence = '';
    for (let x = -20; x < W + 40; x += 40) fence += `<polygon points="${x},${G + 20} ${x + 20},${G + 20} ${x + 50},${G + 80} ${x + 30},${G + 80}" fill="#2b2b2b"/>`;
    const cone = (x, s) => `<g transform="translate(${x} ${G + 90}) scale(${s})"><polygon points="-14,0 14,0 5,-46 -5,-46" fill="#ff6a1f" stroke="#2b1d14" stroke-width="3" stroke-linejoin="round"/><rect x="-11" y="-24" width="22" height="7" fill="#fff"/><rect x="-20" y="-2" width="40" height="8" rx="2" fill="#2b2b2b"/></g>`;
    return wrap(W, H,
      `<linearGradient id="g1sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd0ff"/><stop offset=".55" stop-color="#d8f0ff"/><stop offset="1" stop-color="#fff6e3"/></linearGradient>
       <linearGradient id="g1gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9d2c4"/><stop offset="1" stop-color="#b9b0a0"/></linearGradient>
       <radialGradient id="g1sun"><stop offset="0" stop-color="#fff9d6"/><stop offset="1" stop-color="#fff9d6" stop-opacity="0"/></radialGradient>`,
      `<rect width="${W}" height="${H}" fill="url(#g1sky)"/>
       <circle cx="${W - 70}" cy="110" r="110" fill="url(#g1sun)"/><circle cx="${W - 70}" cy="110" r="34" fill="#fff4b8"/>
       <g opacity=".9"><ellipse cx="80" cy="140" rx="46" ry="14" fill="#fff"/><ellipse cx="110" cy="130" rx="30" ry="14" fill="#fff"/><ellipse cx="${W * .62}" cy="${top - 60}" rx="40" ry="11" fill="#fff"/></g>
       ${city}
       <rect x="${bx}" y="${top}" width="${bw}" height="${G - top}" fill="#e9e3d6"/>${wins}${scaffold}
       <rect y="${G - 20}" width="${W}" height="${H - G + 20}" fill="url(#g1gr)"/>
       <rect y="${G + 20}" width="${W}" height="60" fill="#ffd21f"/>${fence}<rect y="${G + 20}" width="${W}" height="4" fill="#2b1d14" opacity=".4"/><rect y="${G + 76}" width="${W}" height="4" fill="#2b1d14" opacity=".4"/>
       <g transform="translate(${W - 45} ${G - 45}) scale(.8)"><circle r="38" fill="#a8783f" stroke="#2b1d14" stroke-width="4"/><circle r="27" fill="#3a6fb0"/><circle r="11" fill="#7a5530" stroke="#2b1d14" stroke-width="3"/></g>
       ${cone(40, 1.1)}${cone(90, .9)}`);
  }

  // 2 お昼ごはん（食堂）
  function shokudo(W, H) {
    const G = ground(W, H), nh = W > H ? 118 : 150;
    let slats = '';
    for (let x = 0; x < W; x += 26) slats += `<rect x="${x}" y="0" width="22" height="${H}" fill="${x % 52 ? '#c98d55' : '#c3864e'}"/><rect x="${x + 22}" y="0" width="4" height="${H}" fill="#9a6435"/>`;
    const lantern = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-3" y="-30" width="6" height="16" fill="#2b1d14"/><ellipse rx="26" ry="36" fill="#e8402a" stroke="#2b1d14" stroke-width="4"/>${[-22, -11, 0, 11, 22].map(yy => `<path d="M-24 ${yy} Q0 ${yy + 5} 24 ${yy}" stroke="#a82313" stroke-width="2" fill="none"/>`).join('')}<rect x="-14" y="-40" width="28" height="8" rx="2" fill="#2b1d14"/><rect x="-14" y="32" width="28" height="8" rx="2" fill="#2b1d14"/><ellipse rx="10" ry="22" fill="#fff" opacity=".18"/></g>`;
    let noren = '';
    for (let x = 0; x < W; x += 98) {
      noren += `<path d="M${x + 2} 0 H${x + 96} V${nh} Q${x + 49} ${nh + 12} ${x + 2} ${nh} Z" fill="#20345a" stroke="#14213b" stroke-width="3"/>`;
      noren += `<path d="M${x + 12} ${nh - 30} q12 -14 24 0 t24 0 t24 0 t24 0" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`;
    }
    noren += `<text x="${W / 2}" y="${nh * .6}" text-anchor="middle" font-family="Boku, serif" font-size="${nh * .42}" fill="#fff">めし処</text>`;
    const ly = W > H ? 230 : 250;
    return wrap(W, H,
      `<radialGradient id="g2l" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#fff2c9" stop-opacity=".75"/><stop offset="1" stop-color="#fff2c9" stop-opacity="0"/></radialGradient>
       <linearGradient id="g2c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5126"/><stop offset="1" stop-color="#5c3417"/></linearGradient>`,
      `${slats}<rect width="${W}" height="${H}" fill="url(#g2l)"/>
       ${noren}${lantern(36, ly)}${lantern(W - 36, ly)}${W > H ? lantern(150, ly + 40) + lantern(W - 150, ly + 40) : ''}
       <rect y="${G}" width="${W}" height="${H - G}" fill="url(#g2c)"/><rect y="${G}" width="${W}" height="14" fill="#a8693a"/>
       <g opacity=".85"><ellipse cx="60" cy="${G + 60}" rx="40" ry="10" fill="#3d2210"/><ellipse cx="${W - 60}" cy="${G + 70}" rx="40" ry="10" fill="#3d2210"/></g>`);
  }

  // 3 午後（事務所・眠い）
  function jimusho(W, H) {
    const G = ground(W, H) - 10;
    const ww = W > H ? 560 : 270, wh = W > H ? 300 : 320, wx = W / 2 - ww / 2, wy = W > H ? 150 : 120;
    let blinds = '';
    for (let y = wy; y < wy + wh; y += 14) blinds += `<rect x="${wx}" y="${y}" width="${ww}" height="9" fill="#f3efe6"/>`;
    return wrap(W, H,
      `<linearGradient id="g3w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4ead7"/><stop offset="1" stop-color="#e3d3b6"/></linearGradient>
       <linearGradient id="g3b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0" stop-opacity=".75"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></linearGradient>`,
      `<rect width="${W}" height="${H}" fill="url(#g3w)"/>
       <rect x="${wx - 8}" y="${wy - 8}" width="${ww + 16}" height="${wh + 16}" rx="6" fill="#bfe3f5" stroke="#9c8a6a" stroke-width="8"/>
       <rect x="${wx}" y="${wy}" width="${ww}" height="${wh * .6}" fill="#ffd89a" opacity=".6"/>
       ${blinds}
       <polygon points="${wx},${wy + wh} ${wx + ww},${wy + wh} ${W},${H} 0,${H}" fill="url(#g3b)"/>
       <g transform="translate(${W - 60} 70)"><circle r="30" fill="#fff" stroke="#2b1d14" stroke-width="5"/><line x1="0" y1="0" x2="0" y2="-18" stroke="#2b1d14" stroke-width="4" stroke-linecap="round"/><line x1="0" y1="0" x2="13" y2="6" stroke="#2b1d14" stroke-width="4" stroke-linecap="round"/></g>
       <rect y="${G}" width="${W}" height="${H - G}" fill="#b38a5a"/><rect y="${G}" width="${W}" height="12" fill="#cfa575"/>
       <g transform="translate(40 ${G - 50})"><rect x="-22" y="0" width="44" height="50" rx="6" fill="#c46a3b" stroke="#2b1d14" stroke-width="4"/><path d="M0 0 C-30 -40 -10 -70 0 -40 C10 -80 40 -40 0 0" fill="#5fae4f" stroke="#2b1d14" stroke-width="4"/></g>`);
  }

  // 4 夜の打ち上げ（難波）
  function yoru(W, H) {
    const G = ground(W, H), rnd = rng(7), base = G - 140;
    let wins = '', bokeh = '';
    for (let i = 0, x = -6; x < W; i++, x += 46) {
      const h = 200 + ((i * 71) % 160);
      wins += `<rect x="${x}" y="${base - h}" width="42" height="${h}" fill="#1c1840"/>`;
      for (let y = base - h + 10; y < base - 10; y += 18) for (let c = 0; c < 3; c++) if (rnd() > .45) wins += `<rect x="${x + 6 + c * 12}" y="${y}" width="7" height="9" fill="${rnd() > .5 ? '#ffd76a' : '#7ad3ff'}" opacity=".85"/>`;
    }
    for (let i = 0; i < W / 20; i++) bokeh += `<circle cx="${rnd() * W}" cy="${rnd() * G}" r="${6 + rnd() * 22}" fill="${['#ff4fa3', '#4fd8ff', '#ffd34f', '#9a6bff'][i % 4]}" opacity="${.12 + rnd() * .2}"/>`;
    const neon = (x, y, txt, col, size) => `<g transform="translate(${x} ${y})"><rect x="-6" y="${-size}" width="${txt.length * size + 12}" height="${size * 1.3}" rx="10" fill="#120f2a" stroke="${col}" stroke-width="3" filter="url(#g4glow)"/><text x="${txt.length * size / 2}" y="${size * .12}" text-anchor="middle" font-family="Dela, sans-serif" font-size="${size}" fill="${col}" filter="url(#g4glow)">${txt}</text></g>`;
    let ball = '';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) ball += `<rect x="${-30 + c * 10}" y="${-30 + r * 12}" width="9" height="11" fill="${(r + c) % 2 ? '#d7dbe8' : '#9aa3bd'}"/>`;
    const mx = W / 2;
    return wrap(W, H,
      `<linearGradient id="g4s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0a24"/><stop offset=".7" stop-color="#2a1550"/><stop offset="1" stop-color="#4a1d55"/></linearGradient>
       <filter id="g4glow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
       <clipPath id="g4c"><circle r="32"/></clipPath>`,
      `<rect width="${W}" height="${H}" fill="url(#g4s)"/>${bokeh}${wins}
       ${neon(22, 150, 'スナック', '#ff5fb4', 30)}${neon(W - 176, 230, 'カラオケ', '#5fe3ff', 30)}
       <line x1="${mx}" y1="0" x2="${mx}" y2="40" stroke="#888" stroke-width="3"/>
       <g transform="translate(${mx} 74)"><g clip-path="url(#g4c)">${ball}</g><circle r="32" fill="none" stroke="#2b1d14" stroke-width="3"/></g>
       ${[[-40, 40], [40, 40], [-60, 0], [60, 0]].map(([dx, dy]) => `<path d="M${mx + dx} ${74 + dy} l4 -10 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 z" fill="#fff" opacity=".9"/>`).join('')}
       <rect y="${G}" width="${W}" height="${H - G}" fill="#1b0f2a"/><rect y="${G}" width="${W}" height="8" fill="#ff5fb4" opacity=".6" filter="url(#g4glow)"/>`);
  }

  // 5 エバの夢（豪華ホテル）
  function hotel(W, H) {
    const G = ground(W, H);
    let damask = '';
    for (let y = 0; y < H; y += 70) for (let x = (y / 70) % 2 ? 35 : 0; x < W + 35; x += 70) damask += `<path d="M${x} ${y - 16} C${x + 12} ${y - 8} ${x + 12} ${y + 8} ${x} ${y + 16} C${x - 12} ${y + 8} ${x - 12} ${y - 8} ${x} ${y - 16} Z" fill="#e8c46a" opacity=".12"/>`;
    const ch = G;
    const curtain = (flip) => `<g transform="${flip ? `translate(${W} 0) scale(-1 1)` : ''}"><path d="M0 0 H86 C70 ${ch * .3} 96 ${ch * .6} 60 ${ch * .92} C40 ${ch} 20 ${ch} 0 ${ch} Z" fill="#8e1732"/>${[16, 36, 56].map(x => `<path d="M${x} 0 C${x - 8} ${ch * .36} ${x + 8} ${ch * .65} ${x - 6} ${ch * .98}" stroke="#6b0f24" stroke-width="7" fill="none"/>`).join('')}<path d="M0 0 H92 V22 H0 Z" fill="#d9a93f"/><circle cx="66" cy="${ch * .6}" r="10" fill="#d9a93f" stroke="#2b1d14" stroke-width="3"/></g>`;
    let chand = `<g transform="translate(${W / 2} 40)"><line x1="0" y1="-40" x2="0" y2="10" stroke="#c99b36" stroke-width="4"/>`;
    for (let i = -3; i <= 3; i++) chand += `<path d="M0 12 Q${i * 22} 40 ${i * 30} 26" stroke="#d9a93f" stroke-width="4" fill="none"/><circle cx="${i * 30}" cy="24" r="6" fill="#fff6c8"/><path d="M${i * 30} 30 l-4 14 h8 z" fill="#bfe3ff" opacity=".8"/>`;
    chand += '<circle r="14" cy="14" fill="#e8c46a" stroke="#2b1d14" stroke-width="3"/></g>';
    const ww = W > H ? 520 : 210, wh = W > H ? 220 : 160, wx = W / 2 - ww / 2, wy = 150;
    let city = '';
    for (let x = wx + 8, i = 0; x < wx + ww - 14; x += 17, i++) { const h = 40 + ((i * 37) % 70); city += `<rect x="${x}" y="${wy + wh - h}" width="14" height="${h}" fill="#241a45"/><rect x="${x + 4}" y="${wy + wh - h + 8}" width="3" height="4" fill="#ffd76a"/>`; }
    return wrap(W, H,
      `<linearGradient id="g5w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1240"/><stop offset="1" stop-color="#5e1a3c"/></linearGradient>
       <linearGradient id="g5n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1438"/><stop offset="1" stop-color="#3b2a6b"/></linearGradient>
       <radialGradient id="g5g" cx=".5" cy=".1" r=".7"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".45"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>`,
      `<rect width="${W}" height="${H}" fill="url(#g5w)"/>${damask}
       <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="4" fill="url(#g5n)" stroke="#d9a93f" stroke-width="6"/>${city}<line x1="${W / 2}" y1="${wy}" x2="${W / 2}" y2="${wy + wh}" stroke="#d9a93f" stroke-width="5"/>
       <rect width="${W}" height="${H}" fill="url(#g5g)"/>
       ${curtain(false)}${curtain(true)}${chand}
       <rect y="${G}" width="${W}" height="${H - G}" fill="#4a1630"/>${Array.from({ length: Math.ceil(W / 40) }, (_, i) => `<rect x="${i * 40}" y="${G}" width="20" height="${H - G}" fill="#5a1d3a"/>`).join('')}<rect y="${G}" width="${W}" height="8" fill="#d9a93f"/>`);
  }

  return { 1: genba, 2: shokudo, 3: jimusho, 4: yoru, 5: hotel };
})();
