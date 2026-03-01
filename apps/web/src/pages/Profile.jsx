import { useState } from 'react'
import { useUserStore } from '../stores/userStore.js'
import TagPicker, { REGION_TAGS, INTEREST_TAGS, EXPERIENCE_LEVELS } from '../components/UI/TagPicker.jsx'

const ROLE_COLORS = {
  owner:      '#F59E0B',
  co_creator: '#F59E0B',
  admin:      '#EF4444',
  moderator:  '#8B5CF6',
  vip:        '#F59E0B',
  verified:   '#22C55E',
  contributor:'#38BDF8',
  member:     '#6B7280',
  probation:  '#6B7280',
}

const ROLE_LABELS = {
  owner:      'OWNER',
  co_creator: 'CO-CREATOR',
  admin:      'ADMIN',
  moderator:  'MODERATOR',
  vip:        'VIP ⭐',
  verified:   'VERIFIED CHASER ✓',
  contributor:'CONTRIBUTOR',
  member:     'MEMBER',
  probation:  'NEW MEMBER 🌱',
}

const EXP_DISPLAY = {
  hobbyist:   { emoji:'🟢', label:'Hobbyist' },
  enthusiast: { emoji:'🔵', label:'Enthusiast' },
  advanced:   { emoji:'🟣', label:'Advanced' },
  pro:        { emoji:'🔴', label:'Professional' },
}

