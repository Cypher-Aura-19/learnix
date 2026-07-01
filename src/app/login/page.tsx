'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckCircle, AlertTriangle, ArrowLeft, Mail } from 'lucide-react'
import { loginWithEmail, signupWithEmail, signInWithProvider, validateEmail, validatePassword } from './actions'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // High fidelity feedback state
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    title: string
    text: string
  } | null>(null)

  // Individual field validation error states
  const [errors, setErrors] = useState<{
    fullName?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  // Real-time input validation on change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setErrors(prev => {
      const next = { ...prev }
      delete next[name as keyof typeof next]
      
      // Inline validation checks
      if (name === 'email' && value.trim()) {
        if (!validateEmail(value.trim())) {
          next.email = 'Please enter a valid email address structure (e.g. name@domain.com).'
        }
      }
      if (name === 'password' && value) {
        const passwordCheck = validatePassword(value)
        if (!passwordCheck.isValid) {
          next.password = passwordCheck.message
        }
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})
    setFeedback(null)

    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string || '').trim()
    const password = formData.get('password') as string
    const fullName = (formData.get('fullName') as string || '').trim()
    const confirmPassword = formData.get('confirmPassword') as string

    // Validate fields before submitting
    const newErrors: typeof errors = {}
    
    if (!isLogin && !fullName) {
      newErrors.fullName = 'Full Name is required.'
    }
    if (!email) {
      newErrors.email = 'Email address is required.'
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email address format.'
    }
    if (!password) {
      newErrors.password = 'Password is required.'
    } else if (!isLogin) {
      const passwordCheck = validatePassword(password)
      if (!passwordCheck.isValid) {
        newErrors.password = passwordCheck.message
      }
    }
    if (!isLogin && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    const result = isLogin 
      ? await loginWithEmail(formData) 
      : await signupWithEmail(formData)

    setLoading(false)
    if (result && result.success) {
      if (isLogin && 'role' in result) {
        // Redirect to correct dashboard immediately based on role
        const destination = (result as any).role === 'admin' ? '/admin/dashboard' : '/dashboard'
        router.push(destination)
        return
      }
      setFeedback({
        type: 'success',
        title: isLogin ? 'Login Successful' : 'Account Created!',
        text: result.message
      })
    } else {
      setFeedback({
        type: 'error',
        title: 'Authentication Error',
        text: result?.message || 'Authentication failed.'
      })
    }
  }

  return (
    <main className="h-screen w-full flex bg-white overflow-hidden select-none">
      {/* Grid container covering exactly 100vh without overflow */}
      <div className="w-full h-full grid grid-cols-1 md:grid-cols-2">
        
        {/* Left Side: Auth Form Container (Left-aligned, fitting screen viewport, no vertical scrollbar) */}
        <div className="flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:p-14 xl:p-16 bg-white h-full overflow-hidden">
          <div className="w-full max-w-xl mx-auto my-auto">
            
            {/* Feedback Status Panel */}
            {feedback ? (
              <div className="space-y-6 animate-fade-in font-sans">
                <div 
                  className={`border-3 border-black p-8 shadow-[6px_6px_0px_#000] rounded-none flex flex-col items-start gap-4 ${
                    feedback.type === 'success' ? 'bg-neo-green' : 'bg-neo-pink'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <div className="bg-white border-2 border-black p-2 shadow-[2px_2px_0px_#000]">
                      <CheckCircle className="w-8 h-8 text-black stroke-[2.5px]" />
                    </div>
                  ) : (
                    <div className="bg-white border-2 border-black p-2 shadow-[2px_2px_0px_#000]">
                      <AlertTriangle className="w-8 h-8 text-black stroke-[2.5px]" />
                    </div>
                  )}

                  <div>
                    <h2 className="font-heading text-2xl uppercase tracking-wider text-black mb-2">
                      {feedback.title}
                    </h2>
                    <p className="text-sm font-bold text-black leading-relaxed">
                      {feedback.text}
                    </p>
                  </div>
                </div>

                {feedback.type === 'success' && !isLogin && (
                  <div className="border-2 border-black p-4 bg-neo-yellow/20 font-bold text-xs uppercase flex items-center gap-3">
                    <Mail className="w-5 h-5 text-black stroke-[2.5px]" />
                    <span>Please check spam/promotions folder if you don't receive it in 2 minutes.</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="flex items-center justify-center gap-2 py-3.5 px-6 border-2 border-black bg-white text-black shadow-[3px_3px_0px_#000] font-heading text-xs uppercase tracking-wider active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer rounded-none hover:-translate-y-[1px] transition-all"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[3.5px]" />
                  Back to {isLogin ? 'Login' : 'Sign Up'}
                </button>
              </div>
            ) : (
              /* Active Form View */
              <div className="space-y-4">
                {/* Header Section */}
                <div>
                  <h1 className="font-heading text-4xl sm:text-[45px] uppercase tracking-wider text-black mb-1.5 leading-none">
                    {isLogin ? 'LOG IN' : 'SIGN UP'}
                  </h1>
                  <p className="font-sans text-sm font-medium text-neutral-600">
                    {isLogin ? 'Enter your credentials below' : 'Create your account to get started'}
                  </p>
                </div>

                {/* Social Authentication Row */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => signInWithProvider('google')}
                    className="flex items-center justify-center gap-2 py-3 border-2 border-black shadow-[2px_2px_0px_#000] font-sans font-bold uppercase text-xs active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer bg-white rounded-none transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => signInWithProvider('github')}
                    className="flex items-center justify-center gap-2 py-3 border-2 border-black shadow-[2px_2px_0px_#000] font-sans font-bold uppercase text-xs active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer bg-white rounded-none transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    Github
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center justify-center gap-4">
                  <div className="h-[2px] flex-1 bg-black"></div>
                  <span className="font-heading text-xs text-black font-black uppercase">OR</span>
                  <div className="h-[2px] flex-1 bg-black"></div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-3 font-sans">
                  
                  {!isLogin && (
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <label className="block text-xs font-bold uppercase text-black">Full Name</label>
                        {errors.fullName && <span className="text-[10px] font-bold text-neo-pink uppercase">{errors.fullName}</span>}
                      </div>
                      <input
                        type="text"
                        name="fullName"
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        className={`w-full h-[45px] px-4 border-2 focus:outline-none focus:bg-white font-medium placeholder-neutral-400 text-sm shadow-[3px_3px_0px_#000] focus:translate-y-0.5 focus:translate-x-0.5 focus:shadow-[1.5px_1.5px_0px_#000] transition-all rounded-none ${
                          errors.fullName ? 'border-neo-pink bg-neo-pink/5' : 'border-black'
                        }`}
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <label className="block text-xs font-bold uppercase text-black">Email</label>
                      {errors.email && <span className="text-[10px] font-bold text-neo-pink uppercase">{errors.email}</span>}
                    </div>
                    <input
                      type="email"
                      name="email"
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      className={`w-full h-[45px] px-4 border-2 focus:outline-none focus:bg-white font-medium placeholder-neutral-400 text-sm shadow-[3px_3px_0px_#000] focus:translate-y-0.5 focus:translate-x-0.5 focus:shadow-[1.5px_1.5px_0px_#000] transition-all rounded-none ${
                        errors.email ? 'border-neo-pink bg-neo-pink/5' : 'border-black'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <label className="block text-xs font-bold uppercase text-black">Password</label>
                      {errors.password && <span className="text-[10px] font-bold text-neo-pink uppercase">{errors.password}</span>}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        onChange={handleInputChange}
                        placeholder={isLogin ? 'Enter your password' : 'Create a password'}
                        className={`w-full h-[45px] px-4 border-2 focus:outline-none focus:bg-white font-medium placeholder-neutral-400 text-sm shadow-[3px_3px_0px_#000] focus:translate-y-0.5 focus:translate-x-0.5 focus:shadow-[1.5px_1.5px_0px_#000] transition-all rounded-none ${
                          errors.password ? 'border-neo-pink bg-neo-pink/5' : 'border-black'
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
                  </div>

                  {!isLogin && (
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <label className="block text-xs font-bold uppercase text-black">Confirm Password</label>
                        {errors.confirmPassword && <span className="text-[10px] font-bold text-neo-pink uppercase">{errors.confirmPassword}</span>}
                      </div>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          onChange={handleInputChange}
                          placeholder="Confirm your password"
                          className={`w-full h-[45px] px-4 border-2 focus:outline-none focus:bg-white font-medium placeholder-neutral-400 text-sm shadow-[3px_3px_0px_#000] focus:translate-y-0.5 focus:translate-x-0.5 focus:shadow-[1.5px_1.5px_0px_#000] transition-all rounded-none ${
                            errors.confirmPassword ? 'border-neo-pink bg-neo-pink/5' : 'border-black'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-black cursor-pointer"
                        >
                          {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {!isLogin && (
                    <div className="flex items-center gap-2 py-0.5">
                      <input
                        type="checkbox"
                        id="terms"
                        required
                        className="w-4 h-4 border-2 border-black accent-black cursor-pointer rounded-none shadow-[1px_1px_0px_#000]"
                      />
                      <label htmlFor="terms" className="text-xs font-bold text-neutral-600 cursor-pointer">
                        I agree to the <span className="underline cursor-pointer text-black font-extrabold">Terms of Service</span> and <span className="underline cursor-pointer text-black font-extrabold">Privacy Policy</span>
                      </label>
                    </div>
                  )}

                  {/* Yellow Primary Action CTA Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 border-3 border-black bg-[#ffd500] text-black shadow-[4px_4px_0px_#000] font-heading text-base uppercase tracking-wider active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 cursor-pointer rounded-none hover:-translate-y-[1px] hover:translate-x-[1px] hover:shadow-[5px_5px_0px_#000] transition-all"
                    >
                      {loading ? 'Processing...' : isLogin ? 'Login' : 'Create Account'}
                    </button>
                  </div>
                </form>

                {/* Toggle footer action link */}
                <div className="text-center pt-1">
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin)
                      setErrors({})
                      setFeedback(null)
                    }}
                    className="font-sans text-xs text-neutral-600 cursor-pointer"
                  >
                    {isLogin ? (
                      <>
                        Don't have an account? <span className="font-bold text-black underline">Sign up</span>
                      </>
                    ) : (
                      <>
                        Already have an account? <span className="font-bold text-black underline">Sign in</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Mockup Artwork Panel (using cover + full screen dimensions to avoid blank spaces) */}
        <div className="hidden md:block relative w-full h-full border-l-3 border-black bg-white">
          <img
            src="/retro_login_artwork.png"
            alt="Milestone Platform Illustrative Graphic"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </main>
  )
}
