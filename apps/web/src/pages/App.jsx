import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing     from './Landing.jsx'
import Shell       from './Shell.jsx'
import StormRoom   from './StormRoom.jsx'
import Discovery   from './Discovery.jsx'
import Profile     from './Profile.jsx'
import AdminPanel  from './AdminPanel.jsx'
import Onboarding      from './Onboarding.jsx'
import Forums          from './Forums.jsx'
import DirectMessages  from './DirectMessages.jsx'
import NotFound    from './NotFound.jsx'
import { useUserStore } from '../stores/userStore.js'

function Protected({ children }) {
  const { user, onboardingComplete } = useUserStore()
  if (!user) return <Navigate to="/" replace />
  if (!onboardingComplete && window.location.pathname !== '/onboarding')
    return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<Landing />} />
        <Route path="/onboarding"  element={<Onboarding />} />

        <Route path="/app" element={<Protected><Shell /></Protected>}>
          <Route index                          element={<Discovery />} />
          <Route path="storm/:stormId"          element={<StormRoom />} />
          <Route path="profile/:username"       element={<Profile />} />
          <Route path="admin"                   element={<AdminPanel />} />
          <Route path="forums"                  element={<Forums />} />
          <Route path="forums/:channelId"       element={<Forums />} />
          <Route path="messages"                element={<DirectMessages />} />
          <Route path="messages/:userId"        element={<DirectMessages />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
