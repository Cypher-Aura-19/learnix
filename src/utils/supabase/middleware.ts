import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not delete this. Required for Server Components to read session.
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // ── Unauthenticated access protection ─────────────────────────────────────
  const isAdminRoute = path.startsWith('/admin/dashboard')
  const isStudentRoute = path === '/dashboard' || path.startsWith('/dashboard/')

  if (!user) {
    if (isAdminRoute) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      return NextResponse.redirect(loginUrl)
    }
    if (isStudentRoute) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }
    return supabaseResponse
  }

  // ── Role-based access protection ──────────────────────────────────────────
  // Fetch the role from the profiles table (single lookup, cached by Supabase edge)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'student'

  // Admin trying to access admin routes → allow
  // Admin trying to access student dashboard → redirect to admin dashboard
  if (isAdminRoute && role !== 'admin') {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/admin/login'
    return NextResponse.redirect(redirect)
  }

  if (isStudentRoute && role === 'admin') {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/admin/dashboard'
    return NextResponse.redirect(redirect)
  }

  // Student trying to access admin routes → send to student login
  if (isAdminRoute && role === 'student') {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/admin/login'
    return NextResponse.redirect(redirect)
  }

  return supabaseResponse
}
