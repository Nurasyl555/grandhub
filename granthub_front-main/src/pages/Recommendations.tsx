import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, TrendingUp, Calendar, MapPin, ArrowUpRight, RefreshCw, Lock } from 'lucide-react'
import { useAuthContext } from '../context/AuthContext'
import { fetchRecommendations, recomputeRecommendations } from '../services/api'
import { type Opportunity, daysLeft, typeLabels } from '../types'

// ── Skeleton ──────────────────────────────────────────────────
function Bone({ className = '' }: { className?: string }) {
    return <div className={`bg-white/[0.06] rounded animate-pulse ${className}`} />
}

function SkeletonCard() {
    return (
        <div className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 flex flex-col gap-3.5 animate-pulse">
            <div className="flex justify-between">
                <div className="flex flex-col gap-2 flex-1">
                    <div className="flex gap-2"><Bone className="h-4 w-14" /><Bone className="h-4 w-20" /></div>
                    <Bone className="h-4 w-3/4" />
                    <Bone className="h-3 w-1/3" />
                </div>
                <Bone className="w-8 h-8 rounded-lg flex-shrink-0" />
            </div>
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-4/5" />
            <div className="flex gap-3"><Bone className="h-3 w-24" /><Bone className="h-3 w-20" /></div>
            <Bone className="h-1 w-full rounded-full" />
            <div className="flex justify-between pt-2 border-t border-white/[0.05]">
                <Bone className="h-6 w-24" /><Bone className="h-7 w-20 rounded-lg" />
            </div>
        </div>
    )
}

