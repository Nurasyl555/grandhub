import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import GrantCard from '../components/GrantCard'
import { Sparkles, TrendingUp, Clock, CheckCircle, ChevronDown } from 'lucide-react'
import { useAuthContext } from '../context/AuthContext'
import { fetchAllOpportunities } from '../services/api'
import { type Opportunity, type OpportunityType, daysLeft } from '../types'

const typeTabs: { value: OpportunityType | 'all'; label: string }[] = [
    { value: 'all',         label: 'Все' },
    { value: 'grant',       label: 'Гранты' },
    { value: 'scholarship', label: 'Стипендии' },
    { value: 'internship',  label: 'Стажировки' },
]
const sortOptions = ['По дедлайну', 'По названию']

// ── Skeleton card ─────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 flex flex-col gap-4 animate-pulse">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 flex flex-col gap-2">
                    <div className="flex gap-2">
                        <div className="h-4 w-14 bg-white/[0.06] rounded-md" />
                        <div className="h-4 w-20 bg-white/[0.06] rounded-md" />
                    </div>
                    <div className="h-4 w-3/4 bg-white/[0.06] rounded" />
                    <div className="h-3 w-1/3 bg-white/[0.04] rounded" />
                </div>
                <div className="w-8 h-8 bg-white/[0.06] rounded-lg flex-shrink-0" />
            </div>
            <div className="space-y-2">
                <div className="h-3 w-full bg-white/[0.05] rounded" />
                <div className="h-3 w-4/5 bg-white/[0.05] rounded" />
            </div>
            <div className="flex gap-3">
                <div className="h-3 w-24 bg-white/[0.05] rounded" />
                <div className="h-3 w-20 bg-white/[0.05] rounded" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                <div className="h-6 w-24 bg-white/[0.06] rounded" />
                <div className="h-7 w-20 bg-white/[0.08] rounded-lg" />
            </div>
        </div>
    )
}

// ── Empty state ────────────────────────────────────────────────
function EmptyState({ query, onReset }: { query: string; onReset: () => void }) {
    return (
        <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-2xl flex items-center justify-center text-3xl">
                🔍
            </div>
            <div className="text-center">
                <p className="text-[15px] text-white font-semibold">Ничего не найдено</p>
                <p className="text-[13px] text-[#3d5a72] mt-1 max-w-xs">
                    {query
                        ? <>По запросу «<span className="text-[#7a9bb5]">{query}</span>» совпадений нет. Попробуйте другой запрос.</>
                        : 'Нет возможностей, соответствующих выбранным фильтрам.'
                    }
                </p>
            </div>
            <button
                onClick={onReset}
                className="mt-1 px-4 py-2 text-[13px] font-semibold text-[#07111f] bg-[#00c6a7] rounded-lg hover:bg-[#00ddb9] active:scale-95 transition-all"
            >
                Сбросить фильтры
            </button>
        </div>
    )
}

