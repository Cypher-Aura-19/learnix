import { createClient } from '@/utils/supabase/client'

export async function createCourseWithMilestones(
  courseData: { title: string; description: string; category: string; icon: string; difficulty: string },
  milestones: Array<{
    group_title: string
    title: string
    description: string
    content_type: string
    content_url: string
    quiz_questions: any
    days_left_from_enrollment: number
  }>
) {
  const supabase = createClient()

  // 1. Insert Course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert([courseData])
    .select()
    .single()

  if (courseError || !course) {
    return { success: false, message: courseError?.message || 'Failed to create course.' }
  }

  // 2. Insert Milestones with sequence order
  if (milestones.length > 0) {
    const milestonesToInsert = milestones.map((m, idx) => ({
      course_id: course.id,
      group_title: m.group_title,
      title: m.title,
      description: m.description,
      sequence_order: idx + 1,
      content_type: m.content_type,
      content_url: m.content_url || '',
      quiz_questions: m.quiz_questions || null,
      days_left_from_enrollment: m.days_left_from_enrollment || 5,
    }))

    const { error: milestonesError } = await supabase
      .from('milestones')
      .insert(milestonesToInsert)

    if (milestonesError) {
      // Clean up course to simulate transaction rollback
      await supabase.from('courses').delete().eq('id', course.id)
      return { success: false, message: milestonesError.message }
    }
  }

  return { success: true, courseId: course.id }
}

export async function seedSampleData() {
  const supabase = createClient()

  try {
    // 1. Get some courses to link to enrollments
    const { data: courses, error: coursesErr } = await supabase
      .from('courses')
      .select('id, title')
    
    if (coursesErr || !courses || courses.length === 0) {
      return { success: false, message: 'Please create at least one course first before seeding sample data.' }
    }

    // Query existing profiles in the database (excluding admins).
    const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').neq('role', 'admin')
    if (profiles && profiles.length > 0 && courses.length > 0) {
      const { data: existingEnrollments } = await supabase.from('enrollments').select('*')
      
      for (const profile of profiles) {
        for (const course of courses) {
          const exists = existingEnrollments?.some(e => e.user_id === profile.id && e.course_id === course.id)
          if (!exists) {
            const randomProgress = Math.floor(Math.random() * 5) * 25 // 0, 25, 50, 75, 100
            await supabase.from('enrollments').insert({
              user_id: profile.id,
              course_id: course.id,
              progress: randomProgress,
              completed_milestones: []
            })
          }
        }
      }
      return { success: true, message: `Successfully seeded/aligned enrollments for ${profiles.length} profiles across ${courses.length} courses!` }
    }

    return { success: false, message: 'No registered profiles/students found to enroll.' }

  } catch (err: any) {
    return { success: false, message: err.message }
  }
}

export async function updateCourseWithMilestones(
  courseId: string,
  courseData: { title: string; description: string; category: string; icon: string; difficulty: string },
  milestones: Array<{
    group_title: string
    title: string
    description: string
    content_type: string
    content_url: string
    quiz_questions: any
    days_left_from_enrollment: number
  }>
) {
  const supabase = createClient()

  // 1. Update Course properties
  const { error: courseError } = await supabase
    .from('courses')
    .update(courseData)
    .eq('id', courseId)

  if (courseError) {
    return { success: false, message: courseError.message }
  }

  // 2. Delete old milestones
  const { error: deleteError } = await supabase
    .from('milestones')
    .delete()
    .eq('course_id', courseId)

  if (deleteError) {
    return { success: false, message: deleteError.message }
  }

  // 3. Insert new milestones
  if (milestones.length > 0) {
    const milestonesToInsert = milestones.map((m, idx) => ({
      course_id: courseId,
      group_title: m.group_title,
      title: m.title,
      description: m.description,
      sequence_order: idx + 1,
      content_type: m.content_type,
      content_url: m.content_url || '',
      quiz_questions: m.quiz_questions || null,
      days_left_from_enrollment: m.days_left_from_enrollment || 5,
    }))

    const { error: milestonesError } = await supabase
      .from('milestones')
      .insert(milestonesToInsert)

    if (milestonesError) {
      return { success: false, message: milestonesError.message }
    }
  }

  return { success: true }
}

export async function updateCourseProperties(
  courseId: string,
  courseData: { title: string; description: string; category: string; icon: string; difficulty: string }
) {
  const supabase = createClient()
  const { error } = await supabase
    .from('courses')
    .update(courseData)
    .eq('id', courseId)

  if (error) {
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function deleteCourse(courseId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)

  if (error) {
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function fetchCourseEnrollmentsCount(courseId: string): Promise<number> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)

  if (error) {
    console.error('Error fetching enrollment count:', error)
    return 0
  }
  return count || 0
}

const SETTINGS_ID = '00000000-0000-0000-0000-000000000000'

export async function fetchPlatformSettings() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', SETTINGS_ID)
    .single()

  if (error || !data) {
    return {
      platformName: 'Learnix',
      supportEmail: 'support@learnix.com',
      certificateSignatory: 'Jane Doe',
      minPassingScore: 70,
      enrollmentOpen: true,
      maintenanceMode: false
    }
  }

  try {
    return JSON.parse(data.description || '{}')
  } catch {
    return {
      platformName: 'Learnix',
      supportEmail: 'support@learnix.com',
      certificateSignatory: 'Jane Doe',
      minPassingScore: 70,
      enrollmentOpen: true,
      maintenanceMode: false
    }
  }
}

export async function savePlatformSettings(settings: any) {
  const supabase = createClient()
  const { error } = await supabase
    .from('courses')
    .upsert({
      id: SETTINGS_ID,
      title: 'PlatformSettingsRecord',
      description: JSON.stringify(settings),
      category: 'System',
      icon: '⚙️',
      difficulty: 'System'
    })
  return { success: !error, error }
}

export async function resetAllEnrollments() {
  const supabase = createClient()
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // delete all records
  return { success: !error, error }
}

