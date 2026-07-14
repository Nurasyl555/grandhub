export type OpportunityType = 'grant' | 'scholarship' | 'internship'

// Поля, которые реально отдаёт backend (см. app/schemes/*.py) —
// никаких amount/currency/category/tags/matchScore: их там нет.
export type Opportunity = {
    id: number
    type: OpportunityType
    title: string
    description: string
    source_url: string
    provider: string
    country?: string | null
    region?: string | null
    deadline?: string | null // ISO datetime or null
    published_at?: string | null
    image_url?: string | null
    // scholarship-only
    level?: string | null
    deadline_text?: string | null
    // internship-only
    duration?: string | null
    paid?: boolean | null
    // присутствует только когда элемент пришёл из /recommendations (ML score)
    matchScore?: number
}

export function daysLeft(deadline?: string | null): number | null {
    if (!deadline) return null
    const diffMs = new Date(deadline).getTime() - Date.now()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function opportunityStatus(o: Opportunity): 'open' | 'closing' | 'new' | 'expired' {
    const dl = daysLeft(o.deadline)
    if (dl !== null && dl < 0) return 'expired'
    if (dl !== null && dl <= 3) return 'closing'
    if (o.published_at) {
        const ageDays = (Date.now() - new Date(o.published_at).getTime()) / (1000 * 60 * 60 * 24)
        if (ageDays <= 14) return 'new'
    }
    return 'open'
}

export function opportunityTags(o: Opportunity): string[] {
    if (o.type === 'scholarship' && o.level) return [o.level]
    if (o.type === 'internship') {
        const tags: string[] = []
        if (o.duration) tags.push(o.duration)
        if (o.paid !== null && o.paid !== undefined) tags.push(o.paid ? 'Оплачивается' : 'Без оплаты')
        return tags
    }
    return []
}

export const typeLabels: Record<OpportunityType, string> = {
    grant: 'Грант',
    scholarship: 'Стипендия',
    internship: 'Стажировка',
}
