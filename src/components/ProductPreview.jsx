import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  BookOpen, Building2, MessageSquare, ShieldCheck,
  Send, FileText, CheckCheck, Heart, MessageCircle,
} from 'lucide-react'

export default function ProductPreview() {
  const [activeTab, setActiveTab] = useState('feed') // 'feed' | 'notices' | 'messages'
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="preview" className="py-20 sm:py-24 bg-white dark:bg-base-900 border-t border-base-200 dark:border-base-800 transition-colors duration-200" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <p className="font-mono text-xs uppercase tracking-wider text-accent-500 font-semibold mb-2">
            The Swish Interface
          </p>
          <h2
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-base-900 dark:text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            A Dedicated Workspace for Campus Life
          </h2>
          <p className="text-base-500 dark:text-base-400 text-sm sm:text-base mt-3 leading-relaxed">
            Preview the verified tools students, faculty, and administrators use daily.
          </p>
        </motion.div>

        {/* Interactive Viewport Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-xl bg-base-100 dark:bg-base-800 border border-base-200 dark:border-base-750 text-xs font-medium">
            {[
              { id: 'feed', label: 'Campus Feed & Projects', icon: BookOpen },
              { id: 'notices', label: 'Official Noticeboard', icon: Building2 },
              { id: 'messages', label: 'Peer Direct Messages', icon: MessageSquare },
            ].map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-base-900 text-base-900 dark:text-white shadow-xs font-semibold'
                      : 'text-base-600 dark:text-base-400 hover:text-base-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-accent-500' : ''} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Product Chrome Frame */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-4xl mx-auto rounded-2xl border border-base-200 dark:border-base-800 bg-base-25 dark:bg-base-950 shadow-sm overflow-hidden"
        >
          {/* Top Address Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-base-50 dark:bg-base-850 border-b border-base-200 dark:border-base-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-base-300 dark:bg-base-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-base-300 dark:bg-base-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-base-300 dark:bg-base-700" />
              <span className="font-mono text-xs text-base-600 dark:text-base-300 ml-2">
                app.swish.campus/{activeTab}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-accent-500 bg-accent-50 dark:bg-accent-950/60 border border-accent-100 dark:border-accent-900 px-2 py-0.5 rounded">
              <ShieldCheck size={12} />
              <span>Verified Session</span>
            </div>
          </div>

          {/* Dynamic Tab Content Area */}
          <div className="p-4 sm:p-6 min-h-[380px] bg-white dark:bg-base-900">
            
            {/* TAB 1: CAMPUS FEED */}
            {activeTab === 'feed' && (
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="rounded-xl border border-base-200 dark:border-base-800 p-4 bg-white dark:bg-base-850">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-accent-500 text-white font-bold flex items-center justify-center text-xs">
                        AK
                      </div>
                      <div>
                        <p className="font-bold text-base-900 dark:text-white text-xs">
                          Ananya Kulkarni
                        </p>
                        <p className="text-[10px] text-base-400 font-mono">
                          Computer Science · 4th Year · AI Club
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-base-400">18m ago</span>
                  </div>

                  <p className="text-xs sm:text-sm text-base-700 dark:text-base-300 leading-relaxed mb-3">
                    Our team just published the benchmarks for the campus library seat-availability sensor network! The entire stack is running on lightweight ESP32 nodes across 4 study floors. Check it out if you are working on embedded systems this semester.
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-base-100 dark:bg-base-800 text-base-600 dark:text-base-300">
                      #IoT
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-base-100 dark:bg-base-800 text-base-600 dark:text-base-300">
                      #EmbeddedSystems
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-base-100 dark:bg-base-800 text-base-600 dark:text-base-300">
                      #OpenHardware
                    </span>
                  </div>

                  <div className="flex items-center gap-4 pt-3 border-t border-base-100 dark:border-base-800 text-xs text-base-500">
                    <button className="flex items-center gap-1.5 font-semibold text-accent-500">
                      <Heart size={14} className="fill-accent-500" />
                      <span>56 upvotes</span>
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-base-800 dark:hover:text-base-200">
                      <MessageCircle size={14} />
                      <span>12 peer comments</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-base-200 dark:border-base-800 p-4 bg-white dark:bg-base-850">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                        EC
                      </div>
                      <div>
                        <p className="font-bold text-base-900 dark:text-white text-xs">
                          E-Cell Innovation Hub
                        </p>
                        <p className="text-[10px] text-base-400 font-mono">
                          Campus Club · Student Chapter
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-base-400">1h ago</span>
                  </div>
                  <p className="text-xs text-base-700 dark:text-base-300">
                    Annual Campus Hackathon registrations are officially open. Teams of up to 4 students from any department can register.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: OFFICIAL NOTICEBOARD */}
            {activeTab === 'notices' && (
              <div className="space-y-3 max-w-2xl mx-auto">
                <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded">
                      High Priority · Academic Dean's Office
                    </span>
                    <span className="font-mono text-[11px] text-base-400">Notice #2026/08</span>
                  </div>
                  <h4 className="font-bold text-base-900 dark:text-white text-sm mb-1">
                    End-Semester Practical Examination Schedules & Lab Safety Protocol
                  </h4>
                  <p className="text-xs text-base-600 dark:text-base-300 leading-relaxed mb-3">
                    Department heads have finalized laboratory slot distributions for 2nd and 3rd year engineering students. Download the official PDF circular below for laboratory safety protocols and viva timetables.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-base-200 dark:border-base-750 bg-white dark:bg-base-900 text-xs text-base-700 dark:text-base-300 font-medium">
                    <FileText size={13} className="text-accent-500" />
                    <span>Lab_Evaluation_Schedule_Spring2026.pdf</span>
                    <span className="text-base-400 text-[10px] font-mono ml-1">240 KB</span>
                  </div>
                </div>

                <div className="rounded-xl border border-base-200 dark:border-base-800 p-4 bg-white dark:bg-base-850">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-base-500 dark:text-base-400 bg-base-100 dark:bg-base-800 px-2 py-0.5 rounded">
                      Administrative Circular · Registrar Office
                    </span>
                    <span className="font-mono text-[11px] text-base-400">Yesterday</span>
                  </div>
                  <h4 className="font-bold text-base-900 dark:text-white text-xs mb-1">
                    Library Operating Hours Extended for Assessment Week
                  </h4>
                  <p className="text-xs text-base-500 dark:text-base-400">
                    The central library and digital reading rooms will remain open until 11:00 PM through the exam period.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: DIRECT MESSAGING */}
            {activeTab === 'messages' && (
              <div className="max-w-xl mx-auto rounded-xl border border-base-200 dark:border-base-800 p-4 bg-base-25 dark:bg-base-850">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-base-100 dark:border-base-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent-500 text-white font-bold flex items-center justify-center text-xs">
                      RS
                    </div>
                    <div>
                      <p className="font-bold text-base-900 dark:text-white text-xs leading-none">
                        Rohan Sharma
                      </p>
                      <p className="text-[10px] text-emerald-500 font-mono mt-0.5">
                        Online · Computer Science '27
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-base-400">Peer Message</span>
                </div>

                <div className="space-y-2.5 text-xs mb-4">
                  <div className="flex flex-col items-start">
                    <div className="bg-white dark:bg-base-800 border border-base-200 dark:border-base-700 rounded-xl rounded-tl-xs px-3.5 py-2 max-w-[80%] text-base-800 dark:text-base-200">
                      Hey! Did you submit the lab report for the compiler design assignment?
                    </div>
                    <span className="text-[10px] font-mono text-base-400 mt-1 ml-1">11:42 AM</span>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="bg-accent-500 text-white rounded-xl rounded-tr-xs px-3.5 py-2 max-w-[80%]">
                      Yes, pushed it to our team Git repo and uploaded the PDF on the department portal. Let me know if you need the test cases!
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-base-400 mt-1 mr-1">
                      <span>11:44 AM</span>
                      <CheckCheck size={12} className="text-accent-500" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-base-100 dark:border-base-800">
                  <input
                    type="text"
                    disabled
                    placeholder="Message Rohan (verified peer)..."
                    className="flex-1 bg-white dark:bg-base-900 border border-base-200 dark:border-base-750 rounded-lg px-3 py-1.5 text-xs text-base-400 cursor-not-allowed"
                  />
                  <div className="p-1.5 rounded-lg bg-accent-500 text-white">
                    <Send size={13} />
                  </div>
                </div>
              </div>
            )}

          </div>

        </motion.div>

      </div>
    </section>
  )
}
