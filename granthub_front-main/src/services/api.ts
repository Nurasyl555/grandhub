import type { Opportunity, OpportunityType } from '../types'

// Прод: фронт и бэк на одном origin под /granthub, поэтому относительный
// путь из BASE_URL ("/granthub") достаточен и не хардкодит домен.
// Локальная разработка (фронт и бэк в разных контейнерах/портах) переопределяет
// через VITE_API_BASE, см. docker-compose.local.yml.
export const API_BASE = import.meta.env.VITE_API_BASE ?? import.meta.env.BASE_URL.replace(/\/$/, '')

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

export async function fetchGrants(token?: string | null): Promise<Opportunity[]> {
    const items = await getJson<Record<string, unknown>[]>(`${API_BASE}/api/v1/grants/`, token)
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
    const path = type === 'grant' ? 'grants' : type === 'scholarship' ? 'scholarships' : 'internships'
    try {
        const item = await getJson<Record<string, unknown>>(`${API_BASE}/api/v1/${path}/${id}`, token)
        return withType(type)(item)
    } catch {
        return null
    }
}

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

// ─────────────────────────────────────────────────────────────
// Заявки (applications) — CRUD, привязаны к текущему пользователю.
// Backend: /api/v1/applications/  (все методы требуют токен)
// ─────────────────────────────────────────────────────────────

export type ApplicationStatus = 'draft' | 'active' | 'submitted'

// Заявка + вложенная возможность (backend отдаёт её в поле `data`).
export type ApplicationEntry = {
    id:           number
    status:       ApplicationStatus
    note:         string | null
    item_type:    OpportunityType
    item_id:      number
    created_at:   string
    updated_at:   string
    submitted_at: string | null
    opportunity:  Opportunity | null
}

type RawApplication = {
    id:           number
    item_type:    OpportunityType
    item_id:      number
    status:       ApplicationStatus
    note:         string | null
    created_at:   string
    updated_at:   string
    submitted_at: string | null
    data:         Record<string, unknown> | null
}

function mapApplication(a: RawApplication): ApplicationEntry {
    return {
        id:           a.id,
        status:       a.status,
        note:         a.note,
        item_type:    a.item_type,
        item_id:      a.item_id,
        created_at:   a.created_at,
        updated_at:   a.updated_at,
        submitted_at: a.submitted_at,
        opportunity:  a.data ? ({ ...a.data, type: a.item_type } as Opportunity) : null,
    }
}

export async function fetchApplications(token: string, status?: ApplicationStatus): Promise<ApplicationEntry[]> {
    const url = new URL(`${API_BASE}/api/v1/applications/`)
    if (status) url.searchParams.set('status', status)
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 401) throw new Error('UNAUTHORIZED')
    if (!res.ok) throw new Error(`Ошибка ${res.status}`)
    const body = await res.json()
    const list: RawApplication[] = Array.isArray(body?.applications) ? body.applications : []
    return list.map(mapApplication)
}

export async function createApplication(
    token: string,
    payload: { item_type: OpportunityType; item_id: number; status?: ApplicationStatus; note?: string },
): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/applications/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Ошибка ${res.status}`)
}

export async function updateApplication(
    token: string,
    id: number,
    payload: { status?: ApplicationStatus; note?: string },
): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Ошибка ${res.status}`)
}

export async function deleteApplication(token: string, id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/applications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok && res.status !== 204) throw new Error(`Ошибка ${res.status}`)
}