// ── Main ───────────────────────────────────────────────────────
export default function Dashboard({ search = '' }: { search?: string }) {
    const navigate = useNavigate()
    const { token, user, isAuthenticated } = useAuthContext()
    const [searchParams, setSearchParams] = useSearchParams()

    const activeType = (searchParams.get('type') as OpportunityType | null) ?? 'all'
    const [activeCountry, setActiveCountry] = useState('Все страны')
    const [activeSort, setActiveSort]       = useState('По дедлайну')

    const [items, setItems]     = useState<Opportunity[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        // Сбрасываем loading/error синхронно, чтобы спиннер появился сразу
        // при смене token, а не через один лишний рендер.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true)
        setError(null)
        fetchAllOpportunities(token)
            .then(data => { if (!cancelled) setItems(data) })
            .catch(() => { if (!cancelled) setError('Не удалось загрузить данные с сервера') })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [token])

    function setActiveType(value: OpportunityType | 'all') {
        if (value === 'all') setSearchParams(p => { p.delete('type'); return p })
        else setSearchParams(p => { p.set('type', value); return p })
    }

    function resetFilters() {
        setActiveType('all')
        setActiveCountry('Все страны')
        setActiveSort('По дедлайну')
    }

    const countries = useMemo(
        () => ['Все страны', ...Array.from(new Set(items.map(i => i.country).filter(Boolean) as string[]))],
        [items]
    )

    const filtered: Opportunity[] = items
        .filter(g => activeType === 'all' || g.type === activeType)
        .filter(g => activeCountry === 'Все страны' || g.country === activeCountry)
        .filter(g => {
            if (!search.trim()) return true
            const q = search.toLowerCase()
            return (
                g.title.toLowerCase().includes(q) ||
                g.provider.toLowerCase().includes(q) ||
                g.description.toLowerCase().includes(q)
            )
        })
        .sort((a, b) => {
            if (activeSort === 'По названию') return a.title.localeCompare(b.title)
            const da = daysLeft(a.deadline)
            const db = daysLeft(b.deadline)
            if (da === null) return 1
            if (db === null) return -1
            return da - db
        })

    return (
        <div className="flex-1 overflow-y-auto bg-[#07111f]">

            {/* Header */}
            <div className="px-8 pt-8 pb-0">
                <h1
                    className="text-[26px] font-bold text-white tracking-tight"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                    Добро пожаловать{user?.name ? `, ${user.name}` : ''} 👋
                </h1>
                <p className="text-[14px] text-[#3d5a72] mt-1">
                    {search
                        ? <>Результаты по запросу «<span className="text-white">{search}</span>»: <span className="text-[#00c6a7] font-semibold">{filtered.length}</span> возможностей</>
                        : <>Найдено <span className="text-[#00c6a7] font-semibold">{filtered.length}</span> возможностей</>
                    }
                </p>
                {!isAuthenticated && (
                    <p className="text-[12.5px] text-amber-400 mt-2">
                        Гранты доступны только авторизованным пользователям — сейчас показаны только стипендии и стажировки.{' '}
                        <button onClick={() => navigate('/auth')} className="underline hover:text-amber-300">Войти</button>
                    </p>
                )}
            </div>

            {/* Stats */}
            <div className="px-8 mt-6 grid grid-cols-4 gap-4">
                {[
                    { icon: TrendingUp,  label: 'Всего в базе',   value: String(items.length), color: 'text-[#00c6a7]',  bg: 'bg-[rgba(0,198,167,0.08)]'  },
                    { icon: Sparkles,    label: 'Гранты',         value: String(items.filter(i => i.type === 'grant').length),       color: 'text-purple-400', bg: 'bg-purple-900/20' },
                    { icon: Clock,       label: 'Стипендии',      value: String(items.filter(i => i.type === 'scholarship').length),  color: 'text-amber-400',  bg: 'bg-amber-900/20'  },
                    { icon: CheckCircle, label: 'Стажировки',     value: String(items.filter(i => i.type === 'internship').length),   color: 'text-green-400',  bg: 'bg-green-900/20'  },
                ].map(({ icon: Icon, label, value, color, bg }) => (
                    <div
                        key={label}
                        className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl px-5 py-4 flex items-center gap-4 hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150"
                    >
                        <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Icon size={18} className={color} />
                        </div>
                        <div>
                            <p className="text-[22px] font-bold text-white leading-none" style={{ fontFamily: "'Instrument Serif', serif" }}>
                                {value}
                            </p>
                            <p className="text-[12px] text-[#3d5a72] mt-0.5">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Banner */}
            {isAuthenticated && (
                <div className="mx-8 mt-5 px-5 py-3.5 bg-[rgba(0,198,167,0.06)] border border-[rgba(0,198,167,0.2)] rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#00c6a7] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sparkles size={15} className="text-[#07111f]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-semibold text-[#00c6a7]">AI-рекомендации · </span>
                        <span className="text-[13px] text-[#7a9bb5]">
                            Персональная подборка на основе ваших интересов
                        </span>
                    </div>
                    <button
                        onClick={() => navigate('/recommendations')}
                        className="text-[12px] font-semibold text-[#00c6a7] hover:text-white transition-colors whitespace-nowrap flex-shrink-0"
                    >
                        Смотреть все →
                    </button>
                </div>
            )}

            {/* Filters */}
            <div id="dashboard-filters" className="px-8 mt-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {typeTabs.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveType(tab.value)}
                            className={`
                                px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150
                                ${activeType === tab.value
                                    ? 'bg-[#00c6a7] text-[#07111f] font-bold shadow-[0_0_12px_rgba(0,198,167,0.3)]'
                                    : 'bg-[#0c1e33] border border-[rgba(255,255,255,0.08)] text-[#7a9bb5] hover:border-[rgba(0,198,167,0.3)] hover:text-white'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {[
                        { value: activeCountry, onChange: setActiveCountry, options: countries },
                        { value: activeSort,    onChange: setActiveSort,    options: sortOptions },
                    ].map(({ value, onChange, options }, i) => (
                        <div key={i} className="relative">
                            <select
                                value={value}
                                onChange={e => onChange(e.target.value)}
                                className="appearance-none pl-3 pr-7 py-1.5 bg-[#0c1e33] border border-[rgba(255,255,255,0.08)] rounded-lg text-[12.5px] text-[#7a9bb5] focus:outline-none focus:ring-2 focus:ring-[rgba(0,198,167,0.25)] hover:border-[rgba(0,198,167,0.25)] transition-colors cursor-pointer"
                            >
                                {options.map(o => <option key={o}>{o}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#3d5a72] pointer-events-none" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Count */}
            <div className="px-8 mt-4 flex items-center gap-3">
                <p className="text-[12px] text-[#3d5a72]">
                    Показано <span className="font-medium text-[#7a9bb5]">{filtered.length}</span> из {items.length} результатов
                </p>
                {(activeType !== 'all' || activeCountry !== 'Все страны' || search) && (
                    <button
                        onClick={resetFilters}
                        className="text-[11.5px] text-[#3d5a72] hover:text-[#00c6a7] transition-colors border border-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded-md hover:border-[rgba(0,198,167,0.2)]"
                    >
                        Сбросить ×
                    </button>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="mx-8 mt-4 px-4 py-3 bg-red-900/20 border border-red-800/40 rounded-xl text-[13px] text-red-400">
                    {error}
                </div>
            )}

            {/* Cards */}
            <div className="px-8 mt-4 pb-10 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                ) : filtered.length > 0 ? (
                    filtered.map((grant, i) => (
                        <div
                            key={`${grant.type}-${grant.id}`}
                            className="animate-fade-in-up"
                            style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                        >
                            <GrantCard grant={grant} />
                        </div>
                    ))
                ) : (
                    <EmptyState query={search} onReset={resetFilters} />
                )}
            </div>
        </div>
    )
}
