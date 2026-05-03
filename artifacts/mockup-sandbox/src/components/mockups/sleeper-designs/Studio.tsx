export function Studio() {
  const tokens = {
    bg: '#f5f0e8',
    surface: '#faf7f2',
    border: '#e2d9cc',
    text: '#1a1612',
    dim: '#8a7d6e',
    accent: '#c4622d',
    accentLight: '#f0e0d6',
    sleeper: '#5c6bc0',
    sleeperDim: '#3f51b5',
    sleeperLight: '#e8eaf6',
  };

  const slides = [
    { n: 1, active: true },
    { n: 2, active: false },
    { n: 3, active: false },
    { n: 4, active: false },
    { n: 5, active: false },
    { n: 6, active: false },
  ];
  const sleepers = [
    { n: 'S1', code: 'COMP' },
    { n: 'S2', code: 'ROI' },
    { n: 'S3', code: 'TECH' },
  ];

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: tokens.bg, color: tokens.text, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Token Reference Panel */}
      <div style={{ background: tokens.surface, borderBottom: `1px solid ${tokens.border}`, padding: '7px 16px', display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: tokens.dim, letterSpacing: 2, textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>Design Tokens · Studio</span>
        {[['--bg', tokens.bg], ['--surface', tokens.surface], ['--accent', tokens.accent], ['--sleeper', tokens.sleeper], ['--text', tokens.text], ['--dim', tokens.dim]].map(([name, val]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: val as string, border: `1px solid ${tokens.border}` }} />
            <span style={{ fontSize: 8, color: tokens.dim, fontFamily: "'Space Mono', monospace" }}>{name}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 8, color: tokens.dim, fontFamily: "'Space Mono', monospace" }}>Playfair Display + Inter</div>
      </div>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: `1px solid ${tokens.border}`, background: tokens.surface, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 17, letterSpacing: -0.3, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 6, height: 6, background: tokens.accent, borderRadius: '50%' }} />
          Sleeper Slides
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontFamily: "'Space Mono', monospace" }}>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: tokens.dim, padding: '3px 8px', border: `1px solid ${tokens.border}`, borderRadius: 3, background: tokens.bg }}>EDIT</div>
          <button style={{ fontFamily: 'inherit', fontSize: 10, padding: '5px 12px', border: `1px solid ${tokens.border}`, background: tokens.surface, color: tokens.dim, borderRadius: 4, cursor: 'pointer' }}>+ Slide</button>
          <button style={{ fontFamily: 'inherit', fontSize: 10, padding: '5px 12px', border: `1px solid ${tokens.sleeperDim}`, background: tokens.sleeperLight, color: tokens.sleeper, borderRadius: 4, cursor: 'pointer' }}>+ Sleeper</button>
          <button style={{ fontFamily: 'inherit', fontSize: 10, padding: '5px 12px', background: tokens.accent, border: `1px solid ${tokens.accent}`, color: '#fff', borderRadius: 4, cursor: 'pointer' }}>Present</button>
        </div>
      </div>

      {/* Element Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 20px', borderBottom: `1px solid ${tokens.border}`, background: tokens.surface, flexShrink: 0, fontFamily: "'Space Mono', monospace" }}>
        {['⊞ Grid', 'T Text', '⬜ Image', '▶ Video'].map(label => (
          <button key={label} style={{ fontFamily: 'inherit', fontSize: 9, padding: '3px 8px', border: `1px solid ${tokens.border}`, background: tokens.bg, color: tokens.dim, borderRadius: 3, cursor: 'pointer' }}>{label}</button>
        ))}
        <div style={{ width: 1, height: 16, background: tokens.border, margin: '0 4px' }} />
        <span style={{ fontSize: 8, color: tokens.dim }}>Select element + Del to remove</span>
      </div>

      {/* Main */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 200, borderRight: `1px solid ${tokens.border}`, background: tokens.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${tokens.border}` }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 2, color: tokens.dim, fontFamily: "'Space Mono', monospace" }}>Main Queue</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 10px', overflowY: 'auto' }}>
            {slides.map(s => (
              <div key={s.n} style={{ aspectRatio: '16/9', background: tokens.bg, border: `2px solid ${s.active ? tokens.accent : tokens.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: s.active ? `0 1px 8px rgba(196,98,45,0.15)` : 'none', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: tokens.dim, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{s.n}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '8px 12px', borderTop: `1px solid ${tokens.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 2, color: tokens.dim, fontFamily: "'Space Mono', monospace" }}>Sleeper Queue</div>
            <span style={{ fontSize: 7, color: tokens.sleeper, fontFamily: "'Space Mono', monospace" }}>HIDDEN</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '0 10px 8px' }}>
            {sleepers.map(s => (
              <div key={s.n} style={{ aspectRatio: '16/9', background: tokens.sleeperLight, border: `2px dashed ${tokens.sleeperDim}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: tokens.dim, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{s.n}</span>
                <div style={{ position: 'absolute', top: 2, right: 2, fontSize: 7, background: tokens.sleeper, color: '#fff', padding: '1px 3px', borderRadius: 2, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{s.code}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#ede8df' }}>
          <div style={{ width: '100%', maxWidth: 720, aspectRatio: '16/9', background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 700, marginBottom: 12, lineHeight: 1.2, color: tokens.text }}>Our Vision</div>
              <div style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: tokens.dim, maxWidth: 380, margin: '0 auto', lineHeight: 1.7 }}>Transforming how teams share ideas through intelligent presentations.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px', borderTop: `1px solid ${tokens.border}`, background: tokens.surface, flexShrink: 0, fontFamily: "'Space Mono', monospace" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {['←', '→'].map((a, i) => <button key={i} style={{ width: 28, height: 28, border: `1px solid ${tokens.border}`, background: tokens.bg, color: tokens.dim, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>{a}</button>)}
          <span style={{ fontSize: 10, color: tokens.dim, minWidth: 50, textAlign: 'center' }}>1 / 6</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: tokens.dim }}>Code</span>
          <div style={{ width: 90, padding: '4px 8px', background: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: 4, fontSize: 11, color: tokens.dim, textAlign: 'center', letterSpacing: 3 }}>···</div>
        </div>
        <div style={{ fontSize: 8, color: tokens.dim }}>← → navigate · / code · Esc return</div>
      </div>
    </div>
  );
}
