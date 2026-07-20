import { useEffect, useMemo, useState } from 'react'
import { BarChart2, TrendingUp, Clock, Globe } from 'lucide-react'
import { useAuthContext } from '../context/AuthContext'
import { fetchAllOpportunities } from '../services/api'
import { type Opportunity, daysLeft, opportunityStatus, typeLabels } from '../types'

export default function Analytics() {
    const { token } = useAuthContext()
    const [all, setAll]       = useState<Opportunity[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError]   = useState<string | null>(null)

    useEffect(() => {
        let alive = true
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true)
        fetchAllOpportunities(token)
            .then(data => { if (alive) setAll(data) })
            .catch(() => { if (alive) setError('Не удалось загрузить данные — проверьте, что бэкенд запущен') })
            .finally(() => { if (alive) setLoading(false) })
        return () => { alive = false }
    }, [token])

    const stats = useMemo(() => {
        const byType   = { grant: 0, scholarship: 0, internship: 0 }
        const byStatus = { open: 0, closing: 0, new: 0, expired: 0 }
        const byCountry = new Map<string, number>()
        let withDeadline = 0

        for (const o of all) {
            byType[o.type]++
            byStatus[opportunityStatus(o)]++
            if (o.country) byCountry.set(o.country, (byCountry.get(o.country) ?? 0) + 1)
            if (daysLeft(o.deadline) !== null) withDeadline++
        }

        const topCountries = [...byCountry.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)

        const closingSoon = all
            .map(o => ({ o, d: daysLeft(o.deadline) }))
            .filter(x => x.d !== null && x.d >= 0 && x.d <= 7)
            .sort((a, b) => (a.d! - b.d!))

        return { total: all.length, byType, byStatus, topCountries, withDeadline, closingSoon }
    }, [all])

    if (loading) return <Centered text="Загрузка аналитики…" />
    if (error)   return <Centered text={error} tone="error" />

    const maxCountry = Math.max(1, ...stats.topCountries.map(c => c[1]))

    return (
        <div className="flex-1 overflow-y-auto bg-[#07111f]">
            <div className="px-8 pt-8 pb-4">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 bg-[rgba(0,198,167,0.12)] rounded-lg flex items-center justify-center">
                        <BarChart2 size={14} className="text-[#00c6a7]" />
                    </div>
                    <h1 className="text-[26px] font-bold text-white tracking-tight"
                        style={{ fontFamily: "'Instrument Serif', serif" }}>
                        Аналитика
                    </h1>
                </div>
                <p className="text-[14px] text-[#3d5a72]">Обзор всех возможностей в базе</p>
            </div>

            <div className="px-8 pb-10 space-y-6">
                {/* KPI row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Kpi icon={TrendingUp} label="Всего в базе"      value={stats.total} />
                    <Kpi icon={Clock}      label="С дедлайном"       value={stats.withDeadline} />
                    <Kpi icon={Clock}      label="Закрываются ≤7 дн." value={stats.closingSoon.length} accent="amber" />
                    <Kpi icon={Globe}      label="Стран"             value={stats.topCountries.length} />
                </div>

                {/* By type + by status */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Panel title="По типам">
                        {(['grant', 'scholarship', 'internship'] as const).map(t => (
                            <Row key={t} label={typeLabels[t]} value={stats.byType[t]} max={Math.max(1, stats.total)} />
                        ))}
                    </Panel>
                    <Panel title="По статусу">
                        <Row label="Открыт" value={stats.byStatus.open}    max={Math.max(1, stats.total)} color="bg-green-400" />
                        <Row label="Новый"  value={stats.byStatus.new}     max={Math.max(1, stats.total)} color="bg-[#00c6a7]" />
                        <Row label="Скоро"  value={stats.byStatus.closing} max={Math.max(1, stats.total)} color="bg-amber-400" />
                        <Row label="Закрыт" value={stats.byStatus.expired} max={Math.max(1, stats.total)} color="bg-white/30" />
                    </Panel>
                </div>

                {/* Top countries */}
                <Panel title="Топ стран">
                    {stats.topCountries.length === 0
                        ? <p className="text-[13px] text-[#3d5a72]">Нет данных по странам</p>
                        : stats.topCountries.map(([country, n]) => (
                            <Row key={country} label={country} value={n} max={maxCountry} />
                        ))}
                </Panel>

                {/* Closing soon */}
                <Panel title="Скоро закрываются">
                    {stats.closingSoon.length === 0
                        ? <p className="text-[13px] text-[#3d5a72]">Ничего не закрывается в ближайшую неделю</p>
                        : stats.closingSoon.slice(0, 8).map(({ o, d }) => (
                            <div key={`${o.type}-${o.id}`} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                                <span className="text-[13px] text-[#7a9bb5] truncate pr-4">{o.title}</span>
                                <span className={`text-[12px] font-semibold whitespace-nowrap ${d! <= 3 ? 'text-amber-400' : 'text-[#3d5a72]'}`}>
                                    {d} дн.
                                </span>
                            </div>
                        ))}
                </Panel>
            </div>
        </div>
    )
}

function Kpi({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent?: 'amber' }) {
    return (
        <div className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl px-5 py-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${accent === 'amber' ? 'bg-amber-900/30' : 'bg-[rgba(0,198,167,0.12)]'}`}>
                <Icon size={16} className={accent === 'amber' ? 'text-amber-400' : 'text-[#00c6a7]'} />
            </div>
            <div>
                <p className="text-[22px] font-bold text-white leading-none">{value}</p>
                <p className="text-[11.5px] text-[#3d5a72] mt-1">{label}</p>
            </div>
        </div>
    )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
            <p className="text-[13px] font-semibold text-white mb-3">{title}</p>
            <div className="space-y-2.5">{children}</div>
        </div>
    )
}

function Row({ label, value, max, color = 'bg-[#00c6a7]' }: { label: string; value: number; max: number; color?: string }) {
    const pct = Math.round((value / max) * 100)
    return (
        <div>
            <div className="flex items-center justify-between text-[12.5px] mb-1">
                <span className="text-[#7a9bb5] truncate pr-3">{label}</span>
                <span className="text-white font-medium">{value}</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    )
}

function Centered({ text, tone }: { text: string; tone?: 'error' }) {
    return (
        <div className="flex-1 flex items-center justify-center bg-[#07111f]">
            <p className={`text-[14px] ${tone === 'error' ? 'text-red-400' : 'text-[#3d5a72]'}`}>{text}</p>
        </div>
    )
}
