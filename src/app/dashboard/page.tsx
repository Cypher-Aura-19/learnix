'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  Compass,
  FileText,
  HelpCircle,
  Award,
  MessageSquare,
  Settings,
  Search,
  Bell,
  Clock,
  ChevronRight,
  TrendingUp,
  Bookmark,
  ChevronLeft,
  CheckCircle2,
  Lock,
  ArrowLeft,
  LogOut,
  Sun,
  Maximize2,
  Volume2,
  Calendar,
  ClipboardList,
  Download,
  Eye,
  Share2,
  Play
} from 'lucide-react'
import { fetchCourses, fetchMilestones, fetchUserEnrollments, enrollInCourse, toggleMilestoneCompletion } from '@/utils/db-actions'
import { createClient } from '@/utils/supabase/client'
import { useModal } from '@/components/ModalProvider'
import { fetchPlatformSettings } from '@/utils/admin-actions-extended'
import CourseCover from '@/components/CourseCover'
import { FaBookOpen, FaClock, FaAward, FaChartLine, FaGraduationCap } from 'react-icons/fa'

interface AppNotification {
  id: string
  message: string
  seen: boolean
  timestamp?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const { showAlert } = useModal()
  
  // Dynamic application state
  const [courses, setCourses] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null)
  const [courseMilestones, setCourseMilestones] = useState<any[]>([])
  const [loadingEnroll, setLoadingEnroll] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my-courses' | 'explore' | 'certificates'>('dashboard')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'in-progress' | 'completed'>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [allMilestones, setAllMilestones] = useState<any[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  
  // Platform configurations
  const [passingScore, setPassingScore] = useState<number>(70)
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false)
  const [supportEmail, setSupportEmail] = useState<string>('support@learnix.com')

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])
  
  // Notifications with seen tracking
  const [notifications, setNotifications] = useState<AppNotification[]>([
    { id: '1', message: 'Welcome to Learnix! Start exploring milestones.', seen: false },
    { id: '2', message: 'New milestone added to Web Development Bootcamp.', seen: false }
  ])
  const [showNotifications, setShowNotifications] = useState(false)

  // Active Content Sandbox Viewers
  const [activeContent, setActiveContent] = useState<any | null>(null)
  const [activeContentIndex, setActiveContentIndex] = useState<number>(-1)
  const [pdfLocalUrl, setPdfLocalUrl] = useState<string | null>(null)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [pdfFileExt, setPdfFileExt] = useState<string | null>(null)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'overview' | 'notes' | 'transcript'>('overview')
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizResult, setQuizResult] = useState<string | null>(null)

  // Custom video states
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoTime, setVideoTime] = useState('00:00')
  const [videoDurationStr, setVideoDurationStr] = useState('00:00')
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoVolume, setVideoVolume] = useState(1)
  const [videoSpeed, setVideoSpeed] = useState(1)
  const [videoCc, setVideoCc] = useState(true)
  const videoRef = React.useRef<HTMLVideoElement>(null)

  // Certificates states
  const [activeCertFilter, setActiveCertFilter] = useState<'all' | 'completed' | 'in-progress'>('all')
  const [selectedCertCourse, setSelectedCertCourse] = useState<any | null>(null)
  const [studentName, setStudentName] = useState<string>('Student')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // ── Role guard: admins must not see the student dashboard ──────────────
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

      if (profile?.full_name) {
        setStudentName(profile.full_name)
      }

      if (profile?.role === 'admin') {
        router.replace('/admin/dashboard')
        return
      }

      const dbCourses = await fetchCourses()
      setCourses(dbCourses)

      const dbEnrollments = await fetchUserEnrollments()
      setEnrollments(dbEnrollments)

      const enrolledCourseIds = dbEnrollments.map((e: any) => e.course_id)
      if (enrolledCourseIds.length > 0) {
        const { data: milestonesData } = await supabase
          .from('milestones')
          .select('*')
          .in('course_id', enrolledCourseIds)
          .order('sequence_order', { ascending: true })
        if (milestonesData) {
          setAllMilestones(milestonesData)
        }
      }

      const settings = await fetchPlatformSettings()
      setPassingScore(settings.minPassingScore ?? 70)
      setMaintenanceMode(settings.maintenanceMode ?? false)
      setSupportEmail(settings.supportEmail ?? 'support@learnix.com')

      // Fetch dynamic student notifications matching admin behavior
      const noteList: any[] = []
      
      // Course publications
      dbCourses.forEach((c: any) => {
        noteList.push({
          id: `course-${c.id}`,
          message: `New course published: ${c.title}`,
          seen: false,
          created_at: new Date(c.created_at)
        })
      })

      // Enrollments
      dbEnrollments.forEach((e: any) => {
        const title = e.courses?.title || 'course'
        noteList.push({
          id: `enroll-${e.id}`,
          message: `You enrolled in ${title}`,
          seen: false,
          created_at: new Date(e.created_at)
        })
        if (e.progress >= 100) {
          noteList.push({
            id: `complete-${e.id}`,
            message: `Congratulations! Completed ${title}`,
            seen: false,
            created_at: new Date(e.created_at)
          })
        }
      })

      // Sort notifications by date descending
      noteList.sort((a: any, b: any) => b.created_at.getTime() - a.created_at.getTime())

      // Convert timestamp strings
      const formattedNotes: AppNotification[] = noteList.slice(0, 10).map((item: any) => {
        const diffMs = new Date().getTime() - item.created_at.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        let timeStr = 'Just now'
        if (diffMins > 0 && diffMins < 60) {
          timeStr = `${diffMins}m ago`
        } else if (diffMins >= 60 && diffMins < 1440) {
          const hrs = Math.floor(diffMins / 60)
          timeStr = `${hrs}h ago`
        } else if (diffMins >= 1440) {
          const days = Math.floor(diffMins / 1440)
          timeStr = `${days}d ago`
        }
        return {
          id: item.id,
          message: item.message,
          seen: false,
          timestamp: timeStr
        }
      })

      // Fallback
      if (formattedNotes.length === 0) {
        formattedNotes.push({
          id: 'welcome',
          message: 'Welcome to Learnix! Start exploring milestones.',
          seen: false,
          timestamp: 'Just now'
        })
      }
      
      setNotifications(formattedNotes)
      setLoading(false)
    }
    loadData()
  }, [])

  // Auto-close notification panel after 3 seconds when opened
  useEffect(() => {
    if (showNotifications) {
      const timer = setTimeout(() => {
        setShowNotifications(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showNotifications])

  // Count only unseen notifications
  const unseenCount = notifications.filter(n => !n.seen).length

  const triggerNotification = (msg: string) => {
    const newNote = {
      id: Math.random().toString(),
      message: msg,
      seen: false
    }
    setNotifications(prev => [newNote, ...prev])
    setShowNotifications(true)
  }

  const handleToggleNotifications = () => {
    const nextState = !showNotifications
    setShowNotifications(nextState)
    if (nextState) {
      // Mark all as seen when panel opens
      setNotifications(prev => prev.map(n => ({ ...n, seen: true })))
    }
  }

  const handleOpenCourse = async (course: any) => {
    setSelectedCourse(course)
    const milestones = await fetchMilestones(course.id)
    setCourseMilestones(milestones)
    setActiveContent(null)
    setActiveContentIndex(-1)
    setQuizAnswers({})
    setQuizSubmitted(false)
    setQuizResult(null)
  }

  const handleEnroll = async (courseId: string) => {
    setLoadingEnroll(true)
    const result = await enrollInCourse(courseId)
    setLoadingEnroll(false)
    
    triggerNotification(result.message)

    if (result.success) {
      const dbEnrollments = await fetchUserEnrollments()
      setEnrollments(dbEnrollments)

      const enrolledCourseIds = dbEnrollments.map((e: any) => e.course_id)
      if (enrolledCourseIds.length > 0) {
        const { data: milestonesData } = await supabase
          .from('milestones')
          .select('*')
          .in('course_id', enrolledCourseIds)
          .order('sequence_order', { ascending: true })
        if (milestonesData) {
          setAllMilestones(milestonesData)
        }
      }
    }
  }

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!selectedCourse) return
    const result = await toggleMilestoneCompletion(selectedCourse.id, milestoneId, courseMilestones.length)
    if (result.success) {
      const dbEnrollments = await fetchUserEnrollments()
      setEnrollments(dbEnrollments)

      const enrolledCourseIds = dbEnrollments.map((e: any) => e.course_id)
      if (enrolledCourseIds.length > 0) {
        const { data: milestonesData } = await supabase
          .from('milestones')
          .select('*')
          .in('course_id', enrolledCourseIds)
          .order('sequence_order', { ascending: true })
        if (milestonesData) {
          setAllMilestones(milestonesData)
        }
      }
    }
  }

  const isEnrolled = (courseId: string) => {
    return enrollments.some(e => e.course_id === courseId)
  }

  const getCompletedMilestones = (courseId: string): string[] => {
    const enroll = enrollments.find(e => e.course_id === courseId)
    return enroll ? (enroll.completed_milestones || []) : []
  }

  const getEnrollmentProgress = (courseId: string) => {
    const enroll = enrollments.find(e => e.course_id === courseId)
    return enroll ? enroll.progress : 0
  }

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return
    const current = videoRef.current.currentTime
    const total = videoRef.current.duration || 0
    setVideoProgress(total > 0 ? (current / total) * 100 : 0)

    const curMin = Math.floor(current / 60).toString().padStart(2, '0')
    const curSec = Math.floor(current % 60).toString().padStart(2, '0')
    setVideoTime(`${curMin}:${curSec}`)
  }

  const handleVideoLoadedMetadata = () => {
    if (!videoRef.current) return
    const total = videoRef.current.duration || 0
    const totMin = Math.floor(total / 60).toString().padStart(2, '0')
    const totSec = Math.floor(total % 60).toString().padStart(2, '0')
    setVideoDurationStr(`${totMin}:${totSec}`)
  }

  const handleTogglePlay = () => {
    if (!videoRef.current) return
    if (videoPlaying) {
      videoRef.current.pause()
      setVideoPlaying(false)
    } else {
      videoRef.current.play()
      setVideoPlaying(true)
    }
  }

  const handleToggleVolume = () => {
    if (!videoRef.current) return
    if (videoVolume > 0) {
      videoRef.current.volume = 0
      setVideoVolume(0)
    } else {
      videoRef.current.volume = 1
      setVideoVolume(1)
    }
  }

  const handleToggleSpeed = () => {
    if (!videoRef.current) return
    let nextSpeed = 1
    if (videoSpeed === 1) nextSpeed = 1.5
    else if (videoSpeed === 1.5) nextSpeed = 2
    else nextSpeed = 1

    videoRef.current.playbackRate = nextSpeed
    setVideoSpeed(nextSpeed)
  }

  const handleToggleCc = () => {
    setVideoCc(prev => !prev)
  }

  const handleToggleFullscreen = () => {
    if (!videoRef.current) return
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen()
    }
  }

  const handleOpenContent = (milestone: any, idx: number) => {
    setActiveContent(milestone)
    setActiveContentIndex(idx)
    setQuizAnswers({})
    setQuizSubmitted(false)
    setQuizResult(null)
    setVideoPlaying(false)
    setVideoTime('00:00')
    setVideoProgress(0)
    setCurrentSlide(0)

    const contentType = milestone?.content_type
    if (contentType === 'pdf' || contentType === 'file' || contentType === 'document' || contentType === 'slides' || contentType === 'ppt') {
      const rawUrl = milestone.content_url
      if (rawUrl) {
        setLoadingPdf(true)
        setPdfLocalUrl(null)
        setPdfFileExt(null)
        fetch(`/api/pdf-proxy?url=${encodeURIComponent(rawUrl)}`)
          .then(res => res.json())
          .then(data => {
            if (data.localUrl) {
              setPdfLocalUrl(data.localUrl)
              setPdfFileExt(data.ext || 'bin')
            } else {
              setPdfLocalUrl(rawUrl)
              setPdfFileExt('bin')
            }
          })
          .catch(err => {
            console.error('Failed to resolve proxy URL', err)
            setPdfLocalUrl(rawUrl)
            setPdfFileExt('bin')
          })
          .finally(() => {
            setLoadingPdf(false)
          })
      }
    } else {
      setPdfLocalUrl(null)
      setPdfFileExt(null)
    }
  }

  const handleSelectOption = (qIdx: number, option: string) => {
    setQuizAnswers(prev => ({ ...prev, [qIdx]: option }))
  }

  const handleSubmitQuiz = () => {
    if (!activeContent?.quiz_questions) return
    const questions = activeContent.quiz_questions
    let correctCount = 0

    questions.forEach((q: any, idx: number) => {
      if (quizAnswers[idx] === q.answer) {
        correctCount++
      }
    })

    setQuizSubmitted(true)
    const score = Math.round((correctCount / questions.length) * 100)
    const passed = score >= passingScore
    setQuizResult(`You scored ${score}% (${correctCount}/${questions.length} correct). ${passed ? '🎉 You passed and unlocked this milestone!' : `❌ You need at least ${passingScore}% to pass.`}`)
    
    if (passed) {
      handleToggleMilestone(activeContent.id)
    }
  }

  const handleMoveToNext = () => {
    if (!selectedCourse || activeContentIndex === -1) return
    
    const currentMilestone = courseMilestones[activeContentIndex]
    const completedList = getCompletedMilestones(selectedCourse.id)
    if (!completedList.includes(currentMilestone.id)) {
      handleToggleMilestone(currentMilestone.id)
    }

    const nextIndex = activeContentIndex + 1
    if (nextIndex < courseMilestones.length) {
      const nextMilestone = courseMilestones[nextIndex]
      handleOpenContent(nextMilestone, nextIndex)
      triggerNotification(`Moved to next milestone: ${nextMilestone.title}`)
    } else {
      setActiveContent(null)
      setActiveContentIndex(-1)
      triggerNotification(`Congratulations! You completed the ${selectedCourse.title} course! 🎓`)
      showAlert({ title: 'Course Completed', message: 'Congratulations! You have completed all milestones in this course!', type: 'success' })
    }
  }

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    course.category.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  )

  const filteredEnrollments = enrollments.filter((enroll) => {
    const matchesSearch = enroll.courses?.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                          enroll.courses?.category.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    
    let matchesProgress = true
    if (selectedFilter === 'in-progress') {
      matchesProgress = enroll.progress > 0 && enroll.progress < 100
    } else if (selectedFilter === 'completed') {
      matchesProgress = enroll.progress === 100
    }

    let matchesDifficulty = true
    if (selectedDifficulty !== 'all') {
      matchesDifficulty = enroll.courses?.difficulty?.toLowerCase() === selectedDifficulty.toLowerCase()
    }

    return matchesSearch && matchesProgress && matchesDifficulty
  })

  // Dynamic Continue Learning values derived from actual database enrollments
  const getContinueLearningCourse = () => {
    if (enrollments.length === 0) return null
    // Pick the course with the lowest incomplete progress first
    const active = enrollments.find(e => e.progress < 100)
    return active || enrollments[0]
  }

  const activeLearning = getContinueLearningCourse()

  // Dynamic upcoming milestones with deadlines derived from database
  const getUpcomingDeadlines = () => {
    const list: any[] = []
    enrollments.forEach(enroll => {
      const courseId = enroll.course_id
      const completed = enroll.completed_milestones || []
      const courseMilestones = allMilestones.filter(m => m.course_id === courseId)
      
      // Find the first uncompleted milestone for enrolled courses
      const nextMilestone = courseMilestones.find((m: any) => !completed.includes(m.id))
      if (nextMilestone) {
        const enrollDate = new Date(enroll.created_at)
        const daysLimit = nextMilestone.days_left_from_enrollment || 5
        const deadlineDate = new Date(enrollDate.getTime() + daysLimit * 24 * 60 * 60 * 1000)
        const today = new Date()
        
        // Reset hours for accurate date difference
        today.setHours(0,0,0,0)
        const deadlineCompare = new Date(deadlineDate)
        deadlineCompare.setHours(0,0,0,0)
        
        const timeDiff = deadlineCompare.getTime() - today.getTime()
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
        
        let daysLeftStr = ''
        let isOverdue = false
        if (daysDiff < 0) {
          daysLeftStr = `${Math.abs(daysDiff)}d Overdue`
          isOverdue = true
        } else if (daysDiff === 0) {
          daysLeftStr = 'Due Today'
        } else {
          daysLeftStr = `${daysDiff} Days Left`
        }

        list.push({
          title: nextMilestone.title,
          courseTitle: enroll.courses?.title,
          daysLeft: daysLeftStr,
          isOverdue,
          contentType: nextMilestone.content_type,
          color: isOverdue 
            ? 'bg-[#ff7675]' 
            : nextMilestone.content_type === 'quiz' 
              ? 'bg-[#ff7675]' 
              : nextMilestone.content_type === 'exam' 
                ? 'bg-[#ffd200]' 
                : 'bg-[#74b9ff]'
        })
      }
    })

    // Fallbacks if no active enrollments
    if (list.length === 0) {
      return [
        { title: 'No upcoming milestones', courseTitle: 'All caught up!', daysLeft: 'Completed', color: 'bg-[#00ea8c]', isOverdue: false }
      ]
    }
    return list
  }

  const dynamicDeadlines = getUpcomingDeadlines()

  const sidebarItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-courses', name: 'My Courses', icon: BookOpen },
    { id: 'explore', name: 'Explore', icon: Compass },
    { id: 'certificates', name: 'Certificates', icon: Award },
  ]

  const activeEnrollmentsCount = enrollments.length
  const learningHours = enrollments.reduce((acc, curr) => acc + (curr.completed_milestones?.length || 0), 0) * 1.5
  const certificatesCount = enrollments.filter(e => e.progress === 100).length
  const xpPoints = (enrollments.reduce((acc, curr) => acc + (curr.completed_milestones?.length || 0), 0) * 100) + (certificatesCount * 500)
  const currentLevel = Math.max(1, Math.floor(xpPoints / 1000) + 1)

  const statCards = [
    { title: 'Enrolled Courses', value: activeEnrollmentsCount.toString().padStart(2, '0'), sub: 'Active', color: 'bg-[#00ea8c]', icon: (props: any) => <FaBookOpen className="w-10 h-10 text-white stroke-black stroke-[30px]" /> },
    { title: 'Learning Hours', value: Math.round(learningHours).toString().padStart(2, '0'), sub: 'This Month', color: 'bg-[#74b9ff]', icon: (props: any) => <FaClock className="w-10 h-10 text-white stroke-black stroke-[30px]" /> },
    { title: 'Certificates', value: certificatesCount.toString().padStart(2, '0'), sub: 'Earned', color: 'bg-[#ffd200]', icon: (props: any) => <FaAward className="w-10 h-10 text-white stroke-black stroke-[30px]" /> },
    { title: 'XP Points', value: xpPoints.toString(), sub: `Level ${currentLevel}`, color: 'bg-[#ff7675]', icon: (props: any) => <FaChartLine className="w-10 h-10 text-white stroke-black stroke-[30px]" /> },
  ]

  if (loading) {
    return (
      <main className="min-h-screen w-full flex bg-[#fdfdfd] overflow-hidden select-none font-sans animate-pulse">
        <div className="w-full h-screen flex">

          {/* Sidebar — same as real */}
          <aside className="w-64 flex-shrink-0 border-r-[3px] border-black bg-[#f4f4f0] flex flex-col justify-between p-6">
            <div className="flex flex-col gap-10">
              {/* Logo area */}
              <div className="flex items-center gap-4">
                <div className="w-11 h-12 bg-neutral-200 border-2 border-black shadow-[1px_1px_0px_#000]" />
                <div className="flex flex-col gap-1">
                  <div className="w-20 h-5 bg-neutral-200 border border-black" />
                  <div className="w-28 h-2.5 bg-neutral-200" />
                </div>
              </div>
              {/* Nav — 3 items */}
              <nav className="flex flex-col gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-full flex items-center gap-4 px-4 py-3 border-2 border-black bg-neutral-200 shadow-[2px_2px_0px_#000]">
                    <div className="w-6 h-6 bg-neutral-300 shrink-0" />
                    <div className="flex-1 h-3 bg-neutral-300" />
                  </div>
                ))}
              </nav>
            </div>
            {/* Profile card bottom */}
            <div className="w-full border-[3px] border-black p-3 bg-neutral-200 flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-[38px] h-[38px] border-2 border-black bg-neutral-300 shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <div className="h-3.5 w-24 bg-neutral-300 border border-black" />
                <div className="h-2.5 w-32 bg-neutral-300" />
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 h-full overflow-y-auto flex flex-col relative">

            {/* Header — same h-20, same right panel */}
            <header className="h-20 border-b-[3px] border-black flex items-center justify-between bg-white shrink-0 p-0 overflow-visible relative z-30">
              <div className="flex-1 flex items-center justify-between px-8 py-4 h-full">
                <div className="flex flex-col gap-2">
                  <div className="w-72 h-5 bg-neutral-200 border border-black" />
                  <div className="w-40 h-3 bg-neutral-200" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-48 h-9 border-2 border-black bg-neutral-200" />
                  <div className="w-9 h-9 border-2 border-black bg-neutral-200 shadow-[2px_2px_0px_#000]" />
                </div>
              </div>
              {/* Right colored banner block — same w-80 */}
              <div className="w-80 h-full border-l-[3px] border-black flex-shrink-0 bg-neutral-200 hidden md:block" />
            </header>

            {/* Dashboard tab content */}
            <div className="flex-1 p-8 bg-[#fdfdfc] overflow-y-auto">
              <div className="space-y-8">

                {/* Stats Grid — grid-cols-4, h-[100px], left colored block + right text */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex overflow-hidden h-[100px]">
                      <div className="w-[80px] shrink-0 border-r-[3px] border-black bg-neutral-200" />
                      <div className="flex-1 p-4 bg-[#fcfcf9] flex flex-col justify-center gap-2">
                        <div className="h-2.5 w-20 bg-neutral-200 border border-black" />
                        <div className="h-7 w-14 bg-neutral-300 border border-black" />
                        <div className="h-2 w-16 bg-neutral-200" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Continue Learning + Upcoming Deadlines — grid-cols-3, lg:col-span-2 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Continue Learning col-span-2 */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="w-44 h-5 bg-neutral-200 border border-black" />
                    {/* Course card — h-56, grid-cols-5 */}
                    <div className="border-[3px] border-black bg-white shadow-[6px_6px_0px_#000] grid grid-cols-5 overflow-hidden h-56">
                      <div className="col-span-2 border-r-[3px] border-black bg-neutral-200" />
                      <div className="col-span-3 p-6 bg-[#fbfbf8] flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="w-20 h-5 bg-neutral-200 border border-black" />
                          <div className="w-48 h-5 bg-neutral-300 border border-black" />
                          <div className="w-full h-4 bg-neutral-200 border-2 border-black" />
                        </div>
                        <div className="w-40 h-9 bg-neutral-200 border-2 border-black shadow-[2px_2px_0px_#000]" />
                      </div>
                    </div>
                  </div>

                  {/* Upcoming Deadlines — col-span-1 */}
                  <div className="space-y-4">
                    <div className="w-40 h-5 bg-neutral-200 border border-black" />
                    <div className="border-[3px] border-black bg-[#fbfbf8] p-5 shadow-[6px_6px_0px_#000] space-y-4 h-56">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between border-b-2 border-black/10 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 border-2 border-black bg-neutral-200 shadow-[1.5px_1.5px_0px_#000]" />
                            <div className="flex flex-col gap-1">
                              <div className="h-3 w-28 bg-neutral-200 border border-black" />
                              <div className="h-2 w-20 bg-neutral-200" />
                            </div>
                          </div>
                          <div className="w-14 h-5 bg-neutral-200 border border-black" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Browse Available Courses — grid-cols-4 */}
                <div className="space-y-4">
                  <div className="w-56 h-5 bg-neutral-200 border border-black" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="border-[3px] border-black bg-white shadow-[4px_4px_0px_#000] flex flex-col overflow-hidden">
                        <div className="h-36 bg-neutral-200 border-b-[3px] border-black" />
                        <div className="p-4 flex flex-col gap-3">
                          <div className="flex justify-between">
                            <div className="w-16 h-4 bg-neutral-200 border border-black" />
                            <div className="w-16 h-3 bg-neutral-200" />
                          </div>
                          <div className="w-36 h-4 bg-neutral-300 border border-black" />
                          <div className="w-full h-3 bg-neutral-200" />
                          <div className="w-full h-3 bg-neutral-200" />
                          <div className="border-t-2 border-black/10 pt-3 flex justify-between items-center">
                            <div className="w-16 h-3 bg-neutral-200" />
                            <div className="w-20 h-7 bg-neutral-200 border-2 border-black" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-[#fcfcf9] text-black font-sans flex flex-col justify-between overflow-hidden relative select-none">
        {/* CSS Keyframes for Marquee */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 20s linear infinite;
          }
        `}} />

        {/* Top Branding Bar */}
        <header className="h-16 border-b-[3px] border-black flex items-center justify-between bg-white px-8 shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-9 flex-shrink-0">
              <div className="absolute left-0 top-0 w-2 h-full bg-[#ff4d4d] border-2 border-black z-10 shadow-[1px_1px_0px_#000]"></div>
              <div className="absolute left-2 top-0 w-6 h-full bg-[#ffcc00] border-y-2 border-r-2 border-black flex items-center justify-center shadow-[1px_1px_0px_#000]">
                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-black ml-0.5"></div>
              </div>
            </div>
            <h2 className="font-heading text-lg tracking-wider text-black leading-none uppercase">LEARNIX</h2>
          </div>
          
          <div className="flex items-center border-2 border-black bg-[#ffcc00] px-3 py-1 font-heading text-[10px] uppercase shadow-[1.5px_1.5px_0px_#000]">
            ⚡ SYSTEM STATUS: MAINTENANCE ACTIVE
          </div>
        </header>

        {/* Center Screen Grid */}
        <div className="flex-1 flex items-center justify-center p-8 relative z-20">
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column: Big Rotated Banner Box */}
            <div className="md:col-span-5 border-[3px] border-black bg-white shadow-[6px_6px_0px_#000] relative overflow-hidden flex flex-col justify-between p-6 min-h-[300px]" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #ffcc00, #ffcc00 15px, #111 15px, #111 30px)'
            }}>
              <div className="w-12 h-12 border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000] z-10">
                <svg className="w-6 h-6 stroke-[2.5px] text-[#ff4d4d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>

              <div className="bg-white border-2 border-black p-3 shadow-[3px_3px_0px_#000] z-10 mt-auto">
                <h1 className="font-heading text-4xl font-black uppercase tracking-tight text-black leading-[0.9]">
                  PORTAL<br/>OFFLINE
                </h1>
                <p className="font-sans text-[9px] font-black text-neutral-400 uppercase tracking-widest mt-2">CODE: 503_SERVICE_UNAVAILABLE</p>
              </div>
            </div>

            {/* Right Column: Content Card */}
            <div className="md:col-span-7 border-[3px] border-black bg-white p-8 shadow-[6px_6px_0px_#000] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-heading text-neutral-400 block uppercase tracking-wider">Upgrade in progress</span>
                <h3 className="font-heading text-2xl font-black uppercase text-black leading-tight mt-1 border-b-2 border-black pb-3">We'll Be Back Shortly!</h3>
                <p className="font-sans text-xs font-semibold text-neutral-600 mt-4 leading-relaxed">
                  We are currently performing scheduled maintenance to upgrade the student experience. New course catalog syncs and milestone evaluations are temporarily paused.
                </p>
                <div className="mt-4 p-3 border-2 border-black bg-neutral-50 shadow-[2px_2px_0px_#000] flex items-center gap-3">
                  <span className="text-xl">📩</span>
                  <div>
                    <p className="font-heading text-[9px] uppercase text-neutral-400 leading-none">Need urgent help?</p>
                    <p className="font-sans text-xs font-extrabold text-black mt-0.5">{supportEmail}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-6">
                <button 
                  onClick={() => window.location.reload()}
                  className="flex-1 px-5 py-2.5 border-[2.5px] border-black bg-[#00ea8c] hover:bg-[#00ea8c]/90 font-heading text-xs uppercase tracking-wider text-black shadow-[3px_3px_0px_#000] hover:shadow-[4.5px_4.5px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer text-center"
                >
                  🔄 Retry Connection
                </button>
                <button 
                  onClick={async () => {
                    await supabase.auth.signOut()
                    window.location.reload()
                  }}
                  className="px-5 py-2.5 border-[2.5px] border-black bg-white hover:bg-neutral-50 font-heading text-xs uppercase tracking-wider text-black shadow-[3px_3px_0px_#000] hover:shadow-[4.5px_4.5px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer text-center"
                >
                  🚪 Sign Out
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Animated Marquee Footer */}
        <footer className="h-10 border-t-[3px] border-black bg-black text-white flex items-center overflow-hidden shrink-0 relative z-30">
          <div className="flex whitespace-nowrap animate-marquee">
            <div className="flex font-heading text-[10px] uppercase tracking-widest gap-8 pr-8">
              <span>⚠️ UNDERGOING SYSTEM UPGRADES</span>
              <span>•</span>
              <span>BACK ONLINE SOON</span>
              <span>•</span>
              <span>LEARN. GROW. ACHIEVE.</span>
              <span>•</span>
              <span>⚠️ UNDERGOING SYSTEM UPGRADES</span>
              <span>•</span>
              <span>BACK ONLINE SOON</span>
              <span>•</span>
              <span>LEARN. GROW. ACHIEVE.</span>
              <span>•</span>
            </div>
            <div className="flex font-heading text-[10px] uppercase tracking-widest gap-8 pr-8">
              <span>⚠️ UNDERGOING SYSTEM UPGRADES</span>
              <span>•</span>
              <span>BACK ONLINE SOON</span>
              <span>•</span>
              <span>LEARN. GROW. ACHIEVE.</span>
              <span>•</span>
              <span>⚠️ UNDERGOING SYSTEM UPGRADES</span>
              <span>•</span>
              <span>BACK ONLINE SOON</span>
              <span>•</span>
              <span>LEARN. GROW. ACHIEVE.</span>
              <span>•</span>
            </div>
          </div>
        </footer>

      </div>
    )
  }

  // Split-Pane Learning Interface Early Return
  if (selectedCourse && activeContent) {
    const resourceItems = courseMilestones.filter(m => ['file', 'document', 'slides'].includes(m.content_type))
    const completedList = getCompletedMilestones(selectedCourse.id)

    return (
      <main className="h-screen w-full flex flex-col bg-[#fdfdfc] select-none font-sans overflow-hidden">
        {/* Custom Header Bar */}
        <header className="h-20 border-b-[3px] border-black flex items-center justify-between bg-white shrink-0 px-8 z-30">
          <div className="flex items-center gap-4">
            <div className="relative w-11 h-12 flex-shrink-0">
              <div className="absolute left-0 top-0 w-3 h-full bg-[#ff4d4d] border-2 border-black z-10 shadow-[1px_1px_0px_#000]"></div>
              <div className="absolute left-2.5 top-0 w-8.5 h-full bg-[#ffcc00] border-y-2 border-r-2 border-black flex items-center justify-center shadow-[1px_1px_0px_#000]">
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-black ml-1"></div>
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="font-heading text-2xl tracking-wider text-black leading-none uppercase">LEARNIX</h2>
              <span className="text-[9px] font-extrabold text-black uppercase tracking-wider mt-1 leading-none animate-pulse" style={{ letterSpacing: '1px' }}>
                LEARN. GROW. ACHIEVE.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                setActiveContent(null)
                setActiveContentIndex(-1)
              }}
              className="flex items-center gap-2 px-5 py-2.5 border-3 border-black bg-white shadow-[4px_4px_0px_#000] font-heading text-xs uppercase active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer rounded-none"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3px]" />
              Back to Milestones
            </button>
            <div className="flex items-center gap-2">
              <button className="p-2 border-2 border-black bg-white hover:bg-neutral-50 shadow-[1.5px_1.5px_0px_#000] cursor-pointer rounded-none">
                <Sun className="w-4 h-4 text-black stroke-[2.5px]" />
              </button>
              <button className="p-2 border-2 border-black bg-white hover:bg-neutral-50 shadow-[1.5px_1.5px_0px_#000] cursor-pointer rounded-none">
                <Settings className="w-4 h-4 text-black stroke-[2.5px]" />
              </button>
              <button className="p-2 border-2 border-black bg-white hover:bg-neutral-50 shadow-[1.5px_1.5px_0px_#000] cursor-pointer rounded-none">
                <Maximize2 className="w-4 h-4 text-black stroke-[2.5px]" />
              </button>
            </div>
          </div>
        </header>

        {/* Split Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar Layout */}
          <aside className="w-80 flex-shrink-0 border-r-[3px] border-black bg-[#f4f4f0] flex flex-col justify-between overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0">
              {/* Milestone Content Header */}
              <div className="p-4 border-b-2 border-black bg-white">
                <h3 className="font-heading text-sm uppercase tracking-wider text-black">Milestone Content</h3>
              </div>

              {/* Milestones scroll list */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0 bg-[#f9f9f6]">
                {courseMilestones.map((m, mIdx) => {
                  const mCompleted = completedList.includes(m.id)
                  const mActive = activeContent.id === m.id
                  const mAccessible = mIdx === 0 || completedList.includes(courseMilestones[mIdx - 1]?.id)
                  
                  return (
                    <div
                      key={m.id}
                      onClick={() => mAccessible && handleOpenContent(m, mIdx)}
                      className={`w-full flex items-center justify-between border-2 border-black p-3 rounded-none transition-all cursor-pointer ${
                        mActive 
                          ? 'bg-[#ffcc00] shadow-[3.5px_3.5px_0px_#000] -translate-y-0.5' 
                          : mAccessible
                            ? 'bg-white hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#000]'
                            : 'bg-neutral-100 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000]">
                          <span className="text-sm">
                            {m.content_type === 'video' ? '📺' : m.content_type === 'pdf' ? '📄' : m.content_type === 'slides' ? '📊' : m.content_type === 'quiz' ? '❓' : '📝'}
                          </span>
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-black text-black uppercase truncate">{`1.${mIdx + 1} ${m.title}`}</h4>
                          <span className="text-[9px] font-bold text-neutral-400 uppercase">
                            {m.content_type} • {m.duration || 'Flexible'}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2">
                        {mCompleted ? (
                          <div className="w-5 h-5 border-2 border-black bg-neo-green flex items-center justify-center rounded-full">
                            <span className="text-[10px] font-black text-black">✓</span>
                          </div>
                        ) : !mAccessible ? (
                          <span className="text-neutral-400 text-xs">🔒</span>
                        ) : (
                          <div className="w-5 h-5 border-2 border-black/30 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Resources Footer Block */}
            <div className="border-t-3 border-black bg-white flex flex-col min-h-0 max-h-[35%]">
              <div className="p-3 border-b-2 border-black bg-neutral-50">
                <h3 className="font-heading text-xs uppercase tracking-wider text-black">Resources</h3>
              </div>
              <div className="p-3 overflow-y-auto space-y-2.5 bg-[#fafaf8] flex-1">
                {resourceItems.length > 0 ? (
                  resourceItems.map((resItem) => (
                    <a
                      key={resItem.id}
                      href={resItem.content_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between border-2 border-black p-2.5 bg-white hover:-translate-y-0.5 shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-y-0 active:shadow-none transition-all rounded-none"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-7 h-7 border border-black bg-neutral-100 flex items-center justify-center shrink-0">
                          <span className="text-xs">{resItem.content_type === 'slides' ? '📊' : '📄'}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-black uppercase truncate">{resItem.title}</p>
                          <span className="text-[8px] font-bold text-neutral-400 uppercase">{resItem.content_type} • {resItem.duration}</span>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2 w-6 h-6 border border-black bg-neo-yellow flex items-center justify-center font-bold text-xs shadow-[1px_1px_0px_#000]">
                        ↓
                      </div>
                    </a>
                  ))
                ) : (
                  <>
                    <div className="flex items-center justify-between border-2 border-black p-2.5 bg-white hover:-translate-y-0.5 shadow-[2px_2px_0px_#000] transition-all rounded-none">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-7 h-7 border border-black bg-neutral-100 flex items-center justify-center shrink-0">
                          <span className="text-xs">📊</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-black uppercase truncate">Download Slides</p>
                          <span className="text-[8px] font-bold text-neutral-400 uppercase">PPT • 2.4 MB</span>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2 w-6 h-6 border border-black bg-neo-yellow flex items-center justify-center font-bold text-xs shadow-[1px_1px_0px_#000]">
                        ↓
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-2 border-black p-2.5 bg-white hover:-translate-y-0.5 shadow-[2px_2px_0px_#000] transition-all rounded-none">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-7 h-7 border border-black bg-neutral-100 flex items-center justify-center shrink-0">
                          <span className="text-xs">📄</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-black uppercase truncate">Cheat Sheet</p>
                          <span className="text-[8px] font-bold text-neutral-400 uppercase">PDF • 1.1 MB</span>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2 w-6 h-6 border border-black bg-neo-yellow flex items-center justify-center font-bold text-xs shadow-[1px_1px_0px_#000]">
                        ↓
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </aside>

          {/* Right Main Player Workspace */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[#fdfdfc] gap-6 animate-fade-in">
            {/* Player Container */}
            <div className="border-3 border-black shadow-[6px_6px_0px_#000] bg-white rounded-none p-4 relative">
              {/* Type Badge header */}
              <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 border border-black bg-neo-yellow text-[9px] font-black uppercase shadow-[1px_1px_0px_#000]">
                    {activeContent.content_type}
                  </span>
                  <h3 className="font-heading text-lg uppercase tracking-wider text-black">{activeContent.title}</h3>
                </div>
                {activeContent.content_type !== 'quiz' && (
                  <button
                    onClick={handleMoveToNext}
                    className="px-4 py-2 border-2 border-black bg-neo-green text-black font-heading text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer rounded-none hover:bg-neo-green/90 transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <span>✓ Mark as Complete</span>
                  </button>
                )}
              </div>

              {/* Render player matching type */}
              {(activeContent.content_type === 'video' || activeContent.content_type === 'live') && (
                <div className="border-3 border-black bg-black w-full aspect-video max-h-[70vh] relative flex items-center justify-center overflow-hidden shadow-[inset_0px_0px_20px_rgba(0,0,0,0.5)] group mx-auto">
                  {activeContent.content_url && (activeContent.content_url.includes('youtube.com') || activeContent.content_url.includes('youtu.be')) ? (
                    <iframe
                      src={activeContent.content_url.replace('watch?v=', 'embed/').split('&')[0]}
                      className="w-full h-full border-none absolute inset-0"
                      allowFullScreen
                    />
                  ) : (
                    <>
                      <video 
                        ref={videoRef}
                        src={activeContent.content_url?.includes('cloudinary.com/video/upload') && !activeContent.content_url.endsWith('.mp4') 
                          ? activeContent.content_url.replace(/\.[^/.]+$/, "") + ".mp4" 
                          : activeContent.content_url} 
                        className="w-full h-full object-contain absolute inset-0 cursor-pointer" 
                        onTimeUpdate={handleVideoTimeUpdate}
                        onLoadedMetadata={handleVideoLoadedMetadata}
                        onClick={handleTogglePlay}
                      />
                      
                      {/* Custom Controls Bar matching mock */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/90 border-t-2 border-black flex flex-col p-3.5 z-20 font-mono text-xs select-none">
                        {/* Custom Control Buttons row */}
                        <div className="flex items-center justify-between text-white font-mono gap-4">
                          <div className="flex items-center gap-3">
                            {/* Play/Pause Button */}
                            <button onClick={handleTogglePlay} className="hover:text-neo-yellow text-sm focus:outline-none transition-colors cursor-pointer">
                              {videoPlaying ? '❚❚' : '▶'}
                            </button>
                            {/* Volume Button */}
                            <button onClick={handleToggleVolume} className="hover:text-neo-yellow text-sm focus:outline-none transition-colors cursor-pointer">
                              {videoVolume > 0 ? '🔊' : '🔇'}
                            </button>
                            {/* Time indicators */}
                            <span className="text-[10px] font-bold text-neutral-300">
                              {videoTime} / {videoDurationStr}
                            </span>
                          </div>

                          {/* Center Progress slider indicator bar */}
                          <div className="flex-1 px-4 relative flex items-center">
                            <div className="w-full h-2 bg-neutral-700 relative cursor-pointer border border-black/40" onClick={(e) => {
                              if (!videoRef.current) return
                              const rect = e.currentTarget.getBoundingClientRect()
                              const clickX = e.clientX - rect.left
                              const width = rect.width
                              const percentage = clickX / width
                              videoRef.current.currentTime = percentage * videoRef.current.duration
                            }}>
                              <div className="h-full bg-red-600 transition-all duration-75" style={{ width: `${videoProgress}%` }} />
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Playback speed */}
                            <button onClick={handleToggleSpeed} className="hover:text-neo-yellow font-black tracking-tighter text-[10px] uppercase cursor-pointer">
                              {videoSpeed}x
                            </button>
                            {/* Subtitle / CC */}
                            <button onClick={handleToggleCc} className={`px-1.5 py-0.5 border border-white font-bold text-[8px] tracking-wide rounded-sm cursor-pointer ${videoCc ? 'bg-white text-black' : 'bg-transparent text-white'}`}>
                              CC
                            </button>
                            {/* Fullscreen */}
                            <button onClick={handleToggleFullscreen} className="hover:text-neo-yellow cursor-pointer text-sm">
                              ⛶
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {(activeContent.content_type === 'pdf' || activeContent.content_type === 'file' || activeContent.content_type === 'document') && (() => {
                const rawUrl = activeContent.content_url || ''
                return (
                  <div className="space-y-3">
                    <div className="border-3 border-black shadow-[4px_4px_0px_#000] overflow-hidden bg-white">
                      <div className="bg-black px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-white stroke-[2.5px]" />
                          <span className="text-white text-[10px] font-black uppercase tracking-widest">{activeContent.title || 'Resource File'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <a href={pdfLocalUrl || rawUrl} download target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-[#fdcb6e] uppercase hover:text-white">Download ↗</a>
                        </div>
                      </div>
                      
                      {loadingPdf ? (
                        <div className="h-[560px] flex flex-col items-center justify-center gap-3 bg-neutral-50">
                          <div className="w-10 h-10 border-4 border-black border-t-neo-yellow animate-spin rounded-full"></div>
                          <p className="text-[10px] font-black uppercase text-neutral-400 animate-pulse">Caching secure file preview locally...</p>
                        </div>
                      ) : pdfLocalUrl && pdfFileExt === 'pdf' ? (
                        <iframe
                          src={pdfLocalUrl}
                          width="100%"
                          height={560}
                          className="block border-0 bg-neutral-50"
                          title={activeContent.title || 'Resource File'}
                        />
                      ) : pdfLocalUrl && pdfFileExt === 'pptx' ? (() => {
                        const pptCloudinaryUrl = rawUrl + (rawUrl.includes('?') ? '&ext=.pptx' : '?ext=.pptx')
                        return (
                          <iframe
                            src={`https://docs.google.com/viewer?url=${encodeURIComponent(pptCloudinaryUrl)}&embedded=true`}
                            width="100%"
                            height={560}
                            className="block border-0 bg-neutral-50"
                            title={activeContent.title || 'Presentation'}
                          />
                        )
                      })() : (
                        <div className="h-[560px] flex flex-col items-center justify-center gap-5 bg-neutral-50 p-6">
                          <div className="w-16 h-16 border-3 border-black bg-neo-yellow flex items-center justify-center shadow-[4px_4px_0px_#000]">
                            <FileText className="w-8 h-8 text-black stroke-[2.5px]" />
                          </div>
                          <div className="text-center space-y-1">
                            <h4 className="font-heading text-base uppercase text-black">{activeContent.title || 'Resource Download'}</h4>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                              This milestone file ({pdfFileExt?.toUpperCase() || 'FILE'}) is a download-only resource.
                            </p>
                          </div>
                          <a
                            href={pdfLocalUrl || rawUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 border-3 border-black bg-neo-green text-black text-xs font-black uppercase shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
                          >
                            <span>Download File ↗</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {activeContent.content_type === 'slides' && (() => {
                const url = activeContent.content_url || ''
                let pptUrl = url
                if (url.includes('cloudinary.com') && !url.toLowerCase().endsWith('.ppt') && !url.toLowerCase().endsWith('.pptx')) {
                  pptUrl = url + (url.includes('?') ? '&ext=.pptx' : '?ext=.pptx')
                }
                const ext = pptUrl.split('.').pop()?.split('?')[0]?.toLowerCase()
                const isPptx = ext === 'ppt' || ext === 'pptx'
                return (
                  <div className="space-y-3">
                    <div className="border-3 border-black shadow-[4px_4px_0px_#000] overflow-hidden bg-white">
                      <div className="bg-[#fdcb6e] border-b-2 border-black px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-black stroke-[2.5px]" />
                          <span className="text-black text-[10px] font-black uppercase tracking-widest">{activeContent.title || 'Presentation'}</span>
                        </div>
                        <a href={pdfLocalUrl || url} download target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-black/60 uppercase hover:text-black">Download ↗</a>
                      </div>
                      
                      {loadingPdf ? (
                        <div className="h-[560px] flex flex-col items-center justify-center gap-3 bg-neutral-50">
                          <div className="w-10 h-10 border-4 border-black border-t-neo-yellow animate-spin rounded-full"></div>
                          <p className="text-[10px] font-black uppercase text-neutral-400 animate-pulse">Caching secure presentation preview...</p>
                        </div>
                      ) : pdfLocalUrl && pdfFileExt === 'pdf' ? (
                        <iframe
                          src={pdfLocalUrl}
                          width="100%"
                          height={560}
                          className="block border-0 bg-neutral-50"
                          title={activeContent.title || 'Presentation File'}
                        />
                      ) : (
                        <iframe
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(pptUrl)}&embedded=true`}
                          width="100%"
                          height={560}
                          className="block border-0"
                          title={activeContent.title || 'Presentation'}
                        />
                      )}
                    </div>
                  </div>
                )
              })()}

              {activeContent.content_type === 'assignment' && (
                <div className="space-y-4">
                  <div className="border-3 border-black bg-[#f9f9f6] p-4 shadow-[3px_3px_0px_#000] flex items-center justify-between rounded-none">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">📝</span>
                      <div>
                        <h4 className="font-heading text-xs uppercase text-black">Instruction template</h4>
                        <p className="text-[9px] text-neutral-400 font-extrabold uppercase">Attachment file</p>
                      </div>
                    </div>
                    {activeContent.content_url && (
                      <a
                        href={activeContent.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 border-2 border-black bg-neo-yellow text-black font-extrabold text-[10px] uppercase shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none cursor-pointer"
                      >
                        Download Template ↗
                      </a>
                    )}
                  </div>

                  <div className="border-3 border-black bg-white p-5 shadow-[4px_4px_0px_#000] space-y-4 rounded-none">
                    <div className="border-b-2 border-black pb-2">
                      <h3 className="font-heading text-sm uppercase tracking-wide">Assignment Submit Workspace</h3>
                      <p className="text-[9px] text-neutral-400 font-extrabold uppercase mt-0.5">Submit your completed milestone report below.</p>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Paste your submission notes, links, or report documentation here..."
                      className="w-full p-3 border-2 border-black bg-white text-xs font-semibold focus:outline-none rounded-none"
                    />
                    <div className="border-2 border-dashed border-black/30 p-4 text-center cursor-pointer hover:bg-neutral-50">
                      <span className="text-[10px] font-black uppercase text-neutral-400">📎 Click to upload attachment files (.zip, .pdf, .docx)</span>
                    </div>
                  </div>
                </div>
              )}

              {activeContent.content_type === 'quiz' && activeContent.quiz_questions && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {activeContent.quiz_questions.map((q: any, qIdx: number) => (
                      <div key={qIdx} className="border-2 border-black p-4 bg-neutral-50 space-y-3">
                        <h4 className="text-xs font-black uppercase text-black">{qIdx + 1}. {q.question}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt: string, oIdx: number) => (
                            <button
                              key={oIdx}
                              type="button"
                              disabled={quizSubmitted}
                              onClick={() => handleSelectOption(qIdx, opt)}
                              className={`py-2 px-3 border border-black text-left text-xs font-bold uppercase rounded-none transition-all ${
                                quizAnswers[qIdx] === opt
                                  ? 'bg-[#ffcc00] text-black border-2 shadow-[1px_1px_0px_#000]'
                                  : 'bg-white hover:bg-neutral-100 text-neutral-700'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {quizResult && (
                    <div className="p-4 border-2 border-black bg-neo-yellow/20 font-sans font-bold text-xs uppercase tracking-wide">
                      {quizResult}
                    </div>
                  )}

                  <div className="flex gap-4">
                    {!quizSubmitted ? (
                      <button
                        type="button"
                        onClick={handleSubmitQuiz}
                        className="flex-1 py-3.5 border-2 border-black bg-[#ffd500] text-black font-heading text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
                      >
                        Submit Answers
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setQuizAnswers({})
                            setQuizSubmitted(false)
                            setQuizResult(null)
                          }}
                          className="flex-1 py-3.5 border-2 border-black bg-white text-black font-heading text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000]"
                        >
                          Retry Module
                        </button>
                        {quizResult && quizResult.includes("scored") && !quizResult.includes("0%") && (
                          <button
                            type="button"
                            onClick={handleMoveToNext}
                            className="flex-1 py-3.5 border-2 border-black bg-neo-green text-black font-heading text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
                          >
                            Complete & Move Next →
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Interactive Tabs Section */}
            <div className="border-3 border-black bg-white shadow-[4px_4px_0px_#000] rounded-none">
              {/* Tab Switcher Headers */}
              <div className="flex border-b-2 border-black bg-neutral-50">
                {(['overview', 'notes', 'transcript'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveWorkspaceTab(tab)}
                    className={`px-6 py-3 font-heading text-xs uppercase tracking-wider border-r-2 border-black cursor-pointer transition-all ${
                      activeWorkspaceTab === tab 
                        ? 'bg-white font-black border-b-2 border-b-white translate-y-[2px]' 
                        : 'bg-neutral-100 hover:bg-neutral-200/50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content body */}
              <div className="p-5 min-h-[120px] font-sans text-xs text-neutral-700 font-semibold leading-relaxed">
                {activeWorkspaceTab === 'overview' && (
                  <p>{activeContent.description || 'No overview details are provided for this module yet. Read the content details above to complete this course milestone.'}</p>
                )}
                {activeWorkspaceTab === 'notes' && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-neutral-400 leading-none">Draft your custom workspace study notes here:</p>
                    <textarea 
                      rows={4}
                      placeholder="Type study notes..." 
                      className="w-full p-2 border-2 border-black text-xs font-semibold focus:outline-none rounded-none"
                    />
                  </div>
                )}
                {activeWorkspaceTab === 'transcript' && (
                  <div className="space-y-2 text-neutral-500">
                    <p><span className="font-bold text-black">[00:00]</span> Introduction to the topic curriculum details and milestones.</p>
                    <p><span className="font-bold text-black">[02:30]</span> Reviewing the core concepts and execution structures.</p>
                    <p><span className="font-bold text-black">[05:15]</span> Advanced summary, checklist, and key reference materials.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen w-full flex bg-[#fdfdfd] overflow-hidden select-none font-sans">
      <div className="w-full h-screen flex">
        
        {/* Left Sidebar Layout */}
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
              {sidebarItems.map((item) => {
                const isSelected = activeTab === item.id && !selectedCourse
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any)
                      setSelectedCourse(null)
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3 border-2 border-black font-sans font-extrabold text-base tracking-wide rounded-none cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#ffcc00] text-black shadow-[4px_4px_0px_#000]'
                        : 'bg-transparent text-black border-transparent hover:translate-x-1'
                    }`}
                  >
                    <item.icon className="w-6 h-6 stroke-[2.5px] text-black" />
                    <span>{item.name}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Profile Card (Bottom) */}
          <div className="relative w-full mb-10">
            {profileMenuOpen && (
              <div className="absolute bottom-full left-0 w-full mb-3 bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] z-[110] p-1.5 flex flex-col gap-1">
                <div className="p-2 border-b-2 border-black bg-neutral-50">
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Signed in as</p>
                  <p className="text-xs font-black text-black truncate">{user?.email || 'guest@email.com'}</p>
                </div>
                <button
                  onClick={async () => {
                    setProfileMenuOpen(false)
                    await supabase.auth.signOut()
                    router.push('/login')
                  }}
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
                <h4 className="font-sans font-black text-sm text-black leading-tight mb-0.5 truncate">
                  {user?.user_metadata?.full_name || 'Student User'}
                </h4>
                <span className="font-sans font-extrabold text-xs text-neutral-500 leading-none truncate">
                  {user?.email || 'guest@email.com'}
                </span>
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

        {/* Main Content Area */}
        <div className="flex-1 h-full overflow-y-auto flex flex-col relative">
          
          {/* Header */}
          <header className="h-20 border-b-[3px] border-black flex items-center justify-between bg-white shrink-0 p-0 overflow-visible relative z-30">
            <div className="flex-1 flex items-center justify-between px-8 py-4 h-full relative overflow-visible">
              <div className="min-w-0 flex-1 mr-4">
                <h1 
                  className="font-heading text-base sm:text-lg md:text-xl lg:text-2xl uppercase tracking-wider text-black leading-none truncate max-w-[200px] sm:max-w-sm md:max-w-md lg:max-w-lg"
                  title={selectedCourse ? selectedCourse.title : activeTab === 'dashboard' ? `Welcome back, ${studentName}! 👋` : activeTab === 'my-courses' ? 'My Enrolled Courses' : activeTab === 'certificates' ? 'My Certificates' : 'Explore All Courses'}
                >
                  {selectedCourse ? selectedCourse.title : activeTab === 'dashboard' ? `Welcome back, ${studentName}! 👋` : activeTab === 'my-courses' ? 'My Enrolled Courses' : activeTab === 'certificates' ? 'My Certificates' : 'Explore All Courses'}
                </h1>
                <p className="text-xs font-bold text-neutral-500 mt-1 truncate">
                  {selectedCourse ? 'Course Details & Milestone Progress' : activeTab === 'certificates' ? 'View and download your earned certificates.' : 'Keep learning, keep growing.'}
                </p>
              </div>
              
              <div className="flex items-center gap-4 relative shrink-0">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 border-2 border-black font-bold text-xs uppercase tracking-wide focus:outline-none placeholder-neutral-400 w-44 md:w-56"
                  />
                  <Search className="w-4 h-4 text-black absolute right-3 pointer-events-none stroke-[2.5px]" />
                </div>

                <div className="relative">
                  <button
                    onClick={handleToggleNotifications}
                    className="p-2 border-2 border-black shadow-[2px_2px_0px_#000] bg-white cursor-pointer rounded-none relative active:translate-x-[1px] active:translate-y-[1px]"
                  >
                    <Bell className="w-5 h-5 stroke-[2.5px]" />
                    {unseenCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-neo-pink text-white text-[9px] font-bold border-2 border-black w-5 h-5 flex items-center justify-center rounded-full">
                        {unseenCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Popup Card */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 border-3 border-black bg-white shadow-[6px_6px_0px_#000] p-4 space-y-3 z-30 font-sans rounded-none">
                      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                        <span className="font-heading text-xs uppercase tracking-wider text-black">Notifications</span>
                        <button onClick={() => setNotifications([])} className="text-[10px] font-bold underline text-neutral-500 hover:text-black">Clear All</button>
                      </div>
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-neutral-400 font-bold uppercase text-center py-2">No new messages.</p>
                        ) : (
                          notifications.map((note) => (
                            <div key={note.id} className="p-2.5 border-2 border-black bg-neutral-50 text-[10px] font-bold text-black uppercase flex flex-col gap-1 shadow-[2px_2px_0px_#000] rounded-none">
                              <span className="leading-tight">{note.message}</span>
                              <span className="text-[8px] font-extrabold text-neutral-400 self-end mt-0.5">{note.timestamp || 'Just now'}</span>
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

          <div className="flex-1 p-8 bg-[#fdfdfc] overflow-y-auto">
            {selectedCourse ? (
              <div className="space-y-8 animate-fade-in">
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="flex items-center gap-2 px-5 py-2.5 border-3 border-black bg-white shadow-[4px_4px_0px_#000] font-heading text-xs uppercase active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer rounded-none"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[3px]" />
                  Back to Dashboard
                </button>
 
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Milestones timeline block */}
                  <div className="lg:col-span-2 space-y-6">
                    {activeContent ? (
                      /* Content Sandbox Viewer */
                      <div className="border-3 border-black bg-white p-6 shadow-[8px_8px_0px_#000] rounded-none space-y-6">
                        <div className="flex items-center justify-between border-b-3 border-black pb-4">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 border-2 border-black bg-neo-yellow text-[10px] font-black uppercase shadow-[2px_2px_0px_#000]">
                              {activeContent.content_type}
                            </span>
                            <h3 className="font-heading text-xl uppercase tracking-wider text-black">{activeContent.title}</h3>
                          </div>
                          <button
                            onClick={() => {
                              setActiveContent(null)
                              setActiveContentIndex(-1)
                            }}
                            className="px-4 py-2 border-2 border-black bg-neo-pink text-white text-[10px] font-heading uppercase shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer"
                          >
                            Close Content
                          </button>
                        </div>

                        {/* Interactive Sandbox according to type */}
                        {/* Interactive Sandbox according to type */}
                        {(activeContent.content_type === 'video' || activeContent.content_type === 'live') && (
                          <div className="space-y-4">
                            <div className="border-3 border-black shadow-[6px_6px_0px_#000] w-full bg-neo-blue p-2 sm:p-3 rounded-none relative">
                              {/* Top Bar for Video */}
                              <div className="flex items-center justify-between mb-3 px-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-black animate-pulse"></span>
                                  <span className="font-heading text-xs uppercase text-white tracking-widest">Media Player</span>
                                </div>
                              </div>
                              
                              <div className="border-3 border-black bg-black aspect-video w-full relative flex items-center justify-center overflow-hidden shadow-[inset_0px_0px_20px_rgba(0,0,0,0.5)]">
                                {activeContent.content_url && (activeContent.content_url.includes('youtube.com') || activeContent.content_url.includes('youtu.be')) ? (
                                  <iframe
                                    src={activeContent.content_url.replace('watch?v=', 'embed/').split('&')[0]}
                                    className="w-full h-full border-none absolute inset-0"
                                    allowFullScreen
                                  />
                                ) : (
                                  <video 
                                    src={activeContent.content_url?.includes('cloudinary.com/video/upload') && !activeContent.content_url.endsWith('.mp4') 
                                      ? activeContent.content_url.replace(/\.[^/.]+$/, "") + ".mp4" 
                                      : activeContent.content_url} 
                                    controls 
                                    className="w-full h-full object-contain absolute inset-0" 
                                  />
                                )}
                              </div>
                            </div>
                            
                            <div className="border-2 border-black bg-white p-3 shadow-[3px_3px_0px_#000]">
                              <p className="text-xs font-black text-black uppercase">{activeContent.description || 'Watch the video lesson and complete the milestone.'}</p>
                            </div>
                            
                            <button
                              onClick={handleMoveToNext}
                              className="w-full py-4 border-3 border-black bg-neo-green text-black font-heading text-sm uppercase tracking-wider shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#000] cursor-pointer rounded-none hover:bg-neo-green/90 transition-all"
                            >
                              Complete & Move Next →
                            </button>
                          </div>
                        )}

                        {(activeContent.content_type === 'pdf' || activeContent.content_type === 'file' || activeContent.content_type === 'document') && (() => {
                          const rawUrl = activeContent.content_url || ''
                          return (
                            <div className="space-y-4">
                              <div className="border-3 border-black shadow-[6px_6px_0px_#000] overflow-hidden bg-white">
                                <div className="bg-black px-4 py-2.5 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-white stroke-[2.5px]" />
                                    <span className="text-white text-[10px] font-black uppercase tracking-widest">{activeContent.title || 'Resource File'}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <a href={pdfLocalUrl || rawUrl} download target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-[#fdcb6e] uppercase hover:text-white">Download ↗</a>
                                  </div>
                                </div>
                                
                                {loadingPdf ? (
                                  <div className="h-[620px] flex flex-col items-center justify-center gap-3 bg-neutral-50">
                                    <div className="w-12 h-12 border-4 border-black border-t-neo-yellow animate-spin rounded-full"></div>
                                    <p className="text-xs font-black uppercase text-neutral-400 animate-pulse">Caching secure file preview locally...</p>
                                  </div>
                                ) : pdfLocalUrl && pdfFileExt === 'pdf' ? (
                                  <iframe
                                    src={pdfLocalUrl}
                                    width="100%"
                                    height={620}
                                    className="block border-0 bg-neutral-50"
                                    title={activeContent.title || 'Resource File'}
                                  />
                                ) : pdfLocalUrl && pdfFileExt === 'pptx' ? (() => {
                                  const pptCloudinaryUrl = rawUrl + (rawUrl.includes('?') ? '&ext=.pptx' : '?ext=.pptx')
                                  return (
                                    <iframe
                                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(pptCloudinaryUrl)}&embedded=true`}
                                      width="100%"
                                      height={620}
                                      className="block border-0 bg-neutral-50"
                                      title={activeContent.title || 'Presentation'}
                                    />
                                  )
                                })() : (
                                  <div className="h-[620px] flex flex-col items-center justify-center gap-5 bg-neutral-50 p-6">
                                    <div className="w-16 h-16 border-3 border-black bg-neo-yellow flex items-center justify-center shadow-[4px_4px_0px_#000]">
                                      <FileText className="w-8 h-8 text-black stroke-[2.5px]" />
                                    </div>
                                    <div className="text-center space-y-1">
                                      <h4 className="font-heading text-base uppercase text-black">{activeContent.title || 'Resource Download'}</h4>
                                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                                        This milestone file ({pdfFileExt?.toUpperCase() || 'FILE'}) is a download-only resource.
                                      </p>
                                    </div>
                                    <a
                                      href={pdfLocalUrl || rawUrl}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-8 py-3 border-3 border-black bg-neo-green text-black text-sm font-black uppercase shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
                                    >
                                      <span>Download File ↗</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                              <button
                                  onClick={handleMoveToNext}
                                  className="w-full py-4 border-3 border-black bg-neo-green text-black font-heading text-sm uppercase tracking-wider shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer rounded-none hover:bg-neo-green/90 transition-all"
                                >
                                Complete Document & Move Next →
                              </button>
                            </div>
                          )
                        })()}

                        {activeContent.content_type === 'slides' && (() => {
                          const url = activeContent.content_url || ''
                          let pptUrl = url
                          if (url.includes('cloudinary.com') && !url.toLowerCase().endsWith('.ppt') && !url.toLowerCase().endsWith('.pptx')) {
                            pptUrl = url + (url.includes('?') ? '&ext=.pptx' : '?ext=.pptx')
                          }
                          const ext = pptUrl.split('.').pop()?.split('?')[0]?.toLowerCase()
                          const isPptx = ext === 'ppt' || ext === 'pptx'
                          return (
                            <div className="space-y-4">
                              <div className="border-3 border-black shadow-[6px_6px_0px_#000] overflow-hidden bg-white">
                                <div className="bg-[#fdcb6e] border-b-2 border-black px-4 py-2.5 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4 text-black stroke-[2.5px]" />
                                    <span className="text-black text-[10px] font-black uppercase tracking-widest">{activeContent.title || 'Presentation'}</span>
                                  </div>
                                  <a href={pdfLocalUrl || url} download target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-black/60 uppercase hover:text-black">Download ↗</a>
                                </div>
                                
                                {loadingPdf ? (
                                  <div className="h-[620px] flex flex-col items-center justify-center gap-3 bg-neutral-50">
                                    <div className="w-12 h-12 border-4 border-black border-t-neo-yellow animate-spin rounded-full"></div>
                                    <p className="text-xs font-black uppercase text-neutral-400 animate-pulse">Caching secure presentation preview...</p>
                                  </div>
                                ) : pdfLocalUrl && pdfFileExt === 'pdf' ? (
                                  <iframe
                                    src={pdfLocalUrl}
                                    width="100%"
                                    height={620}
                                    className="block border-0 bg-neutral-50"
                                    title={activeContent.title || 'Presentation File'}
                                  />
                                ) : (
                                  <iframe
                                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(pptUrl)}&embedded=true`}
                                    width="100%"
                                    height={620}
                                    className="block border-0"
                                    title={activeContent.title || 'Presentation'}
                                  />
                                )}
                              </div>
                              <button
                                onClick={handleMoveToNext}
                                className="w-full py-4 border-3 border-black bg-neo-green text-black font-heading text-sm uppercase tracking-wider shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer rounded-none hover:bg-neo-green/90 transition-all"
                              >
                                Complete & Move Next →
                              </button>
                            </div>
                          )
                        })()}

                        {(activeContent.content_type === 'file' || activeContent.content_type === 'document' || activeContent.content_type === 'assignment') && (
                          <div className="space-y-6">
                            <div className="border-3 border-black shadow-[6px_6px_0px_#000] bg-white flex flex-col sm:flex-row items-center p-4 sm:p-6 rounded-none gap-6">
                              {/* Icon Box */}
                              <div className="w-full sm:w-1/3 aspect-video border-3 border-black bg-[#74b9ff] flex items-center justify-center overflow-hidden shadow-[4px_4px_0px_#000] relative">
                                <span className="text-6xl drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                                  {activeContent.content_type === 'assignment' ? '📝' : '📦'}
                                </span>
                              </div>
                              
                              <div className="flex-1 space-y-4 text-center sm:text-left">
                                <h3 className="font-heading text-xl sm:text-2xl uppercase tracking-wider text-black">
                                  {activeContent.title || 'Resource Download'}
                                </h3>
                                <p className="text-xs font-black text-neutral-500 uppercase">
                                  {activeContent.content_type === 'assignment' 
                                    ? 'Download the instruction template and submit your report below.' 
                                    : 'Download the required course assets and resource files.'}
                                </p>
                                
                                <a
                                  href={activeContent.content_url || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block w-full sm:w-auto px-8 py-3 border-3 border-black bg-neo-yellow text-black font-heading text-sm uppercase shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all text-center"
                                >
                                  {activeContent.content_type === 'assignment' ? 'Download Assignment template ↗' : 'Download Resource File ↗'}
                                </a>
                              </div>
                            </div>

                            {activeContent.content_type === 'assignment' && (
                              <div className="border-3 border-black bg-white p-5 shadow-[4px_4px_0px_#000] space-y-4 rounded-none">
                                <div className="border-b-2 border-black pb-2">
                                  <h3 className="font-heading text-sm uppercase tracking-wide">Assignment Submit Workspace</h3>
                                  <p className="text-[9px] text-neutral-400 font-extrabold uppercase mt-0.5">Submit your completed milestone report below.</p>
                                </div>
                                <textarea
                                  rows={4}
                                  placeholder="Paste your submission notes, links, or report documentation here..."
                                  className="w-full p-3 border-2 border-black bg-white text-xs font-semibold focus:outline-none rounded-none"
                                />
                                <div className="border-2 border-dashed border-black/30 p-4 text-center cursor-pointer hover:bg-neutral-50">
                                  <span className="text-[10px] font-black uppercase text-neutral-400">📎 Click to upload attachment files (.zip, .pdf, .docx)</span>
                                </div>
                              </div>
                            )}

                            <button
                              onClick={handleMoveToNext}
                              className="w-full py-4 border-3 border-black bg-neo-green text-black font-heading text-sm uppercase tracking-wider shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#000] cursor-pointer rounded-none hover:bg-neo-green/90 transition-all"
                            >
                              {activeContent.content_type === 'assignment' ? 'Submit Assignment & Continue →' : 'Mark Asset as Read & Continue →'}
                            </button>
                          </div>
                        )}

                        {(activeContent.content_type === 'quiz' || activeContent.content_type === 'exam') && activeContent.quiz_questions && (
                          <div className="space-y-6">
                            <div className="space-y-4">
                              {activeContent.quiz_questions.map((q: any, qIdx: number) => (
                                <div key={qIdx} className="border-2 border-black p-4 bg-neutral-50 space-y-3">
                                  <h4 className="text-xs font-black uppercase text-black">{qIdx + 1}. {q.question}</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {q.options.map((opt: string, oIdx: number) => (
                                      <button
                                        key={oIdx}
                                        type="button"
                                        disabled={quizSubmitted}
                                        onClick={() => handleSelectOption(qIdx, opt)}
                                        className={`py-2 px-3 border border-black text-left text-xs font-bold uppercase rounded-none transition-all ${
                                          quizAnswers[qIdx] === opt
                                            ? 'bg-neo-yellow text-black border-2 shadow-[1px_1px_0px_#000]'
                                            : 'bg-white hover:bg-neutral-100 text-neutral-700'
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {quizResult && (
                              <div className="p-4 border-2 border-black bg-neo-yellow/20 font-sans font-bold text-xs uppercase tracking-wide">
                                {quizResult}
                              </div>
                            )}

                            <div className="flex gap-4">
                              {!quizSubmitted ? (
                                <button
                                  type="button"
                                  onClick={handleSubmitQuiz}
                                  className="flex-1 py-3.5 border-2 border-black bg-[#ffd500] text-black font-heading text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
                                >
                                  Submit Answers
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuizAnswers({})
                                      setQuizSubmitted(false)
                                      setQuizResult(null)
                                    }}
                                    className="flex-1 py-3.5 border-2 border-black bg-white text-black font-heading text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000]"
                                  >
                                    Retry Module
                                  </button>
                                  {quizResult && quizResult.includes("scored") && !quizResult.includes("0%") && (
                                    <button
                                      type="button"
                                      onClick={handleMoveToNext}
                                      className="flex-1 py-3.5 border-2 border-black bg-neo-green text-black font-heading text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
                                    >
                                      Complete & Move Next →
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Milestones list — pixel-perfect redesign */
                      <div className="space-y-0 rounded-none">
                        
                        {/* Course header banner */}
                        <div className="border-3 border-black bg-white p-5 shadow-[6px_6px_0px_#000] mb-6">
                          <div className="flex items-center gap-5">
                            {/* Course thumbnail */}
                            <div className="w-20 h-20 border-3 border-black shrink-0 overflow-hidden shadow-[3px_3px_0px_#000]">
                              <CourseCover
                                category={selectedCourse.category}
                                title={selectedCourse.title}
                                icon={selectedCourse.icon}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            {/* Course meta + progress */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <h2 className="font-heading text-lg uppercase tracking-wider text-black leading-none truncate">
                                  {selectedCourse.title}
                                </h2>
                                <span className={`px-2 py-0.5 border-2 border-black text-[8px] font-black uppercase tracking-wider shrink-0 shadow-[1.5px_1.5px_0px_#000] ${
                                  getEnrollmentProgress(selectedCourse.id) === 100 
                                    ? 'bg-neo-green text-black' 
                                    : isEnrolled(selectedCourse.id) 
                                      ? 'bg-[#ffcc00] text-black' 
                                      : 'bg-neutral-200 text-neutral-500'
                                }`}>
                                  {getEnrollmentProgress(selectedCourse.id) === 100 ? 'Completed' : isEnrolled(selectedCourse.id) ? 'In Progress' : 'Not Enrolled'}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex-1 bg-neutral-100 border-2 border-black h-3 shadow-[1.5px_1.5px_0px_#000] relative overflow-hidden">
                                  <div
                                    className="bg-neo-green h-full border-r-2 border-black transition-all duration-500"
                                    style={{ width: `${getEnrollmentProgress(selectedCourse.id)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wide shrink-0">
                                  {getEnrollmentProgress(selectedCourse.id)}% Complete
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Legend row */}
                        <div className="flex items-center justify-between mb-4 px-1">
                          <span className="font-heading text-sm uppercase tracking-wider text-black">
                            All Milestones ({courseMilestones.length})
                          </span>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-neo-green border-2 border-black flex items-center justify-center">
                                <CheckCircle2 className="w-2.5 h-2.5 text-black stroke-[3px]" />
                              </div>
                              <span className="text-[10px] font-black text-neutral-500 uppercase">Completed</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-[#ffcc00] border-2 border-black flex items-center justify-center">
                                <span className="text-[7px] font-black text-black">P</span>
                              </div>
                              <span className="text-[10px] font-black text-neutral-500 uppercase">In Progress</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-neutral-200 border-2 border-black flex items-center justify-center">
                                <Lock className="w-2 h-2 text-neutral-500" />
                              </div>
                              <span className="text-[10px] font-black text-neutral-500 uppercase">Locked</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full border-2 border-neutral-300 bg-white" />
                              <span className="text-[10px] font-black text-neutral-400 uppercase">Not Started</span>
                            </div>
                          </div>
                        </div>

                        {/* Milestone rows */}
                        <div className="border-3 border-black bg-white shadow-[6px_6px_0px_#000] overflow-hidden divide-y-[2px] divide-black/15">
                          {courseMilestones.length === 0 ? (
                            <p className="text-sm font-bold text-neutral-500 p-6">No milestones added yet.</p>
                          ) : (
                            courseMilestones.map((milestone, idx) => {
                              const completedList = getCompletedMilestones(selectedCourse.id)
                              const isCompleted = completedList.includes(milestone.id)
                              const isInProgress = isEnrolled(selectedCourse.id) && !isCompleted && (idx === 0 || completedList.includes(courseMilestones[idx - 1]?.id))
                              const isAccessible = isEnrolled(selectedCourse.id) && (idx === 0 || completedList.includes(courseMilestones[idx - 1]?.id))
                              const isLocked = !isAccessible

                              // Type icon
                              let typeIcon = <FileText className="w-4 h-4 text-white stroke-[2.5px]" />
                              let typeLabel = milestone.content_type || 'doc'
                              let typeDetail = ''
                              if (milestone.content_type === 'video') {
                                typeIcon = <Play className="w-3.5 h-3.5 text-white fill-white" />
                                typeDetail = milestone.duration ? `${milestone.duration} min` : ''
                              } else if (milestone.content_type === 'pdf') {
                                typeDetail = milestone.pages ? `${milestone.pages} pages` : ''
                              } else if (milestone.content_type === 'slides' || milestone.content_type === 'ppt') {
                                typeLabel = 'PPT'
                                typeIcon = <ClipboardList className="w-4 h-4 text-white stroke-[2.5px]" />
                                typeDetail = milestone.slides ? `${milestone.slides} slides` : ''
                              } else if (milestone.content_type === 'quiz') {
                                typeIcon = <HelpCircle className="w-4 h-4 text-white stroke-[2.5px]" />
                                typeDetail = milestone.question_count ? `${milestone.question_count} Questions` : '10 Questions'
                              } else if (milestone.content_type === 'assignment') {
                                typeIcon = <ClipboardList className="w-4 h-4 text-white stroke-[2.5px]" />
                                typeDetail = 'Guidelines'
                              }

                              const typeBg = milestone.content_type === 'video' ? 'bg-[#74b9ff]'
                                : milestone.content_type === 'quiz' || milestone.content_type === 'exam' ? 'bg-[#ff7675]'
                                : milestone.content_type === 'slides' || milestone.content_type === 'ppt' ? 'bg-[#fdcb6e]'
                                : milestone.content_type === 'assignment' ? 'bg-[#a29bfe]'
                                : 'bg-[#ff9f43]'

                              const accentColor = isCompleted ? '#00b894' : isInProgress ? '#fdcb6e' : '#dfe6e9'

                              return (
                                <div
                                  key={milestone.id}
                                  className={`flex items-stretch h-16 transition-colors duration-150 ${
                                    isLocked ? 'bg-neutral-50' : 'bg-white hover:bg-[#fffdf0] cursor-pointer'
                                  }`}
                                >
                                  {/* Left accent bar — fixed width 4px */}
                                  <div className="w-1 shrink-0" style={{ backgroundColor: accentColor }} />

                                  {/* Number badge — fixed 56px zone */}
                                  <div className="w-14 shrink-0 flex items-center justify-center">
                                    <div className={`w-7 h-7 rounded-full border-2 border-black flex items-center justify-center text-[11px] font-black shadow-[1.5px_1.5px_0px_#000] ${
                                      isCompleted ? 'bg-neo-green text-black'
                                      : isInProgress ? 'bg-[#ffcc00] text-black'
                                      : 'bg-neutral-200 text-neutral-500'
                                    }`}>
                                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 stroke-[3px]" /> : idx + 1}
                                    </div>
                                  </div>

                                  {/* Type icon — fixed 44px zone */}
                                  <div className={`w-11 shrink-0 flex items-center justify-center`}>
                                    <div className={`w-9 h-9 border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000] ${typeBg} ${isLocked ? 'opacity-50' : ''}`}>
                                      {typeIcon}
                                    </div>
                                  </div>

                                  {/* Title + type meta — flex-1 */}
                                  <div className="flex-1 min-w-0 flex flex-col justify-center px-4">
                                    <h4 className={`text-[13px] font-black uppercase tracking-wide leading-none truncate ${isLocked ? 'text-neutral-400' : 'text-black'}`}>
                                      {milestone.title}
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="text-[10px] font-bold text-neutral-400 uppercase">{typeLabel}</span>
                                      {typeDetail && (
                                        <>
                                          <span className="text-neutral-300">·</span>
                                          <span className="text-[10px] font-bold text-neutral-400">{typeDetail}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Description — fixed 200px, hidden on small screens */}
                                  <div className="hidden xl:flex w-48 items-center px-4 border-l border-black/8 shrink-0">
                                    <p className="text-[10px] font-bold text-neutral-400 leading-snug line-clamp-2">
                                      {milestone.description || 'Complete this milestone to progress.'}
                                    </p>
                                  </div>

                                  {/* Status + CTA — fixed 180px, always centered */}
                                  <div className="w-44 shrink-0 flex items-center justify-between px-4 border-l border-black/10">
                                    {isCompleted ? (
                                      <div className="flex items-center justify-between w-full">
                                        <span className="text-[10px] font-black text-[#00b894] uppercase">Completed</span>
                                        <button
                                          onClick={() => handleOpenContent(milestone, idx)}
                                          className="px-2.5 py-1 border-2 border-black bg-white text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_#000] hover:-translate-y-0.5 active:shadow-none transition-all cursor-pointer whitespace-nowrap"
                                        >
                                          Review →
                                        </button>
                                      </div>
                                    ) : isInProgress ? (
                                      <div className="flex items-center justify-between w-full">
                                        <span className="text-[10px] font-black text-[#e6a817] uppercase">In Progress</span>
                                        <button
                                          onClick={() => handleOpenContent(milestone, idx)}
                                          className="px-2.5 py-1 border-2 border-black bg-[#ffcc00] text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_#000] hover:-translate-y-0.5 active:shadow-none transition-all cursor-pointer whitespace-nowrap"
                                        >
                                          Continue →
                                        </button>
                                      </div>
                                    ) : isLocked ? (
                                      <div className="flex items-center gap-1.5 w-full">
                                        <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                                        <div>
                                          <p className="text-[10px] font-black text-neutral-400 uppercase leading-none">Locked</p>
                                          <p className="text-[8px] font-bold text-neutral-300 leading-tight mt-0.5">Complete previous to unlock</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between w-full">
                                        <span className="text-[10px] font-black text-neutral-500 uppercase">Not Started</span>
                                        <button
                                          onClick={() => handleOpenContent(milestone, idx)}
                                          className="px-2.5 py-1 border-2 border-black bg-[#ffcc00] text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_#000] hover:-translate-y-0.5 active:shadow-none transition-all cursor-pointer whitespace-nowrap"
                                        >
                                          Start →
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Chevron — fixed 32px */}
                                  <div className="w-8 shrink-0 flex items-center justify-center">
                                    <ChevronRight className={`w-4 h-4 stroke-[2.5px] ${isLocked ? 'text-neutral-200' : 'text-neutral-400'}`} />
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>

                        {/* Footer completion banner */}
                        {isEnrolled(selectedCourse.id) && (
                          <div className="mt-4 border-2 border-black bg-[#f0fff4] p-4 flex items-center gap-4 shadow-[4px_4px_0px_#000]">
                            <Award className="w-8 h-8 text-[#00b894] shrink-0" />
                            <p className="text-xs font-bold text-neutral-600">
                              Complete all milestones to finish the course and earn your{' '}
                              <span className="text-[#00b894] font-black underline cursor-pointer" onClick={() => setActiveTab('certificates')}>
                                certificate!
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Enrollment side card actions */}
                  <div className="space-y-6">
                    <div className="border-3 border-black bg-[#ffcc00] p-6 shadow-[6px_6px_0px_#000] rounded-none">
                      <h3 className="font-heading text-lg uppercase tracking-wider text-black mb-2">Enrollment Status</h3>
                      <p className="text-xs font-bold text-black mb-4 leading-relaxed">
                        {selectedCourse.description}
                      </p>

                      {/* Calculated Course Duration Badge */}
                      <div className="mb-4">
                        <p className="text-[10px] font-heading text-neutral-600 uppercase block mb-1">Expected Course Duration</p>
                        <div className="w-full bg-white border-2 border-black p-2 font-heading text-[10px] uppercase text-black shadow-[2px_2px_0px_#000] flex items-center gap-2">
                          ⏱️ {courseMilestones.reduce((acc, m) => acc + (m.days_left_from_enrollment || 5), 0)} Days Total
                        </div>
                      </div>

                      {isEnrolled(selectedCourse.id) ? (
                        <div className="space-y-3">
                          <div className="w-full bg-white border-2 border-black p-3 text-center font-heading text-xs uppercase shadow-[2px_2px_0px_#000]">
                            Enrolled - Progress {getEnrollmentProgress(selectedCourse.id)}%
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEnroll(selectedCourse.id)}
                          disabled={loadingEnroll}
                          className="w-full py-4 border-2 border-black bg-white text-black shadow-[4px_4px_0px_#000] font-heading text-sm uppercase tracking-wider active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer rounded-none hover:-translate-y-[1px] transition-all"
                        >
                          {loadingEnroll ? 'Enrolling...' : 'Enroll Now'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'dashboard' ? (
              /* Dashboard tab view */
              <div className="space-y-8 animate-fade-in">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
                  {statCards.map((card, idx) => (
                    <div key={idx} className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex rounded-none overflow-hidden h-[100px]">
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
                          {card.value}
                        </p>
                        <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wide leading-none mt-1">
                          {card.sub}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Continue Learning Course Banner (Dynamic) */}
                  <div className="lg:col-span-2 space-y-4">
                    <h2 className="font-heading text-lg uppercase tracking-wider text-black">Continue Learning</h2>
                    {activeLearning ? (
                      <div className="border-3 border-black bg-white shadow-[6px_6px_0px_#000] grid grid-cols-1 md:grid-cols-5 rounded-none overflow-hidden h-56">
                        <div className="md:col-span-2 border-r-3 border-black relative h-full overflow-hidden">
                          <CourseCover category={activeLearning.courses?.category} title={activeLearning.courses?.title} icon={activeLearning.courses?.icon} className="w-full h-full object-cover !border-b-0" />
                          <div className="absolute top-3 left-3 w-7 h-7 rounded-full border-2 border-black bg-[#ffcc00] flex items-center justify-center text-xs font-black shadow-[1.5px_1.5px_0px_#000] z-20">▶</div>
                        </div>

                        <div className="md:col-span-3 p-6 flex flex-col justify-between bg-[#fbfbf8]">
                          <div className="space-y-2">
                            <span className="px-2.5 py-0.5 border border-black bg-neo-yellow text-[9px] font-black uppercase tracking-wider">
                              In Progress
                            </span>
                            <h3 className="font-heading text-xl uppercase tracking-wider text-black leading-tight truncate">
                              {activeLearning.courses?.title}
                            </h3>
                            <div className="pt-2">
                              <div className="w-full bg-neutral-200 border-2 border-black h-4.5 shadow-[1.5px_1.5px_0px_#000] relative">
                                <div className="bg-neo-green h-full border-r-2 border-black" style={{ width: `${activeLearning.progress}%` }}></div>
                                <span className="absolute right-2 top-0.5 text-[8px] font-black text-black leading-none">{activeLearning.progress}% Completed</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4">
                            <button
                              onClick={() => handleOpenCourse(activeLearning.courses)}
                              className="flex items-center gap-2 px-5 py-2.5 border-2 border-black bg-white shadow-[2px_2px_0px_#000] font-heading text-xs uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer rounded-none"
                            >
                              <span>Open Course Details</span>
                              <ChevronRight className="w-4 h-4 stroke-[3px]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-3 border-black border-dashed p-10 text-center uppercase font-bold text-neutral-400">
                        Enroll in a course below to track progress!
                      </div>
                    )}
                  </div>

                  {/* Upcoming Deadlines (Dynamic) */}
                  <div className="space-y-4">
                    <h2 className="font-heading text-lg uppercase tracking-wider text-black">Upcoming Deadlines</h2>
                    <div className="border-3 border-black bg-[#fbfbf8] p-5 shadow-[6px_6px_0px_#000] space-y-4 rounded-none h-56 overflow-y-auto">
                      {dynamicDeadlines.map((item, idx) => {
                        let milestoneIcon = <FileText className="w-4 h-4 text-black stroke-[2.5px]" />
                        if (item.contentType === 'video' || item.contentType === 'live') {
                          milestoneIcon = <Play className="w-3.5 h-3.5 text-black fill-black" />
                        } else if (item.contentType === 'quiz' || item.contentType === 'exam') {
                          milestoneIcon = <HelpCircle className="w-4 h-4 text-black stroke-[2.5px]" />
                        } else if (item.contentType === 'assignment') {
                          milestoneIcon = <ClipboardList className="w-4 h-4 text-black stroke-[2.5px]" />
                        }

                        return (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between border-2 border-black bg-white p-3 shadow-[3px_3px_0px_#000] rounded-none hover:-translate-y-0.5 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-8 h-8 border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000] ${item.color}`}>
                                {milestoneIcon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-0.5">MILESTONE</p>
                                <h4 className="text-xs font-black uppercase tracking-wide text-black truncate leading-tight" title={item.title}>
                                  {item.title}
                                </h4>
                                <div className="flex items-center gap-1 mt-1 truncate">
                                  <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest leading-none">COURSE:</span>
                                  <span className="text-[9px] font-black text-[#0984e3] uppercase tracking-wide truncate max-w-[120px] leading-none" title={item.courseTitle}>
                                    {item.courseTitle}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <span className={`px-2 py-0.5 border-2 border-black text-[9px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#000] shrink-0 ${
                              item.isOverdue 
                                ? 'bg-[#ff7675] text-white' 
                                : item.daysLeft === 'Due Today'
                                  ? 'bg-[#ffcc00] text-black'
                                  : item.daysLeft === 'Completed'
                                    ? 'bg-[#00ea8c] text-black'
                                    : 'bg-neo-pink/15 text-neo-pink'
                            }`}>
                              {item.daysLeft}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Lower Layout: Browse Grid */}
                <div className="space-y-4">
                  <h2 className="font-heading text-lg uppercase tracking-wider text-black">Browse Available Courses</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredCourses.length === 0 ? (
                      <div className="col-span-full text-center py-8 border-2 border-dashed border-black">
                        <p className="font-sans font-bold text-neutral-400 uppercase">No courses match your search criteria.</p>
                      </div>
                    ) : (
                      filteredCourses.map((course) => {
                        const enrolled = isEnrolled(course.id)
                        const displayCategory = course.category?.replace('Draft|', '') || 'Curriculum'
                        return (
                          <div key={course.id} className="border-3 border-black bg-white shadow-[4px_4px_0px_#000] flex flex-col rounded-none overflow-hidden hover:shadow-[6px_6px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_#000] transition-all">
                            {/* Cover */}
                            <CourseCover category={course.category} title={course.title} icon={course.icon} />
                            
                            {/* Card Body */}
                            <div className="p-4 flex flex-col justify-between flex-1 gap-4">
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <span className={`px-2 py-0.5 border border-black text-[8px] font-black uppercase shadow-[1px_1px_0px_#000] ${
                                    enrolled
                                      ? 'bg-neo-green text-white'
                                      : 'bg-[#ffcc00] text-black'
                                  }`}>
                                    {enrolled ? 'Enrolled' : 'Available'}
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

                              {/* Footer details row */}
                              <div className="flex items-center justify-between border-t-2 border-black/10 pt-3">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                                  <span>{course.difficulty || 'Beginner'}</span>
                                </div>
                                
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleOpenCourse(course)}
                                    className="px-2.5 py-1.5 border border-black bg-white hover:bg-neutral-50 font-bold uppercase text-[9px] cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all rounded-none"
                                  >
                                    Details
                                  </button>
                                  {!enrolled && (
                                    <button
                                      onClick={() => handleEnroll(course.id)}
                                      className="px-3 py-1.5 border border-black bg-[#ffcc00] hover:bg-[#ffcc00]/90 font-bold uppercase text-[9px] cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all rounded-none"
                                    >
                                      Enroll
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : activeTab === 'certificates' ? (
              /* Certificates tab view */
              <div className="flex flex-col xl:flex-row gap-8 animate-fade-in items-start w-full">
                {/* Left side: certificates cards list */}
                <div className="flex-1 flex flex-col gap-6 w-full">
                  {/* Filter tabs and sort row */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b-2 border-black w-full">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveCertFilter('all')}
                        className={`px-3 py-1.5 font-sans font-bold text-xs uppercase tracking-wider border-2 border-black transition-all cursor-pointer rounded-none ${
                          activeCertFilter === 'all'
                            ? 'bg-black text-white shadow-none'
                            : 'bg-white text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
                        }`}
                      >
                        All Certificates
                      </button>
                      <button
                        onClick={() => setActiveCertFilter('completed')}
                        className={`px-3 py-1.5 font-sans font-bold text-xs uppercase tracking-wider border-2 border-black transition-all cursor-pointer flex items-center gap-2 rounded-none ${
                          activeCertFilter === 'completed'
                            ? 'bg-black text-white shadow-none'
                            : 'bg-white text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
                        }`}
                      >
                        Completed
                        <span className="bg-[#00ea8c] text-black border border-black text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                          {enrollments.filter(e => e.progress === 100).length}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveCertFilter('in-progress')}
                        className={`px-3 py-1.5 font-sans font-bold text-xs uppercase tracking-wider border-2 border-black transition-all cursor-pointer flex items-center gap-2 rounded-none ${
                          activeCertFilter === 'in-progress'
                            ? 'bg-black text-white shadow-none'
                            : 'bg-white text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
                        }`}
                      >
                        In Progress
                        <span className="bg-[#ffcc00] text-black border border-black text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                          {enrollments.filter(e => e.progress < 100).length}
                        </span>
                      </button>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2 font-bold text-xs uppercase text-black">
                      <span>Sort by:</span>
                      <select className="px-3 py-1.5 border-2 border-black bg-white font-bold text-xs uppercase tracking-wide focus:outline-none rounded-none cursor-pointer">
                        <option>Recently Earned</option>
                        <option>Oldest Earned</option>
                      </select>
                    </div>
                  </div>

                  {/* Certificates List grid */}
                  <div className="space-y-6">
                    {(() => {
                      const displayedCerts = enrollments.filter(e => {
                        if (activeCertFilter === 'completed') return e.progress === 100
                        if (activeCertFilter === 'in-progress') return e.progress < 100
                        return true
                      })

                      if (displayedCerts.length === 0) {
                        return (
                          <div className="border-3 border-black border-dashed p-10 text-center uppercase font-bold text-neutral-400">
                            No certificates matched the filter. Complete courses to earn credentials!
                          </div>
                        )
                      }

                      return (
                        <>
                          {displayedCerts.map((cert) => {
                            const isCompleted = cert.progress === 100
                            const certId = `LRNX-${(cert.courses?.category || 'GN').substring(0, 2).toUpperCase()}-${cert.id.substring(0, 8).toUpperCase()}`
                            const issuedDateStr = new Date(cert.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })

                            // Badges mapping:
                            let badgeSrc = '/badges/development.png'
                            const cat = cert.courses?.category?.replace('Draft|', '')
                            if (cat === 'Data Science') badgeSrc = '/badges/data-science.png'
                            else if (cat === 'Design') badgeSrc = '/badges/design.png'
                            else if (cat === 'Marketing') badgeSrc = '/badges/marketing.png'

                            return (
                              <div
                                key={cert.id}
                                className="border-3 border-black bg-white shadow-[6px_6px_0px_#000] grid grid-cols-1 md:grid-cols-12 rounded-none overflow-hidden"
                              >
                                {/* Left Badge Container */}
                                <div className={`md:col-span-3 border-b-3 md:border-b-0 md:border-r-3 border-black p-6 flex items-center justify-center relative min-h-[140px] overflow-hidden`}>
                                  {/* Neo-brutalist Background Pattern SVG matching CourseCover */}
                                  <div className="absolute inset-0 z-0">
                                    {cat === 'Data Science' && (
                                      <div className="w-full h-full bg-neo-green relative">
                                        <svg className="w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                                          <defs>
                                            <pattern id="ds-grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                                              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="black" strokeWidth="1" />
                                            </pattern>
                                          </defs>
                                          <rect width="100%" height="100%" fill="url(#ds-grid-pattern)" />
                                        </svg>
                                      </div>
                                    )}
                                    {cat === 'Design' && (
                                      <div className="w-full h-full bg-[#74b9ff] relative">
                                        <svg className="w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg">
                                          <defs>
                                            <pattern id="design-grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                                              <circle cx="1.5" cy="1.5" r="1" fill="black" />
                                            </pattern>
                                          </defs>
                                          <rect width="100%" height="100%" fill="url(#design-grid-pattern)" />
                                        </svg>
                                      </div>
                                    )}
                                    {cat === 'Marketing' && (
                                      <div className="w-full h-full bg-[#ffcc00] relative">
                                        <svg className="w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                                          <defs>
                                            <pattern id="marketing-grid-pattern" width="12" height="12" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                                              <line x1="0" y1="0" x2="0" y2="12" stroke="black" strokeWidth="1.5" />
                                            </pattern>
                                          </defs>
                                          <rect width="100%" height="100%" fill="url(#marketing-grid-pattern)" />
                                        </svg>
                                      </div>
                                    )}
                                    {cat !== 'Data Science' && cat !== 'Design' && cat !== 'Marketing' && (
                                      <div className="w-full h-full bg-[#ff7675] relative">
                                        <svg className="w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                                          <defs>
                                            <pattern id="dev-grid-pattern" width="12" height="12" patternUnits="userSpaceOnUse">
                                              <path d="M 12 0 L 0 0 0 12" fill="none" stroke="black" strokeWidth="1" />
                                            </pattern>
                                          </defs>
                                          <rect width="100%" height="100%" fill="url(#dev-grid-pattern)" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <img
                                    src={badgeSrc}
                                    alt={`${cat} Badge`}
                                    className="w-28 h-28 object-contain z-10 transition-transform duration-300 hover:scale-105"
                                  />
                                </div>

                                {/* Middle Details Container */}
                                <div className="md:col-span-6 p-6 flex flex-col justify-between bg-[#fbfbf8] border-b-3 md:border-b-0 md:border-r-3 border-black">
                                  <div className="space-y-2">
                                    <span className={`px-2 py-0.5 border border-black text-[8px] font-black uppercase tracking-wider ${
                                      isCompleted ? 'bg-neo-green text-black' : 'bg-neo-yellow text-black'
                                    }`}>
                                      {isCompleted ? 'Completed' : 'In Progress'}
                                    </span>
                                    <h3 className="font-heading text-lg font-black uppercase tracking-wider text-black leading-tight truncate">
                                      {cert.courses?.title}
                                    </h3>
                                    {isCompleted ? (
                                      <p className="text-[10px] font-bold text-neutral-400 uppercase">
                                        Issued on: {issuedDateStr} • Certificate ID: {certId}
                                      </p>
                                    ) : (
                                      <p className="text-[10px] font-bold text-neutral-400 uppercase">
                                        Keep going, you're almost there!
                                      </p>
                                    )}
                                    <p className="text-xs font-semibold text-neutral-600 line-clamp-2 mt-1">
                                      {isCompleted 
                                        ? `Successfully completed all requirements for ${cert.courses?.title}.`
                                        : `Currently working on milestones. Progress is at ${cert.progress}%.`
                                      }
                                    </p>
                                  </div>

                                  {!isCompleted && (
                                    <div className="pt-3 flex items-center gap-4">
                                      <div className="flex-1 bg-neutral-200 border-3 border-black h-5 shadow-[2px_2px_0px_#000] relative">
                                        <div className="bg-[#ff4d4d] h-full border-r-3 border-black" style={{ width: `${cert.progress}%` }}></div>
                                      </div>
                                      <span className="text-xs font-black text-black shrink-0">{cert.progress}%</span>
                                    </div>
                                  )}
                                </div>

                                {/* Right Actions Container */}
                                <div className="md:col-span-3 p-4 flex flex-col justify-center gap-3 bg-white">
                                  {isCompleted ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedCertCourse(cert)
                                          setTimeout(() => window.print(), 350)
                                        }}
                                        className="w-full py-2.5 border-3 border-black bg-neo-yellow text-black shadow-[3px_3px_0px_#000] font-heading text-[10px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:-translate-y-0.5 transition-all cursor-pointer rounded-none flex items-center justify-center gap-2 whitespace-nowrap"
                                      >
                                        <Download className="w-3.5 h-3.5 text-black stroke-[3px]" />
                                        <span>Download PDF</span>
                                      </button>
                                      <button
                                        onClick={() => setSelectedCertCourse(cert)}
                                        className="w-full py-2.5 border-3 border-black bg-white text-black shadow-[3px_3px_0px_#000] font-heading text-[10px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:-translate-y-0.5 transition-all cursor-pointer rounded-none flex items-center justify-center gap-2 whitespace-nowrap"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-black stroke-[3px]" />
                                        <span>View Certificate</span>
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenCourse(cert.courses)}
                                      className="w-full py-3 border-3 border-black bg-white text-black font-heading text-[10px] uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:-translate-y-0.5 transition-all cursor-pointer rounded-none whitespace-nowrap"
                                    >
                                      Continue Course
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}

                          {/* Info Alert Footer Banner */}
                          <div className="w-full p-4 border-2 border-black bg-[#e3f2fd] text-xs font-bold text-[#0984e3] flex items-center gap-3 rounded-none shadow-[2px_2px_0px_#000] mt-8 uppercase tracking-wide">
                            <HelpCircle className="w-5 h-5 text-[#0984e3] stroke-[3px]" />
                            <span>Certificates are automatically generated when you complete all course requirements.</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Right side achievements & shares block */}
                <div className="w-full xl:w-80 flex flex-col gap-6 shrink-0">
                  {/* Your Achievement stats */}
                  <div className="border-3 border-black bg-white p-5 shadow-[4px_4px_0px_#000] rounded-none">
                    <h3 className="font-heading text-sm uppercase tracking-wider text-black border-b-2 border-black pb-2 mb-4">Your Achievement</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 border-2 border-black bg-[#ffcc00] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000] rounded-none">
                          <FaAward className="w-6 h-6 text-black" />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-black leading-none">{enrollments.filter(e => e.progress === 100).length}</p>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase">Certificates Earned</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 border-2 border-black bg-[#00ea8c] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000] rounded-none">
                          <FaGraduationCap className="w-6 h-6 text-black" />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-black leading-none">{enrollments.filter(e => e.progress === 100).length}</p>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase">Courses Completed</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 border-2 border-black bg-[#74b9ff] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000] rounded-none">
                          <FaClock className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-black leading-none">
                            {enrollments.filter(e => e.progress === 100).reduce((acc, curr) => acc + (curr.completed_milestones?.length || 0), 0) * 1.5}
                          </p>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase">Learning Hours</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 border-2 border-black bg-[#ff7675] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000] rounded-none">
                          <FaChartLine className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-black leading-none">
                            {(enrollments.reduce((acc, curr) => acc + (curr.completed_milestones?.length || 0), 0) * 100) + (enrollments.filter(e => e.progress === 100).length * 500)}
                          </p>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase">XP Points Earned</span>
                        </div>
                      </div>

                      <button className="w-full py-3 mt-4 border-2 border-black bg-white text-black font-heading text-xs uppercase shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none hover:-translate-y-0.5 transition-all cursor-pointer rounded-none flex items-center justify-between px-4">
                        <span>View Achievements</span>
                        <span>➔</span>
                      </button>
                    </div>
                  </div>

                  {/* LinkedIn Share card */}
                  <div className="border-3 border-black bg-white p-5 shadow-[4px_4px_0px_#000] rounded-none flex flex-col gap-4">
                    <h3 className="font-heading text-xs uppercase tracking-wider text-black border-b-2 border-black pb-2">Share Your Achievement</h3>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase leading-relaxed">
                      Showcase your skills and accomplishments on your professional profile.
                    </p>
                    
                    {/* Browser UI illustration card */}
                    <div className="border-2 border-black p-4 bg-[#fcfcf9] relative overflow-hidden shadow-[inset_0px_0px_10px_rgba(0,0,0,0.05)] h-32 flex flex-col justify-between">
                      {/* Top browser bar */}
                      <div className="flex items-center gap-1 border-b-2 border-black pb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 border border-black"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 border border-black"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 border border-black"></span>
                      </div>
                      {/* Center content profile mock */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border-2 border-black rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-[#74b9ff] border border-black"></div>
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="w-20 h-2 bg-black"></div>
                          <div className="w-12 h-1.5 bg-neutral-200 border border-black"></div>
                        </div>
                        {/* Green badge seal */}
                        <div className="w-8 h-8 rounded-full bg-neo-green border-2 border-black flex items-center justify-center font-bold text-xs shrink-0 shadow-[1.5px_1.5px_0px_#000] rotate-12">
                          ✓
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => triggerNotification('Redirecting to LinkedIn share portal...')}
                      className="w-full py-3 border-2 border-black bg-[#ffcc00] text-black font-heading text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:-translate-y-0.5 transition-all cursor-pointer rounded-none flex items-center justify-center gap-2"
                    >
                      <span className="px-1 bg-black text-white text-[10px] font-black rounded-none">in</span>
                      <span>Share on LinkedIn</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : activeTab === 'my-courses' ? (
              /* My Enrolled Courses list with advanced filters and stats layout */
              <div className="flex flex-col xl:flex-row gap-8 animate-fade-in items-start">
                
                {/* Left side: filter tabs row & course card grid */}
                <div className="flex-1 flex flex-col gap-6 w-full">
                  
                  {/* Filter tabs & Sort row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b-2 border-black">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedFilter('all')}
                        className={`px-3 py-1.5 font-sans font-bold text-xs uppercase tracking-wider border-2 border-black transition-all cursor-pointer rounded-none ${
                          selectedFilter === 'all'
                            ? 'bg-black text-white shadow-none'
                            : 'bg-white text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
                        }`}
                      >
                        All Courses
                      </button>
                      <button
                        onClick={() => setSelectedFilter('in-progress')}
                        className={`px-3 py-1.5 font-sans font-bold text-xs uppercase tracking-wider border-2 border-black transition-all cursor-pointer flex items-center gap-2 rounded-none ${
                          selectedFilter === 'in-progress'
                            ? 'bg-black text-white shadow-none'
                            : 'bg-white text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
                        }`}
                      >
                        <span>In Progress</span>
                        <span className="bg-[#ffcc00] text-black border border-black text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                          {enrollments.filter(e => e.progress > 0 && e.progress < 100).length}
                        </span>
                      </button>
                      <button
                        onClick={() => setSelectedFilter('completed')}
                        className={`px-3 py-1.5 font-sans font-bold text-xs uppercase tracking-wider border-2 border-black transition-all cursor-pointer flex items-center gap-2 rounded-none ${
                          selectedFilter === 'completed'
                            ? 'bg-black text-white shadow-none'
                            : 'bg-white text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
                        }`}
                      >
                        <span>Completed</span>
                        <span className="bg-neo-green text-white border border-black text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                          {enrollments.filter(e => e.progress === 100).length}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-500 uppercase">Sort by:</span>
                      <select className="px-3 py-1.5 border-2 border-black bg-white font-bold text-xs uppercase cursor-pointer focus:outline-none rounded-none">
                        <option>Recently Accessed</option>
                        <option>Alphabetical</option>
                        <option>Progress</option>
                      </select>
                    </div>
                  </div>

                  {/* Cards Grid */}
                  {filteredEnrollments.length === 0 ? (
                    <div className="text-center py-16 border-[3px] border-dashed border-black bg-white">
                      <p className="font-sans font-black text-neutral-400 uppercase text-xs">No courses matching selected filters.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredEnrollments.map((enroll) => {
                        const duration = enroll.courses?.title.includes('Bootcamp') ? '24h 15m' : enroll.courses?.title.includes('Essentials') ? '12h 30m' : enroll.courses?.title.includes('Fundamentals') ? '8h 15m' : '15h 45m'
                        return (
                          <div key={enroll.id} className="border-3 border-black bg-white shadow-[4px_4px_0px_#000] flex flex-col rounded-none overflow-hidden hover:shadow-[6px_6px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_#000] transition-all">
                            {/* Cover */}
                            <CourseCover category={enroll.courses?.category} title={enroll.courses?.title} icon={enroll.courses?.icon} />
                            
                            {/* Card Body */}
                            <div className="p-4 flex flex-col justify-between flex-1 gap-4">
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <span className={`px-2 py-0.5 border border-black text-[8px] font-black uppercase shadow-[1px_1px_0px_#000] ${
                                    enroll.progress === 100
                                      ? 'bg-neo-green text-white'
                                      : enroll.progress === 0
                                      ? 'bg-neutral-100 text-neutral-400 border-neutral-300 shadow-none'
                                      : 'bg-neo-orange text-black'
                                  }`}>
                                    {enroll.progress === 100 ? 'Completed' : enroll.progress === 0 ? 'Not Started' : 'In Progress'}
                                  </span>
                                </div>
                                
                                <h4 className="font-heading text-sm uppercase tracking-wider text-black leading-tight mb-1 truncate">
                                  {enroll.courses?.title}
                                </h4>
                                <p className="text-[10px] text-neutral-500 font-semibold uppercase line-clamp-2">
                                  {enroll.courses?.description || 'Learn the fundamentals of this course and track progress.'}
                                </p>
                              </div>

                              {/* Progress bar */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-black">
                                  <span>Progress</span>
                                  <span>{enroll.progress}% Complete</span>
                                </div>
                                <div className="w-full bg-neutral-200 border-2 border-black h-3 shadow-[1.5px_1.5px_0px_#000] rounded-none">
                                  <div className="bg-neo-green h-full border-r-2 border-black" style={{ width: `${enroll.progress}%` }}></div>
                                </div>
                              </div>

                              {/* Footer details row */}
                              <div className="flex items-center justify-between border-t-2 border-black/10 pt-3">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 uppercase">
                                  <Clock className="w-3.5 h-3.5 stroke-[2.5px]" />
                                  <span>{duration}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                                  <span>{enroll.courses?.difficulty || 'Beginner'}</span>
                                </div>
                                
                                <button
                                  onClick={() => handleOpenCourse(enroll.courses)}
                                  className="px-2.5 py-1 border border-black bg-white hover:bg-neutral-50 font-bold uppercase text-[9px] cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all rounded-none"
                                >
                                  Open
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Load More Button */}
                  <div className="flex justify-center mt-4">
                    <button className="flex items-center justify-center gap-2 px-6 py-2.5 border-[2.5px] border-black bg-white hover:bg-neutral-50 font-heading text-xs uppercase tracking-wider text-black shadow-[3px_3px_0px_#000] hover:shadow-[4.5px_4.5px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer rounded-none">
                      <span>Load More Courses</span>
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </button>
                  </div>
                </div>

                {/* Right side: Learning Overview & Filters sidebar (width matching design) */}
                <div className="w-full xl:w-[280px] shrink-0 space-y-6 flex flex-col">
                  
                  {/* Learning Overview Card */}
                  <div className="border-3 border-black bg-[#fcfcf9] p-5 shadow-[4px_4px_0px_#000] rounded-none">
                    <h3 className="font-heading text-xs uppercase tracking-wider text-black border-b-2 border-black pb-2 mb-4">Learning Overview</h3>
                    
                    {/* Circle chart */}
                    <div className="relative w-28 h-28 mx-auto flex items-center justify-center mb-6">
                      <svg className="w-full h-full transform -rotate-95" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e6e6e2" strokeWidth="3" />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="none"
                          stroke="#2ecc71"
                          strokeWidth="3.5"
                          strokeDasharray={`${enrollments.length > 0 ? Math.round(enrollments.reduce((acc, curr) => acc + curr.progress, 0) / enrollments.length) : 0} 100`}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-lg font-black leading-none">{enrollments.length > 0 ? Math.round(enrollments.reduce((acc, curr) => acc + curr.progress, 0) / enrollments.length) : 0}%</span>
                        <span className="text-[7px] font-black uppercase text-neutral-400 mt-0.5">Overall</span>
                      </div>
                    </div>

                    {/* Legendary list */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-black uppercase">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-neo-green border border-black"></span>
                          <span>In Progress</span>
                        </div>
                        <span>{enrollments.filter(e => e.progress > 0 && e.progress < 100).length}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-black uppercase">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-neo-blue border border-black"></span>
                          <span>Completed</span>
                        </div>
                        <span>{enrollments.filter(e => e.progress === 100).length}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-black uppercase">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#f4d03f] border border-black"></span>
                          <span>Not Started</span>
                        </div>
                        <span>{enrollments.filter(e => e.progress === 0).length}</span>
                      </div>
                      <div className="border-t border-black/15 pt-2.5 mt-2 flex items-center justify-between text-xs font-black text-black uppercase">
                        <span>Total Courses</span>
                        <span>{enrollments.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Categories Card */}
                  <div className="border-3 border-black bg-white p-5 shadow-[4px_4px_0px_#000] rounded-none">
                    <h3 className="font-heading text-xs uppercase tracking-wider text-black border-b-2 border-black pb-2 mb-4">Categories</h3>
                    <div className="space-y-2 text-xs font-bold uppercase text-black">
                      {[
                        { name: 'Data Science', count: courses.filter(c => c.category?.replace('Draft|', '') === 'Data Science').length },
                        { name: 'Design', count: courses.filter(c => c.category?.replace('Draft|', '') === 'Design').length },
                        { name: 'Marketing', count: courses.filter(c => c.category?.replace('Draft|', '') === 'Marketing').length },
                        { name: 'Development', count: courses.filter(c => c.category?.replace('Draft|', '') === 'Development').length },
                      ].map((cat, i) => (
                        <div key={i} className="flex justify-between items-center py-1 hover:text-[#ffcc00] cursor-pointer">
                          <span>{cat.name}</span>
                          <span className="text-neutral-400 font-extrabold">{cat.count}</span>
                        </div>
                      ))}
                      <div className="border-t border-black/10 pt-2 mt-2 flex justify-between items-center text-[10px] font-black uppercase tracking-wider cursor-pointer hover:underline">
                        <span>View all categories</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Filters Card */}
                  <div className="border-3 border-black bg-white p-5 shadow-[4px_4px_0px_#000] rounded-none space-y-4">
                    <h3 className="font-heading text-xs uppercase tracking-wider text-black border-b-2 border-black pb-2">Filters</h3>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-neutral-400">Difficulty</label>
                      <select
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-black bg-white font-bold text-xs uppercase tracking-wide focus:outline-none rounded-none cursor-pointer"
                      >
                        <option value="all">All Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDifficulty('all')
                        setSelectedFilter('all')
                        setSearchQuery('')
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 border-2 border-black bg-white hover:bg-neutral-50 text-black shadow-[2px_2px_0px_#000] font-heading text-[10px] uppercase tracking-wider active:translate-y-0.5 active:shadow-none cursor-pointer rounded-none transition-all"
                    >
                      <svg className="w-3.5 h-3.5 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                      </svg>
                      <span>Clear Filters</span>
                    </button>
                  </div>

                </div>
              </div>
            ) : (
              /* Explore all courses with search */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {filteredCourses.map((course) => {
                  const enrolled = isEnrolled(course.id)
                  const displayCategory = course.category?.replace('Draft|', '') || 'Curriculum'
                  return (
                    <div key={course.id} className="border-3 border-black bg-white shadow-[4px_4px_0px_#000] flex flex-col rounded-none overflow-hidden hover:shadow-[6px_6px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_#000] transition-all">
                      {/* Cover */}
                      <CourseCover category={course.category} title={course.title} icon={course.icon} />
                      
                      {/* Card Body */}
                      <div className="p-4 flex flex-col justify-between flex-1 gap-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`px-2 py-0.5 border border-black text-[8px] font-black uppercase shadow-[1px_1px_0px_#000] ${
                              enrolled
                                ? 'bg-neo-green text-white'
                                : 'bg-[#ffcc00] text-black'
                            }`}>
                              {enrolled ? 'Enrolled' : 'Available'}
                            </span>
                            <span className="text-[9px] font-bold text-neutral-400 uppercase">{displayCategory}</span>
                          </div>
                          
                          <h4 className="font-heading text-sm uppercase tracking-wider text-black leading-tight mb-1 truncate">
                            {course.title}
                          </h4>
                          <p className="text-[10px] text-neutral-500 font-semibold uppercase line-clamp-2">
                            {course.description || 'Explore the syllabus and milestones for this course and begin learning.'}
                          </p>
                        </div>

                        {/* Footer details row */}
                        <div className="flex items-center justify-between border-t-2 border-black/10 pt-3">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                            <span>{course.difficulty || 'Beginner'}</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenCourse(course)}
                              className="px-2.5 py-1.5 border border-black bg-white hover:bg-neutral-50 font-bold uppercase text-[9px] cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all rounded-none"
                            >
                              Details
                            </button>
                            {!enrolled && (
                              <button
                                onClick={() => handleEnroll(course.id)}
                                className="px-3 py-1.5 border border-black bg-[#ffcc00] hover:bg-[#ffcc00]/90 font-bold uppercase text-[9px] cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all rounded-none"
                              >
                                Enroll
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Certificate Modal Popup */}
      {selectedCertCourse && (() => {
        const cat = selectedCertCourse.courses?.category?.replace('Draft|', '') || 'Curriculum'
        const certId = `LRNX-${(selectedCertCourse.courses?.category || 'GN').substring(0, 2).toUpperCase()}-${selectedCertCourse.id.substring(0, 8).toUpperCase()}`
        const issuedDateStr = new Date(selectedCertCourse.created_at).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })

        // Badges mapping:
        let badgeSrc = '/badges/development.png'
        if (cat === 'Data Science') badgeSrc = '/badges/data-science.png'
        else if (cat === 'Design') badgeSrc = '/badges/design.png'
        else if (cat === 'Marketing') badgeSrc = '/badges/marketing.png'

        // Dynamic theme color
        let themeColorText = 'text-[#00ea8c]'
        if (cat === 'Design') themeColorText = 'text-[#74b9ff]'
        else if (cat === 'Marketing') themeColorText = 'text-[#ffcc00]'
        else if (cat === 'Development') themeColorText = 'text-[#ff7675]'

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fade-in print:p-0">
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-certificate-area, #printable-certificate-area * {
                  visibility: visible;
                }
                #printable-certificate-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 297mm;
                  height: 210mm;
                  margin: 0;
                  padding: 24px;
                  border: 4px solid black !important;
                  box-shadow: none !important;
                  background-color: #fcfcf9 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}} />
            
            <div 
              className="border-[4px] border-black shadow-[8px_8px_0px_#000] w-full max-w-4xl h-[560px] relative flex flex-row z-[1000] rounded-none print:w-[297mm] print:h-[210mm] print:border-[4px] print:shadow-none bg-[#fcfcf9] overflow-hidden" 
              id="printable-certificate-area"
            >
              {/* Main Left-Aligned Text Content Panel */}
              <div className="w-[68%] p-8 flex flex-col justify-between relative z-10 h-full">
                
                {/* Top Left Logo Header */}
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-9 flex-shrink-0">
                    <div className="absolute left-0 top-0 w-2 h-full bg-[#ff4d4d] border-2 border-black z-10 shadow-[0.5px_0.5px_0px_#000]"></div>
                    <div className="absolute left-1.5 top-0 w-5.5 h-full bg-[#ffcc00] border-y-2 border-r-2 border-black flex items-center justify-center shadow-[0.5px_0.5px_0px_#000]">
                      <div className="w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] border-l-black ml-0.5"></div>
                    </div>
                  </div>
                  <div>
                    <h2 className="font-heading text-base tracking-wider text-black uppercase leading-none">LEARNIX</h2>
                    <p className="text-[7px] font-black text-neutral-400 uppercase tracking-widest leading-none mt-0.5">LEARN. GROW. ACHIEVE.</p>
                  </div>
                </div>

                {/* Certificate Title */}
                <div className="space-y-1">
                  <h1 className="font-heading text-3xl sm:text-4xl font-black uppercase text-black tracking-wide leading-none select-text">
                    CERTIFICATE
                  </h1>
                  <h2 className="font-heading text-lg sm:text-xl font-black uppercase text-neo-green tracking-wider leading-none select-text">
                    OF COMPLETION
                  </h2>
                  <div className="w-24 border-b-[2.5px] border-black pt-1"></div>
                </div>

                {/* Certify statement & Name Section */}
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">THIS IS TO CERTIFY THAT</p>
                  <div className="inline-block relative">
                    <span className="absolute bottom-1 left-0 w-full h-3 bg-[#ffcc00] z-0"></span>
                    <h2 className="text-3xl font-heading font-black text-black tracking-wider uppercase relative z-10 px-1 select-text">
                      {studentName}
                    </h2>
                  </div>
                </div>

                {/* Course Completion Details */}
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">has successfully completed the course</p>
                  <h3 className={`text-xl font-heading font-black tracking-wide uppercase select-text ${themeColorText}`}>
                    {selectedCertCourse.courses?.title}
                  </h3>
                  <p className="text-[9px] font-semibold text-neutral-500 max-w-sm uppercase tracking-wide leading-relaxed select-text">
                    and has demonstrated expertise in the fundamental concepts of {cat.toLowerCase()} and curriculum syllabus.
                  </p>
                </div>

                {/* Dynamic Metadata Attributes */}
                <div className="flex items-center gap-6 border-t-2 border-dashed border-black/20 pt-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4.5 h-4.5 text-neutral-600 stroke-[2.5px]" />
                    <div>
                      <p className="text-[10px] font-black text-black leading-none select-text">{issuedDateStr}</p>
                      <span className="text-[7px] font-bold text-neutral-400 uppercase">DATE OF COMPLETION</span>
                    </div>
                  </div>
                  <div className="h-6 border-l border-neutral-300"></div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4.5 h-4.5 text-neutral-600 stroke-[2.5px]" />
                    <div>
                      <p className="text-[10px] font-black text-black leading-none select-text">12h 30m</p>
                      <span className="text-[7px] font-bold text-neutral-400 uppercase">COURSE DURATION</span>
                    </div>
                  </div>
                  <div className="h-6 border-l border-neutral-300"></div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4.5 h-4.5 text-neutral-600 stroke-[2.5px]" />
                    <div>
                      <p className="text-[10px] font-black text-black leading-none select-text">{certId}</p>
                      <span className="text-[7px] font-bold text-neutral-400 uppercase">CERTIFICATE ID</span>
                    </div>
                  </div>
                </div>

                {/* Signatures & Seal stamp */}
                <div className="flex items-end justify-between pr-4 mt-2">
                  <div className="text-center">
                    <p className="font-mono text-xs italic text-neutral-700 select-text">Sarah Mitchell</p>
                    <div className="w-20 border-t-2 border-black my-1"></div>
                    <p className="text-[8px] font-black text-black uppercase select-text">Sarah Mitchell</p>
                    <p className="text-[7px] font-bold text-neutral-400 uppercase">Head of Learning</p>
                  </div>

                  {/* Circular seal stamp */}
                  <div className="w-14 h-14 rounded-full border-[2.5px] border-black bg-white flex items-center justify-center relative shrink-0 shadow-[2px_2px_0px_#000]">
                    <div className="w-12 h-12 rounded-full border border-black border-dashed flex flex-col items-center justify-center">
                      <span className="text-[6px] font-black text-black uppercase tracking-wider text-center leading-none">LEARNIX</span>
                      <span className="text-[4px] font-bold text-neutral-400 uppercase text-center leading-none mt-0.5">EST. 2026</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="font-mono text-xs italic text-neutral-700 select-text">Michael Anderson</p>
                    <div className="w-20 border-t-2 border-black my-1"></div>
                    <p className="text-[8px] font-black text-black uppercase select-text">Michael Anderson</p>
                    <p className="text-[7px] font-bold text-neutral-400 uppercase">CEO, Learnix</p>
                  </div>
                </div>

                {/* Verification footer label */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 border-2 border-black bg-white shadow-[2px_2px_0px_#000] text-[8px] font-black text-black uppercase rounded-none max-w-max mt-2">
                  <Award className="w-3.5 h-3.5 text-neo-green stroke-[3px]" />
                  <span>Verify this certificate at: <span className="text-neo-green underline select-text">learnix.com/verify</span></span>
                </div>

                {/* Bottom Left Corner CSS Shapes Overlay */}
                <div className="absolute bottom-0 left-0 w-32 h-16 pointer-events-none z-0">
                  <div className="absolute bottom-0 left-0 w-16 h-16 rounded-tr-full bg-neo-green/10 border-t border-r border-black/10"></div>
                </div>
              </div>

              {/* Stacked Neo-Brutalist Geometric Collage Panel (Right 32%) */}
              <div className="w-[32%] border-l-3 border-black bg-white h-full relative overflow-hidden shrink-0 flex flex-col justify-between">
                {/* Shape 1: Top Yellow block */}
                <div className="h-12 bg-[#ffcc00] border-b-3 border-black flex-shrink-0"></div>
                
                {/* Shape 2: Half circles and patterns row */}
                <div className="flex h-16 border-b-3 border-black flex-shrink-0">
                  <div className="w-1/2 h-full bg-[#00ea8c] border-r-3 border-black relative">
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(#000_1.5px,transparent_1.5px)] [background-size:6px_6px] opacity-35"></div>
                  </div>
                  <div className="w-1/2 h-full bg-[#ff7675] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-8 h-8 rounded-full bg-white border border-black -translate-x-3 -translate-y-3"></div>
                  </div>
                </div>

                {/* Shape 3: Blue grid block */}
                <div className="h-28 bg-[#0984e3] border-b-3 border-black flex-shrink-0 relative">
                  <div className="absolute inset-0 bg-[radial-gradient(#000_2px,transparent_2px)] [background-size:8px_8px] opacity-30"></div>
                </div>

                {/* Shape 4: Speckles white pattern block */}
                <div className="h-20 bg-white border-b-3 border-black flex-shrink-0 relative">
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,#000_1px,transparent_1px),linear-gradient(-45deg,#000_1px,transparent_1px)] [background-size:12px_12px] opacity-15"></div>
                </div>

                {/* Shape 5: Yellow sector circular block */}
                <div className="h-20 bg-[#ffcc00] border-b-3 border-black flex-shrink-0 relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-16 h-16 rounded-full bg-white border-3 border-black flex items-center justify-center">
                    <div className="absolute w-12 h-12 rounded-full border border-black border-dashed"></div>
                  </div>
                </div>

                {/* Shape 6: Black background with green triangle */}
                <div className="flex-1 bg-black relative">
                  <div className="absolute bottom-0 left-0 w-0 h-0 border-b-[50px] border-b-[#00ea8c] border-r-[50px] border-r-transparent"></div>
                </div>
              </div>

              {/* Overlapping Floating badge circular stamp (directly rounded-full) */}
              <img
                src={badgeSrc}
                alt="Badge Stamp"
                className="absolute top-8 right-[24%] w-32 h-32 object-contain z-20 rounded-full border-3 border-black bg-white shadow-[4px_4px_0px_#000] p-1.5"
              />
              {/* Green ribbon tail hanging behind the badge circle */}
              <div className="absolute top-[135px] right-[28%] w-12 h-14 bg-[#00ea8c] border-3 border-black [clip-path:polygon(0%_0%,100%_0%,100%_100%,50%_75%,0%_100%)] z-10 shadow-[2px_2px_0px_#000]"></div>

              {/* Floating controls container (no-print) */}
              <div className="absolute bottom-4 right-4 flex gap-2 z-[110] no-print">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 border-2 border-black bg-neo-yellow text-black font-heading text-xs uppercase shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none hover:-translate-y-0.5 transition-all cursor-pointer rounded-none"
                >
                  🖨️ Print PDF
                </button>
                <button
                  onClick={() => setSelectedCertCourse(null)}
                  className="px-4 py-2 border-2 border-black bg-white text-black font-heading text-xs uppercase shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none hover:-translate-y-0.5 transition-all cursor-pointer rounded-none"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  )
}
