import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Team from './pages/Team'
import Layout from './components/Layout'
import { isAuthed } from './lib/auth'
import Insights from './pages/Insights'   // ⬅️ add this import

function PrivateRoute({ children }: { children: JSX.Element }) {
  return isAuthed() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="team" element={<Team />} />
        <Route path="insights" element={<Insights />} /> {/* ⬅️ new route */}
      </Route>
      <Route path="*" element={<Navigate to={isAuthed() ? '/' : '/login'} replace />} />
    </Routes>
  )
}
