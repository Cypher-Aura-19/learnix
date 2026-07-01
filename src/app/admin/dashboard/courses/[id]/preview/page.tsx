'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Play, FileText, CheckCircle2, Lock, HelpCircle, Laptop } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { fetchMilestones } from '@/utils/db-actions'
import { useModal } from '@/components/ModalProvider'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function CoursePreviewPage({ params }: PageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const courseId = resolvedParams.id
  const supabase = createClient()
  const { showAlert } = useModal()

  const [course, setCourse] = useState<any | null>(null)
  const [milestones, setMilestones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Active Sandbox Viewers (simulating student learning)
  const [activeContent, setActiveContent] = useState<any | null>(null)
  const [activeContentIndex, setActiveContentIndex] = useState<number>(-1)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizResult, setQuizResult] = useState<string | null>(null)

  useEffect(() => {
    async function loadCourseData() {
      // 1. Fetch Course details
      const { data: courseData, error: courseErr } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()

      if (courseErr) {
        console.error('Error loading course:', courseErr)
        setLoading(false)
        return
      }

      setCourse(courseData)

      // 2. Fetch Milestones
      const milestonesData = await fetchMilestones(courseId)
      setMilestones(milestonesData)
      setLoading(false)
    }

    loadCourseData()
  }, [courseId])

  const handleOpenContent = (milestone: any, idx: number) => {
    setActiveContent(milestone)
    setActiveContentIndex(idx)
    setQuizAnswers({})
    setQuizSubmitted(false)
    setQuizResult(null)
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
    setQuizResult(`Simulation Score: ${score}% (${correctCount}/${questions.length} correct answers).`)
  }

  const handleMoveToNext = () => {
    const nextIndex = activeContentIndex + 1
    if (nextIndex < milestones.length) {
      const nextMilestone = milestones[nextIndex]
      handleOpenContent(nextMilestone, nextIndex)
    } else {
      setActiveContent(null)
      setActiveContentIndex(-1)
      showAlert({ title: 'Simulation Complete', message: 'Simulation: All milestones completed!', type: 'success' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 text-black font-sans">
        <div className="border-3 border-black bg-white p-6 shadow-[4px_4px_0px_#000] font-bold uppercase text-xs">
          Loading Preview...
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 text-black font-sans">
        <div className="border-3 border-black bg-red-50 p-6 shadow-[4px_4px_0px_#000] space-y-4 max-w-sm">
          <p className="font-bold uppercase text-red-600">Course Not Found</p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="w-full py-2 border-2 border-black bg-white font-bold text-xs uppercase"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-black font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Navigation Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center gap-2 px-4 py-2 border-2 border-black bg-white shadow-[3px_3px_0px_#000] hover:bg-neutral-50 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer font-bold text-xs uppercase self-start"
          >
            <ArrowLeft className="w-4 h-4 stroke-[3.5px]" />
            Back to Admin Panel
          </button>

          <div className="flex items-center gap-2 border-2 border-black bg-[#ffcc00] px-3.5 py-1.5 shadow-[2px_2px_0px_#000] text-xs font-black uppercase">
            <Laptop className="w-4 h-4" />
            <span>Admin Preview Mode</span>
          </div>
        </div>

        {/* Course Banner Block */}
        <div className="border-3 border-black bg-white p-6 shadow-[6px_6px_0px_#000] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 border-2 border-black bg-neutral-100 flex items-center justify-center text-lg">{course.icon || '📚'}</span>
              <span className="px-2 py-0.5 border border-black bg-[#ffcc00] text-[8px] font-black uppercase">{course.difficulty}</span>
              <span className="px-2 py-0.5 border border-black bg-neutral-100 text-[8px] font-black uppercase text-neutral-500">{course.category}</span>
            </div>
            <h1 className="font-heading text-2xl uppercase tracking-wider text-black mt-2">{course.title}</h1>
            <p className="text-xs font-bold text-neutral-500 mt-1 uppercase max-w-2xl">{course.description}</p>
          </div>
          <div className="flex flex-col gap-1 items-end md:self-center shrink-0">
            <span className="text-[9px] font-heading text-neutral-400 uppercase block leading-none">Total Estimated Duration</span>
            <div className="border-2 border-black bg-[#ffcc00] px-4 py-2 shadow-[2.5px_2.5px_0px_#000] font-heading text-sm uppercase tracking-wider text-black mt-1">
              ⏱️ {milestones.reduce((acc, m) => acc + (m.days_left_from_enrollment || 5), 0)} Days
            </div>
          </div>
        </div>

        {/* Workspace Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Timeline Milestones Side View */}
          <div className="space-y-6">
            <div className="border-3 border-black bg-white p-6 shadow-[6px_6px_0px_#000] space-y-4">
              <h2 className="font-heading text-sm uppercase text-black border-b-2 border-black pb-2">Milestones Timeline</h2>
              
              <div className="space-y-4">
                {milestones.length === 0 ? (
                  <p className="text-xs font-bold uppercase text-neutral-400">No milestones registered yet.</p>
                ) : (
                  (() => {
                    const groupedMilestones: Record<string, any[]> = {}
                    milestones.forEach(m => {
                      const groupName = m.group_title || 'General Curriculum'
                      if (!groupedMilestones[groupName]) {
                        groupedMilestones[groupName] = []
                      }
                      groupedMilestones[groupName].push(m)
                    })

                    return Object.keys(groupedMilestones).map((groupName, gIdx) => (
                      <div key={groupName} className="space-y-2.5 border-2 border-black p-3 bg-[#fcfcf9]">
                        <h3 className="font-heading text-[10px] uppercase text-black tracking-wider border-b border-black pb-1.5 leading-tight">
                          {gIdx + 1}. {groupName}
                        </h3>
                        <div className="space-y-2">
                          {groupedMilestones[groupName].map((m) => {
                            const globalIdx = milestones.findIndex(item => item.id === m.id)
                            const isSelected = activeContentIndex === globalIdx
                            return (
                              <button
                                key={m.id}
                                onClick={() => handleOpenContent(m, globalIdx)}
                                className={`w-full flex items-center justify-between border-2 border-black p-2.5 shadow-[1.5px_1.5px_0px_#000] cursor-pointer text-left transition-all ${
                                  isSelected
                                    ? 'bg-[#ffcc00] -translate-y-0.5 -translate-x-0.5 shadow-[3px_3px_0px_#000]'
                                    : 'bg-white hover:bg-neutral-50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 border border-black bg-neutral-100 flex items-center justify-center text-[8px] font-black shrink-0">
                                    {m.sequence_order}
                                  </span>
                                  <h4 className="text-xs font-extrabold text-black uppercase truncate">{m.title}</h4>
                                </div>
                                <span className="px-1 py-0.5 border border-black bg-neutral-100 text-[8px] font-black uppercase shrink-0">
                                  {m.content_type}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  })()
                )}
              </div>
            </div>
          </div>

          {/* Interactive Core Viewer Sandbox */}
          <div className="lg:col-span-2">
            {activeContent ? (
              <div className="border-3 border-black bg-white p-6 shadow-[6px_6px_0px_#000] space-y-6">
                <div className="flex items-center justify-between border-b-2 border-black pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 border border-black bg-[#ffcc00] text-[8px] font-black uppercase">
                      {activeContent.content_type}
                    </span>
                    <h3 className="font-heading text-base uppercase text-black">{activeContent.title}</h3>
                  </div>
                  <button
                    onClick={() => {
                      setActiveContent(null)
                      setActiveContentIndex(-1)
                    }}
                    className="px-2 py-1 border border-black hover:bg-neutral-100 text-[10px] font-bold uppercase cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>

                {/* Content Simulation Renderers */}
                {activeContent.content_type === 'video' && (
                  <div className="space-y-4">
                    <div className="border-2 border-black shadow-[3px_3px_0px_#000] aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                      {activeContent.content_url ? (
                        <video src={activeContent.content_url} controls className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-white font-bold text-xs uppercase flex items-center gap-2">
                          <Play className="w-5 h-5 fill-white" />
                          No Video URL Specified
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-neutral-600 uppercase">{activeContent.description}</p>
                    <button
                      onClick={handleMoveToNext}
                      className="w-full py-3 border-2 border-black bg-neo-green text-black font-heading text-xs uppercase shadow-[2.5px_2.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
                    >
                      Next Milestone →
                    </button>
                  </div>
                )}

                {activeContent.content_type === 'pdf' && (
                  <div className="space-y-4">
                    <div className="border-2 border-black shadow-[3px_3px_0px_#000] p-4 bg-neutral-50 h-96 overflow-y-auto font-mono text-xs text-neutral-700 space-y-2">
                      <p className="font-bold text-black border-b border-neutral-300 pb-2 uppercase tracking-wide">
                        [PDF Embed Simulator: {activeContent.title}]
                      </p>
                      <p className="text-[10px] text-neutral-400">Source: {activeContent.content_url || 'None'}</p>
                      <p className="pt-4 leading-relaxed">
                        This is a simulated document view of the PDF uploaded to this milestone. Administrators and students can review files uploaded here for readings.
                      </p>
                      <p className="leading-relaxed">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam at porttitor sem. Aliquam erat volutpat. Donec placerat nisl magna, id efficitur lectus facilisis a.
                      </p>
                    </div>
                    <button
                      onClick={handleMoveToNext}
                      className="w-full py-3 border-2 border-black bg-neo-green text-black font-heading text-xs uppercase shadow-[2.5px_2.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
                    >
                      Next Milestone →
                    </button>
                  </div>
                )}

                {activeContent.content_type === 'slides' && (
                  <div className="space-y-4">
                    <div className="border-2 border-black shadow-[3px_3px_0px_#000] p-6 bg-neutral-800 text-white h-80 flex flex-col justify-between rounded-none">
                      <div className="border-b border-neutral-700 pb-2 flex justify-between items-center">
                        <span className="text-[9px] uppercase font-bold text-neutral-400">Presentation Slides Simulator</span>
                        <span className="text-[9px] uppercase font-bold text-neutral-400">{activeContent.content_url || 'No URL'}</span>
                      </div>
                      <div className="text-center space-y-2 py-8">
                        <h4 className="font-heading text-lg uppercase tracking-wide">{activeContent.title}</h4>
                        <p className="text-xs text-neutral-400">{activeContent.description || 'Slide Deck Presentation Content'}</p>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500">
                        <span>Slide 1 of 5</span>
                        <span>Use Space/Arrows to Navigate</span>
                      </div>
                    </div>
                    <button
                      onClick={handleMoveToNext}
                      className="w-full py-3 border-2 border-black bg-neo-green text-black font-heading text-xs uppercase shadow-[2.5px_2.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
                    >
                      Next Milestone →
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
                      <div className="p-4 border-2 border-black bg-[#ffcc00]/20 font-sans font-bold text-xs uppercase tracking-wide">
                        {quizResult}
                      </div>
                    )}

                    <div className="flex gap-4">
                      {!quizSubmitted ? (
                        <button
                          type="button"
                          onClick={handleSubmitQuiz}
                          className="flex-1 py-3 border-2 border-black bg-[#ffcc00] text-black font-heading text-xs uppercase shadow-[2.5px_2.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
                        >
                          Submit Quiz Answers
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
                            className="flex-1 py-3 border-2 border-black bg-white text-black font-heading text-xs uppercase shadow-[2.5px_2.5px_0px_#000]"
                          >
                            Reset Quiz
                          </button>
                          <button
                            type="button"
                            onClick={handleMoveToNext}
                            className="flex-1 py-3 border-2 border-black bg-neo-green text-black font-heading text-xs uppercase shadow-[2.5px_2.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
                          >
                            Next Milestone →
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-3 border-dashed border-neutral-300 p-12 text-center uppercase font-bold text-neutral-400 text-xs">
                Select a milestone from the list to preview its student interface.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
