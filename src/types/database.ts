import type { Milestone, MilestoneType, StudentStage } from '.'

export type DbProfile = {
  id: string
  name: string
  email: string
  advisor_email: string | null
  department: string | null
  program: string | null
  start_date: string | null
  expected_graduation: string | null
  stage: string
  created_at: string
}

export type DbMilestone = {
  id: string
  profile_id: string
  title: string
  description: string
  type: string
  due_date: string
  completed: boolean
  completed_date: string | null
  created_at: string
}

export function dbMilestoneToMilestone(row: DbMilestone): Milestone {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as MilestoneType,
    dueDate: row.due_date,
    completedDate: row.completed_date,
    completed: row.completed,
  }
}

export function dbProfileStage(stage: string): StudentStage {
  const valid: StudentStage[] = ['coursework', 'qualifying', 'proposal', 'research', 'writing', 'defense', 'graduated']
  return valid.includes(stage as StudentStage) ? (stage as StudentStage) : 'coursework'
}
