'use client'

import { useState } from 'react'
import { MILESTONE_TYPE_LABELS, type Milestone } from '@/types'

type MilestoneGroup = 'completed' | 'overdue' | 'future'

function getGroup(m: Milestone, today: Date): MilestoneGroup {
  const due = new Date(m.dueDate)
  if (m.completed) return 'completed'
  if (due < today) return 'overdue'
  return 'future'
}

const GROUP_NODE_STYLES: Record<MilestoneGroup, string> = {
  completed: 'bg-zinc-300 dark:bg-zinc-600 border-zinc-400 dark:border-zinc-500',
  overdue: 'bg-red-400 dark:bg-red-600 border-red-500 dark:border-red-500',
  future: 'bg-white dark:bg-zinc-900 border-zinc-400 dark:border-zinc-500',
}

const GROUP_LINE_STYLES: Record<MilestoneGroup, string> = {
  completed: 'text-zinc-400 dark:text-zinc-500',
  overdue: 'text-red-500 dark:text-red-400',
  future: 'text-zinc-500 dark:text-zinc-400',
}

export default function TimelineClient({ milestones }: { milestones: Milestone[] }) {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const sorted = [...milestones].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const todayIndex = sorted.findIndex((m) => m.dueDate >= todayStr)

  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const activeId = hoveredId ?? focusedId

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-zinc-400 dark:text-zinc-500">
        No milestones to display on the timeline.
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600 border border-zinc-400" />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400 dark:bg-red-600 border border-red-500" />
          Overdue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-500" />
          Upcoming
        </span>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex items-start min-w-max gap-0">
          {sorted.map((milestone, i) => {
            const group = getGroup(milestone, today)
            const isActive = activeId === milestone.id
            const isToday = todayIndex === i

            return (
              <div key={milestone.id} className="flex items-start">
                {isToday && (
                  <div className="flex flex-col items-center mx-2">
                    <div className="w-0.5 h-8 bg-blue-400 dark:bg-blue-500" />
                    <span className="text-xs text-blue-500 dark:text-blue-400 font-medium whitespace-nowrap px-1">Today</span>
                    <div className="w-0.5 h-4 bg-blue-400 dark:bg-blue-500" />
                  </div>
                )}
                <div className="flex flex-col items-center w-32">
                  <div className="flex items-center w-full">
                    {i > 0 && <div className={`flex-1 h-0.5 bg-current ${GROUP_LINE_STYLES[group]}`} />}
                    <button
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-400 ${GROUP_NODE_STYLES[group]} ${isActive ? 'scale-125' : 'hover:scale-110'}`}
                      onMouseEnter={() => setHoveredId(milestone.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onFocus={() => setFocusedId(milestone.id)}
                      onBlur={() => setFocusedId(null)}
                      aria-label={`${milestone.title} — ${MILESTONE_TYPE_LABELS[milestone.type]} — due ${new Date(milestone.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} — ${milestone.completed ? 'Completed' : group === 'overdue' ? 'Overdue' : 'Upcoming'}`}
                      aria-expanded={isActive}
                    />
                    {i < sorted.length - 1 && (
                      <div className={`flex-1 h-0.5 bg-current ${GROUP_LINE_STYLES[getGroup(sorted[i + 1], today)]}`} />
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute z-10 mt-2 w-52 p-3 rounded-lg shadow-lg border text-left bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-xs space-y-1" role="tooltip">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm leading-snug">{milestone.title}</p>
                      <p className="text-zinc-500 dark:text-zinc-400">{MILESTONE_TYPE_LABELS[milestone.type]}</p>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        Due: {new Date(milestone.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      <p className={group === 'overdue' ? 'text-red-500' : group === 'completed' ? 'text-zinc-400' : 'text-zinc-500'}>
                        {milestone.completed ? 'Completed' : group === 'overdue' ? 'Overdue' : 'Upcoming'}
                      </p>
                    </div>
                  )}
                  <div className="mt-2 text-center relative">
                    <p className={`text-xs font-medium leading-tight ${group === 'overdue' ? 'text-red-500 dark:text-red-400' : group === 'completed' ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
                      {new Date(milestone.dueDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight max-w-[7rem] break-words">
                      {milestone.title.length > 22 ? milestone.title.slice(0, 22) + '…' : milestone.title}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          {todayIndex === -1 && (
            <div className="flex flex-col items-center ml-2">
              <div className="w-0.5 h-8 bg-blue-400 dark:bg-blue-500" />
              <span className="text-xs text-blue-500 dark:text-blue-400 font-medium whitespace-nowrap px-1">Today</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
