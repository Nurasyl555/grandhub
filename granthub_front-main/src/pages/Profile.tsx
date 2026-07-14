import { useState, useEffect } from 'react'
import {
    User, Mail, MapPin, Briefcase, GraduationCap,
    Bell, Shield, LogOut, Edit3, Save, X,
    CheckCircle, Sparkles, TrendingUp, FileText, Star
} from 'lucide-react'
import { useAuthContext } from '../context/AuthContext'
import { updateInterests, API_BASE } from '../services/api'

const interests = [
    'IT / Tech', 'Наука', 'Образование', 'Инновации',
    'Общество', 'Медицина', 'Экология', 'Бизнес',
    'Искусство', 'Спорт', 'Сельское хозяйство', 'Энергетика'
]

// ── Skeleton primitives ───────────────────────────────────────
function Bone({ className = '' }: { className?: string }) {
    return <div className={`bg-white/[0.06] rounded animate-pulse ${className}`} />
}

function SkeletonProfile() {
    return (
        <div className="flex-1 overflow-y-auto bg-[#07111f]">
            <div className="max-w-4xl mx-auto px-8 py-8 flex flex-col gap-5">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <Bone className="h-7 w-40" />
                    <Bone className="h-4 w-64" />
                </div>

                {/* Hero card */}
                <div className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 flex items-center gap-6 animate-pulse">
                    <Bone className="w-20 h-20 rounded-2xl flex-shrink-0" />
                    <div className="flex-1 flex flex-col gap-3">
                        <Bone className="h-6 w-48" />
                        <div className="flex gap-4">
                            <Bone className="h-3 w-28" />
                            <Bone className="h-3 w-24" />
                            <Bone className="h-3 w-32" />
                        </div>
                        <Bone className="h-6 w-36 rounded-lg" />
                    </div>
                    <Bone className="w-32 h-9 rounded-xl flex-shrink-0" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl px-5 py-4 flex items-center gap-3 animate-pulse">
                            <Bone className="w-9 h-9 rounded-lg flex-shrink-0" />
                            <div className="flex flex-col gap-1.5">
                                <Bone className="h-5 w-8" />
                                <Bone className="h-3 w-20" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <Bone className="h-11 w-72 rounded-xl" />

                {/* Content */}
                <div className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 flex flex-col gap-4 animate-pulse">
                    <Bone className="h-5 w-36" />
                    <div className="grid grid-cols-2 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <Bone className="h-3 w-20" />
                                <Bone className="h-10 w-full rounded-lg" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Save toast ────────────────────────────────────────────────
function SaveToast({ visible }: { visible: boolean }) {
    return (
        <div className={`
            fixed bottom-6 right-6 flex items-center gap-2.5 px-4 py-3
            bg-[#0c1e33] border border-[rgba(0,198,167,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]
            text-[13px] font-semibold text-white
            transition-all duration-300 z-50
            ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}
        `}>
            <CheckCircle size={15} className="text-[#00c6a7]" />
            Изменения сохранены
        </div>
    )
}

// ── Notification toggle row ───────────────────────────────────
function NotifRow({ label, desc, defaultOn }: { label: string; desc: string; defaultOn: boolean }) {
    const [on, setOn] = useState(defaultOn)
    return (
        <div className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0">
            <div>
                <p className="text-[13.5px] font-medium text-white">{label}</p>
                <p className="text-[12px] text-[#3d5a72] mt-0.5">{desc}</p>
            </div>
            <button
                onClick={() => setOn(v => !v)}
                aria-label={on ? `Выключить: ${label}` : `Включить: ${label}`}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0
                    ${on ? 'bg-[#00c6a7]' : 'bg-[#1a3550]'}`}
            >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200
                    ${on ? 'left-[22px]' : 'left-0.5'}`}
                />
            </button>
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────
export default function Profile() {
    const { token, user } = useAuthContext()
    const [loading, setLoading]     = useState(true)
    const [visible, setVisible]     = useState(false)
    const [editing, setEditing]     = useState(false)
    const [saving, setSaving]       = useState(false)
    const [toastVisible, setToast]  = useState(false)
    const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile')
    const [tabVisible, setTabVisible] = useState(true)
    const [selectedInterests, setSelectedInterests] = useState<string[]>([])
    const [interestsSaving, setInterestsSaving] = useState(false)

    const [form, setForm] = useState({
        name:       user?.name ?? 'Пользователь',
        email:      user?.email ?? '',
        location:   'Алматы, Казахстан',
        occupation: 'PhD студент',
        university: 'НУ, Назарбаев Университет',
        bio:        'Исследователь в области AI и машинного обучения. Ищу гранты для продолжения научной работы.',
    })

    const [draft, setDraft] = useState({ ...form })

    // Загружаем реальные данные аккаунта (в т.ч. interests для ML-рекомендаций)
    useEffect(() => {
        if (!token) { setLoading(false); setVisible(true); return }

        fetch(`${API_BASE}/api/v1/auth/my_account`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
                if (data?.interests) {
                    setSelectedInterests(data.interests.split(',').map((s: string) => s.trim()).filter(Boolean))
                }
            })
            .catch(() => {})
            .finally(() => { setLoading(false); setVisible(true) })
    }, [token])

    // Tab transition
    function switchTab(tab: typeof activeTab) {
        if (tab === activeTab) return
        setTabVisible(false)
        setTimeout(() => { setActiveTab(tab); setTabVisible(true) }, 180)
    }

    const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(prev => ({ ...prev, [key]: e.target.value }))

    // Интересы реально сохраняются на backend — их использует TF-IDF движок
    // рекомендаций (app/ml/recommender.py) при пересчёте.
    function toggleInterest(i: string) {
        const next = selectedInterests.includes(i)
            ? selectedInterests.filter(x => x !== i)
            : [...selectedInterests, i]
        setSelectedInterests(next)

        if (!token) return
        setInterestsSaving(true)
        updateInterests(token, next.join(', '))
            .catch(() => {})
            .finally(() => setInterestsSaving(false))
    }

    function handleSave() {
        setSaving(true)
        setTimeout(() => {
            setForm(draft)
            setEditing(false)
            setSaving(false)
            setToast(true)
            setTimeout(() => setToast(false), 3000)
        }, 800)
    }

    function handleCancel() {
        setDraft(form)
        setEditing(false)
    }

    if (loading) return <SkeletonProfile />

    const completionPct = 78

    return (
        <div className="flex-1 overflow-y-auto bg-[#07111f]">
            <div className="max-w-4xl mx-auto px-8 py-8">

                {/* Header */}
                <div
                    className="mb-6 animate-fade-in-up"
                    style={{ animationDelay: '0ms', animationFillMode: 'both' }}
                >
                    <h1 className="text-[26px] font-bold text-white tracking-tight"
                        style={{ fontFamily: "'Instrument Serif', serif" }}>
                        Мой профиль
                    </h1>
                    <p className="text-[14px] text-[#3d5a72] mt-1">
                        Управляйте данными аккаунта и настройте AI-рекомендации
                    </p>
                </div>

                {/* Hero card */}
                <div
                    className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 mb-5 flex items-center gap-6 animate-fade-in-up"
                    style={{ animationDelay: '60ms', animationFillMode: 'both' }}
                >
                    <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00c6a7] to-[#8b5cf6] flex items-center justify-center text-white text-2xl font-bold"
                             style={{ fontFamily: "'Instrument Serif', serif" }}>
                            АН
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#00c6a7] rounded-full flex items-center justify-center">
                            <CheckCircle size={13} className="text-[#07111f]" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
                            {form.name}
                        </h2>
                        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1.5 text-[12.5px] text-[#7a9bb5]">
                                <Briefcase size={12} className="text-[#3d5a72]" /> {form.occupation}
                            </span>
                            <span className="flex items-center gap-1.5 text-[12.5px] text-[#7a9bb5]">
                                <MapPin size={12} className="text-[#3d5a72]" /> {form.location}
                            </span>
                            <span className="flex items-center gap-1.5 text-[12.5px] text-[#7a9bb5]">
                                <Mail size={12} className="text-[#3d5a72]" /> {form.email}
                            </span>
                        </div>

                        {/* Completion bar */}
                        <div className="flex items-center gap-2 mt-3">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(0,198,167,0.08)] border border-[rgba(0,198,167,0.2)] rounded-lg">
                                <Sparkles size={11} className="text-[#00c6a7]" />
                                <span className="text-[11.5px] font-semibold text-[#00c6a7]">
                                    AI-профиль заполнен на {completionPct}%
                                </span>
                            </div>
                            <div className="flex-1 max-w-[120px] h-1.5 bg-[#07111f] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#00c6a7] rounded-full transition-all duration-700"
                                    style={{ width: visible ? `${completionPct}%` : '0%' }}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => editing ? handleCancel() : setEditing(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 active:scale-95
                            ${editing
                                ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#7a9bb5]'
                                : 'bg-[#00c6a7] text-[#07111f] hover:bg-[#00ddb9]'
                            }`}
                    >
                        {editing ? <X size={14} /> : <Edit3 size={14} />}
                        {editing ? 'Отмена' : 'Редактировать'}
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-5">
                    {[
                        { icon: TrendingUp,  value: '34', label: 'AI-совпадений',  color: 'text-[#00c6a7]',  bg: 'bg-[rgba(0,198,167,0.08)]' },
                        { icon: Star,        value: '8',  label: 'В избранном',    color: 'text-amber-400',  bg: 'bg-amber-900/20'           },
                        { icon: FileText,    value: '12', label: 'Заявок подано',  color: 'text-purple-400', bg: 'bg-purple-900/20'          },
                        { icon: CheckCircle, value: '3',  label: 'Одобрено',       color: 'text-green-400',  bg: 'bg-green-900/20'           },
                    ].map(({ icon: Icon, value, label, color, bg }, i) => (
                        <div
                            key={label}
                            className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl px-5 py-4 flex items-center gap-3 hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150 animate-fade-in-up"
                            style={{ animationDelay: `${120 + i * 40}ms`, animationFillMode: 'both' }}
                        >
                            <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                <Icon size={16} className={color} />
                            </div>
                            <div>
                                <p className="text-[20px] font-bold text-white leading-none"
                                   style={{ fontFamily: "'Instrument Serif', serif" }}>
                                    {value}
                                </p>
                                <p className="text-[11px] text-[#3d5a72] mt-0.5">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div
                    className="flex gap-1 mb-5 bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-1 w-fit animate-fade-in-up"
                    style={{ animationDelay: '280ms', animationFillMode: 'both' }}
                >
                    {([
                        { key: 'profile',       label: 'Профиль',      icon: User   },
                        { key: 'notifications', label: 'Уведомления',  icon: Bell   },
                        { key: 'security',      label: 'Безопасность', icon: Shield },
                    ] as const).map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => switchTab(key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-150
                                ${activeTab === key
                                    ? 'bg-[#07111f] text-white shadow-sm'
                                    : 'text-[#3d5a72] hover:text-[#7a9bb5]'
                                }`}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className={`transition-all duration-180 ${tabVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>

                    {/* ── Profile tab ── */}
                    {activeTab === 'profile' && (
                        <div className="flex flex-col gap-5">

                            <div className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
                                <h3 className="text-[15px] font-semibold text-white mb-5">Личная информация</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Имя',            key: 'name',       icon: User,          type: 'text'  },
                                        { label: 'Email',           key: 'email',      icon: Mail,          type: 'email' },
                                        { label: 'Местоположение',  key: 'location',   icon: MapPin,        type: 'text'  },
                                        { label: 'Должность',       key: 'occupation', icon: Briefcase,     type: 'text'  },
                                        { label: 'Университет',     key: 'university', icon: GraduationCap, type: 'text'  },
                                    ].map(({ label, key, icon: Icon, type }) => (
                                        <div key={key} className={key === 'university' ? 'col-span-2' : ''}>
                                            <label className="block text-[11px] font-semibold text-[#7a9bb5] uppercase tracking-wider mb-1.5">
                                                {label}
                                            </label>
                                            <div className="relative">
                                                <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3d5a72]" />
                                                <input
                                                    type={type}
                                                    value={draft[key as keyof typeof draft]}
                                                    onChange={set(key)}
                                                    disabled={!editing}
                                                    className="w-full pl-9 pr-4 py-2.5 bg-[#07111f] border border-[rgba(255,255,255,0.06)] rounded-lg text-[13.5px] text-white placeholder-[#3d5a72] disabled:text-[#7a9bb5] disabled:cursor-default focus:outline-none focus:ring-2 focus:ring-[rgba(0,198,167,0.2)] focus:border-[#00c6a7] transition-all"
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    <div className="col-span-2">
                                        <label className="block text-[11px] font-semibold text-[#7a9bb5] uppercase tracking-wider mb-1.5">
                                            О себе
                                        </label>
                                        <textarea
                                            value={draft.bio}
                                            onChange={set('bio')}
                                            disabled={!editing}
                                            rows={3}
                                            className="w-full px-4 py-2.5 bg-[#07111f] border border-[rgba(255,255,255,0.06)] rounded-lg text-[13.5px] text-white placeholder-[#3d5a72] disabled:text-[#7a9bb5] disabled:cursor-default focus:outline-none focus:ring-2 focus:ring-[rgba(0,198,167,0.2)] focus:border-[#00c6a7] transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                {editing && (
                                    <div className="flex gap-3 mt-5 pt-5 border-t border-[rgba(255,255,255,0.06)] animate-fade-in-up">
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-[#00c6a7] text-[#07111f] font-bold rounded-xl hover:bg-[#00ddb9] active:scale-95 transition-all text-[13.5px] disabled:opacity-70 disabled:cursor-default"
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="inline-block w-3.5 h-3.5 border-2 border-[#07111f]/40 border-t-[#07111f] rounded-full animate-spin" />
                                                    Сохранение…
                                                </>
                                            ) : (
                                                <><Save size={14} /> Сохранить изменения</>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-5 py-2.5 border border-[rgba(255,255,255,0.08)] text-[#7a9bb5] font-medium rounded-xl hover:bg-[#07111f] active:scale-95 transition-all text-[13.5px]"
                                        >
                                            <X size={14} /> Отмена
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Interests */}
                            <div className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[15px] font-semibold text-white">Интересы для AI-подбора</h3>
                                    <span className="text-[11px] px-2 py-0.5 bg-[rgba(0,198,167,0.08)] border border-[rgba(0,198,167,0.2)] text-[#00c6a7] rounded-lg font-semibold">
                                        {interestsSaving ? 'Сохранение…' : `${selectedInterests.length} выбрано`}
                                    </span>
                                </div>
                                <p className="text-[12.5px] text-[#3d5a72] mb-4">
                                    Используются TF-IDF-движком рекомендаций — сохраняются автоматически
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {interests.map(interest => {
                                        const active = selectedInterests.includes(interest)
                                        return (
                                            <button
                                                key={interest}
                                                onClick={() => toggleInterest(interest)}
                                                className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 active:scale-95
                                                    ${active
                                                        ? 'bg-[#00c6a7] text-[#07111f] font-bold shadow-[0_0_10px_rgba(0,198,167,0.25)]'
                                                        : 'bg-[#07111f] border border-[rgba(255,255,255,0.08)] text-[#7a9bb5] hover:border-[rgba(0,198,167,0.3)] hover:text-white'
                                                    }`}
                                            >
                                                {active && <span className="mr-1">✓</span>}
                                                {interest}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Notifications tab ── */}
                    {activeTab === 'notifications' && (
                        <div className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
                            <h3 className="text-[15px] font-semibold text-white mb-5">Настройки уведомлений</h3>
                            <div className="flex flex-col gap-0">
                                <NotifRow label="Новые рекомендации AI"      desc="Когда ИИ находит подходящие гранты"       defaultOn={true}  />
                                <NotifRow label="Напоминания о дедлайнах"    desc="За 7 дней и за 1 день до закрытия"        defaultOn={true}  />
                                <NotifRow label="Статус заявок"              desc="Обновления по поданным заявкам"           defaultOn={true}  />
                                <NotifRow label="Новые гранты в категориях"  desc="По вашим выбранным интересам"             defaultOn={false} />
                                <NotifRow label="Еженедельный дайджест"      desc="Подборка лучших грантов за неделю"        defaultOn={false} />
                                <NotifRow label="Email-уведомления"          desc="Дублирование уведомлений на почту"        defaultOn={true}  />
                            </div>
                        </div>
                    )}

                    {/* ── Security tab ── */}
                    {activeTab === 'security' && (
                        <div className="flex flex-col gap-4">
                            <div className="bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
                                <h3 className="text-[15px] font-semibold text-white mb-5">Смена пароля</h3>
                                <div className="flex flex-col gap-4 max-w-md">
                                    {['Текущий пароль', 'Новый пароль', 'Повторите пароль'].map(label => (
                                        <div key={label}>
                                            <label className="block text-[11px] font-semibold text-[#7a9bb5] uppercase tracking-wider mb-1.5">
                                                {label}
                                            </label>
                                            <input
                                                type="password"
                                                placeholder="••••••••"
                                                className="w-full px-4 py-2.5 bg-[#07111f] border border-[rgba(255,255,255,0.06)] rounded-lg text-[13.5px] text-white placeholder-[#3d5a72] focus:outline-none focus:ring-2 focus:ring-[rgba(0,198,167,0.2)] focus:border-[#00c6a7] transition-all"
                                            />
                                        </div>
                                    ))}
                                    <button className="flex items-center gap-2 px-5 py-2.5 bg-[#00c6a7] text-[#07111f] font-bold rounded-xl hover:bg-[#00ddb9] active:scale-95 transition-all text-[13.5px] w-fit mt-1">
                                        <Save size={14} /> Обновить пароль
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[#0c1e33] border border-red-900/30 rounded-xl p-6">
                                <h3 className="text-[15px] font-semibold text-red-400 mb-1">Опасная зона</h3>
                                <p className="text-[12.5px] text-[#3d5a72] mb-4">Необратимые действия с аккаунтом</p>
                                <div className="flex flex-col gap-3">
                                    <button className="flex items-center gap-2 px-4 py-2.5 border border-[rgba(255,255,255,0.08)] text-[#7a9bb5] rounded-xl hover:bg-[#07111f] active:scale-95 transition-all text-[13px] w-fit">
                                        <LogOut size={14} /> Выйти из аккаунта
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2.5 border border-red-900/40 text-red-400 rounded-xl hover:bg-red-900/10 active:scale-95 transition-all text-[13px] w-fit">
                                        <X size={14} /> Удалить аккаунт
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Save toast */}
            <SaveToast visible={toastVisible} />
        </div>
    )
}