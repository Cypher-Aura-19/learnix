'use client'

import React, { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Percent,
  Plus,
  ArrowRight,
  LogOut,
  X,
  FileText,
  Search,
  Bell,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  UserCheck,
  Award,
  Settings,
  ShieldAlert,
  BarChart4,
  GraduationCap,
  PieChart,
  School,
  ChartNoAxesCombined,
  Trash2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useModal } from '@/components/ModalProvider'
import { createClient } from '@/utils/supabase/client'
import { fetchAdminStats, fetchRecentActivity, createCourse, fetchStudentsList, fetchEnrollmentOverTime, fetchRealNotifications, fetchAllEnrollments, updateEnrollmentProgress, removeEnrollment } from '@/utils/admin-actions'
import { fetchCourses } from '@/utils/db-actions'
import { deleteCourse, updateCourseProperties, fetchCourseEnrollmentsCount, fetchPlatformSettings, savePlatformSettings, resetAllEnrollments } from '@/utils/admin-actions-extended'
import { FaBookOpen, FaUsers, FaGraduationCap, FaChartLine } from 'react-icons/fa'
import CourseCover from '@/components/CourseCover'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
)

export default function AdminDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const { showAlert, showConfirm } = useModal()

  // State Definitions
  const [stats, setStats] = useState({ courses: 0, students: 0, enrollments: 0, completionRate: '0%' })
  const [activities, setActivities] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [coursesList, setCoursesList] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Courses' | 'Students' | 'Enrollments' | 'Reports' | 'Settings'>('Dashboard')
  
  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    platformName: 'Learnix',
    supportEmail: 'support@learnix.com',
    certificateSignatory: 'Jane Doe',
    minPassingScore: 70,
    enrollmentOpen: true,
    maintenanceMode: false
  })
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [showActivityDetailsModal, setShowActivityDetailsModal] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  // Search & Notifications states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unseenCount, setUnseenCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [courseStatusTab, setCourseStatusTab] = useState<'published' | 'drafts'>('published')
  const [coursePage, setCoursePage] = useState(1)
  const COURSES_PER_PAGE = 4
  const [enrollmentsList, setEnrollmentsList] = useState<any[]>([])
  const [performancePage, setPerformancePage] = useState(1)
  const [chartFilter, setChartFilter] = useState<'This Month' | 'Last Month' | 'All Time'>('This Month')
  // Reports filters
  const [reportTimeframe, setReportTimeframe] = useState<'This Month' | 'Last Month' | 'All Time'>('All Time')
  const [reportCourse,    setReportCourse]    = useState<string>('All Courses')
  const [reportCategory,  setReportCategory]  = useState<string>('All Categories')

  // Create Course Form State
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: 'Development',
    icon: '</>',
    difficulty: 'Beginner'
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<{ labels: string[]; data: number[] }>({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [0, 0, 0, 0, 0, 0, 0]
  })

  const loadAdminData = async () => {
    setLoading(true)
    const dataStats = await fetchAdminStats()
    setStats(dataStats)

    const listActivity = await fetchRecentActivity()
    setActivities(listActivity)

    const listStudents = await fetchStudentsList()
    setStudents(listStudents)

    const listCourses = await fetchCourses(true)
    setCoursesList(listCourses)

    const chartRes = await fetchEnrollmentOverTime(chartFilter)
    setChartData(chartRes)

    const realNotes = await fetchRealNotifications()
    const clearedAtStr = typeof window !== 'undefined' ? localStorage.getItem('notifications_cleared_at') : null
    const clearedAt = clearedAtStr ? new Date(clearedAtStr) : null

    const activeNotes = realNotes.filter((n: any) => {
      if (clearedAt && new Date(n.created_at) <= clearedAt) {
        return false
      }
      return true
    })
    setNotifications(activeNotes)
    setUnseenCount(activeNotes.length)

    const listEnrollments = await fetchAllEnrollments()
    setEnrollmentsList(listEnrollments)

    const currentSettings = await fetchPlatformSettings()
    setSettingsForm(currentSettings)

    setLoading(false)
  }

  useEffect(() => {
    async function reloadChart() {
      const chartRes = await fetchEnrollmentOverTime(chartFilter)
      setChartData(chartRes)
    }
    if (!loading) {
      reloadChart()
    }
  }, [chartFilter])

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/admin/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        router.push('/admin/login')
        return
      }

      loadAdminData()
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setCourseForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!courseForm.title || !courseForm.description) {
      setFormError('Course Title and Description are required.')
      return
    }

    setIsSubmitting(true)
    const result = await createCourse(courseForm)
    setIsSubmitting(false)

    if (!result.success) {
      setFormError(result.message || 'Error occurred.')
    } else {
      setShowCreateModal(false)
      setCourseForm({ title: '', description: '', category: 'Development', icon: '</>', difficulty: 'Beginner' })
      loadAdminData()
    }
  }

  const handleClearAllNotifications = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications_cleared_at', new Date().toISOString())
    }
    setNotifications([])
    setUnseenCount(0)
  }

  const handleDeleteCourseClick = async (courseId: string, courseTitle: string) => {
    const count = await fetchCourseEnrollmentsCount(courseId)
    let confirmed = true
    if (count > 0) {
      confirmed = await showConfirm(`Warning: The course "${courseTitle}" has ${count} active enrolled student(s). Deleting it will permanently delete their progress and enrollments. Are you sure you want to continue?`)
    } else {
      confirmed = await showConfirm(`Are you sure you want to delete the course "${courseTitle}"?`)
    }
    if (confirmed) {
      const res = await deleteCourse(courseId)
      if (res.success) {
        await showAlert({ title: 'Success', message: 'Course successfully deleted!', type: 'success' })
        loadAdminData()
      } else {
        await showAlert({ title: 'Error', message: `Error deleting course: ${res.message}`, type: 'error' })
      }
    }
  }

  const handlePublishDraft = async (course: any) => {
    const originalCategory = course.category.replace('Draft|', '')
    const res = await updateCourseProperties(course.id, {
      title: course.title,
      description: course.description,
      category: originalCategory,
      icon: course.icon,
      difficulty: course.difficulty
    })
    if (res.success) {
      await showAlert({ title: 'Published', message: 'Course published successfully!', type: 'success' })
      loadAdminData()
    } else {
      await showAlert({ title: 'Error', message: `Error publishing course: ${res.message}`, type: 'error' })
    }
  }

  const handleUnpublishCourse = async (course: any) => {
    const res = await updateCourseProperties(course.id, {
      title: course.title,
      description: course.description,
      category: `Draft|${course.category}`,
      icon: course.icon,
      difficulty: course.difficulty
    })
    if (res.success) {
      await showAlert({ title: 'Unpublished', message: 'Course unpublished successfully! Enrolled students retain access, but new students cannot find it.', type: 'info' })
      loadAdminData()
    } else {
      await showAlert({ title: 'Error', message: `Error unpublishing course: ${res.message}`, type: 'error' })
    }
  }

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, active: true },
    { name: 'Courses', icon: BookOpen, active: false },
    { name: 'Students', icon: Users, active: false },
    { name: 'Enrollments', icon: UserCheck, active: false },
    { name: 'Reports', icon: BarChart4, active: false },
  ]

  const statCards = [
    { title: 'Total Courses', value: stats.courses, sub: '↑ 12 this month', color: 'bg-neo-green', icon: (props: any) => <FaBookOpen className="w-10 h-10 text-white stroke-black stroke-[30px]" /> },
    { title: 'Total Students', value: stats.students, sub: '↑ 18% this month', color: 'bg-neo-blue', icon: (props: any) => <FaUsers className="w-10 h-10 text-white stroke-black stroke-[30px]" /> },
    { title: 'Total Enrollments', value: stats.enrollments, sub: '↑ 22% this month', color: 'bg-neo-yellow', icon: (props: any) => <FaGraduationCap className="w-10 h-10 text-white stroke-black stroke-[30px]" /> },
    { title: 'Completion Rate', value: stats.completionRate, sub: '↑ 6% this month', color: 'bg-neo-pink', icon: (props: any) => <FaChartLine className="w-10 h-10 text-white stroke-black stroke-[30px]" /> },
  ]
  if (loading) {
    return (
      <div className="flex h-screen w-full bg-[#f8f9fa] font-sans text-black overflow-hidden border-2 border-black animate-pulse">
        {/* Sidebar Skeleton */}
        <aside className="w-64 flex-shrink-0 border-r-[3px] border-black bg-[#f4f4f0] flex flex-col justify-between p-6">
          <div className="flex flex-col gap-10">
            {/* Logo Area */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-12 bg-neutral-200 border-2 border-black shadow-[1px_1px_0px_#000]" />
              <div className="flex flex-col gap-1.5">
                <div className="w-24 h-4 bg-neutral-200 border border-black" />
                <div className="w-16 h-2.5 bg-neutral-200 border border-black" />
              </div>
            </div>
            {/* Links */}
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-full h-11 bg-neutral-200 border-2 border-black shadow-[2px_2px_0px_#000]" />
              ))}
            </div>
          </div>
          {/* Profile Card */}
          <div className="w-full h-14 bg-neutral-200 border-2 border-black shadow-[3px_3px_0px_#000]" />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-20 border-b-[3px] border-black flex items-center justify-between bg-white px-8 shrink-0">
            <div className="flex flex-col gap-1.5">
              <div className="w-48 h-5.5 bg-neutral-200 border border-black" />
              <div className="w-32 h-3 bg-neutral-200 border border-black" />
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-neutral-200 border border-black" />
              <div className="w-8 h-8 rounded-full bg-neutral-200 border border-black" />
            </div>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 p-8 overflow-hidden flex flex-col gap-6 bg-[#fcfcf9]">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-white border-2 border-black p-4 shadow-[4px_4px_0px_#000] flex items-center gap-4">
                  <div className="w-12 h-12 bg-neutral-200 border border-black shadow-[1.5px_1.5px_0px_#000]" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="w-16 h-3 bg-neutral-200 border" />
                    <div className="w-12 h-5 bg-neutral-200 border" />
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
              <div className="border-2 border-black bg-white p-6 shadow-[3px_3px_0px_#000] flex flex-col gap-4">
                <div className="w-36 h-4 bg-neutral-200 border" />
                <div className="flex-1 bg-neutral-100 border border-dashed border-neutral-300 animate-pulse" />
              </div>
              <div className="border-2 border-black bg-white p-6 shadow-[3px_3px_0px_#000] flex flex-col gap-4">
                <div className="w-36 h-4 bg-neutral-200 border" />
                <div className="flex-1 bg-neutral-100 border border-dashed border-neutral-300 animate-pulse" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full bg-[#f8f9fa] font-sans text-black overflow-hidden border-2 border-black">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 border-r-[3px] border-black bg-[#f4f4f0] flex flex-col justify-between p-6">
        <div className="flex flex-col gap-10">
          
          {/* Logo Area */}
          <div className="flex items-center gap-4">
            <div className="relative w-11 h-12 flex-shrink-0">
              <div className="absolute left-0 top-0 w-3 h-full bg-[#ff4d4d] border-2 border-black z-10 shadow-[1px_1px_0px_#000]"></div>
              <div className="absolute left-2.5 top-0 w-8.5 h-full bg-[#ffcc00] border-y-2 border-r-2 border-black flex items-center justify-center shadow-[1px_1px_0px_#000]">
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-black ml-1"></div>
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="font-heading text-2xl tracking-wider text-black leading-none uppercase">LEARNIX</h2>
              <span className="text-[9px] font-extrabold text-black uppercase tracking-wider mt-1 leading-none" style={{ letterSpacing: '1px' }}>
                LEARN. GROW. ACHIEVE.
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-4">
            {sidebarItems.map((item, idx) => {
              const isSelected = activeTab === item.name
              return (
                <div key={idx}>
                  <button
                    onClick={() => setActiveTab(item.name as any)}
                    className={`w-full flex items-center gap-4 px-4 py-3 border-2 border-black font-sans font-extrabold text-base tracking-wide rounded-none cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#ffcc00] text-black shadow-[4px_4px_0px_#000]'
                        : 'bg-transparent text-black border-transparent hover:translate-x-1'
                    }`}
                  >
                    <item.icon className="w-6 h-6 stroke-[2.5px] text-black" />
                    <span>{item.name}</span>
                  </button>
                </div>
              )
            })}
          </nav>
        </div>

        {/* Bottom Profile card */}
        <div className="relative w-full mb-10">
          {profileMenuOpen && (
            <div className="absolute bottom-full left-0 w-full mb-3 bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] z-[110] p-1.5 flex flex-col gap-1">
              <div className="p-2 border-b-2 border-black bg-neutral-50">
                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Signed in as</p>
                <p className="text-xs font-black text-black truncate">{`admin@learnix.com`}</p>
              </div>
              <button
                onClick={() => {
                  setProfileMenuOpen(false)
                  setActiveTab('Settings')
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-black uppercase text-black bg-white hover:bg-[#ffcc00] border-2 border-transparent hover:border-black transition-all cursor-pointer text-left"
              >
                <Settings className="w-4 h-4 stroke-[2.5px]" />
                <span>Admin Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-black uppercase text-red-600 bg-white hover:bg-red-50 border-2 border-transparent hover:border-red-600 transition-all cursor-pointer text-left"
              >
                <LogOut className="w-4 h-4 stroke-[2.5px] text-red-600" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="w-full border-[3px] border-black p-3 bg-[#fcfcf9] hover:bg-[#ffcc00] flex items-center gap-3 rounded-none relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_#000] transition-all z-[100] cursor-pointer text-left select-none"
          >
            <div className="w-[38px] h-[38px] rounded-none border-2 border-black bg-white overflow-hidden flex items-center justify-center shrink-0">
              <svg className="w-full h-full" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="14" r="7" fill="black" />
                <path d="M7 34c0-6 6-10 13-10s13 4 13 10H7z" fill="#0080ff" stroke="black" strokeWidth="2.5" />
              </svg>
            </div>
            <div className="flex flex-col text-left min-w-0 flex-1">
              <h4 className="font-sans font-black text-sm text-black leading-tight mb-0.5 truncate">Admin User</h4>
              <span className="font-sans font-extrabold text-xs text-neutral-500 leading-none truncate">admin@learnix.com</span>
            </div>
            <div className="shrink-0 flex items-center pr-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-4 h-4 text-black transition-transform duration-200 ${profileMenuOpen ? 'rotate-180' : ''}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        
        {/* Top Header */}
        <header className="h-20 border-b-[3px] border-black flex items-center justify-between bg-white shrink-0 p-0 overflow-visible relative z-30">
          <div className="flex-1 flex items-center justify-between px-8 py-4 h-full relative overflow-visible">
            <div>
              <h2 className="font-sans font-extrabold text-2xl text-black leading-tight">
                {activeTab === 'Dashboard' ? 'Admin Dashboard'
                  : activeTab === 'Courses' ? 'Manage Courses'
                  : activeTab === 'Students' ? 'Registered Students'
                  : activeTab === 'Enrollments' ? 'Student Enrollments'
                  : activeTab === 'Reports' ? 'Analytics & Reports'
                  : 'Platform Settings'}
              </h2>
              <p className="text-xs font-bold text-neutral-500 mt-0.5">
                {activeTab === 'Dashboard' ? "Welcome back! Here's what's happening."
                  : activeTab === 'Courses' ? 'Manage, edit, publish and delete your course catalog.'
                  : activeTab === 'Students' ? 'Browse and manage all registered student accounts.'
                  : activeTab === 'Enrollments' ? 'Monitor student enrollment logs and course progress.'
                  : activeTab === 'Reports' ? 'Track performance and analyze learning data.'
                  : 'Manage platform details, certificates, and status.'}
              </p>
            </div>

            <div className="flex items-center gap-6 pr-4 relative z-50 overflow-visible">
              <div className="flex items-center gap-2 relative">
                {searchOpen && (
                  <input
                    type="text"
                    placeholder="Search query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-1.5 border-2 border-black bg-white text-xs font-bold uppercase tracking-wide focus:outline-none placeholder-neutral-400 w-44 md:w-56"
                  />
                )}
                <button
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="flex items-center justify-center text-black hover:scale-105 cursor-pointer"
                >
                  <Search className="w-6 h-6 stroke-[2.5px]" />
                </button>
              </div>

              <div className="relative overflow-visible">
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen)
                    setUnseenCount(0)
                  }}
                  className="flex items-center justify-center relative text-black hover:scale-105 cursor-pointer"
                >
                  <Bell className="w-6 h-6 stroke-[2.5px]" />
                  {unseenCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#ff4d4d] text-white text-[9px] font-black border-2 border-black w-4.5 h-4.5 flex items-center justify-center rounded-full leading-none shadow-[1px_1px_0px_#000]">
                      {unseenCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popup Card */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 border-3 border-black bg-white shadow-[4px_4px_0px_#000] p-4 space-y-3 z-[9999] font-sans rounded-none">
                    <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                      <span className="font-heading text-xs uppercase tracking-wider text-black">Notifications</span>
                      <button
                        onClick={handleClearAllNotifications}
                        className="text-[10px] font-bold underline text-neutral-500 hover:text-black"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-neutral-400 font-bold uppercase text-center py-2">No new messages.</p>
                      ) : (
                        notifications.map((note) => (
                          <div key={note.id} className="p-2 border-2 border-black bg-neutral-50 text-xs font-bold text-black uppercase relative flex justify-between gap-2">
                            <span>{note.text}</span>
                            <span className="text-[9px] text-neutral-400 whitespace-nowrap">{note.time}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side colored visual artwork banner slot */}
          <div className="w-80 h-full border-l-[3px] border-black flex-shrink-0 bg-[#ffcc00] relative overflow-hidden hidden md:block">
            <div className="absolute inset-0 bg-[#ff4d4d] translate-x-[-120%] rotate-[45deg] border-r-3 border-black w-full h-full transition-all"></div>
            <div className="absolute inset-0 flex items-center justify-end pr-4">
              {/* Graphic abstract vector pattern shapes */}
              <div className="w-full h-full flex items-center justify-between px-1 relative">
                {/* Visual placeholder box shapes matching illustration */}
                <div className="w-16 h-full bg-neo-green border-r-3 border-black relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[15px] border-r-black"></div>
                </div>
                <div className="w-16 h-full bg-black relative flex items-center justify-center">
                  <div className="w-8 h-8 bg-white border-2 border-black rotate-45"></div>
                </div>
                <div className="w-16 h-full bg-[#ffcc00] relative">
                  <div className="absolute bottom-0 right-0 w-12 h-12 bg-white rounded-full border-3 border-black flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-[radial-gradient(#000_2px,transparent_2px)] [background-size:6px_6px] opacity-30"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        {/* Dashboard Canvas Grid Section */}
        <div className="p-8 flex flex-col gap-6 flex-1 overflow-hidden min-h-0">
          {loading ? (
            <div className="flex-1 flex flex-col gap-6 animate-pulse select-none">
              {activeTab === 'Dashboard' && (
                <>
                  {/* 4 Cards Skeleton */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex h-[100px] rounded-none">
                        <div className="w-[80px] bg-neutral-200 border-r-[3px] border-black"></div>
                        <div className="flex-1 p-4 bg-[#fcfcf9] flex flex-col justify-center gap-2">
                          <div className="h-2 bg-neutral-300 w-1/2"></div>
                          <div className="h-5 bg-neutral-300 w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Main Panel split skeleton */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                    <div className="bg-white border-[3px] border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-5 flex flex-col rounded-none">
                      <div className="h-4 bg-neutral-300 w-1/3 mb-6"></div>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex gap-4">
                          <div className="w-[45px] h-[45px] bg-neutral-200 border-2 border-black shadow-[1.5px_1.5px_0px_#000] rounded-none"></div>
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-2.5 bg-neutral-300 w-2/3"></div>
                            <div className="h-2 bg-neutral-200 w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white border-[3px] border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-5 flex flex-col rounded-none">
                      <div className="h-4 bg-neutral-300 w-1/3 mb-6"></div>
                      <div className="flex-1 bg-neutral-50 border-2 border-black flex items-center justify-center h-48 rounded-none">
                        <span className="text-[10px] uppercase font-bold text-neutral-400">Loading graph data...</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'Courses' && (
                <div className="flex-1 flex flex-col min-h-0 space-y-6">
                  {/* Header Skeleton */}
                  <div className="flex items-center justify-between border-b-[3px] border-black pb-4 shrink-0">
                    <div className="space-y-2 w-1/2">
                      <div className="h-5 bg-neutral-300 w-2/3"></div>
                      <div className="h-3.5 bg-neutral-200 w-full"></div>
                    </div>
                    <div className="w-36 h-10 bg-neutral-300 border-2 border-black shadow-[3px_3px_0px_#000]"></div>
                  </div>
                  {/* Cards Grid Skeleton */}
                  <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pr-2 py-2">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_#000] flex flex-col justify-between h-52 rounded-none">
                        <div>
                          <div className="flex justify-between items-start">
                            <div className="w-10 h-10 border-2 border-black bg-neutral-100 shadow-[1.5px_1.5px_0px_#000]"></div>
                            <div className="w-16 h-4 bg-neutral-200 border border-black"></div>
                          </div>
                          <div className="h-4 bg-neutral-300 w-3/4 mt-4"></div>
                          <div className="h-3 bg-neutral-200 w-full mt-2"></div>
                          <div className="h-3 bg-neutral-200 w-5/6 mt-1.5"></div>
                        </div>
                        <div className="w-full h-8 bg-neutral-300 border-2 border-black shadow-[2px_2px_0px_#000] mt-4"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'Students' && (
                <div className="flex-1 flex flex-col min-h-0 space-y-6">
                  {/* Header Skeleton */}
                  <div className="flex items-center justify-between border-b-[3px] border-black pb-4 shrink-0">
                    <div className="space-y-2 w-1/2">
                      <div className="h-5 bg-neutral-300 w-2/3"></div>
                      <div className="h-3.5 bg-neutral-200 w-full"></div>
                    </div>
                    <div className="w-24 h-10 bg-neutral-300 border-2 border-black shadow-[3px_3px_0px_#000]"></div>
                  </div>
                  {/* Students List Skeleton */}
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 py-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="border-2 border-black p-4 bg-white flex items-center justify-between shadow-[3px_3px_0px_#000] rounded-none">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 border-2 border-black bg-neutral-300 shrink-0"></div>
                          <div className="space-y-2">
                            <div className="h-3.5 bg-neutral-300 w-24"></div>
                            <div className="h-3 bg-neutral-200 w-36"></div>
                          </div>
                        </div>
                        <div className="w-16 h-4 bg-neutral-200 border border-black"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {activeTab === 'Dashboard' && (
                <>
                  {/* Stats Cards Grid (4 Column Layout) */}
                  <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
                {statCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex rounded-none overflow-hidden h-[100px]"
                  >
                    {/* Left side colored icon block */}
                    <div className={`w-[80px] shrink-0 border-r-[3px] border-black flex items-center justify-center ${card.color}`}>
                      <card.icon />
                    </div>
                    {/* Right side stats value block */}
                    <div className="flex-1 p-4 bg-[#fcfcf9] flex flex-col justify-center">
                      <span className="text-[10px] font-extrabold text-black uppercase tracking-wider leading-none mb-1">
                        {card.title}
                      </span>
                      <p className="text-3xl font-black text-black leading-none my-1 tracking-tight">
                        {typeof card.value === 'number' ? String(card.value).toLocaleString() : card.value}
                      </p>
                      <span className="text-[9px] font-extrabold text-[#00a854] uppercase tracking-wide leading-none mt-1">
                        {card.sub}
                      </span>
                    </div>
                  </div>
                ))}
              </section>

              {/* Lower Grid Panel (50:50 Split Grid) */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                
                {/* Recent Activity Panel */}
                <div className="bg-white border-[3px] border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col min-h-0">
                  <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4 shrink-0">
                    <h3 className="font-heading text-lg uppercase tracking-wider text-black">Recent Activity</h3>
                    <button 
                      onClick={() => setShowActivityDetailsModal(true)}
                      className="text-xs font-bold text-neutral-500 hover:underline"
                    >
                      View all &gt;
                    </button>
                  </div>

                  {/* No scrollbar activity logs feed */}
                  <div className="flex-1 overflow-hidden space-y-5">
                    {activities.length === 0 ? (
                      <div className="border-3 border-dashed border-black/25 p-12 text-center font-bold uppercase text-neutral-400 text-xs">
                        No recent activity recorded yet.
                      </div>
                    ) : (
                      activities.slice(0, 4).map((act) => (
                        <div key={act.id} className="flex flex-col">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-[45px] h-[45px] border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000] rounded-none ${act.color}`}>
                                {act.type === 'completion' ? (
                                  <svg className="w-5 h-5 text-white fill-white stroke-black stroke-[2px]" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                    <path d="M6 12v4c0 1.5 2.5 3 6 3s6-1.5 6-3v-4" />
                                    <circle cx="21.5" cy="13.5" r="1.5" />
                                  </svg>
                                ) : act.type === 'course_creation' ? (
                                  <BookOpen className="w-5 h-5 text-white stroke-black stroke-[2.5px]" />
                                ) : (
                                  <svg className="w-5 h-5 text-white fill-white stroke-black stroke-[2px]" viewBox="0 0 24 24">
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M4 18c0-3 3-5 8-5s8 2 8 5v2H4v-2z" />
                                  </svg>
                                )}
                              </div>
                              <div className="text-left font-sans text-xs">
                                <span className="font-extrabold text-black">{act.name}</span>
                                <span className="text-neutral-500 font-semibold mx-1">
                                  {act.action}
                                </span>
                                <span className="font-extrabold text-black block sm:inline">{act.target}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-neutral-500 shrink-0 whitespace-nowrap">{act.timestamp}</span>
                          </div>
                          <div className="w-full border-t border-dashed border-black/20 mt-4"></div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Actions & Overview Stack Column */}
                <div className="flex flex-col gap-6 min-h-0">
                  
                  {/* Quick Actions Card - Buttons arranged in horizontal row */}
                  <div className="bg-white border-[3px] border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 shrink-0">
                    <h3 className="font-heading text-lg uppercase tracking-wider text-black border-b-2 border-black pb-2">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => router.push('/admin/dashboard/courses/new')}
                        className="flex items-center justify-between p-3 border-2 border-black bg-white hover:bg-neutral-50 shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer rounded-none text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 border-2 border-black bg-neo-green flex items-center justify-center shrink-0">
                            <Plus className="w-4 h-4 stroke-[3px]" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-black leading-none mb-1">Create</h4>
                            <span className="text-[8px] text-neutral-500 font-bold uppercase block">New Course</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 stroke-[3px] shrink-0" />
                      </button>

                      <button
                        onClick={() => setActiveTab('Students')}
                        className="flex items-center justify-between p-3 border-2 border-black bg-white hover:bg-neutral-50 shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer rounded-none text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 border-2 border-black bg-neo-blue flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4 stroke-[2px] text-white" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-black leading-none mb-1">Students</h4>
                            <span className="text-[8px] text-neutral-500 font-bold uppercase block">Manage list</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 stroke-[3px] shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* Enrollment Overview Chart Card */}
                  <div className="bg-white border-[3px] border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-1 flex flex-col justify-between min-h-0">
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4 shrink-0">
                        <h3 className="font-heading text-lg uppercase tracking-wider text-black">Enrollment Overview</h3>
                        <div className="relative inline-block">
                          <select
                            value={chartFilter}
                            onChange={(e) => setChartFilter(e.target.value as any)}
                            className="border-2 border-black font-sans font-black text-[9px] uppercase pl-2 pr-7 py-1 appearance-none focus:outline-none bg-white rounded-none shadow-[2px_2px_0px_#000] cursor-pointer"
                          >
                            <option value="This Month">This Month</option>
                            <option value="Last Month">Last Month</option>
                            <option value="All Time">All Time</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                            <ChevronDown className="w-3 h-3 text-black stroke-[3.5px]" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Dynamic interactive Line Graph using react-chartjs-2 */}
                      <div className="flex-1 min-h-0 relative">
                        <Line
                          data={{
                            labels: chartData.labels,
                            datasets: [
                              {
                                label: 'Enrollments',
                                data: chartData.data,
                                borderColor: '#00a854',
                                borderWidth: 3,
                                backgroundColor: 'transparent',
                                pointBackgroundColor: '#00a854',
                                pointBorderColor: '#000000',
                                pointBorderWidth: 2,
                                pointRadius: 6,
                                pointHoverRadius: 8,
                                tension: 0.1
                              }
                            ]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                enabled: true,
                                backgroundColor: '#000000',
                                titleFont: { family: 'Space Grotesk', weight: 'bold', size: 10 },
                                bodyFont: { family: 'Space Grotesk', weight: 'bold', size: 10 },
                                padding: 8,
                                displayColors: false,
                                callbacks: {
                                  label: (context) => `${context.parsed.y} Enrollments`
                                }
                              }
                            },
                            scales: {
                              x: { display: false },
                              y: {
                                grid: { color: 'rgba(0,0,0,0.05)' },
                                ticks: {
                                  font: { family: 'Space Grotesk', weight: 'bold', size: 8 },
                                  color: '#000000'
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-[8px] font-black uppercase text-neutral-400 text-center pt-2 px-2 shrink-0">
                      {chartData.labels.map((lbl, lIdx) => (
                        <span key={lIdx}>{lbl}</span>
                      ))}
                    </div>
                  </div>

                </div>

              </section>
            </>
          )}

          {activeTab === 'Courses' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-6">
              <div className="flex items-center justify-between border-b-[3px] border-black pb-4 shrink-0">
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wider text-black">Active Curriculum Courses</h3>
                  <p className="text-xs font-bold text-neutral-500 uppercase mt-0.5">Manage list of all curriculum tracks and preview contents.</p>
                </div>
                <button
                  onClick={() => router.push('/admin/dashboard/courses/new')}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 border-2 border-black bg-[#ffcc00] text-black font-extrabold text-xs uppercase shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3px]" />
                  Create New Course
                </button>
              </div>

              {/* Toggle switch for Published vs Drafts */}
              <div className="flex gap-4 border-b-2 border-black pb-2 mb-2 shrink-0">
                <div className="flex items-center gap-3 mb-4 shrink-0">
                  <button
                    onClick={() => { setCourseStatusTab('published'); setCoursePage(1) }}
                    className={`px-4 py-2 border-2 border-black font-heading text-xs uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] cursor-pointer transition-all ${
                      courseStatusTab === 'published' ? 'bg-[#ffcc00] text-black' : 'bg-white text-neutral-500 hover:text-black'
                    }`}
                  >
                    Published Courses
                  </button>
                  <button
                    onClick={() => { setCourseStatusTab('drafts'); setCoursePage(1) }}
                    className={`px-4 py-2 border-2 border-black font-heading text-xs uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] cursor-pointer transition-all ${
                      courseStatusTab === 'drafts' ? 'bg-[#ffcc00] text-black' : 'bg-white text-neutral-500 hover:text-black'
                    }`}
                  >
                    Draft Courses
                  </button>
                </div>
              </div>

              {/* Course grid — 2 columns, 6 per page */}
              {(() => {
                const statusFiltered = coursesList.filter(course => {
                  const isDraft = course.category?.startsWith('Draft|')
                  return courseStatusTab === 'drafts' ? isDraft : !isDraft
                })
                const filtered = statusFiltered.filter(course =>
                  course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  course.category?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                const totalPages = Math.ceil(filtered.length / COURSES_PER_PAGE)
                const paginated = filtered.slice((coursePage - 1) * COURSES_PER_PAGE, coursePage * COURSES_PER_PAGE)

                if (filtered.length === 0) {
                  return (
                    <div className="flex-1 flex items-center justify-center border-[3px] border-dashed border-black/25 p-12 text-center font-bold uppercase text-neutral-400 text-xs">
                      No courses found under this view.
                    </div>
                  )
                }

                return (
                  <div className="flex flex-col gap-4 flex-1 min-h-0">
                    {/* Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 flex-1 overflow-y-auto pr-2 pb-2">
                      {paginated.map((course) => {
                        const isDraft = course.category?.startsWith('Draft|')
                        const displayCategory = isDraft ? course.category.replace('Draft|', '') : course.category || 'Curriculum'

                        return (
                          <div key={course.id} className="border-[3px] border-black bg-white shadow-[4px_4px_0px_#000] flex flex-col rounded-none overflow-hidden hover:shadow-[6px_6px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_#000] transition-all">
                            
                            {/* Cover — same as student card */}
                            <CourseCover category={course.category} title={course.title} icon={course.icon} />

                            {/* Card Body */}
                            <div className="p-4 flex flex-col justify-between flex-1 gap-4">
                              <div>
                                {/* Status badge + category — same layout as student */}
                                <div className="flex justify-between items-center mb-2">
                                  <span className={`px-2 py-0.5 border border-black text-[8px] font-black uppercase shadow-[1px_1px_0px_#000] ${
                                    isDraft ? 'bg-neutral-200 text-neutral-500' : 'bg-neo-green text-white'
                                  }`}>
                                    {isDraft ? 'Draft' : 'Published'}
                                  </span>
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase">{displayCategory}</span>
                                </div>

                                <h4 className="font-heading text-sm uppercase tracking-wider text-black leading-tight mb-1 truncate">
                                  {course.title}
                                </h4>
                                <p className="text-[10px] text-neutral-500 font-semibold uppercase line-clamp-2">
                                  {course.description || 'Explore milestones and start learning.'}
                                </p>
                              </div>

                              {/* Footer — difficulty dot + admin action buttons */}
                              <div className="flex items-center justify-between border-t-2 border-black/10 pt-3">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-black" />
                                  <span>{course.difficulty || 'Beginner'}</span>
                                </div>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => router.push(`/admin/dashboard/courses/${course.id}/preview`)}
                                    className="px-2.5 py-1.5 border border-black bg-white hover:bg-neutral-50 font-bold uppercase text-[9px] cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
                                  >
                                    Preview
                                  </button>
                                  <button
                                    onClick={() => router.push(`/admin/dashboard/courses/new?id=${course.id}`)}
                                    className="px-2.5 py-1.5 border border-black bg-[#ffcc00] hover:bg-[#ffcc00]/90 font-bold uppercase text-[9px] cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
                                  >
                                    Edit
                                  </button>
                                  {isDraft ? (
                                    <button
                                      onClick={() => handlePublishDraft(course)}
                                      className="px-2.5 py-1.5 border border-black bg-[#00ea8c] hover:bg-[#00ea8c]/90 font-bold uppercase text-[9px] cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
                                    >
                                      Publish
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleDeleteCourseClick(course.id, course.title)}
                                      className="px-2.5 py-1.5 border border-black bg-[#ff4d4d] text-white hover:bg-[#ff4d4d]/90 font-bold uppercase text-[9px] cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t-[3px] border-black pt-4 shrink-0">
                        <span className="font-heading text-xs uppercase tracking-wider text-neutral-500">
                          Showing {(coursePage - 1) * COURSES_PER_PAGE + 1}–{Math.min(coursePage * COURSES_PER_PAGE, filtered.length)} of {filtered.length} courses
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCoursePage(p => Math.max(1, p - 1))}
                            disabled={coursePage === 1}
                            className="w-9 h-9 border-2 border-black font-heading text-sm font-black flex items-center justify-center shadow-[2px_2px_0px_#000] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 active:shadow-none active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-all"
                          >
                            ←
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                              key={p}
                              onClick={() => setCoursePage(p)}
                              className={`w-9 h-9 border-2 border-black font-heading text-xs font-black flex items-center justify-center transition-all cursor-pointer ${
                                p === coursePage
                                  ? 'bg-[#ffcc00] shadow-[2px_2px_0px_#000]'
                                  : 'bg-white hover:bg-neutral-100 shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            onClick={() => setCoursePage(p => Math.min(totalPages, p + 1))}
                            disabled={coursePage === totalPages}
                            className="w-9 h-9 border-2 border-black font-heading text-sm font-black flex items-center justify-center shadow-[2px_2px_0px_#000] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 active:shadow-none active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-all"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {activeTab === 'Students' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-6">
              <div className="flex items-center justify-between border-b-[3px] border-black pb-4 shrink-0">
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wider text-black">Registered Student Directory</h3>
                  <p className="text-xs font-bold text-neutral-500 uppercase mt-0.5">Directory list of registered users and email accounts.</p>
                </div>
                <button
                  onClick={loadAdminData}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 border-2 border-black bg-white hover:bg-neutral-50 text-black font-extrabold text-xs uppercase shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-50"
                >
                  Sync Data
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 py-2">
                {(() => {
                  if (students.length === 0) {
                    return (
                      <div className="border-3 border-dashed border-black/25 p-12 text-center font-bold uppercase text-neutral-400 text-xs">
                        No students registered yet.
                      </div>
                    )
                  }
                  const filtered = students.filter(student =>
                    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    student.email?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  if (filtered.length === 0) {
                    return (
                      <div className="border-3 border-dashed border-black/25 p-12 text-center font-bold uppercase text-neutral-400 text-xs">
                        No students matching search query.
                      </div>
                    )
                  }
                  return filtered.map((student) => (
                    <div key={student.id} className="border-2 border-black p-4 bg-white flex items-center justify-between shadow-[3px_3px_0px_#000] rounded-none">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 border-2 border-black bg-neo-blue text-white flex items-center justify-center text-xs font-black shrink-0">
                          {student.full_name?.substring(0, 2).toUpperCase() || 'ST'}
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase text-black">{student.full_name || 'Student'}</h4>
                          <span className="text-xs font-bold text-neutral-400">{student.email}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 border border-black bg-neutral-100 text-[8px] font-black uppercase tracking-wider">
                          Registered
                        </span>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}

          {activeTab === 'Enrollments' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-6">
              <div className="flex items-center justify-between border-b-[3px] border-black pb-4 shrink-0">
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wider text-black">Active Student Course Enrollments</h3>
                  <p className="text-xs font-bold text-neutral-500 uppercase mt-0.5">Monitor progress logs, track user course completions, or cancel user enrollment.</p>
                </div>
                <button
                  onClick={loadAdminData}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 border-2 border-black bg-white hover:bg-neutral-50 text-black font-extrabold text-xs uppercase shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-50"
                >
                  Sync Logs
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-2">
                {(() => {
                  const filtered = enrollmentsList.filter(e =>
                    e.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.course_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.student_email.toLowerCase().includes(searchQuery.toLowerCase())
                  )

                  if (filtered.length === 0) {
                    return (
                      <div className="border-3 border-dashed border-black/25 p-12 text-center font-bold uppercase text-neutral-400 text-xs">
                        No enrollments found.
                      </div>
                    )
                  }

                  return filtered.map((e) => (
                    <div
                      key={e.id}
                      className="border-3 border-black p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-[4px_4px_0px_#000] rounded-none hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#000] transition-all"
                    >
                      {/* Left: Student Initials & Main Details */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 border-3 border-black bg-neo-yellow text-black flex items-center justify-center text-sm font-black shrink-0 shadow-[2px_2px_0px_#000]">
                          {e.student_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black uppercase text-black truncate">{e.student_name}</h4>
                          <span className="text-[10px] font-bold text-neutral-400 block truncate leading-none mt-0.5">{e.student_email}</span>
                          <span className="inline-block mt-2 px-2 py-0.5 border border-black bg-neutral-100 text-[8px] font-black uppercase text-neutral-600">
                            {e.course_title}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Premium Progress Meter */}
                      <div className="flex-1 max-w-md w-full">
                        <div className="flex justify-between text-[9px] font-black uppercase text-neutral-500 mb-1.5">
                          <span>Engagement progress</span>
                          <span className="font-heading text-[10px] text-black">{e.progress}%</span>
                        </div>
                        <div className="h-4 border-2 border-black bg-neutral-100 rounded-none overflow-hidden relative">
                          <div
                            className={`h-full border-r-2 border-black ${e.progress >= 100 ? 'bg-neo-pink' : 'bg-neo-green'}`}
                            style={{ width: `${e.progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Right: Enrolled Date & Actions */}
                      <div className="flex items-center gap-6 shrink-0 justify-between md:justify-end">
                        <div className="text-left md:text-right">
                          <span className="text-[8px] font-black uppercase text-neutral-400 block">Enrolled Date</span>
                          <span className="text-[10px] font-extrabold text-neutral-600 uppercase">{e.enrolled_at}</span>
                        </div>

                        <button
                          onClick={async () => {
                            const confirmed = await showConfirm(`Are you sure you want to cancel ${e.student_name}'s enrollment in ${e.course_title}?`)
                            if (confirmed) {
                              const res = await removeEnrollment(e.id)
                              if (res.success) {
                                await showAlert({ title: 'Cancelled', message: 'Enrollment cancelled!', type: 'success' })
                                loadAdminData()
                              } else {
                                await showAlert({ title: 'Error', message: `Failed: ${res.message}`, type: 'error' })
                              }
                            }
                          }}
                          className="px-4 py-2 border-2 border-black bg-[#ff4d4d] text-white hover:bg-[#ff4d4d]/90 font-sans font-extrabold text-[10px] uppercase shadow-[2.5px_2.5px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer rounded-none shrink-0"
                        >
                          Cancel Enrollment
                        </button>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}

          {activeTab === 'Reports' && (
            <div className="flex-1 overflow-y-auto" style={{paddingBottom:'60px'}}>
              <div className="flex flex-col gap-6 p-8">
              


              {/* Stats Overview Row */}
              {(() => {
                const totalE = enrollmentsList.length
                const completedCount = enrollmentsList.filter(e => e.progress >= 100).length
                const overallCompletionRate = totalE > 0 ? Math.round((completedCount / totalE) * 100) : 0

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
                    <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_#000] flex items-center gap-4 rounded-none">
                      <div className="w-12 h-12 border-2 border-black bg-[#00ea8c] flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000]">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider block">Total Courses</span>
                        <p className="text-xl font-black text-black leading-tight">{coursesList.length}</p>
                        <span className="text-[8px] font-bold text-green-600 uppercase">↑ {coursesList.length} this month</span>
                      </div>
                    </div>

                    <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_#000] flex items-center gap-4 rounded-none">
                      <div className="w-12 h-12 border-2 border-black bg-[#00a8ff] flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000]">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider block">Total Students</span>
                        <p className="text-xl font-black text-black leading-tight">{students.length}</p>
                        <span className="text-[8px] font-bold text-green-600 uppercase">↑ 18% this month</span>
                      </div>
                    </div>

                    <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_#000] flex items-center gap-4 rounded-none">
                      <div className="w-12 h-12 border-2 border-black bg-[#ffcc00] flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000]">
                        <GraduationCap className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider block">Total Enrollments</span>
                        <p className="text-xl font-black text-black leading-tight">{totalE}</p>
                        <span className="text-[8px] font-bold text-green-600 uppercase">↑ 22% this month</span>
                      </div>
                    </div>

                    <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_#000] flex items-center gap-4 rounded-none">
                      <div className="w-12 h-12 border-2 border-black bg-[#ff4d4d] flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000]">
                        <Percent className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider block">Average Completion Rate</span>
                        <p className="text-xl font-black text-black leading-tight">{overallCompletionRate}%</p>
                        <span className="text-[8px] font-bold text-green-600 uppercase">↑ 6% this month</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Filter Controls Row */}
              {(() => {
                const now = new Date()
                const thisMonthStart  = new Date(now.getFullYear(), now.getMonth(), 1)
                const lastMonthStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                const lastMonthEnd    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

                const filteredEnrollments = enrollmentsList.filter(e => {
                  const d = new Date(e.created_at)
                  // Timeframe filter
                  if (reportTimeframe === 'This Month' && d < thisMonthStart) return false
                  if (reportTimeframe === 'Last Month' && (d < lastMonthStart || d > lastMonthEnd)) return false
                  // Course filter
                  if (reportCourse !== 'All Courses' && e.course_title !== reportCourse) return false
                  // Category filter — look up in coursesList
                  if (reportCategory !== 'All Categories') {
                    const course = coursesList.find((c: any) => c.title === e.course_title)
                    const cat = course?.category?.replace(/^Draft\|/, '') ?? ''
                    if (cat !== reportCategory) return false
                  }
                  return true
                })

                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-4 shrink-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                          <select
                            value={reportTimeframe}
                            onChange={e => setReportTimeframe(e.target.value as any)}
                            className="px-3 py-2 pr-9 border-2 border-black bg-white font-extrabold text-[10px] uppercase shadow-[1.5px_1.5px_0px_#000] focus:outline-none rounded-none cursor-pointer appearance-none"
                          >
                            <option value="All Time">All Time</option>
                            <option value="This Month">This Month</option>
                            <option value="Last Month">Last Month</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
                            <ChevronDown className="w-3.5 h-3.5 text-black stroke-[3.5px]" />
                          </div>
                        </div>

                        <div className="relative">
                          <select
                            value={reportCourse}
                            onChange={e => setReportCourse(e.target.value)}
                            className="px-3 py-2 pr-9 border-2 border-black bg-white font-extrabold text-[10px] uppercase shadow-[1.5px_1.5px_0px_#000] focus:outline-none rounded-none cursor-pointer appearance-none"
                          >
                            <option value="All Courses">All Courses</option>
                            {coursesList.map((c: any) => <option key={c.id} value={c.title}>{c.title}</option>)}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
                            <ChevronDown className="w-3.5 h-3.5 text-black stroke-[3.5px]" />
                          </div>
                        </div>

                        <div className="relative">
                          <select
                            value={reportCategory}
                            onChange={e => setReportCategory(e.target.value)}
                            className="px-3 py-2 pr-9 border-2 border-black bg-white font-extrabold text-[10px] uppercase shadow-[1.5px_1.5px_0px_#000] focus:outline-none rounded-none cursor-pointer appearance-none"
                          >
                            <option value="All Categories">All Categories</option>
                            <option value="Development">Development</option>
                            <option value="Design">Design</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Data Science">Data Science</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
                            <ChevronDown className="w-3.5 h-3.5 text-black stroke-[3.5px]" />
                          </div>
                        </div>
                        {(reportTimeframe !== 'All Time' || reportCourse !== 'All Courses' || reportCategory !== 'All Categories') && (
                          <button
                            onClick={() => { setReportTimeframe('All Time'); setReportCourse('All Courses'); setReportCategory('All Categories') }}
                            className="flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-[#ff4d4d] text-white hover:bg-[#ff4d4d]/90 font-extrabold text-[10px] uppercase shadow-[1.5px_1.5px_0px_#000] cursor-pointer"
                          >
                            ✕ Clear Filters
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => showAlert({ title: 'Export Ready', message: 'Report compiled and ready for PDF/CSV download!', type: 'success' })}
                        className="flex items-center gap-1.5 px-4 py-2 border-2 border-black bg-white hover:bg-neutral-50 font-extrabold text-[10px] uppercase shadow-[2.5px_2.5px_0px_#000] cursor-pointer active:translate-y-0.5 active:shadow-none transition-all"
                      >
                        <span>📥</span> Export Report
                      </button>
                    </div>

              {/* Main Charts & Analytics Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
                <div style={{border:'2px solid #111', background:'#fff', borderRadius:'4px', boxShadow:'3px 3px 0 #111', padding:'20px 20px 12px 14px', height:'320px', display:'flex', flexDirection:'column'}}>
                  <p style={{fontFamily:'sans-serif', fontWeight:700, fontSize:'14px', color:'#111', margin:'0 0 12px 0'}}>Enrollments Over Time</p>
                  <div style={{flex:1, position:'relative', minHeight:0}}>
                    {(() => {
                      // Dates matching the seed data — spans May + June 2026
                      const DATE_LABELS = ['May 1','May 8','May 15','May 22','May 31','Jun 10','Jun 25']
                      const DATE_ISO: {[k:string]:string} = {
                        'May 1': '2026-05-01', 'May 8': '2026-05-08', 'May 15':'2026-05-15',
                        'May 22':'2026-05-22', 'May 31':'2026-05-31',
                        'Jun 10':'2026-06-10', 'Jun 25':'2026-06-25'
                      }
                      // Per-period counts (goes up AND down — zigzag like reference)
                      const counts = DATE_LABELS.map((lbl, i) => {
                        const from = i === 0
                          ? new Date('2000-01-01T00:00:00Z')
                          : new Date(DATE_ISO[DATE_LABELS[i-1]] + 'T23:59:59Z')
                        const to   = new Date(DATE_ISO[lbl] + 'T23:59:59Z')
                        return filteredEnrollments.filter(e => { const d=new Date(e.created_at); return d>from && d<=to }).length
                      })

                      return <Line
                        data={{
                          labels: DATE_LABELS,
                          datasets: [{
                            label:'Enrollments', data:counts, fill:false,
                            borderColor:'#1cc97e', borderWidth:2.5, tension:0.35,
                            pointBackgroundColor:'#1cc97e', pointBorderColor:'#1cc97e',
                            pointBorderWidth:0, pointRadius:6,
                            pointHoverRadius:9, pointHoverBackgroundColor:'#1cc97e',
                            pointHoverBorderColor:'#fff', pointHoverBorderWidth:2,
                          }]
                        }}
                        options={{
                          responsive:true, maintainAspectRatio:false,
                          interaction:{ mode:'index' as const, intersect:false },
                          plugins:{
                            legend:{ display:false },
                            tooltip:{
                              backgroundColor:'#1a1a1a', titleColor:'#fff', bodyColor:'#fff',
                              titleFont:{size:11,weight:'bold' as const,family:'sans-serif'},
                              bodyFont:{size:12,weight:'bold' as const,family:'sans-serif'},
                              cornerRadius:6, displayColors:false, padding:10, caretSize:6,
                              callbacks:{
                                title:(items:any[])=>items[0]?.label??'',
                                label:(ctx:any)=>`${ctx.parsed.y.toLocaleString()} Enrollments`
                              }
                            }
                          },
                          scales:{
                            x:{ grid:{display:false}, border:{display:false},
                              ticks:{font:{size:10,family:'sans-serif'},color:'#999',maxRotation:0} },
                            y:{ min:0,
                              grid:{color:'rgba(0,0,0,0.07)',lineWidth:1},
                              border:{display:false},
                              ticks:{
                                font:{size:10,family:'sans-serif'},color:'#999',maxTicksLimit:6,
                                callback:(v:any)=>v>=1000?`${(v/1000).toFixed(v%1000===0?0:1)}K`:v
                              }
                            }
                          }
                        }}
                      />
                    })()}
                  </div>
                </div>

                {/* ─── 2. Enrollments by Course ─── */}
                <div style={{border:'2px solid #111', background:'#fff', borderRadius:'4px', boxShadow:'3px 3px 0 #111', padding:'20px', height:'320px', display:'flex', flexDirection:'column'}}>
                  <p style={{fontFamily:'sans-serif', fontWeight:700, fontSize:'14px', color:'#111', margin:'0 0 12px 0'}}>Enrollments by Course</p>
                  <div style={{flex:1, display:'flex', alignItems:'center', gap:'16px', minHeight:0, overflow:'hidden'}}>
                    {(() => {
                      const countMap:{[k:string]:number}={}
                      filteredEnrollments.forEach(e=>{ countMap[e.course_title]=(countMap[e.course_title]||0)+1 })
                      const sorted=Object.entries(countMap).map(([title,count])=>({title,count})).sort((a,b)=>b.count-a.count)
                      const top4=sorted.slice(0,4)
                      const othersCount=sorted.slice(4).reduce((s,x)=>s+x.count,0)
                      const labels=[...top4.map(c=>c.title),...(othersCount>0?['Others']:[])]
                      const values=[...top4.map(c=>c.count),...(othersCount>0?[othersCount]:[])]
                      const total=filteredEnrollments.length
                      const COLORS=['#4285F4','#34A853','#FBBC04','#EA4335','#9AA0A6']

                      return (
                        <>
                          {/* Doughnut — 43% width */}
                          <div style={{width:'43%',minWidth:'130px',height:'100%',flexShrink:0}}>
                            <Doughnut
                              data={{
                                labels,
                                datasets:[{
                                  data:values,
                                  backgroundColor:COLORS.slice(0,labels.length),
                                  borderWidth:3, borderColor:'#fff',
                                  hoverBorderColor:'#333', hoverBorderWidth:2, hoverOffset:4
                                }]
                              }}
                              options={{
                                responsive:true, maintainAspectRatio:false,
                                plugins:{
                                  legend:{display:false},
                                  tooltip:{
                                    backgroundColor:'#1a1a1a', titleColor:'#fff', bodyColor:'#fff',
                                    titleFont:{size:11,weight:'bold' as const,family:'sans-serif'},
                                    bodyFont:{size:11,weight:'bold' as const,family:'sans-serif'},
                                    cornerRadius:6, displayColors:true,
                                    callbacks:{
                                      title:(items:any[])=>items[0]?.label??'',
                                      label:(ctx:any)=>{ const pct=total>0?Math.round((ctx.parsed/total)*100):0; return `  ${pct}% (${ctx.parsed.toLocaleString()})` }
                                    }
                                  }
                                },
                                cutout:'60%'
                              }}
                            />
                          </div>
                          {/* Legend — 57% width */}
                          <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',justifyContent:'center',gap:'9px',overflow:'hidden'}}>
                            {labels.map((lbl,i)=>{
                              const count=values[i]
                              const pct=total>0?Math.round((count/total)*100):0
                              const shortLabel=lbl.length>27?lbl.slice(0,25)+'\u2026':lbl
                              return (
                                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'8px',minWidth:0}}>
                                  <span style={{display:'inline-block',flexShrink:0,width:'10px',height:'10px',borderRadius:'50%',backgroundColor:COLORS[i],marginTop:'2px'}} />
                                  <div style={{minWidth:0,flex:1}}>
                                    <p style={{margin:0,fontFamily:'sans-serif',fontWeight:600,fontSize:'10px',color:'#222',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{shortLabel}</p>
                                    <p style={{margin:0,fontFamily:'sans-serif',fontWeight:700,fontSize:'10px',color:'#777'}}>{pct}% ({count.toLocaleString()})</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

              </div>
                  </>
                )
              })()}

              {/* Bottom Row: Course Performance & Top Performing Courses */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
                
                {/* Course Performance Table (bottom left) */}
                <div className="lg:col-span-8 border-3 border-black bg-white p-6 shadow-[4px_4px_0px_#000] flex flex-col min-h-[360px] rounded-none">
                  <h4 className="font-heading text-xs uppercase tracking-wider text-black border-b border-neutral-100 pb-2 mb-4">Course Performance</h4>
                  
                  <div className="flex-1 overflow-x-auto min-h-0">
                    <table className="w-full text-left font-sans text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-black text-neutral-400 font-bold uppercase text-[9px]">
                          <th className="pb-2 font-black">Course</th>
                          <th className="pb-2 font-black text-center">Enrollments</th>
                          <th className="pb-2 font-black text-center">Completion Rate</th>
                          <th className="pb-2 font-black w-40">Avg. Progress</th>
                          <th className="pb-2 font-black text-center">Certificates</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const performancePageSize = 5
                          const paginated = coursesList.slice((performancePage - 1) * performancePageSize, performancePage * performancePageSize)

                          return paginated.map((course) => {
                            const enrolls = enrollmentsList.filter(e => e.course_id === course.id)
                            const avg = enrolls.length > 0 ? Math.round(enrolls.reduce((sum, e) => sum + e.progress, 0) / enrolls.length) : 0
                            const comps = enrolls.filter(e => e.progress >= 100).length
                            const compRate = enrolls.length > 0 ? Math.round((comps / enrolls.length) * 100) : 0

                            return (
                              <tr key={course.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50">
                                <td className="py-3 font-heading uppercase text-black">{course.title}</td>
                                <td className="py-3 font-bold text-center text-black">{enrolls.length}</td>
                                <td className="py-3 font-bold text-center text-black">{compRate}%</td>
                                <td className="py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 border border-black bg-neutral-100 rounded-none overflow-hidden">
                                      <div className="h-full bg-neo-green" style={{ width: `${avg}%` }}></div>
                                    </div>
                                    <span className="font-extrabold text-[8px] w-6 text-right shrink-0">{avg}%</span>
                                  </div>
                                </td>
                                <td className="py-3 font-bold text-center text-black">{comps}</td>
                              </tr>
                            )
                          })
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Actions */}
                  {(() => {
                    const performancePageSize = 5
                    const totalPages = Math.ceil(coursesList.length / performancePageSize)

                    return (
                      <div className="flex items-center justify-between border-t border-neutral-100 pt-4 mt-2 shrink-0">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase">
                          Showing {Math.min((performancePage - 1) * performancePageSize + 1, coursesList.length)} to {Math.min(performancePage * performancePageSize, coursesList.length)} of {coursesList.length} courses
                        </span>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={() => setPerformancePage(p => Math.max(p - 1, 1))}
                            disabled={performancePage === 1}
                            className="px-2 py-1 border border-black bg-white hover:bg-neutral-50 text-[9px] font-black uppercase disabled:opacity-30 cursor-pointer shadow-[1px_1px_0px_#000]"
                          >
                            ◀
                          </button>
                          
                          {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNum = idx + 1
                            const isSelected = performancePage === pageNum
                            return (
                              <button
                                key={idx}
                                onClick={() => setPerformancePage(pageNum)}
                                className={`px-2.5 py-1 border border-black font-extrabold text-[9px] cursor-pointer shadow-[1px_1px_0px_#000] ${
                                  isSelected ? 'bg-neo-yellow text-black' : 'bg-white text-neutral-500 hover:text-black'
                                }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                          
                          <button
                            onClick={() => setPerformancePage(p => Math.min(p + 1, totalPages))}
                            disabled={performancePage === totalPages}
                            className="px-2 py-1 border border-black bg-white hover:bg-neutral-50 text-[9px] font-black uppercase disabled:opacity-30 cursor-pointer shadow-[1px_1px_0px_#000]"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Top Performing Courses (bottom right) */}
                <div className="lg:col-span-4 border-3 border-black bg-white p-6 shadow-[4px_4px_0px_#000] flex flex-col min-h-[360px] rounded-none">
                  <div className="flex justify-between items-start border-b border-neutral-100 pb-3 mb-5">
                    <h4 className="font-heading text-xs uppercase tracking-wider text-black leading-tight">Top Performing <br/>Courses</h4>
                    <button 
                      onClick={() => setActiveTab('Courses')}
                      className="text-[8px] font-black text-neutral-400 uppercase cursor-pointer hover:text-black hover:underline mt-0.5 text-right leading-[1.2] bg-transparent border-none"
                    >
                      View<br/>All
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    {(() => {
                      const ranked = coursesList.map(course => {
                        const enrolls = enrollmentsList.filter(e => e.course_id === course.id)
                        const comps = enrolls.filter(e => e.progress >= 100).length
                        const compRate = enrolls.length > 0 ? Math.round((comps / enrolls.length) * 100) : 0
                        return {
                          ...course,
                          compRate
                        }
                      })
                      .sort((a, b) => b.compRate - a.compRate)
                      const top3 = ranked.slice(0, 3)
                      const bgColors = ['bg-[#00ea8c] text-white', 'bg-neo-yellow text-black', 'bg-[#00a8ff] text-white']

                      return top3.map((c, idx) => (
                        <div key={c.id} className="flex items-center gap-4 border-b border-neutral-50 pb-5 last:border-0 last:pb-0">
                          {/* Rank indicator */}
                          <div className={`w-8 h-8 border-[2.5px] border-black flex items-center justify-center font-heading text-sm shrink-0 shadow-[2px_2px_0px_#000] ${bgColors[idx] || 'bg-white text-black'}`}>
                            {idx + 1}
                          </div>
                          
                          <div className="min-w-0">
                            <h5 className="font-heading text-[11px] text-black truncate uppercase leading-tight">{c.title}</h5>
                            <span className="text-[9px] font-bold text-neutral-400 block uppercase mt-1 tracking-wide">Completion Rate: <strong className="text-black font-extrabold">{c.compRate}%</strong></span>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>

              </div>

            </div>
            </div>
          )}

          {/* ======================= SETTINGS TAB ======================= */}
          {activeTab === 'Settings' && (
            <div className="flex-1 h-[calc(100vh-80px)] overflow-hidden bg-[#fcfcf9] p-6 flex flex-col justify-between">
              <div className="flex flex-col gap-4 max-w-5xl w-full mx-auto h-full justify-between">
                
                {/* Header Row */}
                <div className="flex items-center justify-between border-b-[3px] border-black pb-3 shrink-0">
                  <div>
                    <h2 className="font-heading text-2xl font-black uppercase text-black leading-tight tracking-tight">Platform Settings</h2>
                    <p className="font-sans text-[9px] font-bold text-neutral-500 uppercase mt-0.5 tracking-wider">Manage learning configurations and platform security</p>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await savePlatformSettings(settingsForm)
                      if (res.success) {
                        await showAlert({ title: 'Success', message: 'Platform configurations saved successfully!', type: 'success' })
                        loadAdminData()
                      } else {
                        await showAlert({ title: 'Error', message: `Failed to save configurations: ${res.error?.message}`, type: 'error' })
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2 border-[2.5px] border-black bg-[#00ea8c] hover:bg-[#00ea8c]/90 font-heading text-[10px] uppercase tracking-wider text-black shadow-[2.5px_2.5px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer"
                  >
                    <span>💾</span> Save Settings
                  </button>
                </div>

                {/* 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 py-2 items-stretch">
                  
                  {/* Platform & Signatory Settings */}
                  <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_#000] rounded-none flex flex-col gap-4 h-full justify-center">
                    <h3 className="font-heading text-sm uppercase tracking-wider text-black border-b-[2px] border-black pb-1.5 shrink-0">Platform Identity</h3>
                    
                    <div className="flex flex-col gap-3 font-sans">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-black tracking-wider block">Platform Title</label>
                        <input
                          type="text"
                          value={settingsForm.platformName}
                          onChange={(e) => setSettingsForm({ ...settingsForm, platformName: e.target.value })}
                          className="w-full p-2 border-[2px] border-black bg-white text-black font-extrabold text-[11px] shadow-[1.5px_1.5px_0px_#000] focus:shadow-none focus:translate-x-[1px] focus:translate-y-[1px] focus:outline-none transition-all"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-black tracking-wider block">Support & Helpdesk Email</label>
                        <input
                          type="email"
                          value={settingsForm.supportEmail}
                          onChange={(e) => setSettingsForm({ ...settingsForm, supportEmail: e.target.value })}
                          className="w-full p-2 border-[2px] border-black bg-white text-black font-extrabold text-[11px] shadow-[1.5px_1.5px_0px_#000] focus:shadow-none focus:translate-x-[1px] focus:translate-y-[1px] focus:outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-black tracking-wider block">Certificate Signatory Name</label>
                        <input
                          type="text"
                          value={settingsForm.certificateSignatory}
                          onChange={(e) => setSettingsForm({ ...settingsForm, certificateSignatory: e.target.value })}
                          className="w-full p-2 border-[2px] border-black bg-white text-black font-extrabold text-[11px] shadow-[1.5px_1.5px_0px_#000] focus:shadow-none focus:translate-x-[1px] focus:translate-y-[1px] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Academic Controls & Portal Toggles */}
                  <div className="flex flex-col gap-4 h-full justify-between">
                    
                    {/* Academics Card */}
                    <div className="border-[3px] border-black bg-[#ffcc00] p-4 shadow-[4px_4px_0px_#000] rounded-none flex flex-col justify-center flex-1">
                      <h3 className="font-heading text-sm uppercase tracking-wider text-black border-b-[2px] border-black pb-1.5 mb-3">Academic Rules</h3>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-black uppercase text-black tracking-wider block">Min. Milestone Passing Score</label>
                          <span className="font-heading text-[10px] text-black border-2 border-black bg-white px-1.5 py-0.5 shadow-[1px_1px_0px_#000]">{settingsForm.minPassingScore}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="100"
                          step="5"
                          value={settingsForm.minPassingScore}
                          onChange={(e) => setSettingsForm({ ...settingsForm, minPassingScore: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-white border-2 border-black appearance-none cursor-pointer accent-black"
                        />
                      </div>
                    </div>

                    {/* Portal Status Card */}
                    <div className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_#000] rounded-none flex flex-col gap-3 justify-center flex-1.5">
                      <h3 className="font-heading text-sm uppercase tracking-wider text-black border-b-[2px] border-black pb-1.5">System Controls</h3>
                      
                      <div className="flex items-center justify-between border-[2px] border-black bg-[#fcfcf9] p-2.5 shadow-[1.5px_1.5px_0px_#000] hover:bg-neutral-50 transition-colors">
                        <div>
                          <p className="font-heading text-[11px] uppercase text-black">Open Enrollments</p>
                          <p className="font-sans text-[7px] font-black text-neutral-400 uppercase tracking-wider">Allow new students to enroll</p>
                        </div>
                        <button 
                          onClick={() => setSettingsForm({ ...settingsForm, enrollmentOpen: !settingsForm.enrollmentOpen })}
                          className={`w-10 h-5.5 border-2 border-black rounded-full flex items-center p-0.5 cursor-pointer transition-colors ${settingsForm.enrollmentOpen ? 'bg-[#00ea8c]' : 'bg-neutral-200'}`}
                        >
                          <div className={`w-3.5 h-3.5 bg-white border-2 border-black rounded-full transition-transform ${settingsForm.enrollmentOpen ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between border-[2px] border-black bg-[#fcfcf9] p-2.5 shadow-[1.5px_1.5px_0px_#000] hover:bg-neutral-50 transition-colors">
                        <div>
                          <p className="font-heading text-[11px] uppercase text-black">Maintenance Mode</p>
                          <p className="font-sans text-[7px] font-black text-neutral-400 uppercase tracking-wider">Disable student portals</p>
                        </div>
                        <button 
                          onClick={() => setSettingsForm({ ...settingsForm, maintenanceMode: !settingsForm.maintenanceMode })}
                          className={`w-10 h-5.5 border-2 border-black rounded-full flex items-center p-0.5 cursor-pointer transition-colors ${settingsForm.maintenanceMode ? 'bg-[#ff4d4d]' : 'bg-neutral-200'}`}
                        >
                          <div className={`w-3.5 h-3.5 bg-white border-2 border-black rounded-full transition-transform ${settingsForm.maintenanceMode ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>

                    {/* Danger Zone Card */}
                    <div className="border-[3px] border-black bg-[#ff4d4d]/10 p-4 shadow-[4px_4px_0px_#000] rounded-none flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 border-2 border-black bg-[#ff4d4d] text-white flex items-center justify-center shadow-[1px_1px_0px_#000]">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        </div>
                        <div>
                          <p className="font-heading text-[11px] uppercase text-black">Danger Zone</p>
                          <p className="font-sans text-[7px] font-black text-neutral-500 uppercase tracking-wider">Destructive recovery actions</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const confirmed = await showConfirm({ title: 'Danger Zone', message: 'Are you absolutely sure you want to delete all enrollment logs? This cannot be undone.', type: 'error', confirmText: 'YES, DELETE EVERYTHING' })
                          if (confirmed) {
                            const res = await resetAllEnrollments()
                            if (res.success) {
                              await showAlert({ title: 'Wiped', message: 'All student enrollment records have been deleted.', type: 'success' })
                              loadAdminData()
                            } else {
                              await showAlert({ title: 'Error', message: `Wipe failed: ${res.error?.message}`, type: 'error' })
                            }
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 border-[2.5px] border-black bg-[#ff4d4d] hover:bg-[#ff4d4d]/90 font-heading text-[9px] uppercase tracking-wider text-white shadow-[1.5px_1.5px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Reset Data
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}
            </>
          )}
        </div>
      </main>

      {/* CREATE COURSE FORM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="w-full max-w-lg border-3 border-black bg-white p-8 shadow-[8px_8px_0px_#000] rounded-none relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 p-1.5 border border-black hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading text-lg uppercase tracking-wider text-black mb-6 border-b-2 border-black pb-2">
              Create New Course
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4 font-sans">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-black">Course Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={courseForm.title}
                  onChange={handleFormChange}
                  placeholder="e.g. UI/UX Design Fundamentals"
                  className="w-full p-3 border-2 border-black bg-white text-black font-sans font-semibold text-xs shadow-[2px_2px_0px_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-black">Description</label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  value={courseForm.description}
                  onChange={handleFormChange}
                  placeholder="Enter details about this course..."
                  className="w-full p-3 border-2 border-black bg-white text-black font-sans font-semibold text-xs shadow-[2px_2px_0px_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-black">Category</label>
                  <div className="relative">
                    <select
                      name="category"
                      value={courseForm.category}
                      onChange={handleFormChange}
                      className="w-full pl-4 pr-10 py-2 border-2 border-black font-bold text-sm rounded-none focus:outline-none focus:bg-neutral-50 appearance-none bg-white"
                    >
                      <option value="Development">Development</option>
                      <option value="Design">Design</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Data Science">Data Science</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-black stroke-[3px]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-black">Difficulty</label>
                  <div className="relative">
                    <select
                      name="difficulty"
                      value={courseForm.difficulty}
                      onChange={handleFormChange}
                      className="w-full pl-4 pr-10 py-2 border-2 border-black font-bold text-sm rounded-none focus:outline-none focus:bg-neutral-50 appearance-none bg-white"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-black stroke-[3px]" />
                    </div>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-3 border-2 border-black bg-neo-pink/15 text-black font-bold text-xs uppercase">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 border-2 border-black bg-neo-green text-black font-heading text-xs uppercase shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                {isSubmitting ? 'Creating...' : 'Save New Course'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW REGISTERED STUDENTS MODAL */}
      {showStudentsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="w-full max-w-lg border-3 border-black bg-white p-8 shadow-[8px_8px_0px_#000] rounded-none relative">
            <button
              onClick={() => setShowStudentsModal(false)}
              className="absolute right-4 top-4 p-1.5 border border-black hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading text-lg uppercase tracking-wider text-black mb-6 border-b-2 border-black pb-2">
              Registered Students
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {students.length === 0 ? (
                <p className="text-center py-6 text-xs text-neutral-400 font-bold uppercase">No students registered yet.</p>
              ) : (
                students.map((student) => (
                  <div key={student.id} className="border-2 border-black p-3.5 bg-neutral-50 flex items-center justify-between rounded-none shadow-[2px_2px_0px_#000]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center text-xs font-black">
                        {student.full_name?.substring(0, 2).toUpperCase() || 'ST'}
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-black">{student.full_name || 'Student'}</h4>
                        <span className="text-[10px] font-bold text-neutral-500">{student.email}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW ALL RECENT ACTIVITY MODAL */}
      {showActivityDetailsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="w-full max-w-lg border-3 border-black bg-white p-8 shadow-[8px_8px_0px_#000] rounded-none relative">
            <button
              onClick={() => setShowActivityDetailsModal(false)}
              className="absolute right-4 top-4 p-1.5 border border-black hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading text-lg uppercase tracking-wider text-black mb-6 border-b-2 border-black pb-2">
              Recent Activity Feed
            </h3>

            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
              {activities.length === 0 ? (
                // Fallback Mock data
                [
                  { id: 1, name: 'Sarah Johnson', action: 'enrolled in', target: 'UI/UX Design Fundamentals', time: '10 min ago', color: 'bg-neo-green', isUser: true },
                  { id: 2, name: 'Mike Thompson', action: 'completed', target: 'Python for Beginners', time: '1 hour ago', color: 'bg-neo-blue', isUser: false },
                  { id: 3, name: 'Emily Davis', action: 'enrolled in', target: 'Data Science Essentials', time: '2 hours ago', color: 'bg-neo-yellow', isUser: true },
                  { id: 4, name: 'James Wilson', action: 'completed', target: 'Web Development Bootcamp', time: '3 hours ago', color: 'bg-neo-pink', isUser: false },
                  { id: 5, name: 'Olivia Brown', action: 'enrolled in', target: 'Digital Marketing Masterclass', time: '5 hours ago', color: 'bg-neo-green', isUser: true }
                ].map((act) => (
                  <div key={act.id} className="flex flex-col border-2 border-black p-3 bg-neutral-50 shadow-[2px_2px_0px_#000]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 border-2 border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000] ${act.color}`}>
                          {act.isUser ? (
                            <svg className="w-4 h-4 text-white fill-white stroke-black stroke-[2px]" viewBox="0 0 24 24">
                              <circle cx="12" cy="8" r="4" />
                              <path d="M4 18c0-3 3-5 8-5s8 2 8 5v2H4v-2z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-white fill-white stroke-black stroke-[2px]" viewBox="0 0 24 24">
                              <path d="M12 2L2 7l10 5 10-5-10-5z" />
                              <path d="M6 12v4c0 1.5 2.5 3 6 3s6-1.5 6-3v-4" />
                              <circle cx="21.5" cy="13.5" r="1.5" />
                            </svg>
                          )}
                        </div>
                        <div className="text-left font-sans text-xs">
                          <span className="font-extrabold text-black">{act.name}</span>
                          <span className="text-neutral-500 font-semibold mx-1">{act.action}</span>
                          <span className="font-extrabold text-black">{act.target}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-neutral-500 shrink-0">{act.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex flex-col border-2 border-black p-3 bg-neutral-50 shadow-[2px_2px_0px_#000]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 border-2 border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000] ${
                          act.type === 'completion' ? 'bg-neo-pink' : 'bg-neo-blue'
                        }`}>
                          {act.type === 'completion' ? (
                            <svg className="w-4 h-4 text-white fill-white stroke-black stroke-[2px]" viewBox="0 0 24 24">
                              <path d="M12 2L2 7l10 5 10-5-10-5z" />
                              <path d="M6 12v4c0 1.5 2.5 3 6 3s6-1.5 6-3v-4" />
                              <circle cx="21.5" cy="13.5" r="1.5" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-white fill-white stroke-black stroke-[2px]" viewBox="0 0 24 24">
                              <circle cx="12" cy="8" r="4" />
                              <path d="M4 18c0-3 3-5 8-5s8 2 8 5v2H4v-2z" />
                            </svg>
                          )}
                        </div>
                        <div className="text-left font-sans text-xs">
                          <span className="font-extrabold text-black">Student</span>
                          <span className="text-neutral-500 font-semibold mx-1">
                            {act.type === 'completion' ? 'completed' : 'enrolled in'}
                          </span>
                          <span className="font-extrabold text-black">{(act.description || '').replace('Student completed ', '').replace('New enrollment in ', '')}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-neutral-500 shrink-0">{act.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
