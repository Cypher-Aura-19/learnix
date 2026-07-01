'use client'

import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { loginWithEmail } from '../../login/actions'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setStatusMsg(null)

    // Basic inline validations
    const formErrors: Record<string, string> = {}
    if (!email) formErrors.email = 'Email address is required'
    if (!password) formErrors.password = 'Password is required'
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors)
      return
    }

    setIsLoading(true)
    
    const data = new FormData()
    data.append('email', email)
    data.append('password', password)

    // Perform authentication call
    const result = await loginWithEmail(data)
    
    if (!result.success) {
      setIsLoading(false)
      setStatusMsg(result.message || 'Authentication failed.')
      return
    }

    // Verify role logic
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setIsLoading(false)
      setStatusMsg('Access Blocked: Could not verify user session.')
      return
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    setIsLoading(false)

    if (error || !profile || profile.role !== 'admin') {
      await supabase.auth.signOut()
      setStatusMsg('Access Blocked: You do not have administrator permissions.')
      return
    }

    // Redirect to admin panel dashboard
    router.push('/admin/dashboard')
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#fdfdfc] p-6 font-sans">
      <div className="w-full max-w-md border-3 border-black bg-white p-8 shadow-[8px_8px_0px_#000] rounded-none">
        
        {/* Learnix Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="relative w-10 h-11">
              <div className="absolute left-0 top-0 w-2.5 h-full bg-[#ff4d4d] border-2 border-black z-10"></div>
              <div className="absolute left-2 top-0 w-8 h-full bg-[#ffcc00] border-y-2 border-r-2 border-black flex items-center justify-center">
                <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-black ml-1"></div>
              </div>
            </div>
            <h1 className="font-heading text-2xl uppercase tracking-wider text-black">LEARNIX ADMIN</h1>
          </div>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Portal Access Control</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Email input field */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-black block">Admin Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@learnix.com"
              className={`w-full px-4 py-3 border-2 font-bold text-sm rounded-none focus:outline-none focus:bg-neutral-50 ${
                errors.email ? 'border-neo-pink bg-neo-pink/5 text-black' : 'border-black'
              }`}
            />
            {errors.email && (
              <span className="inline-block px-2.5 py-0.5 border border-black bg-neo-pink text-white text-[9px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#000]">
                {errors.email}
              </span>
            )}
          </div>

          {/* Password input field */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-black block">Security Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-3 border-2 font-bold text-sm rounded-none focus:outline-none focus:bg-neutral-50 pr-12 ${
                  errors.password ? 'border-neo-pink bg-neo-pink/5 text-black' : 'border-black'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-black cursor-pointer"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <span className="inline-block px-2.5 py-0.5 border border-black bg-neo-pink text-white text-[9px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#000]">
                {errors.password}
              </span>
            )}
          </div>

          {/* Error / Status Alert Messages */}
          {statusMsg && (
            <div className="p-3.5 border-2 border-black bg-neo-pink/15 text-black font-sans font-bold text-xs uppercase tracking-wide shadow-[3px_3px_0px_#000]">
              {statusMsg}
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 border-2 border-black bg-[#ffcc00] text-black font-heading text-sm uppercase tracking-wider shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer rounded-none hover:-translate-y-[1px] transition-all disabled:opacity-50"
          >
            {isLoading ? 'Authenticating Admin...' : 'Login As Administrator'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-xs font-bold text-neutral-500 hover:text-black uppercase tracking-wider cursor-pointer underline"
          >
            Go Back to Student Login
          </button>
        </div>

      </div>
    </main>
  )
}
