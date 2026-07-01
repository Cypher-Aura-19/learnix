import { createClient } from '@/utils/supabase/client'

export async function fetchAdminStats() {
  const supabase = createClient()

  // 1. Get total courses
  const { count: coursesCount, error: coursesError } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .neq('id', '00000000-0000-0000-0000-000000000000')

  // 2. Get total students (all non-admin profiles)
  const { count: studentsCount, error: studentsError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .neq('role', 'admin')

  // 3. Get total enrollments
  const { count: enrollmentsCount, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })

  // 4. Calculate Average Completion Rate
  const { data: enrollments, error: progressError } = await supabase
    .from('enrollments')
    .select('progress')

  let completionRate = 0
  if (enrollments && enrollments.length > 0) {
    const totalProgress = enrollments.reduce((acc, curr) => acc + (curr.progress || 0), 0)
    completionRate = Math.round(totalProgress / enrollments.length)
  }

  return {
    courses: coursesCount || 0,
    students: studentsCount || 0,
    enrollments: enrollmentsCount || 0,
    completionRate: `${completionRate}%`
  }
}

export async function fetchRecentActivity() {
  const supabase = createClient()

  // Get recent enrollments
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('*, courses(title)')
    .order('created_at', { ascending: false })

  if (error || !enrollments) {
    console.error('Error fetching recent activity:', error)
    return []
  }

  // Get corresponding student profiles (excluding admins)
  const userIds = enrollments.map((e: any) => e.user_id).filter(Boolean)
  const { data: studentProfiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').neq('role', 'admin').in('id', userIds)
    : { data: [] }

  const studentMap = new Map((studentProfiles || []).map((p: any) => [p.id, p]))

  // Get recent courses published
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, created_at')
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .order('created_at', { ascending: false })
    .limit(10)

  const list: any[] = []

  // Add student enrollments
  enrollments.forEach((item: any) => {
    const student = studentMap.get(item.user_id)
    if (!student) return // Exclude admin enrollments
    
    const name = student.full_name || 'Student'
    const courseName = item.courses?.title || 'Course'
    
    list.push({
      id: `enroll-${item.id}`,
      type: item.progress >= 100 ? 'completion' : 'enrollment',
      name: name,
      action: item.progress >= 100 ? 'completed' : 'enrolled in',
      target: courseName,
      created_at: new Date(item.created_at)
    })
  })

  // Add course publications
  if (courses) {
    courses.forEach((course: any) => {
      list.push({
        id: `course-${course.id}`,
        type: 'course_creation',
        name: 'Administrator',
        action: 'published new course',
        target: course.title,
        created_at: new Date(course.created_at)
      })
    })
  }

  // Sort by date descending
  list.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())

  return list.map((act) => {
    const diffMs = new Date().getTime() - act.created_at.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    let timeStr = 'Just now'
    
    if (diffMins > 0 && diffMins < 60) {
      timeStr = `${diffMins} min ago`
    } else if (diffMins >= 60 && diffMins < 1440) {
      const hrs = Math.floor(diffMins / 60)
      timeStr = `${hrs} hour${hrs > 1 ? 's' : ''} ago`
    } else if (diffMins >= 1440) {
      const days = Math.floor(diffMins / 1440)
      timeStr = `${days} day${days > 1 ? 's' : ''} ago`
    }

    let color = 'bg-neo-blue'
    if (act.type === 'completion') color = 'bg-neo-pink'
    if (act.type === 'course_creation') color = 'bg-neo-green'

    return {
      id: act.id,
      type: act.type,
      name: act.name,
      action: act.action,
      target: act.target,
      timestamp: timeStr,
      color: color
    }
  })
}

export async function createCourse(courseData: { title: string, description: string, category: string, icon: string, difficulty: string }) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('courses')
    .insert([courseData])
    .select()

  if (error) {
    return { success: false, message: error.message }
  }
  return { success: true, data }
}

export async function fetchStudentsList() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'admin')

  if (error) {
    console.error('Error fetching students list:', error)
    return []
  }
  return data || []
}

