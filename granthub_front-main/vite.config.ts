import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    // Прод отдаётся по esg.kbtu.kz/granthub — базовый путь для собранных
    // ассетов. В dev-сервере (`npm run dev`) Vite игнорирует base и всегда
    // отдаёт с корня, так что на localhost:3000 это не влияет.
    base: '/granthub/',
    plugins: [
        react(),
        tailwindcss(),
    ],
})