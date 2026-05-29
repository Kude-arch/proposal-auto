'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const sb = createClient()

    if (mode === 'signup') {
      const { error } = await sb.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      setMessage('가입 완료! 이메일을 확인하거나 바로 로그인하세요.')
      setMode('login')
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) { setError('이메일 또는 비밀번호가 올바르지 않습니다.'); setLoading(false); return }
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
      <div className="bg-white rounded-xl border border-[#e0e0e0] p-10 w-full max-w-sm">
        <h1 className="text-lg font-bold text-[#111] mb-1">제안서 자동화 시스템</h1>
        <p className="text-xs text-[#888] mb-8">건설사업관리 CM 제안서 자동화</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1.5">이메일</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-[#e0e0e0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#888]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1.5">비밀번호</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full border border-[#e0e0e0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#888]" />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {message && <p className="text-xs text-[#555] bg-[#f5f5f5] px-3 py-2 rounded-lg">{message}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-[#333] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#111] disabled:opacity-50 transition-colors">
            {loading ? '처리 중…' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>

        <button onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError('') }}
          className="w-full mt-4 text-xs text-[#888] hover:text-[#333] transition-colors">
          {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </div>
    </div>
  )
}
