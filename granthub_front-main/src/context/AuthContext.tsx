import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

const TOKEN_KEY = 'granthub_token'
const USER_KEY  = 'granthub_user'

export type AuthUser = {
    name:  string
    email: string
}

type AuthContextType = {
    token:           string | null
    user:            AuthUser | null
    isAuthenticated: boolean
    login:           (jwt: string, user: AuthUser) => void
    logout:          () => void
    authFetch:       (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
    const [user,  setUser]  = useState<AuthUser | null>(() => {
        try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') } catch { return null }
    })

    const login = useCallback((jwt: string, userData: AuthUser) => {
        localStorage.setItem(TOKEN_KEY, jwt)
        localStorage.setItem(USER_KEY,  JSON.stringify(userData))
        setToken(jwt)
        setUser(userData)
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
    }, [])

    const authFetch = useCallback((url: string, options: RequestInit = {}) => {
        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            },
        })
    }, [token])

    return (
        <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, login, logout, authFetch }}>
            {children}
        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components -- co-located with the provider by convention
export function useAuthContext() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
    return ctx
}