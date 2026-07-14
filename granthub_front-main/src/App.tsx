import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { AuthProvider, useAuthContext } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'
import Profile from './pages/Profile'
import Landing from './pages/Landing'
import GrantDetail from './pages/GrantDetail'
import Recommendations from './pages/Recommendations'

// ── Redirects to /auth if not logged in ──────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthContext()
    return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />
}

function AppShell() {
    const [search, setSearch] = useState('')

    return (
        <div className="flex h-screen bg-[#07111f] overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopBar search={search} onSearch={setSearch} />
                <Routes>
                    <Route path="/dashboard"           element={<Dashboard search={search} />} />
                    <Route path="/opportunity/:type/:id" element={<GrantDetail />} />
                    <Route path="/recommendations"     element={<Recommendations />} />
                    <Route path="/profile"          element={
                        <ProtectedRoute><Profile /></ProtectedRoute>
                    } />
                </Routes>
            </div>
        </div>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/"     element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/*"    element={<AppShell />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}