export async function fetchEnrollmentOverTime(filter: 'This Month' | 'Last Month' | 'All Time' = 'This Month') {
  const supabase = createClient()
  
  let query = supabase
    .from('enrollments')
    .select('created_at')
    .order('created_at', { ascending: true })

  const now = new Date()
  if (filter === 'This Month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    query = query.gte('created_at', startOfMonth)
  } else if (filter === 'Last Month') {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()
    query = query.gte('created_at', startOfLastMonth).lte('created_at', endOfLastMonth)
  }

  const { data } = await query

  let labels: string[] = []
  let values: number[] = []

  if (filter === 'All Time') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    // Get last 6 months dynamically
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      labels.push(months[d.getMonth()])
    }
    values = new Array(labels.length).fill(0)

    if (data) {
      data.forEach((e: any) => {
        const monthStr = new Date(e.created_at).toLocaleDateString(undefined, { month: 'short' })
        const idx = labels.indexOf(monthStr)
        if (idx !== -1) {
          values[idx]++
        }
      })
    }
  } else {
    // Bucket by weeks/days: '1st', '5th', '10th', '15th', '20th', '25th', '30th'
    labels = ['1st', '5th', '10th', '15th', '20th', '25th', '30th']
    values = new Array(labels.length).fill(0)

    if (data) {
      data.forEach((e: any) => {
        const d = new Date(e.created_at)
        const day = d.getDate()
        let idx = 0
        if (day <= 3) idx = 0
        else if (day <= 7) idx = 1
        else if (day <= 12) idx = 2
        else if (day <= 17) idx = 3
        else if (day <= 22) idx = 4
        else if (day <= 27) idx = 5
        else idx = 6
        values[idx]++
      })
    }
  }

  return { labels, data: values }
}

export async function fetchRealNotifications() {
  const supabase = createClient()
  
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, created_at, progress, user_id, courses(title)')
    .order('created_at', { ascending: false })
    .limit(30)

  // Fetch profiles for the enrollments manually, excluding admin roles
  const userIds = enrollments ? enrollments.map((e: any) => e.user_id).filter(Boolean) : []
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name, email').neq('role', 'admin').in('id', userIds)
    : { data: [] }
  
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

  const { data: courses } = await supabase
    .from('courses')
    .select('id, created_at, title')
    .order('created_at', { ascending: false })
    .limit(5)

  const list: any[] = []
  
  if (enrollments) {
    enrollments.forEach((e: any) => {
      const profile = profileMap.get(e.user_id) as any
      if (!profile) return // Skip admin enrollments
      
      const name = profile.full_name || profile.email || 'A student'
      const courseName = e.courses?.title || 'a course'
      list.push({
        id: `enroll-${e.id}`,
        text: `${name} enrolled in ${courseName}`,
        created_at: new Date(e.created_at)
      })
      if (e.progress >= 100) {
        list.push({
          id: `comp-${e.id}`,
          text: `${name} completed ${courseName}`,
          created_at: new Date(e.created_at)
        })
      }
    })
  }

  if (courses) {
    courses.forEach((c: any) => {
      list.push({
        id: `course-${c.id}`,
        text: `New course published: ${c.title}`,
        created_at: new Date(c.created_at)
      })
    })
  }

  list.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())

  return list.slice(0, 8).map((item) => {
    const diffMs = new Date().getTime() - item.created_at.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    let timeStr = 'Just now'
    if (diffMins > 0 && diffMins < 60) {
      timeStr = `${diffMins}m ago`
    } else if (diffMins >= 60 && diffMins < 1440) {
      timeStr = `${Math.floor(diffMins / 60)}h ago`
    } else if (diffMins >= 1440) {
      timeStr = `${Math.floor(diffMins / 1440)}d ago`
    }
    return {
      id: item.id,
      text: item.text,
      time: timeStr,
      created_at: item.created_at.toISOString()
    }
  })
}

export async function fetchAllEnrollments() {
  const supabase = createClient()
  
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('*, courses(title)')
    .order('created_at', { ascending: false })

  if (error || !enrollments) {
    console.error('Error fetching enrollments:', error)
    return []
  }

  // Fetch profiles manually to resolve student names/emails
  const userIds = enrollments.map((e: any) => e.user_id).filter(Boolean)
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name, email')
    : { data: [] }

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

  return enrollments.map((e: any) => {
    const profile = profileMap.get(e.user_id)
    return {
      id: e.id,
      user_id: e.user_id,
      course_id: e.course_id,
      student_name: profile?.full_name || 'Guest Student',
      student_email: profile?.email || 'N/A',
      course_title: e.courses?.title || 'Unknown Course',
      progress: e.progress || 0,
      created_at: e.created_at,
      enrolled_at: new Date(e.created_at).toLocaleDateString()
    }
  })
}

export async function updateEnrollmentProgress(enrollmentId: string, progress: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('enrollments')
    .update({ progress })
    .eq('id', enrollmentId)

  if (error) {
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function removeEnrollment(enrollmentId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('id', enrollmentId)

  if (error) {
    return { success: false, message: error.message }
  }
  return { success: true }
}
