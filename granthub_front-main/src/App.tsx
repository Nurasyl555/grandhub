import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { FileText, Send, PencilLine } from 'lucide-react'
import { AuthProvider, useAuthContext } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'
import Profile from './pages/Profile'
import Landing from './pages/Landing'
import GrantDetail from './pages/GrantDetail'
import Recommendations from './pages/Recommendations'
import Favorites from './pages/Favorites'
import Analytics from './pages/Analytics'
import ComingSoonPage from './pages/ComingSoonPage'

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
                    <Route path="/favorites"           element={
                        <ProtectedRoute><Favorites /></ProtectedRoute>
                    } />
                    <Route path="/analytics"           element={<Analytics />} />
                    <Route path="/applications/active" element={
                        <ComingSoonPage
                            title="Активные заявки"
                            description="Здесь будут заявки, над которыми вы сейчас работаете. Отслеживание заявок появится, когда на бэкенде добавят модель applications."
                            icon={FileText}
                        />
                    } />
                    <Route path="/applications/submitted" element={
                        <ComingSoonPage
                            title="Поданные заявки"
                            description="Здесь будут заявки, которые вы уже отправили, со статусами рассмотрения."
                            icon={Send}
                        />
                    } />
                    <Route path="/applications/drafts" element={
                        <ComingSoonPage
                            title="Черновики"
                            description="Здесь будут сохранённые черновики заявок, которые можно дозаполнить позже."
                            icon={PencilLine}
                        />
                    } />
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