export default function Profile() {
  const { user, updateProfile, saveTagsAndOnboard } = useUserStore()
  const [editing, setEditing]       = useState(false)
  const [tab, setTab]               = useState('overview')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  // Edit state
  const [bio, setBio]               = useState(user?.bio ?? '')
  const [location, setLocation]     = useState(user?.location ?? '')
  const [regions, setRegions]       = useState(user?.regionTags ?? [])
  const [interests, setInterests]   = useState(user?.interestTags ?? [])
  const [level, setLevel]           = useState(user?.experienceLevel ?? null)

  if (!user) return (
    <div style={{ padding:40, color:'var(--t3)', fontFamily:'var(--mono)', textAlign:'center' }}>
      Not logged in
    </div>
  )

  const role      = user.role ?? 'member'
  const roleColor = ROLE_COLORS[role] ?? '#6B7280'
  const roleLabel = ROLE_LABELS[role] ?? 'MEMBER'
  const exp       = EXP_DISPLAY[user.experienceLevel]
  const joinDate  = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US',{month:'short',year:'numeric'}) : 'Feb 2026'

  async function saveEdits() {
    setSaving(true)
    await saveTagsAndOnboard(regions, interests, level)
    await updateProfile({ bio, location })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setEditing(false)
  }

  const TABS = ['overview','tags','activity','badges']

  return (
    <div style={{
      maxWidth: 720, margin: '0 auto', padding: '32px 20px',
      fontFamily: 'var(--mono)', color: 'var(--t1)',
    }}>

      {/* Header card */}
      <div style={{
        background:'var(--panel)', border:'1px solid var(--border)',
        borderRadius:16, padding:'28px 28px 20px', marginBottom:16,
        position:'relative',
      }}>
        {/* Edit button */}
        <button onClick={() => setEditing(!editing)} style={{
          position:'absolute', top:20, right:20,
          padding:'6px 14px', borderRadius:7, border:'1px solid var(--border)',
          background: editing ? 'rgba(56,189,248,0.15)' : 'transparent',
          color: editing ? '#38BDF8' : 'var(--t3)', cursor:'pointer',
          fontFamily:'var(--mono)', fontWeight:700, fontSize:10, letterSpacing:'0.06em',
        }}>
          {editing ? 'CANCEL' : 'EDIT PROFILE'}
        </button>

        <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
          {/* Avatar */}
          <div style={{
            width:72, height:72, borderRadius:18, flexShrink:0,
            background: user.avatarColor ?? 'var(--blue)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:28, fontWeight:800, color:'var(--bg)',
            border: `3px solid ${roleColor}`,
            boxShadow: `0 0 20px ${roleColor}40`,
          }}>
            {user.username?.[0]?.toUpperCase()}
          </div>

          {/* Identity */}
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <span style={{ fontSize:20, fontWeight:800, color:'var(--t1)' }}>
                @{user.username}
              </span>
              {/* Role badge */}
              <span style={{
                padding:'2px 8px', borderRadius:5, fontSize:9, fontWeight:800,
                letterSpacing:'0.08em', color: roleColor,
                background: roleColor + '20',
                border: '1px solid ' + roleColor + '40',
              }}>
                {roleLabel}
              </span>
              {/* Experience badge */}
              {exp && (
                <span style={{
                  padding:'2px 8px', borderRadius:5, fontSize:9, fontWeight:700,
                  color:'var(--t2)', background:'rgba(255,255,255,0.06)',
                  border:'1px solid rgba(255,255,255,0.1)',
                }}>
                  {exp.emoji} {exp.label}
                </span>
              )}
            </div>

            {/* Bio */}
            {editing ? (
              <textarea
                value={bio} onChange={e => setBio(e.target.value)}
                placeholder="Tell the community about yourself..."
                maxLength={160}
                style={{
                  marginTop:8, width:'100%', background:'rgba(255,255,255,0.05)',
                  border:'1px solid var(--border)', borderRadius:7, padding:'8px 10px',
                  color:'var(--t1)', fontFamily:'var(--mono)', fontSize:12,
                  resize:'none', height:60, outline:'none',
                }}
              />
            ) : (
              <p style={{ color:'var(--t2)', fontSize:13, margin:'6px 0 0', lineHeight:1.5 }}>
                {user.bio || <span style={{ color:'var(--t3)', fontStyle:'italic' }}>No bio yet</span>}
              </p>
            )}

            {/* Meta */}
            <div style={{ display:'flex', gap:16, marginTop:10, flexWrap:'wrap' }}>
              {editing ? (
                <input
                  value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="Location (e.g. Tampa, FL)"
                  style={{
                    background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)',
                    borderRadius:6, padding:'5px 8px', color:'var(--t1)',
                    fontFamily:'var(--mono)', fontSize:11, outline:'none', width:200,
                  }}
                />
              ) : user.location ? (
                <span style={{ color:'var(--t3)', fontSize:11 }}>📍 {user.location}</span>
              ) : null}
              <span style={{ color:'var(--t3)', fontSize:11 }}>📅 Joined {joinDate}</span>
              <span style={{ color:'var(--t3)', fontSize:11 }}>⭐ {user.score ?? 0} pts</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1,
          marginTop:20, background:'var(--border)', borderRadius:10, overflow:'hidden',
        }}>
          {[
            { label:'Forecasts',  value: user.forecastCount ?? 0    },
            { label:'Accuracy',   value: (user.accuracy ?? 0)+'%'   },
            { label:'Forum Posts',value: user.postCount ?? 0        },
            { label:'Streak',     value: (user.streak ?? 0)+'d'     },
          ].map(s => (
            <div key={s.label} style={{
              background:'var(--panel)', padding:'12px 0', textAlign:'center',
            }}>
              <div style={{ fontSize:18, fontWeight:800, color:'var(--blue)' }}>{s.value}</div>
              <div style={{ fontSize:9, color:'var(--t3)', letterSpacing:'0.06em', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, marginBottom:14 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'7px 14px', borderRadius:7, border:'none', cursor:'pointer',
            background: tab===t ? 'rgba(56,189,248,0.15)' : 'transparent',
            color: tab===t ? '#38BDF8' : 'var(--t3)',
            fontFamily:'var(--mono)', fontWeight:700, fontSize:10, letterSpacing:'0.06em',
            borderBottom: tab===t ? '2px solid #38BDF8' : '2px solid transparent',
          }}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Section title="REGIONS">
            {editing ? (
              <TagPicker tags={REGION_TAGS} selected={regions} onChange={setRegions} multi={true} size="sm" />
            ) : (
              <TagList items={REGION_TAGS.filter(t => (user.regionTags??[]).includes(t.slug))} empty="No regions set" />
            )}
          </Section>
          <Section title="INTERESTS">
            {editing ? (
              <TagPicker tags={INTEREST_TAGS} selected={interests} onChange={setInterests} multi={true} size="sm" />
            ) : (
              <TagList items={INTEREST_TAGS.filter(t => (user.interestTags??[]).includes(t.slug))} empty="No interests set" />
            )}
          </Section>
          {editing && (
            <Section title="EXPERIENCE LEVEL">
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {EXPERIENCE_LEVELS.map(lvl => (
                  <button key={lvl.slug} onClick={() => setLevel(lvl.slug)} style={{
                    padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer',
                    background: level===lvl.slug ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.05)',
                    outline: level===lvl.slug ? '1.5px solid rgba(56,189,248,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    color: level===lvl.slug ? '#38BDF8' : 'var(--t2)',
                    fontFamily:'var(--mono)', fontWeight:700, fontSize:11,
                  }}>
                    {lvl.emoji} {lvl.label}
                  </button>
                ))}
              </div>
            </Section>
          )}
          {editing && (
            <button onClick={saveEdits} disabled={saving} style={{
              padding:'12px', borderRadius:10, border:'none', cursor:'pointer',
              background:'linear-gradient(135deg,#38BDF8,#6366F1)',
              color:'white', fontFamily:'var(--mono)', fontWeight:800, fontSize:13,
              letterSpacing:'0.05em', boxShadow:'0 4px 20px rgba(56,189,248,0.3)',
            }}>
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Profile'}
            </button>
          )}
        </div>
      )}

      {/* Tab: Tags */}
      {tab === 'tags' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Section title="YOUR REGION TAGS">
            <TagPicker tags={REGION_TAGS} selected={regions} onChange={setRegions} multi={true} size="sm" />
          </Section>
          <Section title="YOUR INTEREST TAGS">
            <TagPicker tags={INTEREST_TAGS} selected={interests} onChange={setInterests} multi={true} size="sm" />
          </Section>
          <Section title="EXPERIENCE LEVEL">
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {EXPERIENCE_LEVELS.map(lvl => (
                <button key={lvl.slug} onClick={() => setLevel(lvl.slug)} style={{
                  padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer',
                  background: level===lvl.slug ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.05)',
                  outline: level===lvl.slug ? '1.5px solid rgba(56,189,248,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  color: level===lvl.slug ? '#38BDF8' : 'var(--t2)',
                  fontFamily:'var(--mono)', fontWeight:700, fontSize:11,
                }}>
                  {lvl.emoji} {lvl.label}
                </button>
              ))}
            </div>
          </Section>
          <button onClick={saveEdits} disabled={saving} style={{
            padding:'12px', borderRadius:10, border:'none', cursor:'pointer',
            background:'linear-gradient(135deg,#38BDF8,#6366F1)',
            color:'white', fontFamily:'var(--mono)', fontWeight:800, fontSize:13,
            letterSpacing:'0.05em',
          }}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Tags'}
          </button>
        </div>
      )}

      {/* Tab: Activity */}
      {tab === 'activity' && (
        <Section title="RECENT ACTIVITY">
          <div style={{ color:'var(--t3)', fontSize:12, padding:'20px 0', textAlign:'center' }}>
            Activity feed coming soon
          </div>
        </Section>
      )}

      {/* Tab: Badges */}
      {tab === 'badges' && (
        <Section title="EARNED BADGES">
          <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
            {[
              { emoji:'⚡', label:'Early Adopter',   desc:'Joined during beta',         earned:true  },
              { emoji:'🌀', label:'Tropical Tracker', desc:'Track 5+ tropical systems',  earned:true  },
              { emoji:'🏆', label:'Top Forecaster',   desc:'Finish top 10% in a battle', earned:false },
              { emoji:'🔥', label:'Hot Streak',       desc:'7-day activity streak',      earned:false },
              { emoji:'✓',  label:'Verified Chaser',  desc:'Proof of field experience',  earned:false },
              { emoji:'📊', label:'Model Nerd',       desc:'Submit 20+ model analyses',  earned:false },
            ].map(b => (
              <div key={b.label} style={{
                padding:'12px 14px', borderRadius:10, width:140,
                background: b.earned ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.03)',
                border: b.earned ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.06)',
                opacity: b.earned ? 1 : 0.45,
                textAlign:'center',
              }}>
                <div style={{ fontSize:28, marginBottom:6 }}>{b.emoji}</div>
                <div style={{ fontSize:11, fontWeight:700, color: b.earned ? '#38BDF8' : 'var(--t2)' }}>{b.label}</div>
                <div style={{ fontSize:9, color:'var(--t3)', marginTop:4, lineHeight:1.4 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background:'var(--panel)', border:'1px solid var(--border)',
      borderRadius:12, padding:'16px 18px',
    }}>
      <div style={{ fontSize:9, color:'var(--t3)', fontWeight:800, letterSpacing:'0.1em', marginBottom:12 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function TagList({ items, empty }) {
  if (!items.length) return <span style={{ color:'var(--t3)', fontSize:12 }}>{empty}</span>
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
      {items.map(t => (
        <span key={t.slug} style={{
          padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:700,
          background:'rgba(56,189,248,0.12)', color:'#38BDF8',
          border:'1px solid rgba(56,189,248,0.25)',
        }}>
          {t.emoji} {t.label}
        </span>
      ))}
    </div>
  )
}
