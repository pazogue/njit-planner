const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#07101f"/>
      <stop offset="0.42" stop-color="#162743"/>
      <stop offset="0.68" stop-color="#3a4056"/>
      <stop offset="0.82" stop-color="#9a625d"/>
      <stop offset="1" stop-color="#142130"/>
    </linearGradient>
    <radialGradient id="sun" cx="52%" cy="61%" r="38%">
      <stop offset="0" stop-color="#ffd7a3" stop-opacity=".55"/>
      <stop offset=".25" stop-color="#d99f80" stop-opacity=".22"/>
      <stop offset=".62" stop-color="#6684ba" stop-opacity=".08"/>
      <stop offset="1" stop-color="#6684ba" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="far" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#31445f"/>
      <stop offset="1" stop-color="#172437"/>
    </linearGradient>
    <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c2b3c"/>
      <stop offset="1" stop-color="#0e1723"/>
    </linearGradient>
    <linearGradient id="near" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#101923"/>
      <stop offset="1" stop-color="#070c12"/>
    </linearGradient>
    <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7f8fa7" stop-opacity=".44"/>
      <stop offset=".5" stop-color="#354b67" stop-opacity=".25"/>
      <stop offset="1" stop-color="#07101a" stop-opacity="0"/>
    </linearGradient>
    <filter id="blur24"><feGaussianBlur stdDeviation="24"/></filter>
    <filter id="blur42"><feGaussianBlur stdDeviation="42"/></filter>
  </defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <rect width="1600" height="900" fill="url(#sun)"/>
  <g opacity=".7" fill="#cbd7ef">
    <circle cx="105" cy="88" r="1.2"/><circle cx="190" cy="135" r=".8"/><circle cx="285" cy="72" r="1"/><circle cx="390" cy="118" r=".7"/><circle cx="510" cy="54" r="1"/><circle cx="628" cy="102" r=".8"/><circle cx="792" cy="66" r="1.2"/><circle cx="925" cy="112" r=".7"/><circle cx="1060" cy="76" r="1"/><circle cx="1195" cy="128" r=".8"/><circle cx="1330" cy="62" r="1.1"/><circle cx="1468" cy="102" r=".8"/>
  </g>
  <path d="M0 555 L95 505 L172 530 L278 425 L360 500 L438 398 L533 492 L648 350 L742 468 L830 386 L944 478 L1042 365 L1143 468 L1260 390 L1370 500 L1484 430 L1600 500 L1600 900 L0 900 Z" fill="url(#far)" opacity=".66"/>
  <path d="M0 610 L118 520 L205 585 L326 458 L430 602 L548 490 L680 620 L804 470 L936 600 L1060 495 L1190 620 L1322 512 L1450 606 L1600 545 L1600 900 L0 900 Z" fill="url(#mid)" opacity=".9"/>
  <path d="M0 690 L126 618 L244 700 L370 575 L486 710 L620 598 L756 732 L882 588 L1018 725 L1156 610 L1288 720 L1400 624 L1512 700 L1600 662 L1600 900 L0 900 Z" fill="url(#near)"/>
  <path d="M645 620 C720 592 795 580 860 590 C935 603 998 640 1075 683 C996 699 902 718 816 734 C744 716 684 678 645 620 Z" fill="url(#lake)" opacity=".9"/>
  <ellipse cx="810" cy="600" rx="380" ry="72" fill="#b6c4d7" opacity=".09" filter="url(#blur24)"/>
  <ellipse cx="630" cy="675" rx="250" ry="52" fill="#d0d8e2" opacity=".08" filter="url(#blur24)"/>
  <ellipse cx="1110" cy="640" rx="300" ry="58" fill="#b9c7db" opacity=".08" filter="url(#blur42)"/>
  <g fill="#070b11" opacity=".82">
    <path d="M90 900 l30-160 30 160z M130 900 l42-205 42 205z M195 900 l30-145 30 145z M1330 900 l36-190 36 190z M1395 900 l48-235 48 235z M1490 900 l32-165 32 165z"/>
  </g>
  <rect y="780" width="1600" height="120" fill="#050811" opacity=".38"/>
</svg>`;

export function GET() {
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
