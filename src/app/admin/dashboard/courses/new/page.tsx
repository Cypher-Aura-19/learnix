'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Bell, Plus, Trash2, ChevronDown, ChevronUp, GripVertical, MoreVertical, Play, BookOpen, HelpCircle, FileUp, Paperclip, Video, Check, UploadCloud } from 'lucide-react'
import { createCourseWithMilestones, updateCourseWithMilestones } from '@/utils/admin-actions-extended'
import { createClient } from '@/utils/supabase/client'
import { useModal } from '@/components/ModalProvider'

interface QuizQuestion {
  question: string
  options: string[]
  answer: string
}

interface ContentItem {
  id: string
  title: string
  type: 'video' | 'pdf' | 'slides' | 'quiz' | 'assignment' | 'file' | 'live'
  duration: string // e.g. "12:45" or "10 Questions"
  required: boolean
  content_url: string
  quiz_questions?: QuizQuestion[]
  file_name?: string
}

interface MilestoneGroup {
  id: string
  title: string
  expanded: boolean
  items: ContentItem[]
}

function AddCoursePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editCourseId = searchParams ? searchParams.get('id') : null
  const { showAlert } = useModal()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Course Basic Information
  const [courseTitle, setCourseTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')

  // Draft vs Published States
  const [isDraftCourse, setIsDraftCourse] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [thumbnailError, setThumbnailError] = useState<string | null>(null)

  // Milestones Groups state
  const [milestones, setMilestones] = useState<MilestoneGroup[]>([])

  // Track currently selected milestone group to add contents to
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('')

  // Edit item Modal / Form states
  const [editingItem, setEditingItem] = useState<{ mId: string; item: ContentItem; isNew?: boolean } | null>(null)

  useEffect(() => {
    if (editCourseId) {
      const loadCourseData = async () => {
        try {
          const supabase = createClient()
          const { data: course, error: courseErr } = await supabase
            .from('courses')
            .select('*')
            .eq('id', editCourseId)
            .single()

          if (courseErr || !course) {
            showAlert({ title: 'Error', message: 'Error loading course data.', type: 'error' })
            return
          }

          setCourseTitle(course.title)
          setDescription(course.description || '')
          const isDraft = course.category?.startsWith('Draft|')
          setCategory(isDraft ? course.category.replace('Draft|', '') : course.category || '')
          setIsDraftCourse(isDraft)
          
          if (course.icon && (course.icon.startsWith('http') || course.icon.startsWith('/') || course.icon.startsWith('data:'))) {
            setThumbnailUrl(course.icon)
          } else {
            setThumbnailUrl('')
          }

          const { data: dbMilestones, error: milestonesErr } = await supabase
            .from('milestones')
            .select('*')
            .eq('course_id', editCourseId)
            .order('sequence_order', { ascending: true })

          if (!milestonesErr && dbMilestones) {
            const grouped: MilestoneGroup[] = []
            const groupMap = new Map<string, MilestoneGroup>()

            dbMilestones.forEach((m: any) => {
              const groupTitle = m.group_title || 'General'
              let group = groupMap.get(groupTitle)
              if (!group) {
                group = {
                  id: `m-${Math.random()}`,
                  title: groupTitle,
                  expanded: true,
                  items: []
                }
                groupMap.set(groupTitle, group)
                grouped.push(group)
              }

              group.items.push({
                id: m.id,
                title: m.title,
                type: m.content_type as any,
                duration: m.content_type === 'quiz' ? `${m.quiz_questions?.length || 0} Questions` : '10:00',
                required: true,
                content_url: m.content_url || '',
                quiz_questions: m.quiz_questions || undefined
              })
            })

            setMilestones(grouped)
            if (grouped.length > 0) {
              setSelectedMilestoneId(grouped[0].id)
            }
          }
        } catch (e) {
          console.error(e)
          showAlert({ title: 'Error', message: 'Error loading course data.', type: 'error' })
        }
      }

      loadCourseData()
    }
  }, [editCourseId])

  // Helper colors for milestone index badges
  const getBadgeBg = (idx: number) => {
    const colors = ['bg-neo-green', 'bg-neo-blue', 'bg-neo-yellow', 'bg-neo-pink', 'bg-neo-purple']
    return colors[idx % colors.length]
  }

  // Calculation for Course Summary Card
  const totalMilestones = milestones.length
  const totalLessons = milestones.reduce((sum, m) => sum + m.items.filter(i => i.type === 'video' || i.type === 'pdf' || i.type === 'slides' || i.type === 'file' || i.type === 'live').length, 0)
  const totalQuizzes = milestones.reduce((sum, m) => sum + m.items.filter(i => i.type === 'quiz').length, 0)
  const totalAssignments = milestones.reduce((sum, m) => sum + m.items.filter(i => i.type === 'assignment').length, 0)

  // Duration parser for summary
  const getEstimatedDuration = () => {
    let totalMinutes = 0
    milestones.forEach(m => {
      m.items.forEach(i => {
        if (i.duration.includes(':')) {
          const parts = i.duration.split(':')
          totalMinutes += parseInt(parts[0] || '0', 10)
        } else if (i.duration.toLowerCase().includes('min')) {
          totalMinutes += parseInt(i.duration, 10)
        }
      })
    })

    if (totalMinutes === 0) return '0h 00m'
    const hrs = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    return `${hrs}h ${mins}m`
  }

  const detectVideoDuration = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        const mins = Math.floor(video.duration / 60)
        const secs = Math.floor(video.duration % 60)
        resolve(`${mins}:${secs.toString().padStart(2, '0')}`)
      }
      video.onerror = () => {
        resolve("10:00")
      }
      video.src = URL.createObjectURL(file)
    })
  }

  const uploadFile = async (file: File, type: string) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) return data.url
      return null
    } catch (e) {
      console.error(e)
      return null
    }
  }

  // Add a new empty Milestone Group
  const handleAddMilestone = () => {
    const newId = `m-${Date.now()}-${Math.random().toString(36).substring(7)}`
    setMilestones(prev => [
      ...prev,
      {
        id: newId,
        title: 'New Milestone Group',
        expanded: true,
        items: []
      }
    ])
    setSelectedMilestoneId(newId)
  }

  // Delete Milestone Group
  const handleDeleteMilestone = (mId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setMilestones(prev => prev.filter(m => m.id !== mId))
    if (selectedMilestoneId === mId) {
      setSelectedMilestoneId('')
    }
  }

  // Toggle expanding milestone
  const toggleExpand = (mId: string) => {
    setMilestones(prev => prev.map(m => m.id === mId ? { ...m, expanded: !m.expanded } : m))
  }

  // Add content item to currently selected milestone
  const handleAddContent = (type: ContentItem['type']) => {
    if (!selectedMilestoneId) {
      showAlert({ title: 'Select Milestone', message: 'Please select or add a milestone group first (click on it) before adding content.', type: 'warning' })
      return
    }

    const defaultDurations = {
      video: '10:00',
      pdf: '05:00',
      slides: '08:00',
      quiz: '5 Questions',
      assignment: '-',
      file: '-',
      live: '60:00'
    }

    const newItem: ContentItem = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      title: '', // Start empty to let user enter it
      type,
      duration: defaultDurations[type],
      required: true,
      content_url: ''
    }

    if (type === 'quiz') {
      newItem.quiz_questions = [
        { question: '', options: ['', ''], answer: '' }
      ]
    }

    // Immediately open the modal for the new item
    setEditingItem({
      mId: selectedMilestoneId,
      item: newItem,
      isNew: true
    })
  }

  // Delete content item from group
  const handleDeleteContentItem = (mId: string, itemId: string) => {
    setMilestones(prev => prev.map(m => {
      if (m.id === mId) {
        return {
          ...m,
          items: m.items.filter(i => i.id !== itemId)
        }
      }
      return m
    }))
  }

  // Toggle required state
  const toggleRequired = (mId: string, itemId: string) => {
    setMilestones(prev => prev.map(m => {
      if (m.id === mId) {
        return {
          ...m,
          items: m.items.map(i => i.id === itemId ? { ...i, required: !i.required } : i)
        }
      }
      return m
    }))
  }

  // Save changes of edited item from popup/modal
  const saveEditedItem = (mId: string, updatedItem: ContentItem, isNew?: boolean) => {
    if (!updatedItem.title) {
      showAlert({ title: 'Missing Title', message: 'Please enter a title.', type: 'warning' })
      return
    }

    // Auto-set duration info for specific types if not already matching format
    if (updatedItem.type === 'quiz') {
      updatedItem.duration = `${updatedItem.quiz_questions?.length || 0} Questions`
    }

    setMilestones(prev => prev.map(m => {
      if (m.id === mId) {
        const exists = m.items.some(i => i.id === updatedItem.id)
        if (isNew && !exists) {
          return {
            ...m,
            items: [...m.items, updatedItem]
          }
        } else {
          return {
            ...m,
            items: m.items.map(i => i.id === updatedItem.id ? updatedItem : i)
          }
        }
      }
      return m
    }))
    setEditingItem(null)
  }

  // Submit / Publish Course to DB
  const handlePublish = async (asDraft: boolean = false) => {
    setError(null)
    setThumbnailError(null)

    // Form Field Validations
    if (!courseTitle.trim()) {
      setError('Course Title is required.')
      return
    }
    if (!category.trim()) {
      setError('Category is required.')
      return
    }
    if (!description.trim()) {
      setError('Short Description is required.')
      return
    }

    if (milestones.length === 0) {
      setError('Please define at least one milestone group.')
      return
    }

    // Thumbnail error check
    if (thumbnailError) {
      setError('Please resolve course thumbnail upload error before saving.')
      return
    }

    // Flatten all items and assign sequence order and group title
    const flattenedMilestones: any[] = []
    milestones.forEach((mGroup) => {
      mGroup.items.forEach((item) => {
          let defaultUrl = 'https://www.w3schools.com/html/mov_bbb.mp4'
          if (item.type === 'pdf') defaultUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
          if (item.type === 'slides') defaultUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'

          flattenedMilestones.push({
            group_title: mGroup.title,
            title: item.title,
            description: `Group: ${mGroup.title}`,
            content_type: item.type,
            content_url: item.content_url || defaultUrl,
          quiz_questions: item.quiz_questions || null,
          days_left_from_enrollment: 5
        })
      })
    })

    if (flattenedMilestones.length === 0) {
      setError('Please add at least one content item inside your milestone groups.')
      return
    }

    setIsSubmitting(true)
    
    // Prefix category with Draft| if saved as draft
    const finalCategory = asDraft ? `Draft|${category}` : category
    const finalIcon = thumbnailUrl || '📚'

    const courseData = {
      title: courseTitle,
      description,
      category: finalCategory,
      icon: finalIcon,
      difficulty: 'Beginner'
    }

    let res
    if (editCourseId) {
      res = await updateCourseWithMilestones(editCourseId, courseData, flattenedMilestones)
    } else {
      res = await createCourseWithMilestones(courseData, flattenedMilestones)
    }

    setIsSubmitting(false)

    if (res.success) {
      router.push('/admin/dashboard')
    } else {
      setError(res.message || 'An error occurred during saving.')
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-black font-sans flex flex-col">
      {/* Top Navigation Header */}
      <header className="h-20 border-b-[3px] border-black bg-white flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="p-2 border-2 border-black hover:bg-neutral-100 transition-colors cursor-pointer rounded-none"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5px]" />
          </button>
          <div>
            <h1 className="font-heading text-2xl uppercase tracking-wider text-black flex items-center gap-2">
              {editCourseId ? 'Edit Course' : 'Add New Course'}
            </h1>
            <p className="text-xs font-bold text-neutral-500 uppercase mt-0.5">
              {editCourseId ? 'Update course curriculum content and settings' : 'Create a new course and organize it with milestones'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="relative p-2.5 border-2 border-black bg-white cursor-pointer rounded-none">
            <Bell className="w-5 h-5 stroke-[2.5px]" />
            <span className="absolute -top-1 -right-1 bg-[#ff4d4d] text-white text-[9px] font-black border-2 border-black w-4 h-4 flex items-center justify-center rounded-full">
              3
            </span>
          </button>
        </div>
      </header>

      {/* Main Form Content Grid */}
      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0 overflow-y-auto pb-32">
        {/* Left Form Area (Course Info & Milestones list) */}
        <div className="lg:col-span-2 space-y-6">
          
          {error && (
            <div className="border-3 border-black bg-red-50 p-4 font-bold text-xs uppercase text-red-600 shadow-[3px_3px_0px_#000]">
              {error}
            </div>
          )}

          {/* Course Information block */}
          <div className="border-3 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6">
            <h2 className="font-heading text-lg uppercase tracking-wider text-black border-b-2 border-black pb-2">Course Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-neutral-700">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter course title"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full p-3 border-2 border-black bg-white text-black font-semibold text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-neutral-700">Category *</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 pr-10 border-2 border-black bg-white font-bold text-xs focus:outline-none appearance-none rounded-none"
                  >
                    <option value="">Select category</option>
                    <option value="Development">Development</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Business">Business</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-black stroke-[3px]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase text-neutral-700">Short Description *</label>
                <span className="text-[10px] font-bold text-neutral-400">{description.length}/200</span>
              </div>
              <textarea
                required
                maxLength={200}
                rows={3}
                placeholder="Enter a short description about the course"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border-2 border-black bg-white text-black font-semibold text-xs focus:outline-none"
              />
            </div>

            {/* Thumbnail Mock Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-neutral-700">Course Thumbnail *</label>
              <div className="flex gap-4 items-center">
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="Course Thumbnail"
                    className="w-16 h-16 border-2 border-black object-cover shadow-[1.5px_1.5px_0px_#000] shrink-0"
                  />
                )}
                <div className="flex-1">
                  <label className="inline-block px-4 py-2.5 border-2 border-black bg-[#ffcc00] hover:bg-[#ffcc00]/90 text-black font-extrabold text-[10px] uppercase shadow-[1.5px_1.5px_0px_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
                    Select Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setThumbnailError(null)
                          if (file.size > 5000000) {
                            setThumbnailError('Thumbnail upload failed: File too large (max 5MB).')
                            setThumbnailFile(null)
                            setThumbnailUrl('')
                          } else {
                            const uploadedUrl = await uploadFile(file, 'covers')
                            if (uploadedUrl) {
                              setThumbnailFile(file)
                              setThumbnailUrl(uploadedUrl)
                            } else {
                              setThumbnailError('Thumbnail upload failed: Server error.')
                            }
                          }
                        }
                      }}
                    />
                  </label>
                  {thumbnailError && (
                    <span className="text-[10px] text-red-600 font-bold block mt-1">✕ {thumbnailError}</span>
                  )}
                  {thumbnailFile && !thumbnailError && (
                    <span className="text-[10px] text-green-600 font-bold block mt-1">✓ File ready: {thumbnailFile.name}</span>
                  )}
                  
                  {/* Predefined cover templates */}
                  <div className="mt-3">
                    <p className="text-[9px] font-black uppercase text-neutral-400 mb-1.5">Or choose a cover template:</p>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { name: 'Data Science', url: '/course_covers/ds_cover.png' },
                        { name: 'UI/UX Design', url: '/course_covers/ui_cover.png' },
                        { name: 'Marketing', url: '/course_covers/marketing_cover.png' },
                        { name: 'Development', url: '/course_covers/dev_cover.png' },
                        { name: 'Business', url: '/course_covers/business_cover.png' }
                      ].map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setThumbnailUrl(tmpl.url)
                            setThumbnailFile(null)
                            setThumbnailError(null)
                          }}
                          className={`border-2 p-1 transition-all cursor-pointer hover:scale-105 rounded-none bg-white flex flex-col items-center gap-1 ${
                            thumbnailUrl === tmpl.url ? 'border-black bg-neutral-100 shadow-[1.5px_1.5px_0px_#000]' : 'border-black/20 hover:border-black'
                          }`}
                        >
                          <img src={tmpl.url} alt={tmpl.name} className="w-16 h-10 object-cover border border-black/10" />
                          <span className="text-[8px] font-black uppercase tracking-wider">{tmpl.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Milestones Structure block */}
          <div className="border-3 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6">
            <div className="flex justify-between items-center border-b-2 border-black pb-3">
              <div>
                <h2 className="font-heading text-lg uppercase tracking-wider text-black">Milestones (Course Structure)</h2>
                <p className="text-[10px] text-neutral-500 font-bold uppercase mt-0.5">Break your course into milestones and add content to each.</p>
              </div>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="flex items-center gap-1.5 px-4 py-2 border-2 border-black bg-[#ffcc00] text-black font-extrabold text-xs uppercase shadow-[2.5px_2.5px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3px]" />
                Add Milestone
              </button>
            </div>

            {milestones.length === 0 ? (
              <div className="border-2 border-dashed border-neutral-300 p-8 text-center uppercase font-bold text-neutral-400 text-xs">
                No milestone groups defined. Click "+ Add Milestone" above.
              </div>
            ) : (
              <div className="space-y-4">
                {milestones.map((mGroup, mIdx) => {
                  const isSelected = selectedMilestoneId === mGroup.id
                  return (
                    <div
                      key={mGroup.id}
                      onClick={() => setSelectedMilestoneId(mGroup.id)}
                      className={`border-3 border-black transition-all ${
                        isSelected ? 'ring-3 ring-indigo-500' : ''
                      }`}
                    >
                      {/* Milestone Item Header Row */}
                      <div
                        onClick={() => toggleExpand(mGroup.id)}
                        className="bg-[#fcfcf9] p-3 flex items-center justify-between border-b-2 border-black cursor-pointer hover:bg-neutral-50"
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="text-neutral-400 cursor-move shrink-0">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <div className={`w-7 h-7 ${getBadgeBg(mIdx)} text-black border-2 border-black font-heading text-xs flex items-center justify-center shrink-0`}>
                            {mIdx + 1}
                          </div>
                          <input
                            type="text"
                            value={mGroup.title}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const titleVal = e.target.value
                              setMilestones(prev => prev.map(m => m.id === mGroup.id ? { ...m, title: titleVal } : m))
                            }}
                            className="font-heading text-sm uppercase text-black bg-transparent border-b border-transparent focus:border-black focus:outline-none flex-1 truncate"
                          />
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-[10px] font-black uppercase text-neutral-400">{mGroup.items.length} Items</span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteMilestone(mGroup.id, e)}
                            className="p-1.5 border-2 border-black bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {mGroup.expanded ? <ChevronUp className="w-4 h-4 text-black" /> : <ChevronDown className="w-4 h-4 text-black" />}
                        </div>
                      </div>

                      {/* Milestone Items Detail Table List */}
                      {mGroup.expanded && (
                        <div className="bg-white p-4 overflow-x-auto">
                          {mGroup.items.length === 0 ? (
                            <p className="text-[10px] font-bold text-neutral-400 uppercase text-center py-4">No content items added. Use the right sidebar to add content lessons.</p>
                          ) : (
                            <table className="w-full text-left border-collapse min-w-[500px]">
                              <thead>
                                <tr className="border-b border-neutral-200 text-[10px] font-black text-neutral-400 uppercase">
                                  <th className="pb-2 w-10"></th>
                                  <th className="pb-2">Content</th>
                                  <th className="pb-2">Type</th>
                                  <th className="pb-2">Duration</th>
                                  <th className="pb-2 text-center w-20">Required</th>
                                  <th className="pb-2 w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {mGroup.items.map((item, iIdx) => (
                                  <tr key={item.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/50">
                                    <td className="py-2.5">
                                      <GripVertical className="w-4 h-4 text-neutral-300 cursor-move" />
                                    </td>
                                    <td className="py-2.5 font-bold text-xs text-black">
                                      <span
                                        onClick={() => setEditingItem({ mId: mGroup.id, item })}
                                        className="hover:underline cursor-pointer"
                                      >
                                        {item.title}
                                      </span>
                                    </td>
                                    <td className="py-2.5">
                                      <span className="px-2 py-0.5 border border-black bg-neutral-100 text-[9px] font-black uppercase text-neutral-600">
                                        {item.type}
                                      </span>
                                    </td>
                                    <td className="py-2.5 font-bold text-[10px] text-neutral-500">
                                      {item.duration}
                                    </td>
                                    <td className="py-2.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => toggleRequired(mGroup.id, item.id)}
                                        className={`w-5 h-5 border-2 border-black inline-flex items-center justify-center cursor-pointer ${
                                          item.required ? 'bg-neo-green' : 'bg-white'
                                        }`}
                                      >
                                        {item.required && <Check className="w-3.5 h-3.5 text-black stroke-[3px]" />}
                                      </button>
                                    </td>
                                    <td className="py-2.5 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setEditingItem({ mId: mGroup.id, item })}
                                          className="p-1 border border-neutral-300 hover:border-black text-neutral-500 hover:text-black cursor-pointer text-[10px] font-bold uppercase"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteContentItem(mGroup.id, item.id)}
                                          className="p-1 border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Area (Milestone content addition & Summary) */}
        <div className="space-y-6">
          
          {/* Milestone Content block */}
          <div className="border-3 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <h3 className="font-heading text-base uppercase text-black border-b-2 border-black pb-2">Milestone Content</h3>
            <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1">Add content to this milestone</p>
            
            <div className="space-y-2.5">
              {/* Content Picker Buttons */}
              <button
                onClick={() => handleAddContent('video')}
                className="w-full flex items-center justify-between p-2.5 border-2 border-black bg-white hover:bg-neutral-50 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-black bg-neo-blue flex items-center justify-center text-white font-bold rounded-none shrink-0">
                    <Play className="w-4 h-4 fill-white text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black uppercase text-black leading-none mb-0.5">Video</h4>
                    <span className="text-[8px] text-neutral-400 font-bold uppercase">Add a video lesson</span>
                  </div>
                </div>
                <span className="text-xs font-black text-black">+</span>
              </button>

              <button
                onClick={() => handleAddContent('pdf')}
                className="w-full flex items-center justify-between p-2.5 border-2 border-black bg-white hover:bg-neutral-50 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-black bg-neo-green flex items-center justify-center text-white font-bold rounded-none shrink-0">
                    <BookOpen className="w-4 h-4 text-black" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black uppercase text-black leading-none mb-0.5">Reading / Text</h4>
                    <span className="text-[8px] text-neutral-400 font-bold uppercase">Add reading material</span>
                  </div>
                </div>
                <span className="text-xs font-black text-black">+</span>
              </button>

              <button
                onClick={() => handleAddContent('quiz')}
                className="w-full flex items-center justify-between p-2.5 border-2 border-black bg-white hover:bg-neutral-50 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-black bg-neo-pink flex items-center justify-center text-white font-bold rounded-none shrink-0">
                    <HelpCircle className="w-4 h-4 text-black" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black uppercase text-black leading-none mb-0.5">Quiz</h4>
                    <span className="text-[8px] text-neutral-400 font-bold uppercase">Add a quiz</span>
                  </div>
                </div>
                <span className="text-xs font-black text-black">+</span>
              </button>

              <button
                onClick={() => handleAddContent('assignment')}
                className="w-full flex items-center justify-between p-2.5 border-2 border-black bg-white hover:bg-neutral-50 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-black bg-[#ff9f43] flex items-center justify-center text-white font-bold rounded-none shrink-0">
                    <FileUp className="w-4 h-4 text-black" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black uppercase text-black leading-none mb-0.5">Assignment</h4>
                    <span className="text-[8px] text-neutral-400 font-bold uppercase">Add an assignment</span>
                  </div>
                </div>
                <span className="text-xs font-black text-black">+</span>
              </button>

              <button
                onClick={() => handleAddContent('file')}
                className="w-full flex items-center justify-between p-2.5 border-2 border-black bg-white hover:bg-neutral-50 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-black bg-neutral-400 flex items-center justify-center text-white font-bold rounded-none shrink-0">
                    <Paperclip className="w-4 h-4 text-black" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black uppercase text-black leading-none mb-0.5">File / Resource</h4>
                    <span className="text-[8px] text-neutral-400 font-bold uppercase">Add downloadable file</span>
                  </div>
                </div>
                <span className="text-xs font-black text-black">+</span>
              </button>

              <button
                onClick={() => handleAddContent('live')}
                className="w-full flex items-center justify-between p-2.5 border-2 border-black bg-white hover:bg-neutral-50 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-black bg-neo-purple flex items-center justify-center text-white font-bold rounded-none shrink-0">
                    <Video className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black uppercase text-black leading-none mb-0.5">Live Session</h4>
                    <span className="text-[8px] text-neutral-400 font-bold uppercase">Add a live session</span>
                  </div>
                </div>
                <span className="text-xs font-black text-black">+</span>
              </button>
            </div>
          </div>

          {/* Course Summary block */}
          <div className="border-3 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <h3 className="font-heading text-base uppercase text-black border-b-2 border-black pb-2">Course Summary</h3>
            
            <div className="space-y-3 font-sans text-xs uppercase font-extrabold">
              <div className="flex justify-between items-center border-b border-dashed border-black/20 pb-2">
                <span className="text-neutral-500">Total Milestones</span>
                <span className="text-black text-sm">{totalMilestones}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-black/20 pb-2">
                <span className="text-neutral-500">Total Lessons</span>
                <span className="text-black text-sm">{totalLessons}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-black/20 pb-2">
                <span className="text-neutral-500">Total Quizzes</span>
                <span className="text-black text-sm">{totalQuizzes}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-black/20 pb-2">
                <span className="text-neutral-500">Total Assignments</span>
                <span className="text-black text-sm">{totalAssignments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Estimated Duration</span>
                <span className="text-black text-sm">{getEstimatedDuration()}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Editing Content Item Modal Popup */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-[200] animate-fade-in">
          <div className="w-full max-w-lg border-3 border-black bg-white p-6 shadow-[8px_8px_0px_#000] rounded-none relative">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute right-4 top-4 p-1.5 border border-black hover:bg-neutral-100 cursor-pointer"
            >
              ✕
            </button>

            <h3 className="font-heading text-base uppercase tracking-wider text-black mb-6 border-b-2 border-black pb-2">
              Edit Content Item
            </h3>

            <div className="space-y-4 font-sans text-xs">
              <div className="space-y-1">
                <label className="font-black uppercase text-neutral-500">Item Title</label>
                <input
                  type="text"
                  value={editingItem.item.title}
                  placeholder={`Enter ${editingItem.item.type} title`}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, title: e.target.value }
                  })}
                  className="w-full p-2.5 border-2 border-black bg-white text-xs font-semibold focus:outline-none"
                />
              </div>

              {/* VIDEO TYPE FIELDS */}
              {editingItem.item.type === 'video' && (
                <>
                  {!editingItem.item.file_name && (
                    <div className="space-y-1">
                      <label className="font-black uppercase text-neutral-500">Video Duration (e.g. "12:45" or minutes)</label>
                      <input
                        type="text"
                        value={editingItem.item.duration}
                        placeholder="e.g. 15:30"
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          item: { ...editingItem.item, duration: e.target.value }
                        })}
                        className="w-full p-2.5 border-2 border-black bg-white text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="font-black uppercase text-neutral-500">Video Source / Upload File</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingItem.item.content_url}
                        placeholder="Paste video stream URL (YouTube, Vimeo, mp4 etc.)"
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          item: { ...editingItem.item, content_url: e.target.value }
                        })}
                        className="flex-1 p-2.5 border-2 border-black bg-white text-xs font-semibold focus:outline-none"
                      />
                      <label className="px-4 py-2.5 border-2 border-black bg-[#ffcc00] hover:bg-[#ffcc00]/90 text-black font-extrabold text-[10px] uppercase shadow-[1.5px_1.5px_0px_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center shrink-0">
                        Upload Video
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const detected = await detectVideoDuration(file);
                              const uploadedUrl = await uploadFile(file, 'videos') || `/uploads/videos/${file.name}`;
                              setEditingItem({
                                ...editingItem,
                                item: { 
                                  ...editingItem.item, 
                                  content_url: uploadedUrl, 
                                  duration: detected,
                                  file_name: file.name 
                                }
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                    {editingItem.item.file_name && (
                      <span className="text-[10px] text-green-600 font-bold block mt-1">✓ File uploaded: {editingItem.item.file_name} (Auto-detected: {editingItem.item.duration})</span>
                    )}
                  </div>
                </>
              )}

              {/* PDF TYPE FIELDS */}
              {editingItem.item.type === 'pdf' && (
                <>
                  <div className="space-y-1">
                    <label className="font-black uppercase text-neutral-500">PDF File Upload</label>
                    <div className="border-2 border-dashed border-black/45 bg-[#fcfcf9] p-4 text-center cursor-pointer relative hover:bg-neutral-50">
                      <input
                        type="file"
                        accept="application/pdf"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const sizeStr = (file.size / (1024 * 1024)).toFixed(2);
                            const uploadedUrl = await uploadFile(file, 'docs') || `/uploads/docs/${file.name}`;
                            setEditingItem({
                              ...editingItem,
                              item: { 
                                ...editingItem.item, 
                                content_url: uploadedUrl,
                                file_name: file.name,
                                duration: `PDF (${sizeStr} MB)`
                              }
                            });
                          }
                        }}
                      />
                      <FileUp className="w-5 h-5 text-neutral-400 stroke-[2px] mx-auto mb-1" />
                      <span className="text-[10px] font-bold text-black uppercase block">
                        {editingItem.item.file_name ? `✓ ${editingItem.item.file_name} (${editingItem.item.duration})` : "Click to select PDF document"}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* SLIDES TYPE FIELDS */}
              {editingItem.item.type === 'slides' && (
                <>
                  <div className="space-y-1">
                    <label className="font-black uppercase text-neutral-500">Slides File Upload (.ppt, .pptx, .pdf)</label>
                    <div className="border-2 border-dashed border-black/45 bg-[#fcfcf9] p-4 text-center cursor-pointer relative hover:bg-neutral-50">
                      <input
                        type="file"
                        accept=".ppt,.pptx,.pdf"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const sizeStr = (file.size / (1024 * 1024)).toFixed(2);
                            const uploadedUrl = await uploadFile(file, 'slides') || `/uploads/slides/${file.name}`;
                            setEditingItem({
                              ...editingItem,
                              item: { 
                                ...editingItem.item, 
                                content_url: uploadedUrl,
                                file_name: file.name,
                                duration: `Slides (${sizeStr} MB)`
                              }
                            });
                          }
                        }}
                      />
                      <FileUp className="w-5 h-5 text-neutral-400 stroke-[2px] mx-auto mb-1" />
                      <span className="text-[10px] font-bold text-black uppercase block">
                        {editingItem.item.file_name ? `✓ ${editingItem.item.file_name} (${editingItem.item.duration})` : "Click to select slides presentation"}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* GENERIC FILE TYPE FIELDS */}
              {editingItem.item.type === 'file' && (
                <>
                  <div className="space-y-1">
                    <label className="font-black uppercase text-neutral-500">Upload Resource File</label>
                    <div className="border-2 border-dashed border-black/45 bg-[#fcfcf9] p-4 text-center cursor-pointer relative hover:bg-neutral-50">
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                            const uploadedUrl = await uploadFile(file, 'resources') || `/uploads/resources/${file.name}`;
                            setEditingItem({
                              ...editingItem,
                              item: { 
                                ...editingItem.item, 
                                content_url: uploadedUrl,
                                file_name: file.name,
                                duration: `Resource (${sizeMB} MB)`
                              }
                            });
                          }
                        }}
                      />
                      <FileUp className="w-5 h-5 text-neutral-400 stroke-[2px] mx-auto mb-1" />
                      <span className="text-[10px] font-bold text-black uppercase block">
                        {editingItem.item.file_name ? `✓ ${editingItem.item.file_name} (${editingItem.item.duration})` : "Click to select file"}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* ASSIGNMENT TYPE FIELDS */}
              {editingItem.item.type === 'assignment' && (
                <>
                  <div className="space-y-1">
                    <label className="font-black uppercase text-neutral-500">Upload Instruction Template / File</label>
                    <div className="border-2 border-dashed border-black/45 bg-[#fcfcf9] p-4 text-center cursor-pointer relative hover:bg-neutral-50">
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const sizeStr = (file.size / (1024 * 1024)).toFixed(2);
                            const uploadedUrl = await uploadFile(file, 'assignments') || `/uploads/assignments/${file.name}`;
                            setEditingItem({
                              ...editingItem,
                              item: { 
                                ...editingItem.item, 
                                content_url: uploadedUrl,
                                file_name: file.name,
                                duration: `Assignment (${sizeStr} MB)`
                              }
                            });
                          }
                        }}
                      />
                      <FileUp className="w-5 h-5 text-neutral-400 stroke-[2px] mx-auto mb-1" />
                      <span className="text-[10px] font-bold text-black uppercase block">
                        {editingItem.item.file_name ? `✓ ${editingItem.item.file_name} (${editingItem.item.duration})` : "Click to select assignment attachment"}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* LIVE SESSION TYPE FIELDS */}
              {editingItem.item.type === 'live' && (
                <>
                  <div className="space-y-1">
                    <label className="font-black uppercase text-neutral-500">Meeting Duration (e.g. "60 Mins" or "90 Mins")</label>
                    <input
                      type="text"
                      value={editingItem.item.duration.replace(' Mins', '')}
                      placeholder="e.g. 60"
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        item: { ...editingItem.item, duration: `${e.target.value} Mins` }
                      })}
                      className="w-full p-2.5 border-2 border-black bg-white text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-black uppercase text-neutral-500">Live Meeting Link URL (Zoom / Google Meet)</label>
                    <input
                      type="text"
                      value={editingItem.item.content_url}
                      placeholder="https://zoom.us/j/..."
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        item: { ...editingItem.item, content_url: e.target.value }
                      })}
                      className="w-full p-2.5 border-2 border-black bg-white text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Quiz Questions Sub-form */}
              {editingItem.item.type === 'quiz' && (
                <div className="border border-black p-3 bg-neutral-50 space-y-3 max-h-60 overflow-y-auto">
                  <div className="flex justify-between items-center border-b border-black pb-1.5">
                    <span className="font-heading text-[10px] uppercase text-black">Quiz Builder</span>
                    <button
                      type="button"
                      onClick={() => {
                        const questions = editingItem.item.quiz_questions || []
                        const updatedQuestions = [...questions, { question: 'New Question?', options: ['Choice A', 'Choice B'], answer: 'Choice A' }]
                        setEditingItem({
                          ...editingItem,
                          item: { ...editingItem.item, quiz_questions: updatedQuestions }
                        })
                      }}
                      className="px-1.5 py-0.5 border border-black bg-neo-yellow text-[9px] font-black uppercase cursor-pointer"
                    >
                      + Add Question
                    </button>
                  </div>

                  {(editingItem.item.quiz_questions || []).map((q, qIdx) => (
                    <div key={qIdx} className="p-2.5 border border-black bg-white space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => {
                          const questions = (editingItem.item.quiz_questions || []).filter((_, idx) => idx !== qIdx)
                          setEditingItem({
                            ...editingItem,
                            item: { ...editingItem.item, quiz_questions: questions }
                          })
                        }}
                        className="absolute right-1 top-1 p-0.5 text-red-500 cursor-pointer"
                      >
                        ✕
                      </button>

                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-neutral-400">Q #{qIdx + 1}</label>
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => {
                            const questions = [...(editingItem.item.quiz_questions || [])]
                            questions[qIdx].question = e.target.value
                            setEditingItem({ ...editingItem, item: { ...editingItem.item, quiz_questions: questions } })
                          }}
                          className="w-full p-1 border border-black text-xs font-semibold focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-neutral-400 font-bold block">Options (Comma Separated)</label>
                        <input
                          type="text"
                          value={q.options.join(',')}
                          onChange={(e) => {
                            const questions = [...(editingItem.item.quiz_questions || [])]
                            questions[qIdx].options = e.target.value.split(',').map(s => s.trim())
                            setEditingItem({ ...editingItem, item: { ...editingItem.item, quiz_questions: questions } })
                          }}
                          className="w-full p-1 border border-black text-xs focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-neutral-400">Correct Answer</label>
                        <input
                          type="text"
                          value={q.answer}
                          onChange={(e) => {
                            const questions = [...(editingItem.item.quiz_questions || [])]
                            questions[qIdx].answer = e.target.value
                            setEditingItem({ ...editingItem, item: { ...editingItem.item, quiz_questions: questions } })
                          }}
                          className="w-full p-1 border border-black text-xs font-bold focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => saveEditedItem(editingItem.mId, editingItem.item, editingItem.isNew)}
                className="w-full py-2 border-2 border-black bg-neo-green text-black font-heading text-xs uppercase shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                Save Content Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <footer className="fixed bottom-0 left-0 w-full h-20 border-t-[3px] border-black bg-white flex items-center justify-end px-8 gap-4 z-50">
        <button
          onClick={() => handlePublish(true)}
          disabled={isSubmitting}
          className="px-6 py-2.5 border-2 border-black bg-white hover:bg-neutral-50 text-black font-sans font-extrabold text-sm uppercase tracking-wide cursor-pointer transition-all active:translate-y-[1px] disabled:opacity-50"
        >
          {editCourseId && !isDraftCourse ? 'Unpublish' : 'Save as Draft'}
        </button>
        <button
          onClick={() => handlePublish(false)}
          disabled={isSubmitting}
          className="px-10 py-2.5 border-2 border-black bg-[#ffcc00] hover:bg-[#ffcc00]/95 text-black font-sans font-extrabold text-sm uppercase tracking-wide shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : (editCourseId ? 'Save Changes' : 'Publish Course')}
        </button>
      </footer>
    </div>
  )
}

export default function AddCoursePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center font-heading text-lg uppercase text-black">
        Loading Course Editor...
      </div>
    }>
      <AddCoursePageContent />
    </Suspense>
  )
}
