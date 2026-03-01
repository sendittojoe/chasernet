import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore.js'
import TagPicker, { REGION_TAGS, INTEREST_TAGS, EXPERIENCE_LEVELS } from '../components/UI/TagPicker.jsx'

export default function Onboarding() {
  const [step, setStep]       = useState(0)
  const [regions, setRegions] = useState([])
  const [interests, setInterests] = useState([])
  const [level, setLevel]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const { saveTagsAndOnboard, user } = useUserStore()
  const navigate = useNavigate()

  const STEPS = ['Welcome', 'Regions', 'Interests', 'Experience']
  const canNext = [true, regions.length > 0, interests.length > 0, level !== null]

  async function finish() {
    setSaving(true)
    await saveTagsAndOnboard(regions, interests, level)
    navigate('/app')
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--mono)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Progress dots */}
        <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:32 }}>
          {STEPS.map((s,i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i < step ? '#22C55E' : i === step ? '#38BDF8' : 'rgba(255,255,255,0.12)',
              transition: 'all 0.3s',
            }}/>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '36px 32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
              <h1 style={{ color:'var(--t1)', fontSize:22, fontWeight:800, margin:'0 0 10px', letterSpacing:'-0.02em' }}>
                Welcome to ChaserNet
              </h1>
              <p style={{ color:'var(--t3)', fontSize:13, lineHeight:1.6, margin:'0 0 28px' }}>
                Hey {user?.username ?? 'chaser'} — let's set up your War Room.<br/>
                This takes about 30 seconds.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10, textAlign:'left', marginBottom:28 }}>
                {[
                  ['🌀','Track active storms with real model data'],
                  ['📊','Compare Euro IFS, GFS, AIFS side by side'],
                  ['🏆','Compete in Forecast Battles'],
                  ['💬','Connect with chasers and meteorologists'],
                ].map(([icon,text]) => (
                  <div key={text} style={{ display:'flex', gap:12, alignItems:'center', color:'var(--t2)', fontSize:13 }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{icon}</span>{text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Regions */}
          {step === 1 && (
            <>
              <h2 style={{ color:'var(--t1)', fontSize:18, fontWeight:800, margin:'0 0 8px' }}>
                Where do you track weather?
              </h2>
              <p style={{ color:'var(--t3)', fontSize:12, margin:'0 0 20px', lineHeight:1.5 }}>
                Select all that apply. This unlocks regional channels in your sidebar.
                You can always change these in your profile.
              </p>
              <TagPicker tags={REGION_TAGS} selected={regions} onChange={setRegions} multi={true} />
              {regions.length === 0 && (
                <p style={{ color:'rgba(245,158,11,0.7)', fontSize:11, marginTop:12 }}>
                  Select at least one region to continue
                </p>
              )}
            </>
          )}

          {/* Step 2: Interests */}
          {step === 2 && (
            <>
              <h2 style={{ color:'var(--t1)', fontSize:18, fontWeight:800, margin:'0 0 8px' }}>
                What are you most into?
              </h2>
              <p style={{ color:'var(--t3)', fontSize:12, margin:'0 0 20px', lineHeight:1.5 }}>
                Select all that apply. Unlocks topic-specific channels and feeds.
              </p>
              <TagPicker tags={INTEREST_TAGS} selected={interests} onChange={setInterests} multi={true} />
              {interests.length === 0 && (
                <p style={{ color:'rgba(245,158,11,0.7)', fontSize:11, marginTop:12 }}>
                  Select at least one interest to continue
                </p>
              )}
            </>
          )}

          {/* Step 3: Experience */}
          {step === 3 && (
            <>
              <h2 style={{ color:'var(--t1)', fontSize:18, fontWeight:800, margin:'0 0 8px' }}>
                How would you describe yourself?
              </h2>
              <p style={{ color:'var(--t3)', fontSize:12, margin:'0 0 20px', lineHeight:1.5 }}>
                Shown as a badge on your profile. No gatekeeping — just context for other members.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {EXPERIENCE_LEVELS.map(lvl => (
                  <button key={lvl.slug} onClick={() => setLevel(lvl.slug)} style={{
                    padding: '14px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: level===lvl.slug ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                    outline: level===lvl.slug ? '1.5px solid rgba(56,189,248,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', gap: 14, textAlign:'left',
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 22, flexShrink:0 }}>{lvl.emoji}</span>
                    <div>
                      <div style={{ color: level===lvl.slug ? '#38BDF8' : 'var(--t1)', fontWeight:700, fontSize:13, fontFamily:'var(--mono)' }}>
                        {lvl.label}
                      </div>
                      <div style={{ color:'var(--t3)', fontSize:11, marginTop:2 }}>{lvl.desc}</div>
                    </div>
                    {level===lvl.slug && (
                      <div style={{ marginLeft:'auto', color:'#38BDF8', fontSize:16 }}>✓</div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Nav buttons */}
          <div style={{ display:'flex', gap:10, marginTop:28, justifyContent:'space-between' }}>
            {step > 0 ? (
              <button onClick={() => setStep(s => s-1)} style={{
                padding:'10px 18px', borderRadius:8, border:'1px solid var(--border)',
                background:'transparent', color:'var(--t2)', cursor:'pointer',
                fontFamily:'var(--mono)', fontWeight:700, fontSize:12,
              }}>
                ← Back
              </button>
            ) : <div/>}

            {step < 3 ? (
              <button
                onClick={() => setStep(s => s+1)}
                disabled={!canNext[step]}
                style={{
                  padding:'10px 24px', borderRadius:8, border:'none', cursor: canNext[step] ? 'pointer' : 'not-allowed',
                  background: canNext[step] ? 'var(--blue)' : 'rgba(255,255,255,0.08)',
                  color: canNext[step] ? 'var(--bg)' : 'var(--t3)',
                  fontFamily:'var(--mono)', fontWeight:800, fontSize:12, letterSpacing:'0.05em',
                  transition:'all 0.15s',
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={!level || saving}
                style={{
                  padding:'10px 24px', borderRadius:8, border:'none',
                  cursor: level && !saving ? 'pointer' : 'not-allowed',
                  background: level ? 'linear-gradient(135deg,#38BDF8,#6366F1)' : 'rgba(255,255,255,0.08)',
                  color: level ? 'white' : 'var(--t3)',
                  fontFamily:'var(--mono)', fontWeight:800, fontSize:12, letterSpacing:'0.05em',
                  boxShadow: level ? '0 4px 20px rgba(56,189,248,0.3)' : 'none',
                  transition:'all 0.15s',
                }}
              >
                {saving ? 'Saving...' : 'Enter the War Room ⚡'}
              </button>
            )}
          </div>
        </div>

        {/* Skip link */}
        <div style={{ textAlign:'center', marginTop:16 }}>
          <button onClick={() => navigate('/app')} style={{
            background:'none', border:'none', color:'var(--t3)', cursor:'pointer',
            fontSize:11, fontFamily:'var(--mono)',
          }}>
            Skip for now — I'll set this up in my profile
          </button>
        </div>
      </div>
    </div>
  )
}
