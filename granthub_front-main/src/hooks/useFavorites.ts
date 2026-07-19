import { useCallback, useEffect, useState } from 'react'
import type { OpportunityType } from '../types'

// Избранное хранится локально в браузере (localStorage) — у backend нет
// эндпоинта для закладок, поэтому это client-side. Данные переживают
// перезагрузку и синхронизируются между всеми карточками на странице.
const KEY = 'granthub_favorites'
const EVT = 'granthub-favorites-changed'

export type FavKey = `${OpportunityType}:${number}`

export function favKey(type: OpportunityType, id: number): FavKey {
    return `${type}:${id}`
}

function read(): FavKey[] {
    try {
        const raw = localStorage.getItem(KEY)
        const arr = raw ? JSON.parse(raw) : []
        return Array.isArray(arr) ? arr : []
    } catch {
        return []
    }
}

function write(keys: FavKey[]) {
    localStorage.setItem(KEY, JSON.stringify(keys))
    // уведомляем остальные экземпляры хука в этой же вкладке
    window.dispatchEvent(new Event(EVT))
}

export function useFavorites() {
    const [keys, setKeys] = useState<FavKey[]>(read)

    useEffect(() => {
        const sync = () => setKeys(read())
        window.addEventListener(EVT, sync)          // тот же таб
        window.addEventListener('storage', sync)    // другие вкладки
        return () => {
            window.removeEventListener(EVT, sync)
            window.removeEventListener('storage', sync)
        }
    }, [])

    const isFavorite = useCallback(
        (type: OpportunityType, id: number) => keys.includes(favKey(type, id)),
        [keys],
    )

    const toggle = useCallback((type: OpportunityType, id: number) => {
        const k = favKey(type, id)
        const current = read()
        const next = current.includes(k) ? current.filter(x => x !== k) : [...current, k]
        write(next)
        setKeys(next)
    }, [])

    return { keys, count: keys.length, isFavorite, toggle }
}
