import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import Landing     from './Landing.jsx'
import Shell       from './Shell.jsx'
import StormRoom   from './StormRoom.jsx'
import Discovery   from './Discovery.jsx'
import Profile     from './Profile.jsx'
import AdminPanel  from './AdminPanel.jsx'
import Onboarding      from './Onboarding.jsx'
import Forums          from './Forums.jsx'
import DirectMessages  from './DirectMessages.jsx'
import Members         from './Members.jsx'
import NotFound    from './NotFound.jsx'
import { useUserStore } from '../stores/userStore.js'
import Settings from '../pages/Settings.jsx'

function Protected({ children }) {
  const { user, onboardingComplete } = useUserStore()
  if (!user) return <Navigate to="/" replace />
  if (!onboardingComplete && window.location.pathname !== '/onboarding')
    return <Navigate to="/onboarding" replace />
  return children
}

/**
 * Handle Discord OAuth callback — picks up ?token=xxx&discord=1
 * and logs the user in automatically.
 */
function OAuthHandler() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useUserStore()

  useEffect(() => {
    const token = params.get('token')
    const isDiscord = params.get('discord')

    if (token && isDiscord) {
      try {
        // Decode JWT payload to get user info
        const payload = JSON.parse(atob(token.split('.')[1]))
        const user = {
          id: payload.sub,
          username: payload.username,
          role: payload.role ?? 'member',
          avatarColor: payload.avatarColor ?? '#5865F2',
        }
        login(user, token)

        // Clean URL
        window.history.replaceState({}, '', '/app')
      } catch (e) {
        console.error('[OAuth] Token parse error:', e)
        navigate('/')
      }
    }
  }, [])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <OAuthHandler />
      <Routes>
        <Route path="/"            element={<Landing />} />
        <Route path="/onboarding"  element={<Onboarding />} />

        <Route path="/app" element={<Protected><Shell /></Protected>}>
          <Route index                          element={<Discovery />} />
          <Route path="storm/:stormId"          element={<StormRoom />} />
          <Route path="profile/:username"       element={<Profile />} />
          <Route path="admin"                   element={<AdminPanel />} />
          <Route path="settings"                element={<Settings />} />
          <Route path="forums"                  element={<Forums />} />
          <Route path="forums/:channelId"       element={<Forums />} />
          <Route path="messages"                element={<DirectMessages />} />
          <Route path="messages/:userId"        element={<DirectMessages />} />
          <Route path="members"                 element={<Members />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
