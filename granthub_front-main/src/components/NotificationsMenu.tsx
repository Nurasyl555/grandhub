import { useEffect, useRef, useState } from 'react'
import { Bell, Clock, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { fetchAllOpportunities } from '../services/api'
import { type Opportunity, daysLeft, typeLabels } from '../types'

type Note = { o: Opportunity; d: number }

export default function NotificationsMenu() {
    const navigate = useNavigate()
    const { token } = useAuthContext()
    const [open, setOpen]     = useState(false)
    const [notes, setNotes]   = useState<Note[]>([])
    const [loaded, setLoaded] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    // Загружаем данные один раз при первом открытии
    useEffect(() => {
        if (!open || loaded) return
        fetchAllOpportunities(token)
            .then(data => {
                const upcoming = data
                    .map(o => ({ o, d: daysLeft(o.deadline) }))
                    .filter((x): x is Note => x.d !== null && x.d >= 0 && x.d <= 7)
                    .sort((a, b) => a.d - b.d)
                    .slice(0, 8)
                setNotes(upcoming)
            })
            .catch(() => setNotes([]))
            .finally(() => setLoaded(true))
    }, [open, loaded, token])

    // Клик снаружи закрывает меню
    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        if (open) document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [open])

    const hasNotes = notes.length > 0

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                aria-label="Уведомления"
                className={`relative w-9 h-9 flex items-center justify-center border rounded-lg transition-all
                    ${open
                        ? 'bg-[#0c1e33] border-[rgba(0,198,167,0.3)]'
                        : 'border-[rgba(255,255,255,0.08)] hover:bg-[#0c1e33]'}`}
            >
                <Bell size={16} className="text-[#7a9bb5]" />
                {(!loaded || hasNotes) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00c6a7] rounded-full ring-2 ring-[#050e1a] shadow-[0_0_6px_#00c6a7]" />
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-[#0a1626] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                        <span className="text-[13.5px] font-semibold text-white">Уведомления</span>
                        <button onClick={() => setOpen(false)} className="text-[#3d5a72] hover:text-white transition-colors">
                            <X size={15} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="max-h-80 overflow-y-auto">
                        {!loaded ? (
                            <p className="px-4 py-8 text-center text-[13px] text-[#3d5a72]">Загрузка…</p>
                        ) : !hasNotes ? (
                            <div className="px-4 py-10 text-center">
                                <Bell size={22} className="text-[#3d5a72] mx-auto mb-2" />
                                <p className="text-[13px] text-[#7a9bb5]">Пока нет уведомлений</p>
                                <p className="text-[11.5px] text-[#3d5a72] mt-1">Здесь появятся возможности с близким дедлайном</p>
                            </div>
                        ) : (
                            notes.map(({ o, d }) => (
                                <button
                                    key={`${o.type}-${o.id}`}
                                    onClick={() => { setOpen(false); navigate(`/opportunity/${o.type}/${o.id}`) }}
                                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#0c1e33] transition-colors text-left border-b border-[rgba(255,255,255,0.04)] last:border-0"
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                                        ${d <= 3 ? 'bg-amber-900/30' : 'bg-[rgba(0,198,167,0.12)]'}`}>
                                        <Clock size={13} className={d <= 3 ? 'text-amber-400' : 'text-[#00c6a7]'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12.5px] text-white leading-snug line-clamp-2">{o.title}</p>
                                        <p className="text-[11px] text-[#3d5a72] mt-0.5">
                                            {typeLabels[o.type]} ·{' '}
                                            <span className={d <= 3 ? 'text-amber-400 font-semibold' : ''}>
                                                {d === 0 ? 'сегодня дедлайн' : `осталось ${d} дн.`}
                                            </span>
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {hasNotes && (
                        <button
                            onClick={() => { setOpen(false); navigate('/dashboard') }}
                            className="w-full px-4 py-2.5 text-[12.5px] font-medium text-[#00c6a7] hover:bg-[#0c1e33] border-t border-[rgba(255,255,255,0.06)] transition-colors"
                        >
                            Показать все возможности
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
