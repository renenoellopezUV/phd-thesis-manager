import type { User } from '@supabase/supabase-js'

export type UserRole = 'student' | 'advisor' | 'admin'

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  advisor: 'Advisor',
  admin: 'Admin',
}

export function getUserRole(user: User): UserRole {
  const role = (user.app_metadata as { role?: string } | undefined)?.role
  if (role === 'student' || role === 'advisor' || role === 'admin') return role
  return 'student'
}

export type StudentStage =
  | 'coursework'
  | 'qualifying'
  | 'proposal'
  | 'research'
  | 'writing'
  | 'defense'
  | 'graduated'

export const STAGE_LABELS: Record<StudentStage, string> = {
  coursework: 'Coursework',
  qualifying: 'Qualifying Exams',
  proposal: 'Proposal Defense',
  research: 'Research',
  writing: 'Writing',
  defense: 'Final Defense',
  graduated: 'Graduated',
}

export type Student = {
  id: string
  name: string
  email: string
  advisor: string
  department: string
  program: string
  startDate: string
  expectedGraduationDate: string
  stage: StudentStage
}

export type MilestoneType =
  | 'exam'
  | 'defense'
  | 'chapter'
  | 'committee-meeting'
  | 'other'

export const MILESTONE_TYPE_LABELS: Record<MilestoneType, string> = {
  exam: 'Exam',
  defense: 'Defense',
  chapter: 'Chapter',
  'committee-meeting': 'Committee Meeting',
  other: 'Other',
}

export type Milestone = {
  id: string
  title: string
  description: string
  type: MilestoneType
  dueDate: string
  completedDate: string | null
  completed: boolean
}
