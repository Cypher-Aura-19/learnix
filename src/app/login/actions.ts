'use client'

import { createClient } from '@/utils/supabase/client'

// Helper to validate password strength
export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long.' }
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter.' }
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number.' }
  }
  return { isValid: true, message: '' }
}

// Helper to validate email format
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function loginWithEmail(formData: FormData) {
  const supabase = createClient()
  const email = (formData.get('email') as string || '').trim()
  const password = formData.get('password') as string

  // Client-side validations inside Server Actions
  if (!email || !password) {
    return { success: false, message: 'Please fill in all email and password fields.' }
  }

  if (!validateEmail(email)) {
    return { success: false, message: 'Invalid email address format.' }
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Map common database error status codes to user-friendly messages
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, message: 'Incorrect email or password. Please verify your credentials and try again.' }
      }
      return { success: false, message: error.message }
    }

    if (data?.user) {
      // Self-heal profiles if trigger didn't run
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!profile) {
        await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || 'Student',
            role: 'student'
          }])
        return { success: true, message: 'Welcome back! Logging you in...', role: 'student' }
      }

      return { success: true, message: 'Welcome back! Logging you in...', role: profile.role as string }
    }
  } catch (err: any) {
    return { success: false, message: err?.message || 'An unexpected error occurred during login.' }
  }
}

export async function signupWithEmail(formData: FormData) {
  const supabase = createClient()
  const email = (formData.get('email') as string || '').trim()
  const password = formData.get('password') as string
  const fullName = (formData.get('fullName') as string || '').trim()

  // Edge cases: empty values
  if (!email || !password || !fullName) {
    return { success: false, message: 'Please fill in all required fields (Full Name, Email, and Password).' }
  }

  if (!validateEmail(email)) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  const strength = validatePassword(password)
  if (!strength.isValid) {
    return { success: false, message: strength.message }
  }

  try {
    // Check if the user already exists using Supabase signup.
    // By default, Supabase signUp doesn't throw an error if the user exists (to prevent user enumeration).
    // It returns an identities array. If identities is empty, the user already exists.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      return { success: false, message: error.message }
    }

    // Edge case handling for already existing user signatures
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      return { 
        success: false, 
        message: 'An account with this email address already exists. Please sign in instead.' 
      }
    }

    return { 
      success: true, 
      message: 'Signup successful! Please check your email inbox to verify your account.' 
    }
  } catch (err: any) {
    return { success: false, message: err?.message || 'An unexpected error occurred during registration.' }
  }
}

export async function signInWithProvider(provider: 'google' | 'github') {
  const supabase = createClient()
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      if (error.message.includes('provider is not enabled')) {
        return { 
          success: false, 
          message: `The ${provider} provider is not enabled in your Supabase authentication console settings yet.` 
        }
      }
      return { success: false, message: error.message }
    }

    if (data?.url) {
      window.location.href = data.url
      return { success: true, message: 'Redirecting to provider...' }
    }

    return { success: false, message: 'OAuth redirect URL could not be resolved.' }
  } catch (err: any) {
    return { success: false, message: err?.message || `Failed to redirect to ${provider} authentication provider.` }
  }
}
