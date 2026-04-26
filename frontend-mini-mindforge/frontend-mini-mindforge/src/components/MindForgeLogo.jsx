// Shared MindForge logo — brain + circuit + book + lightbulb
// Use: <MindForgeLogo size={40} /> for icon only
//      <MindForgeLogoFull size={40} /> for icon + wordmark

export function MindForgeLogo({ size = 40 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mf-brain" x1="0" y1="0" x2="60" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8"/>
          <stop offset="100%" stopColor="#6366f1"/>
        </linearGradient>
        <linearGradient id="mf-circuit" x1="50" y1="0" x2="100" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#a855f7"/>
        </linearGradient>
        <linearGradient id="mf-book" x1="10" y1="65" x2="90" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8"/>
          <stop offset="100%" stopColor="#6366f1"/>
        </linearGradient>
        <linearGradient id="mf-bulb" x1="40" y1="20" x2="60" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
        <linearGradient id="mf-bolt" x1="47" y1="28" x2="53" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f0abfc"/>
          <stop offset="100%" stopColor="#e879f9"/>
        </linearGradient>
      </defs>

      {/* ── OPEN BOOK ── */}
      {/* Left page */}
      <path d="M50 88 L12 76 L12 62 Q30 68 50 65 Z"
        fill="none" stroke="url(#mf-book)" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Right page */}
      <path d="M50 88 L88 76 L88 62 Q70 68 50 65 Z"
        fill="none" stroke="url(#mf-book)" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Book spine */}
      <line x1="50" y1="65" x2="50" y2="88" stroke="url(#mf-book)" strokeWidth="2" strokeLinecap="round"/>
      {/* Left page lines */}
      <line x1="20" y1="72" x2="44" y2="69" stroke="url(#mf-book)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
      <line x1="20" y1="76" x2="44" y2="73" stroke="url(#mf-book)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
      {/* Right page lines */}
      <line x1="56" y1="69" x2="80" y2="72" stroke="url(#mf-book)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
      <line x1="56" y1="73" x2="80" y2="76" stroke="url(#mf-book)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>

      {/* ── BRAIN (left hemisphere) ── */}
      <path d="M48 62 Q36 62 28 55 Q18 52 14 42 Q8 32 13 22 Q17 14 26 12 Q22 4 32 3 Q42 2 44 12 Q46 8 48 10 L48 62Z"
        fill="none" stroke="url(#mf-brain)" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      {/* Brain folds */}
      <path d="M22 38 Q16 34 19 26" stroke="url(#mf-brain)" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M30 50 Q20 50 22 38" stroke="url(#mf-brain)" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M38 56 Q28 58 30 50" stroke="url(#mf-brain)" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M24 20 Q30 13 38 20" stroke="url(#mf-brain)" strokeWidth="2" strokeLinecap="round" fill="none"/>

      {/* ── CIRCUIT (right side) ── */}
      {/* Vertical stem */}
      <line x1="52" y1="62" x2="52" y2="10" stroke="url(#mf-circuit)" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Branch 1 — top right */}
      <polyline points="52,14 68,14 68,4" stroke="url(#mf-circuit)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="68" cy="3" r="3" fill="none" stroke="url(#mf-circuit)" strokeWidth="2"/>
      {/* Branch 2 — mid right */}
      <polyline points="52,26 72,20 80,10" stroke="url(#mf-circuit)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="81" cy="9" r="3" fill="none" stroke="url(#mf-circuit)" strokeWidth="2"/>
      {/* Branch 3 — right */}
      <polyline points="52,38 82,32" stroke="url(#mf-circuit)" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      <circle cx="84" cy="32" r="3" fill="none" stroke="url(#mf-circuit)" strokeWidth="2"/>
      {/* Branch 4 — lower right */}
      <polyline points="52,50 74,50 74,38" stroke="url(#mf-circuit)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="74" cy="36" r="3" fill="none" stroke="url(#mf-circuit)" strokeWidth="2"/>

      {/* ── LIGHTBULB ── */}
      {/* Bulb glass */}
      <path d="M50 18 C43 18 37 24 37 31 C37 36 40 40 42 43 L58 43 C60 40 63 36 63 31 C63 24 57 18 50 18Z"
        fill="none" stroke="url(#mf-bulb)" strokeWidth="2.5"/>
      {/* Bulb base lines */}
      <line x1="42" y1="46" x2="58" y2="46" stroke="url(#mf-bulb)" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="44" y1="50" x2="56" y2="50" stroke="url(#mf-bulb)" strokeWidth="2" strokeLinecap="round"/>
      {/* Rays */}
      <line x1="50" y1="13" x2="50" y2="8"  stroke="url(#mf-bulb)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="36" y1="18" x2="32" y2="14" stroke="url(#mf-bulb)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="64" y1="18" x2="68" y2="14" stroke="url(#mf-bulb)" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Lightning bolt inside bulb */}
      <path d="M52 24 L46 34 L51 34 L48 44 L56 31 L51 31 Z" fill="url(#mf-bolt)"/>
    </svg>
  );
}

export function MindForgeLogoFull({ size = 40, textSize }) {
  const ts = textSize || Math.round(size * 0.55);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.2) + 'px', textDecoration: 'none' }}>
      <MindForgeLogo size={size} />
      <span style={{
        fontSize: ts + 'px',
        fontWeight: 900,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      }}>
        <span style={{ color: 'currentColor' }}>Mind</span>
        <span style={{
          background: 'linear-gradient(135deg,#6366f1,#a855f7,#38bdf8)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>Forge</span>
      </span>
    </span>
  );
}
