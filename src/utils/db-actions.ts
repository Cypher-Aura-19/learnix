import { createClient } from '@/utils/supabase/client'

export async function fetchCourses(includeDrafts: boolean = false) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching courses:', error)
    return []
  }

  const filtered = (data || []).filter((c: any) => c.id !== '00000000-0000-0000-0000-000000000000')

  if (includeDrafts) {
    return filtered
  }
  return filtered.filter((c: any) => !c.category?.startsWith('Draft|'))
}

export async function fetchMilestones(courseId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('course_id', courseId)
    .order('sequence_order', { ascending: true })

  if (error) {
    console.error('Error fetching milestones:', error)
    return []
  }
  return data || []
}

export async function fetchUserEnrollments() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (typeof window !== 'undefined') {
      const guest = localStorage.getItem('guest_enrollments')
      return guest ? JSON.parse(guest) : []
    }
    return []
  }

  const { data, error } = await supabase
    .from('enrollments')
    .select('*, courses(*)')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching enrollments:', error)
    return []
  }
  return data || []
}

export async function enrollInCourse(courseId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    if (typeof window !== 'undefined') {
      const guest = localStorage.getItem('guest_enrollments')
      const enrollList = guest ? JSON.parse(guest) : []
      if (enrollList.some((e: any) => e.course_id === courseId)) {
        return { success: false, message: 'You are already enrolled in this course.' }
      }
      
      const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).single()
      enrollList.push({
        id: Math.random().toString(),
        user_id: 'guest',
        course_id: courseId,
        progress: 0,
        completed_milestones: [],
        courses: courseData
      })
      localStorage.setItem('guest_enrollments', JSON.stringify(enrollList))
      return { success: true, message: 'Successfully enrolled as Guest!' }
    }
    return { success: false, message: 'Please log in to enroll.' }
  }

  const { data, error } = await supabase
    .from('enrollments')
    .insert([
      { user_id: user.id, course_id: courseId, progress: 0, completed_milestones: [] }
    ])
    .select()

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'You are already enrolled.' }
    }
    return { success: false, message: error.message }
  }

  // Trigger enrollment onboarding email via Next.js API Route
  try {
    const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single()
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

    if (course && user.email) {
      await fetch('/api/send-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: user.email,
          course_title: course.title,
          student_name: profile?.full_name || 'Student'
        })
      })
    }
  } catch (err) {
    console.error('Failed to trigger onboarding email:', err)
  }

  return { success: true, message: 'Successfully enrolled!' }
}

export async function toggleMilestoneCompletion(courseId: string, milestoneId: string, totalMilestonesCount: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (typeof window !== 'undefined') {
      const guest = localStorage.getItem('guest_enrollments')
      if (guest) {
        const enrollList = JSON.parse(guest)
        const match = enrollList.find((e: any) => e.course_id === courseId)
        if (match) {
          const completed = match.completed_milestones || []
          const index = completed.indexOf(milestoneId)
          if (index > -1) {
            completed.splice(index, 1)
          } else {
            completed.push(milestoneId)
          }
          match.completed_milestones = completed
          match.progress = Math.round((completed.length / totalMilestonesCount) * 100)
          localStorage.setItem('guest_enrollments', JSON.stringify(enrollList))
          return { success: true }
        }
      }
    }
    return { success: false }
  }

  // Get current enrollment details
  const { data: enrollment, error: fetchErr } = await supabase
    .from('enrollments')
    .select('completed_milestones')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single()

  if (fetchErr) return { success: false }

  const completed = enrollment.completed_milestones || []
  const index = completed.indexOf(milestoneId)
  if (index > -1) {
    completed.splice(index, 1)
  } else {
    completed.push(milestoneId)
  }

  const progress = Math.round((completed.length / totalMilestonesCount) * 100)

  const { error } = await supabase
    .from('enrollments')
    .update({ completed_milestones: completed, progress })
    .eq('user_id', user.id)
    .eq('course_id', courseId)

  return { success: !error }
}