// ── Recommendation card ───────────────────────────────────────
function RecommendationCard({ grant, index }: { grant: Opportunity; index: number }) {
    const navigate = useNavigate()
    const left = daysLeft(grant.deadline)
    const isUrgent = left !== null && left <= 3 && left >= 0

    function handleApply(e: React.MouseEvent) {
        e.stopPropagation()
        window.open(grant.source_url, '_blank', 'noopener,noreferrer')
    }

    return (
        <div
            onClick={() => navigate(`/opportunity/${grant.type}/${grant.id}`)}
            className="relative bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 cursor-pointer hover:border-[rgba(0,198,167,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-200 flex flex-col gap-3.5 animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
        >
            {isUrgent && <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-amber-500 to-transparent" />}

            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="w-5 h-5 rounded-full bg-[rgba(0,198,167,0.15)] border border-[rgba(0,198,167,0.3)] text-[#00c6a7] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {index + 1}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[rgba(0,198,167,0.1)] text-[#00c6a7]">
                            {typeLabels[grant.type]}
                        </span>
                    </div>
                    <h3 className="text-[14.5px] font-semibold text-white leading-snug line-clamp-2">
                        {grant.title}
                    </h3>
                    <p className="text-[12px] text-[#3d5a72] mt-0.5 truncate">{grant.provider}</p>
                </div>
            </div>

            <p className="text-[12.5px] text-[#7a9bb5] leading-relaxed line-clamp-2">{grant.description}</p>

            <div className="flex items-center gap-4 text-[12px] text-[#3d5a72]">
                <span className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    {grant.deadline ? new Date(grant.deadline).toLocaleDateString('ru-RU') : 'Без дедлайна'}
                </span>
                {grant.country && <span className="flex items-center gap-1.5"><MapPin size={12} />{grant.country}</span>}
            </div>

            {grant.matchScore !== undefined && (
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#00c6a7]" style={{ width: `${grant.matchScore}%` }} />
                    </div>
                    <span className="text-[11px] whitespace-nowrap">
                        <span className="font-semibold text-[#00c6a7]">{grant.matchScore}%</span>
                        <span className="text-[#3d5a72]"> совпадение</span>
                    </span>
                </div>
            )}

            <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.05]">
                <span className="text-[12px] text-[#3d5a72] truncate">{grant.provider}</span>
                <button
                    onClick={handleApply}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-bold rounded-lg transition-all active:scale-95 bg-[#00c6a7] text-[#07111f] hover:bg-[#00ddb9]"
                >
                    Подать <ArrowUpRight size={12} />
                </button>
            </div>
        </div>
    )
}

// ── Not logged in ─────────────────────────────────────────────
function NotAuthenticated() {
    const navigate = useNavigate()
    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#07111f] gap-5">
            <div className="w-16 h-16 bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-2xl flex items-center justify-center">
                <Lock size={24} className="text-[#3d5a72]" />
            </div>
            <div className="text-center">
                <p className="text-white font-semibold text-[16px]">Войдите, чтобы видеть рекомендации</p>
                <p className="text-[#3d5a72] text-[13px] mt-1 max-w-xs">
                    AI-рекомендации персонализированы под ваш профиль и доступны только авторизованным пользователям
                </p>
            </div>
            <button
                onClick={() => navigate('/auth')}
                className="px-6 py-2.5 bg-[#00c6a7] text-[#07111f] font-bold rounded-xl hover:bg-[#00ddb9] active:scale-95 transition-all text-[14px]"
            >
                Войти или зарегистрироваться
            </button>
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────
export default function Recommendations() {
    const { isAuthenticated, token, user } = useAuthContext()
    const [grants,    setGrants]    = useState<Opportunity[]>([])
    const [loading,   setLoading]   = useState(true)
    const [error,     setError]     = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    async function loadRecommendations() {
        if (!token) return
        setLoading(true)
        setError(null)
        try {
            const data = await fetchRecommendations(token)
            setGrants(data)
        } catch {
            setError('Не удалось загрузить рекомендации — проверьте соединение с сервером')
        } finally {
            setLoading(false)
        }
    }

    async function handleRecompute() {
        if (!token) return
        setRefreshing(true)
        setError(null)
        try {
            const data = await recomputeRecommendations(token)
            setGrants(data)
            if (data.length === 0) {
                setError('Рекомендаций пока нет — заполните поле «Интересы» в профиле, чтобы ИИ мог что-то подобрать')
            }
        } catch {
            setError('Не удалось пересчитать рекомендации')
        } finally {
            setRefreshing(false)
        }
    }

    useEffect(() => {
        if (isAuthenticated) loadRecommendations()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated])

    if (!isAuthenticated) return <NotAuthenticated />

    return (
        <div className="flex-1 overflow-y-auto bg-[#07111f]">
            <div className="px-8 pt-8 pb-0">

                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 bg-[rgba(0,198,167,0.12)] rounded-lg flex items-center justify-center">
                                <Sparkles size={14} className="text-[#00c6a7]" />
                            </div>
                            <h1 className="text-[26px] font-bold text-white tracking-tight"
                                style={{ fontFamily: "'Instrument Serif', serif" }}>
                                AI-рекомендации
                            </h1>
                        </div>
                        <p className="text-[14px] text-[#3d5a72]">
                            Подобрано специально для{' '}
                            <span className="text-white font-medium">{user?.name ?? 'вас'}</span>
                        </p>
                    </div>

                    <button
                        onClick={handleRecompute}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 border border-[rgba(255,255,255,0.08)] text-[#7a9bb5] text-[12.5px] font-medium rounded-xl hover:border-[rgba(0,198,167,0.2)] hover:text-white transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                        Пересчитать
                    </button>
                </div>

                {/* AI banner */}
                <div className="px-5 py-3.5 bg-[rgba(0,198,167,0.06)] border border-[rgba(0,198,167,0.2)] rounded-xl flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-[#00c6a7] rounded-lg flex items-center justify-center flex-shrink-0">
                        <TrendingUp size={15} className="text-[#07111f]" />
                    </div>
                    <div className="flex-1">
                        <span className="text-[13px] font-semibold text-[#00c6a7]">Персональная подборка · </span>
                        <span className="text-[13px] text-[#7a9bb5]">
                            TF-IDF-модель сравнила ваши интересы с описаниями грантов, стипендий и стажировок и отобрала{' '}
                            <strong className="text-white">{grants.length}</strong> наиболее подходящих
                        </span>
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div className="px-8 pb-10">
                {error && (
                    <div className="px-4 py-3 bg-red-900/20 border border-red-800/40 rounded-xl text-[13px] text-red-400 mb-4">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {loading
                        ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                        : grants.length > 0
                            ? grants.map((g, i) => <RecommendationCard key={`${g.type}-${g.id}`} grant={g} index={i} />)
                            : !error && (
                                <div className="col-span-3 text-center py-20 text-[#3d5a72]">
                                    <p className="text-[15px] text-[#7a9bb5] font-medium">Рекомендации пока не готовы</p>
                                    <p className="text-[13px] mt-1">Нажмите «Пересчитать» или укажите интересы в профиле</p>
                                </div>
                            )
                    }
                </div>
            </div>
        </div>
    )
}
