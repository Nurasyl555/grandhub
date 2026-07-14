import type { Opportunity, OpportunityType } from '../types'

export const API_BASE = 'http://127.0.0.1:8000'

async function getJson<T>(url: string, token?: string | null): Promise<T> {
    const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(`Ошибка ${res.status}`)
    return res.json()
}

function withType(type: OpportunityType) {
    return (item: Record<string, unknown>): Opportunity => ({ ...item, type }) as Opportunity
}

// Гранты требуют авторизации (RoleChecker на backend) — без токена вернём [].
export async function fetchGrants(token?: string | null): Promise<Opportunity[]> {
    if (!token) return []
    const items = await getJson<Record<string, unknown>[]>(`${API_BASE}/api/v1/grants/grants/`, token)
    return items.map(withType('grant'))
}

export async function fetchScholarships(): Promise<Opportunity[]> {
    const items = await getJson<Record<string, unknown>[]>(`${API_BASE}/api/v1/scholarships/`)
    return items.map(withType('scholarship'))
}

export async function fetchInternships(): Promise<Opportunity[]> {
    const items = await getJson<Record<string, unknown>[]>(`${API_BASE}/api/v1/internships/`)
    return items.map(withType('internship'))
}

export async function fetchOpportunity(type: OpportunityType, id: number, token?: string | null): Promise<Opportunity | null> {
    const path = type === 'grant' ? 'grants/grants' : type === 'scholarship' ? 'scholarships' : 'internships'
    try {
        const item = await getJson<Record<string, unknown>>(`${API_BASE}/api/v1/${path}/${id}`, token)
        return withType(type)(item)
    } catch {
        return null
    }
}

// Гранты могут требовать авторизации — тихо пропускаем, если её нет или сервис недоступен.
export async function fetchAllOpportunities(token?: string | null): Promise<Opportunity[]> {
    const results = await Promise.allSettled([
        fetchGrants(token),
        fetchScholarships(),
        fetchInternships(),
    ])
    return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []))
}

type RecommendationEntry = {
    type: OpportunityType
    item_id: number
    score: number
    source_model: string
    data: Record<string, unknown>
}

function mapRecommendation(entry: RecommendationEntry): Opportunity {
    return {
        ...(entry.data as object),
        type: entry.type,
        matchScore: Math.round(entry.score * 100),
    } as Opportunity
}

export async function fetchRecommendations(token: string): Promise<Opportunity[]> {
    const res = await fetch(`${API_BASE}/api/v1/recommendations/`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 401) throw new Error('UNAUTHORIZED')
    if (!res.ok) throw new Error(`Ошибка ${res.status}`)
    const data = await res.json()
    const entries: RecommendationEntry[] = Array.isArray(data?.recommendations) ? data.recommendations : []
    return entries.map(mapRecommendation)
}

// Пересчитывает ML-рекомендации (TF-IDF по User.interests) и возвращает их сразу.
export async function recomputeRecommendations(token: string): Promise<Opportunity[]> {
    const res = await fetch(`${API_BASE}/api/v1/recommendations/recompute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 401) throw new Error('UNAUTHORIZED')
    if (!res.ok) throw new Error(`Ошибка ${res.status}`)
    const data = await res.json()
    // recompute отдаёт «сырые» Recommendation-записи (поле item_type, без
    // вложенного .data — в отличие от GET /recommendations/) — подгружаем
    // сами объекты после пересчёта.
    const recs: { item_type: OpportunityType; item_id: number; score: number }[] = Array.isArray(data) ? data : []
    const items = await Promise.all(
        recs.map(async (r): Promise<Opportunity | null> => {
            const item = await fetchOpportunity(r.item_type, r.item_id, token)
            return item ? { ...item, matchScore: Math.round(r.score * 100) } : null
        })
    )
    return items.filter((i): i is Opportunity => i !== null)
}

export async function updateInterests(token: string, interests: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/auth/my_account`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ interests }),
    })
    if (!res.ok) throw new Error(`Ошибка ${res.status}`)
}
