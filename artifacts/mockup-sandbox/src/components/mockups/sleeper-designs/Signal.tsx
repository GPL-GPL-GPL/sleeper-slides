export function Signal() {
  const tokens = {
    bg: '#000000',
    surface: '#080808',
    border: '#1a1a1a',
    borderBright: '#2a2a2a',
    text: '#ffffff',
    dim: '#555555',
    accent: '#00ffcc',
    accentDim: '#00cc9e',
    sleeper: '#ff3366',
    sleeperDim: '#cc1144',
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
    <div style={{ fontFamily: "'Space Mono', monospace", background: tokens.bg, color: tokens.text, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Token Reference Panel */}
      <div style={{ background: tokens.surface, borderBottom: `1px solid ${tokens.border}`, padding: '7px 16px', display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: tokens.accent, letterSpacing: 3, textTransform: 'uppercase' }}>Design Tokens · Signal</span>
        {[['--bg', tokens.bg], ['--surface', tokens.surface], ['--accent', tokens.accent], ['--sleeper', tokens.sleeper], ['--text', tokens.text], ['--dim', tokens.dim]].map(([name, val]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 0, background: val as string, border: `1px solid ${tokens.border}`, outline: val === '#000000' ? `1px solid ${tokens.border}` : 'none' }} />
            <span style={{ fontSize: 8, color: tokens.dim }}>{name}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 8, color: tokens.dim }}>Space Mono only</div>
      </div>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: `1px solid ${tokens.border}`, background: tokens.surface, flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 3, display: 'flex', alignItems: 'center', gap: 10, textTransform: 'uppercase' }}>
          <div style={{ width: 6, height: 6, background: tokens.accent }} />
          Sleeper Slides
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: tokens.accent, padding: '3px 8px', border: `1px solid ${tokens.accent}`, borderRadius: 0 }}>EDIT</div>
          <button style={{ fontFamily: 'inherit', fontSize: 9, padding: '5px 12px', border: `1px solid ${tokens.borderBright}`, background: 'transparent', color: tokens.dim, borderRadius: 0, cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase' }}>+ Slide</button>
          <button style={{ fontFamily: 'inherit', fontSize: 9, padding: '5px 12px', border: `1px solid ${tokens.sleeper}`, background: 'transparent', color: tokens.sleeper, borderRadius: 0, cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase' }}>+ Sleeper</button>
          <button style={{ fontFamily: 'inherit', fontSize: 9, padding: '5px 12px', background: tokens.accent, border: `1px solid ${tokens.accent}`, color: '#000', borderRadius: 0, cursor: 'pointer', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Present</button>
        </div>
      </div>

      {/* Element Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 20px', borderBottom: `1px solid ${tokens.border}`, background: tokens.surface, flexShrink: 0 }}>
        {['⊞ Grid', 'T Text', '⬜ Image', '▶ Video'].map(label => (
          <button key={label} style={{ fontFamily: 'inherit', fontSize: 9, padding: '3px 8px', border: `1px solid ${tokens.border}`, background: 'transparent', color: tokens.dim, borderRadius: 0, cursor: 'pointer', letterSpacing: 1 }}>{label}</button>
        ))}
        <div style={{ width: 1, height: 16, background: tokens.border, margin: '0 6px' }} />
        <span style={{ fontSize: 8, color: tokens.dim, letterSpacing: 1 }}>Select + Del to remove</span>
      </div>

      {/* Main */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 200, borderRight: `1px solid ${tokens.border}`, background: tokens.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${tokens.border}` }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 3, color: tokens.dim }}>Main Queue</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 10px', overflowY: 'auto' }}>
            {slides.map(s => (
              <div key={s.n} style={{ aspectRatio: '16/9', background: tokens.bg, border: `1px solid ${s.active ? tokens.accent : tokens.border}`, borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: s.active ? `0 0 12px rgba(0,255,204,0.15)` : 'none', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: s.active ? tokens.accent : tokens.dim, fontWeight: 700 }}>{s.n}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '8px 12px', borderTop: `1px solid ${tokens.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 3, color: tokens.dim }}>Sleeper</div>
            <span style={{ fontSize: 7, color: tokens.sleeper, letterSpacing: 1 }}>HIDDEN</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 10px 6px' }}>
            {sleepers.map(s => (
              <div key={s.n} style={{ aspectRatio: '16/9', background: tokens.bg, border: `1px dashed ${tokens.sleeper}`, borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: tokens.dim, fontWeight: 700 }}>{s.n}</span>
                <div style={{ position: 'absolute', top: 2, right: 2, fontSize: 7, background: tokens.sleeper, color: '#000', padding: '1px 3px', fontWeight: 700, letterSpacing: 0.5 }}>{s.code}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#030303', position: 'relative' }}>
          {/* Scan line effect */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,204,0.01) 2px, rgba(0,255,204,0.01) 4px)', pointerEvents: 'none' }} />
          <div style={{ width: '100%', maxWidth: 720, aspectRatio: '16/9', background: tokens.bg, border: `1px solid ${tokens.borderBright}`, borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Corner accents */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTop: `2px solid ${tokens.accent}`, borderLeft: `2px solid ${tokens.accent}` }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTop: `2px solid ${tokens.accent}`, borderRight: `2px solid ${tokens.accent}` }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottom: `2px solid ${tokens.accent}`, borderLeft: `2px solid ${tokens.accent}` }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottom: `2px solid ${tokens.accent}`, borderRight: `2px solid ${tokens.accent}` }} />
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 11, color: tokens.accent, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>SLIDE 01/06</div>
              <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 12, letterSpacing: -1, lineHeight: 1.1 }}>OUR VISION</div>
              <div style={{ fontSize: 11, color: tokens.dim, maxWidth: 380, margin: '0 auto', lineHeight: 1.7, letterSpacing: 0.5 }}>Transforming how teams share ideas through intelligent presentations.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px', borderTop: `1px solid ${tokens.border}`, background: tokens.surface, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {['←', '→'].map((a, i) => <button key={i} style={{ width: 28, height: 28, border: `1px solid ${tokens.border}`, background: 'transparent', color: tokens.dim, borderRadius: 0, cursor: 'pointer', fontSize: 12 }}>{a}</button>)}
          <span style={{ fontSize: 10, color: tokens.dim, minWidth: 50, textAlign: 'center' }}>1 / 6</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: tokens.dim }}>Code</span>
          <div style={{ width: 90, padding: '4px 8px', background: tokens.bg, border: `1px solid ${tokens.borderBright}`, borderRadius: 0, fontSize: 11, color: tokens.dim, textAlign: 'center', letterSpacing: 4 }}>···</div>
        </div>
        <div style={{ fontSize: 8, color: tokens.dim, letterSpacing: 1 }}>← → navigate · / code · Esc return</div>
      </div>
    </div>
  );
}
