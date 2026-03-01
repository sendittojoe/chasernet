
const REGION_TAGS = [
  { slug:'gulf-coast',        label:'Gulf Coast',        emoji:'🌊' },
  { slug:'southeast-usa',     label:'Southeast USA',     emoji:'🏖' },
  { slug:'northeast-usa',     label:'Northeast USA',     emoji:'🌲' },
  { slug:'tornado-alley',     label:'Tornado Alley',     emoji:'🌪' },
  { slug:'central-mountain',  label:'Central/Mountain',  emoji:'🏔' },
  { slug:'west-coast',        label:'West Coast',        emoji:'🌁' },
  { slug:'canada',            label:'Canada',            emoji:'🍁' },
  { slug:'caribbean-atlantic',label:'Caribbean/Atlantic',emoji:'🌴' },
  { slug:'western-pacific',   label:'Western Pacific',   emoji:'🌏' },
  { slug:'eastern-pacific',   label:'Eastern Pacific',   emoji:'🌍' },
]

const INTEREST_TAGS = [
  { slug:'tropical',  label:'Tropical Cyclones', emoji:'🌀' },
  { slug:'severe',    label:'Severe/Tornadoes',  emoji:'⛈' },
  { slug:'winter',    label:'Winter Weather',    emoji:'❄' },
  { slug:'fire',      label:'Fire Weather',      emoji:'🔥' },
  { slug:'marine',    label:'Marine/Surge',      emoji:'🌊' },
  { slug:'models',    label:'Model Analysis',    emoji:'📊' },
  { slug:'ai-ml',     label:'AI/ML Models',      emoji:'🤖' },
  { slug:'chasing',   label:'Storm Chasing',     emoji:'📸' },
]

const EXPERIENCE_LEVELS = [
  { slug:'hobbyist',   label:'Hobbyist',         emoji:'🟢', desc:'I follow storms casually' },
  { slug:'enthusiast', label:'Enthusiast',       emoji:'🔵', desc:'I dig into model data regularly' },
  { slug:'advanced',   label:'Advanced/Degreed', emoji:'🟣', desc:'Degree in met or years of deep analysis' },
  { slug:'pro',        label:'Professional',     emoji:'🔴', desc:'NWS, EM, broadcast, or research' },
]

export { REGION_TAGS, INTEREST_TAGS, EXPERIENCE_LEVELS }

export default function TagPicker({ tags, selected, onChange, multi=true, size='md' }) {
  const isSelected = (slug) => multi ? (selected ?? []).includes(slug) : selected === slug

  const toggle = (slug) => {
    if (multi) {
      const cur = selected ?? []
      onChange(cur.includes(slug) ? cur.filter(s => s !== slug) : [...cur, slug])
    } else {
      onChange(slug)
    }
  }

  const pad  = size === 'sm' ? '5px 9px' : '8px 13px'
  const fs   = size === 'sm' ? 10 : 12

  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
      {tags.map(tag => {
        const active = isSelected(tag.slug)
        return (
          <button key={tag.slug} onClick={() => toggle(tag.slug)} style={{
            padding: pad, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: active ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.05)',
            outline: active ? '1.5px solid rgba(56,189,248,0.5)' : '1px solid rgba(255,255,255,0.08)',
            color: active ? '#38BDF8' : 'rgba(255,255,255,0.55)',
            fontFamily: 'var(--mono)', fontWeight: 700, fontSize: fs,
            letterSpacing: '0.04em', display:'flex', alignItems:'center', gap:5,
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: fs+2 }}>{tag.emoji}</span>
            {tag.label}
          </button>
        )
      })}
    </div>
  )
}
