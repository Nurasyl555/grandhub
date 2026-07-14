import { useState } from 'react'
import { Calendar, MapPin, Bookmark, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { type Opportunity, daysLeft, opportunityStatus, opportunityTags, typeLabels } from '../types'

type Props = { grant: Opportunity }

const statusConfig = {
    open:    { label: 'Открыт', classes: 'bg-green-900/30 text-green-400 border-green-800/50' },
    closing: { label: 'Скоро',  classes: 'bg-amber-900/30 text-amber-400 border-amber-800/50' },
    new:     { label: 'Новый',  classes: 'bg-[rgba(0,198,167,0.1)] text-[#00c6a7] border-[rgba(0,198,167,0.2)]' },
    expired: { label: 'Закрыт', classes: 'bg-white/5 text-white/40 border-white/10' },
}

const typeColors: Record<string, string> = {
    grant:       'bg-blue-900/30 text-blue-400',
    scholarship: 'bg-purple-900/30 text-purple-400',
    internship:  'bg-[rgba(0,198,167,0.1)] text-[#00c6a7]',
}

// Match score → color + label
function matchMeta(score: number): { bar: string; label: string } {
    if (score >= 90) return { bar: 'bg-[#00c6a7]',   label: 'Отличное совпадение' }
    if (score >= 75) return { bar: 'bg-blue-400',     label: 'Хорошее совпадение'  }
    return              { bar: 'bg-[#3d5a72]',        label: 'Совпадение'           }
}

export default function GrantCard({ grant }: Props) {
    const navigate    = useNavigate()
    const [saved, setSaved] = useState(false)

    const status   = statusConfig[opportunityStatus(grant)]
    const catColor = typeColors[grant.type] ?? 'bg-white/5 text-white/50'
    const tags     = opportunityTags(grant)
    const left     = daysLeft(grant.deadline)

    const isUrgent  = left !== null && left <= 3 && left >= 0
    const isSoonish = left !== null && left <= 7 && left > 3

    function handleApply(e: React.MouseEvent) {
        e.stopPropagation()
        window.open(grant.source_url, '_blank', 'noopener,noreferrer')
    }

    return (
        <div
            onClick={() => navigate(`/opportunity/${grant.type}/${grant.id}`)}
            className="
                relative bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-5
                hover:border-[rgba(0,198,167,0.3)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]
                hover:-translate-y-0.5
                transition-all duration-200 group cursor-pointer flex flex-col gap-3.5
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c6a7]
            "
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate(`/opportunity/${grant.type}/${grant.id}`)}
        >
            {/* Urgent deadline stripe */}
            {isUrgent && (
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-amber-500 via-amber-400 to-transparent" />
            )}

            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${status.classes}`}>
                            {status.label}
                        </span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${catColor}`}>
                            {typeLabels[grant.type]}
                        </span>
                    </div>
                    <h3 className="text-[14.5px] font-semibold text-white leading-snug group-hover:text-[#00c6a7] transition-colors duration-150 line-clamp-2">
                        {grant.title}
                    </h3>
                    <p className="text-[12px] text-[#3d5a72] mt-0.5 truncate">{grant.provider}</p>
                </div>

                {/* Bookmark */}
                <button
                    onClick={e => { e.stopPropagation(); setSaved(s => !s) }}
                    aria-label={saved ? 'Убрать из избранного' : 'Добавить в избранное'}
                    className={`
                        w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-150 flex-shrink-0
                        ${saved
                            ? 'bg-[rgba(0,198,167,0.15)] border-[rgba(0,198,167,0.4)]'
                            : 'border-[rgba(255,255,255,0.08)] hover:bg-[rgba(0,198,167,0.08)] hover:border-[rgba(0,198,167,0.25)]'
                        }
                    `}
                >
                    <Bookmark
                        size={14}
                        className={`transition-colors duration-150 ${saved ? 'text-[#00c6a7] fill-[#00c6a7]' : 'text-[#3d5a72]'}`}
                    />
                </button>
            </div>

            {/* Description */}
            <p className="text-[12.5px] text-[#7a9bb5] leading-relaxed line-clamp-2">
                {grant.description}
            </p>

            {/* Meta row */}
            <div className="flex items-center gap-4 text-[12px] text-[#3d5a72]">
                <span className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    {grant.deadline_text ?? (grant.deadline ? new Date(grant.deadline).toLocaleDateString('ru-RU') : 'Без дедлайна')}
                    {isUrgent && (
                        <span className="text-amber-400 font-bold animate-pulse">· {left} дн.!</span>
                    )}
                    {isSoonish && (
                        <span className="text-amber-400 font-semibold">· {left} дн.</span>
                    )}
                </span>
                {grant.country && (
                    <span className="flex items-center gap-1.5">
                        <MapPin size={12} />
                        {grant.country}
                    </span>
                )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                        <span key={tag} className="text-[11px] px-2 py-0.5 bg-white/[0.04] text-[#7a9bb5] rounded-md border border-white/[0.06] hover:border-[rgba(0,198,167,0.2)] hover:text-[#00c6a7] transition-colors duration-150 cursor-default">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Match score bar — только когда пришли из /recommendations */}
            {grant.matchScore !== undefined && (
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${matchMeta(grant.matchScore).bar}`}
                            style={{ width: `${grant.matchScore}%` }}
                        />
                    </div>
                    <span className="text-[11px] text-[#3d5a72] whitespace-nowrap">
                        <span className="font-semibold text-[#00c6a7]">{grant.matchScore}%</span> · {matchMeta(grant.matchScore).label}
                    </span>
                </div>
            )}

            {/* Bottom */}
            <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.05]">
                <span className="text-[12px] text-[#3d5a72] truncate">{grant.provider}</span>

                <button
                    onClick={handleApply}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-bold rounded-lg transition-all duration-150 active:scale-95 bg-[#00c6a7] text-[#07111f] hover:bg-[#00ddb9]"
                >
                    Подать <ArrowUpRight size={12} />
                </button>
            </div>
        </div>
    )
}
