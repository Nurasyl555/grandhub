import { useEffect, useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { fetchAllOpportunities } from '../services/api'
import { useFavorites, favKey } from '../hooks/useFavorites'
import GrantCard from '../components/GrantCard'
import type { Opportunity } from '../types'

export default function Favorites() {
    const { token } = useAuthContext()
    const { keys, count } = useFavorites()
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

    const favorites = useMemo(
        () => all.filter(o => keys.includes(favKey(o.type, o.id))),
        [all, keys],
    )

    return (
        <div className="flex-1 overflow-y-auto bg-[#07111f]">
            <div className="px-8 pt-8 pb-4">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 bg-[rgba(0,198,167,0.12)] rounded-lg flex items-center justify-center">
                        <Star size={14} className="text-[#00c6a7]" />
                    </div>
                    <h1 className="text-[26px] font-bold text-white tracking-tight"
                        style={{ fontFamily: "'Instrument Serif', serif" }}>
                        Избранное
                    </h1>
                </div>
                <p className="text-[14px] text-[#3d5a72]">
                    {count > 0
                        ? <>Сохранено <span className="text-white font-medium">{count}</span> возможностей</>
                        : 'Здесь появятся возможности, которые вы отметили закладкой'}
                </p>
            </div>

            <div className="px-8 pb-10">
                {error && (
                    <div className="px-4 py-3 bg-red-900/20 border border-red-800/40 rounded-xl text-[13px] text-red-400 mb-4">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-20 text-[#3d5a72] text-[14px]">Загрузка…</div>
                ) : favorites.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {favorites.map(g => <GrantCard key={favKey(g.type, g.id)} grant={g} />)}
                    </div>
                ) : !error && (
                    <EmptyState />
                )}
            </div>
        </div>
    )
}

function EmptyState() {
    const navigate = useNavigate()
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="w-16 h-16 bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-2xl flex items-center justify-center">
                <Star size={24} className="text-[#3d5a72]" />
            </div>
            <div>
                <p className="text-white font-semibold text-[16px]">Пока пусто</p>
                <p className="text-[#3d5a72] text-[13px] mt-1 max-w-xs">
                    Нажмите на иконку закладки на любой карточке, чтобы сохранить возможность сюда
                </p>
            </div>
            <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2.5 bg-[#00c6a7] text-[#07111f] font-bold rounded-xl hover:bg-[#00ddb9] active:scale-95 transition-all text-[14px]"
            >
                Перейти к возможностям
            </button>
        </div>
    )
}
