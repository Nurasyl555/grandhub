import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
    ArrowLeft, Calendar, MapPin, Bookmark,
    ArrowUpRight, Building2, Globe, Clock, CheckCircle,
    AlertTriangle, Sparkles, Share2, ExternalLink
} from 'lucide-react'
import { useAuthContext } from '../context/AuthContext'
import { fetchOpportunity, fetchGrants, fetchScholarships, fetchInternships } from '../services/api'
import { type Opportunity, type OpportunityType, daysLeft, opportunityStatus, opportunityTags, typeLabels } from '../types'

const statusConfig = {
    open:    { label: 'Открыт',  classes: 'bg-green-900/30 text-green-400 border-green-800/50',               icon: CheckCircle  },
    closing: { label: 'Скоро',   classes: 'bg-amber-900/30 text-amber-400 border-amber-800/50',               icon: AlertTriangle },
    new:     { label: 'Новый',   classes: 'bg-[rgba(0,198,167,0.1)] text-[#00c6a7] border-[rgba(0,198,167,0.2)]', icon: Sparkles },
    expired: { label: 'Закрыт',  classes: 'bg-white/5 text-white/40 border-white/10',                          icon: Clock },
}

// ── Section wrapper ───────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
            <h2 className="text-[14px] font-semibold text-[#7a9bb5] uppercase tracking-wider mb-4">{title}</h2>
            {children}
        </div>
    )
}

// ── Info row ──────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0">
            <div className="w-7 h-7 rounded-lg bg-[#07111f] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={13} className="text-[#3d5a72]" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[#3d5a72] uppercase tracking-wider">{label}</p>
                <p className="text-[13.5px] text-white mt-0.5">{value}</p>
            </div>
        </div>
    )
}

