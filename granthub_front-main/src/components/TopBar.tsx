import { Search, Bell, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

type Props = {
    search: string
    onSearch: (val: string) => void
}

export default function TopBar({ search, onSearch }: Props) {
    const navigate = useNavigate()
    const location = useLocation()

    function scrollToFilters() {
        if (location.pathname !== '/dashboard') { navigate('/dashboard'); return }
        document.getElementById('dashboard-filters')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    return (
        <header className="bg-[#050e1a] border-b border-[rgba(255,255,255,0.06)] px-6 py-3.5 flex items-center gap-4 sticky top-0 z-10">
            <div className="flex-1 max-w-lg relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3d5a72]" />
                <input
                    type="text"
                    value={search}
                    onChange={e => onSearch(e.target.value)}
                    placeholder="Поиск грантов, стипендий, стажировок..."
                    className="w-full pl-9 pr-4 py-2 bg-[#0c1e33] border border-[rgba(255,255,255,0.08)] rounded-lg text-[13.5px] text-white placeholder-[#3d5a72] focus:outline-none focus:ring-2 focus:ring-[rgba(0,198,167,0.2)] focus:border-[#00c6a7] transition-all"
                />
            </div>
            <button
                onClick={() => navigate('/recommendations')}
                className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(0,198,167,0.08)] border border-[rgba(0,198,167,0.2)] rounded-lg cursor-pointer hover:bg-[rgba(0,198,167,0.14)] transition-all"
            >
                <Sparkles size={13} className="text-[#00c6a7]" />
                <span className="text-[12.5px] font-medium text-[#00c6a7]">AI-подбор</span>
            </button>
            <button
                onClick={scrollToFilters}
                className="flex items-center gap-2 px-3 py-1.5 border border-[rgba(255,255,255,0.08)] rounded-lg text-[13px] text-[#7a9bb5] hover:bg-[#0c1e33] hover:text-white transition-all"
            >
                <SlidersHorizontal size={14} />
                Фильтры
            </button>
            <button className="relative w-9 h-9 flex items-center justify-center border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-[#0c1e33] transition-all">
                <Bell size={16} className="text-[#7a9bb5]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00c6a7] rounded-full ring-2 ring-[#050e1a] shadow-[0_0_6px_#00c6a7]" />
            </button>
        </header>
    )
}