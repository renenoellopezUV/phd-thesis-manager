// src/__tests__/actions/admin.test.ts
import { revalidatePath } from 'next/cache'

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
const mockCreateAdminClient = createAdminClient as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

import { assignAdvisor, resetUserPassword, verifyUserEmail } from '@/app/actions/admin'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAdminClientWithAdvisorSetup({
  getUserByIdResult,
  upsertResult = { error: null },
}: {
  getUserByIdResult: { data: { user: { id: string; email: string } | null }; error: Error | null }
  upsertResult?: { error: Error | null }
}) {
  const mockUpsert = jest.fn().mockResolvedValue(upsertResult)
  const mockFrom = jest.fn().mockReturnValue({ upsert: mockUpsert })
  mockCreateAdminClient.mockReturnValue({
    auth: { admin: { getUserById: jest.fn().mockResolvedValue(getUserByIdResult) } },
    from: mockFrom,
  })
  return { mockUpsert, mockFrom }
}

function makeAdminClientWithUpdateById(result: { error: Error | null }) {
  const mockUpdateUserById = jest.fn().mockResolvedValue(result)
  mockCreateAdminClient.mockReturnValue({
    auth: { admin: { updateUserById: mockUpdateUserById } },
  })
  return { mockUpdateUserById }
}

// ─── assignAdvisor ────────────────────────────────────────────────────────────

describe('assignAdvisor', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns error when getUserById fails', async () => {
    makeAdminClientWithAdvisorSetup({
      getUserByIdResult: { data: { user: null }, error: new Error('DB error') },
    })
    const result = await assignAdvisor('student-1', 'advisor-1')
    expect(result.error).toBe('DB error')
  })

  it('returns "User not found" when user is null', async () => {
    makeAdminClientWithAdvisorSetup({
      getUserByIdResult: { data: { user: null }, error: null },
    })
    const result = await assignAdvisor('student-1', 'advisor-1')
    expect(result.error).toBe('User not found')
  })

  it('calls upsert with correct payload including email', async () => {
    const { mockUpsert, mockFrom } = makeAdminClientWithAdvisorSetup({
      getUserByIdResult: {
        data: { user: { id: 'student-1', email: 'student@test.com' } },
        error: null,
      },
    })

    await assignAdvisor('student-1', 'advisor-1')

    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockUpsert).toHaveBeenCalledWith(
      { id: 'student-1', email: 'student@test.com', advisor_id: 'advisor-1' },
      { onConflict: 'id' }
    )
  })

  it('sets advisor_id to null when advisorId is empty string', async () => {
    const { mockUpsert } = makeAdminClientWithAdvisorSetup({
      getUserByIdResult: {
        data: { user: { id: 'student-1', email: 'student@test.com' } },
        error: null,
      },
    })

    await assignAdvisor('student-1', '')

    expect(mockUpsert).toHaveBeenCalledWith(
      { id: 'student-1', email: 'student@test.com', advisor_id: null },
      { onConflict: 'id' }
    )
  })

  it('returns error when upsert fails', async () => {
    makeAdminClientWithAdvisorSetup({
      getUserByIdResult: {
        data: { user: { id: 'student-1', email: 'student@test.com' } },
        error: null,
      },
      upsertResult: { error: new Error('Upsert failed') },
    })

    const result = await assignAdvisor('student-1', 'advisor-1')
    expect(result.error).toBe('Upsert failed')
  })

  it('returns {} and revalidates on success', async () => {
    makeAdminClientWithAdvisorSetup({
      getUserByIdResult: {
        data: { user: { id: 'student-1', email: 'student@test.com' } },
        error: null,
      },
    })

    const result = await assignAdvisor('student-1', 'advisor-1')
    expect(result).toEqual({})
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users')
  })
})

// ─── resetUserPassword ────────────────────────────────────────────────────────

describe('resetUserPassword', () => {
  afterEach(() => jest.clearAllMocks())

  it('calls updateUserById with the new password', async () => {
    const { mockUpdateUserById } = makeAdminClientWithUpdateById({ error: null })

    await resetUserPassword('user-1', 'newpassword123')

    expect(mockUpdateUserById).toHaveBeenCalledWith('user-1', { password: 'newpassword123' })
  })

  it('returns error when updateUserById fails', async () => {
    makeAdminClientWithUpdateById({ error: new Error('Weak password') })

    const result = await resetUserPassword('user-1', 'abc')
    expect(result.error).toBe('Weak password')
  })

  it('returns {} on success', async () => {
    makeAdminClientWithUpdateById({ error: null })

    const result = await resetUserPassword('user-1', 'newpassword123')
    expect(result).toEqual({})
  })

  it('does NOT call revalidatePath', async () => {
    makeAdminClientWithUpdateById({ error: null })

    await resetUserPassword('user-1', 'newpassword123')
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})

// ─── verifyUserEmail ──────────────────────────────────────────────────────────

describe('verifyUserEmail', () => {
  afterEach(() => jest.clearAllMocks())

  it('calls updateUserById with email_confirm: true', async () => {
    const { mockUpdateUserById } = makeAdminClientWithUpdateById({ error: null })

    await verifyUserEmail('user-1')

    expect(mockUpdateUserById).toHaveBeenCalledWith('user-1', { email_confirm: true })
  })

  it('returns error when updateUserById fails', async () => {
    makeAdminClientWithUpdateById({ error: new Error('Auth error') })

    const result = await verifyUserEmail('user-1')
    expect(result.error).toBe('Auth error')
  })

  it('returns {} on success', async () => {
    makeAdminClientWithUpdateById({ error: null })

    const result = await verifyUserEmail('user-1')
    expect(result).toEqual({})
  })

  it('revalidates /admin/users on success', async () => {
    makeAdminClientWithUpdateById({ error: null })

    await verifyUserEmail('user-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users')
  })
})
