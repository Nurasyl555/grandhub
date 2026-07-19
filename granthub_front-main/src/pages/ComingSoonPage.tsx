import { Hammer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type Props = {
    title:       string
    description: string
    icon?:       React.ElementType
}

// Заглушка для разделов «Мои заявки»: у backend пока нет модели заявок
// (applications), поэтому эти страницы навигируемы, но без данных.
export default function ComingSoonPage({ title, description, icon: Icon = Hammer }: Props) {
    const navigate = useNavigate()

    return (
        <div className="flex-1 overflow-y-auto bg-[#07111f]">
            <div className="px-8 pt-8 pb-4">
                <h1 className="text-[26px] font-bold text-white tracking-tight"
                    style={{ fontFamily: "'Instrument Serif', serif" }}>
                    {title}
                </h1>
            </div>

            <div className="flex flex-col items-center justify-center py-24 gap-5 text-center px-8">
                <div className="w-16 h-16 bg-[#0c1e33] border border-[rgba(255,255,255,0.06)] rounded-2xl flex items-center justify-center">
                    <Icon size={24} className="text-[#00c6a7]" />
                </div>
                <div>
                    <p className="text-white font-semibold text-[16px]">Раздел в разработке</p>
                    <p className="text-[#3d5a72] text-[13px] mt-1 max-w-sm">{description}</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-2.5 bg-[#00c6a7] text-[#07111f] font-bold rounded-xl hover:bg-[#00ddb9] active:scale-95 transition-all text-[14px]"
                >
                    На главную
                </button>
            </div>
        </div>
    )
}
