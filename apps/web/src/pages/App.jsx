import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing     from './Landing.jsx'
import Shell       from './Shell.jsx'
import StormRoom   from './StormRoom.jsx'
import Discovery   from './Discovery.jsx'
import Profile     from './Profile.jsx'
import AdminPanel  from './AdminPanel.jsx'
import NotFound    from './NotFound.jsx'
import { useUserStore } from '../stores/userStore.js'

// Protected route wrapper
function Protected({ children }) {
  const { user } = useUserStore()
  if (!user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"         element={<Landing />} />

        {/* App shell — wraps everything with the map + nav rail */}
        <Route path="/app"      element={<Protected><Shell /></Protected>}>
          <Route index           element={<Discovery />} />
          <Route path="storm/:stormId" element={<StormRoom />} />
          <Route path="profile/:username" element={<Profile />} />
          <Route path="admin"   element={<AdminPanel />} />
        </Route>

        <Route path="*"         element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
