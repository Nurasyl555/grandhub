import {
    LayoutDashboard, Search, Star, FileText,
    BarChart2, Settings, GraduationCap, Briefcase,
    ChevronRight, Sparkles, LogOut
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'

type NavItemType = {
    icon:        React.ElementType
    label:       string
    badge?:      string
    badgeColor?: string
    path?:       string
    authOnly?:   boolean
    comingSoon?: boolean
}

const navItems: NavItemType[] = [
    { icon: LayoutDashboard, label: 'Главная',        path: '/dashboard'      },
    { icon: Search,          label: 'Поиск грантов',  path: '/dashboard?type=grant' },
    { icon: Sparkles,        label: 'Рекомендации',   path: '/recommendations', authOnly: true },
    { icon: GraduationCap,   label: 'Стипендии',      path: '/dashboard?type=scholarship' },
    { icon: Briefcase,       label: 'Стажировки',     path: '/dashboard?type=internship'  },
    { icon: Star,            label: 'Избранное',      path: '/favorites', authOnly: true },
]

const appItems: NavItemType[] = [
    { icon: FileText,     label: 'Активные',  path: '/applications/active'    },
    { icon: ChevronRight, label: 'Поданные',  path: '/applications/submitted' },
    { icon: FileText,     label: 'Черновики', path: '/applications/drafts'    },
]

const bottomItems: NavItemType[] = [
    { icon: BarChart2, label: 'Аналитика', path: '/analytics' },
    { icon: Settings,  label: 'Профиль',   path: '/profile'   },
]

function NavItem({ icon: Icon, label, badge, badgeColor, path, authOnly, comingSoon }: NavItemType) {
    const navigate        = useNavigate()
    const location        = useLocation()
    const { isAuthenticated } = useAuthContext()
    const currentPath     = `${location.pathname}${location.search}`
    const active          = !!path && currentPath === path
    const locked          = authOnly && !isAuthenticated

    return (
        <div
            onClick={() => {
                if (comingSoon) return
                if (locked) { navigate('/auth'); return }
                if (path) navigate(path)
            }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150
                ${comingSoon ? 'cursor-default' : 'cursor-pointer'}
                ${active
                    ? 'bg-[rgba(0,198,167,0.12)] text-[#00c6a7] border border-[rgba(0,198,167,0.2)]'
                    : locked || comingSoon
                        ? 'text-[#3d5a72] hover:bg-[#0c1e33] hover:text-[#7a9bb5]'
                        : 'text-[#7a9bb5] hover:bg-[#0c1e33] hover:text-white'
                }`}
        >
            <Icon size={16} className="flex-shrink-0" />
            <span className="text-[13.5px] font-medium flex-1">{label}</span>
            {locked && (
                <span className="text-[10px] text-[#3d5a72] border border-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">
                    Войти
                </span>
            )}
            {comingSoon && (
                <span className="text-[10px] text-[#3d5a72] border border-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">
                    Скоро
                </span>
            )}
            {badge && !locked && !comingSoon && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                    ${badgeColor === 'amber'
                        ? 'bg-amber-900/40 text-amber-400'
                        : active
                            ? 'bg-[rgba(0,198,167,0.15)] text-[#00c6a7]'
                            : 'bg-[#0c1e33] text-[#7a9bb5]'
                    }`}>
                    {badge}
                </span>
            )}
        </div>
    )
}

export default function Sidebar() {
    const navigate              = useNavigate()
    const { isAuthenticated, user, logout } = useAuthContext()

    function handleLogout() {
        logout()
        navigate('/auth')
    }

    return (
        <aside className="w-60 bg-[#050e1a] border-r border-[rgba(255,255,255,0.06)] flex flex-col h-screen sticky top-0">

            {/* Logo */}
            <div className="px-5 py-5 border-b border-[rgba(255,255,255,0.06)] cursor-pointer" onClick={() => navigate('/')}>
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#00c6a7] rounded-lg flex items-center justify-center text-[#07111f] font-bold text-sm flex-shrink-0"
                         style={{ fontFamily: "'Instrument Serif', serif" }}>G</div>
                    <span className="text-[17px] text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
                        Grant<span className="text-[#00c6a7]">Hub</span>.AI
                    </span>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-3 overflow-y-auto">
                <div className="space-y-0.5">
                    {navItems.map(item => <NavItem key={item.label} {...item} />)}
                </div>

                <div className="mt-5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#3d5a72] px-3 mb-2">Мои заявки</p>
                    <div className="space-y-0.5">
                        {appItems.map(item => <NavItem key={item.label} {...item} />)}
                    </div>
                </div>

                <div className="mt-5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#3d5a72] px-3 mb-2">Прочее</p>
                    <div className="space-y-0.5">
                        {bottomItems.map(item => <NavItem key={item.label} {...item} />)}
                    </div>
                </div>
            </nav>

            {/* User footer */}
            <div className="px-3 py-3 border-t border-[rgba(255,255,255,0.06)]">
                {isAuthenticated ? (
                    <div className="flex flex-col gap-1">
                        <div
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#0c1e33] cursor-pointer transition-all"
                            onClick={() => navigate('/profile')}
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00c6a7] to-[#7c3aed] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-white truncate">{user?.name ?? 'Пользователь'}</p>
                                <p className="text-[11px] text-[#3d5a72] truncate">{user?.email ?? ''}</p>
                            </div>
                            <Settings size={14} className="text-[#3d5a72] flex-shrink-0" />
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] text-[#3d5a72] hover:text-red-400 hover:bg-red-900/10 transition-all w-full"
                        >
                            <LogOut size={13} /> Выйти
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => navigate('/auth')}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#00c6a7] text-[#07111f] text-[13px] font-bold rounded-xl hover:bg-[#00ddb9] transition-all active:scale-95"
                    >
                        Войти
                    </button>
                )}
            </div>
        </aside>
    )
}