// ── Related card ────────────────────────────────────────
function RelatedCard({ grant }: { grant: Opportunity }) {
    const navigate = useNavigate()
    return (
        <div
            onClick={() => navigate(`/opportunity/${grant.type}/${grant.id}`)}
            className="bg-[#07111f] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 cursor-pointer hover:border-[rgba(0,198,167,0.25)] hover:-translate-y-0.5 transition-all duration-150 flex flex-col gap-2.5"
        >
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md border border-white/10 text-white/50 w-fit">
                {typeLabels[grant.type]}
            </span>
            <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 hover:text-[#00c6a7] transition-colors">
                {grant.title}
            </p>
            <p className="text-[11.5px] text-[#3d5a72]">{grant.provider}</p>
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────
export default function GrantDetail() {
    const { type, id } = useParams<{ type: OpportunityType; id: string }>()
    const navigate = useNavigate()
    const { token } = useAuthContext()

    const [grant, setGrant]     = useState<Opportunity | null | undefined>(undefined) // undefined = loading
    const [related, setRelated] = useState<Opportunity[]>([])
    const [saved, setSaved]     = useState(false)
    const [copied, setCopied]   = useState(false)

    useEffect(() => {
        if (!type || !id) return
        let cancelled = false
        // Сбрасываем в "загрузка" синхронно при смене type/id, чтобы не
        // мигал старый грант перед подгрузкой нового.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGrant(undefined)

        fetchOpportunity(type, Number(id), token).then(item => {
            if (cancelled) return
            setGrant(item)
        })

        const fetchByType = type === 'grant' ? fetchGrants : type === 'scholarship' ? fetchScholarships : fetchInternships
        fetchByType(token).then(list => {
            if (cancelled) return
            setRelated(list.filter(g => g.id !== Number(id)).slice(0, 2))
        }).catch(() => {})

        return () => { cancelled = true }
    }, [type, id, token])

    function handleShare() {
        navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // ── Loading ──
    if (grant === undefined) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#07111f]">
                <div className="w-8 h-8 border-2 border-[#00c6a7]/30 border-t-[#00c6a7] rounded-full animate-spin" />
            </div>
        )
    }

    // ── 404 ──
    if (!grant) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#07111f] gap-4">
                <div className="w-16 h-16 bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-2xl flex items-center justify-center text-3xl">
                    🔍
                </div>
                <p className="text-white font-semibold text-[16px]">Не найдено</p>
                <p className="text-[#3d5a72] text-[13px]">Возможно, запись была удалена или ссылка неверна</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mt-2 px-5 py-2.5 bg-[#00c6a7] text-[#07111f] font-bold rounded-xl hover:bg-[#00ddb9] active:scale-95 transition-all text-[13.5px]"
                >
                    На главную
                </button>
            </div>
        )
    }

    const status      = statusConfig[opportunityStatus(grant)]
    const StatusIcon  = status.icon
    const tags        = opportunityTags(grant)
    const left        = daysLeft(grant.deadline)
    const isUrgent    = left !== null && left <= 3 && left >= 0

    return (
        <div className="flex-1 overflow-y-auto bg-[#07111f]">
            <div className="max-w-5xl mx-auto px-8 py-8">

                {/* Back */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-[13px] text-[#3d5a72] hover:text-white transition-colors mb-6 group"
                >
                    <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                    Назад
                </button>

                <div className="flex gap-6 items-start">

                    {/* ── Left column ── */}
                    <div className="flex-1 min-w-0 flex flex-col gap-5">

                        {/* Hero */}
                        <div className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 animate-fade-in-up" style={{ animationFillMode: 'both' }}>

                            {isUrgent && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-900/20 border border-amber-800/40 rounded-lg mb-4 text-[12.5px] text-amber-400 font-semibold">
                                    <AlertTriangle size={13} />
                                    Дедлайн через {left} дн. — не упустите!
                                </div>
                            )}

                            <div className="flex items-center gap-2 flex-wrap mb-3">
                                <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border ${status.classes}`}>
                                    <StatusIcon size={11} />
                                    {status.label}
                                </span>
                                <span className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-white/10 text-white/60">
                                    {typeLabels[grant.type]}
                                </span>
                            </div>

                            <h1
                                className="text-[24px] font-bold text-white leading-tight tracking-tight mb-1"
                                style={{ fontFamily: "'Instrument Serif', serif" }}
                            >
                                {grant.title}
                            </h1>
                            <p className="text-[13px] text-[#3d5a72] mb-5">{grant.provider}</p>

                            <p className="text-[14px] text-[#7a9bb5] leading-relaxed whitespace-pre-line">
                                {grant.description}
                            </p>

                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-5">
                                    {tags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1 text-[11.5px] px-2.5 py-1 bg-white/[0.04] text-[#7a9bb5] rounded-md border border-white/[0.06]">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Related */}
                        {related.length > 0 && (
                            <div className="animate-fade-in-up" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
                                <p className="text-[12px] font-semibold text-[#3d5a72] uppercase tracking-wider mb-3">
                                    Похожие {typeLabels[grant.type].toLowerCase()}
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {related.map(g => <RelatedCard key={g.id} grant={g} />)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right sidebar ── */}
                    <div className="w-72 flex-shrink-0 flex flex-col gap-4 sticky top-4">

                        <div className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 animate-fade-in-up" style={{ animationFillMode: 'both' }}>
                            {/* Apply button — открывает оригинальную страницу подачи заявки */}
                            <a
                                href={grant.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] transition-all duration-150 active:scale-[0.98] mb-2 bg-[#00c6a7] text-[#07111f] hover:bg-[#00ddb9]"
                            >
                                Подать заявку <ArrowUpRight size={15} />
                            </a>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSaved(s => !s)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[12.5px] font-medium transition-all duration-150
                                        ${saved
                                            ? 'bg-[rgba(0,198,167,0.12)] border-[rgba(0,198,167,0.3)] text-[#00c6a7]'
                                            : 'border-[rgba(255,255,255,0.08)] text-[#7a9bb5] hover:border-[rgba(0,198,167,0.2)] hover:text-white'
                                        }`}
                                >
                                    <Bookmark size={13} className={saved ? 'fill-[#00c6a7]' : ''} />
                                    {saved ? 'Сохранено' : 'Сохранить'}
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] text-[#7a9bb5] text-[12.5px] font-medium hover:border-[rgba(0,198,167,0.2)] hover:text-white transition-all duration-150"
                                >
                                    {copied ? <><CheckCircle size={13} className="text-[#00c6a7]" /> Скопировано</> : <><Share2 size={13} /> Поделиться</>}
                                </button>
                            </div>
                        </div>

                        <Section title="Детали">
                            <InfoRow icon={Calendar}  label="Дедлайн"      value={
                                grant.deadline_text ?? (grant.deadline ? new Date(grant.deadline).toLocaleDateString('ru-RU') : 'Не указан')
                            } />
                            {left !== null && <InfoRow icon={Clock} label="Осталось" value={left >= 0 ? `${left} дней` : 'Срок истёк'} />}
                            {grant.country && <InfoRow icon={MapPin} label="Страна" value={grant.country} />}
                            <InfoRow icon={Building2} label="Организация" value={grant.provider} />
                            <InfoRow icon={Globe} label="Тип" value={typeLabels[grant.type]} />
                        </Section>

                        <a
                            href={grant.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-2.5 border border-[rgba(255,255,255,0.08)] text-[#7a9bb5] text-[12.5px] font-medium rounded-xl hover:border-[rgba(0,198,167,0.2)] hover:text-white transition-all duration-150"
                        >
                            <ExternalLink size={13} />
                            Открыть официальный сайт
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
