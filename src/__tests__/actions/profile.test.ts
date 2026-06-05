import { revalidatePath } from 'next/cache'

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))

import { createClient } from '@/lib/supabase/server'
const mockCreateClient = createClient as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

import { updateProfile } from '@/app/actions/profile'

type FakeUser = {
  id: string
  email: string
  app_metadata: { role?: string }
}

function makeClient({
  user = { id: 'user-1', email: 'u@test.com', app_metadata: { role: 'student' } } as FakeUser | null,
  upsertError = null as Error | null,
} = {}) {
  const mockUpsert = jest.fn().mockResolvedValue({ error: upsertError })
  const mockFrom = jest.fn().mockReturnValue({ upsert: mockUpsert })
  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    from: mockFrom,
  })
  return { mockUpsert }
}

describe('updateProfile', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns Unauthorized when not logged in', async () => {
    makeClient({ user: null })
    const result = await updateProfile(new FormData())
    expect(result.error).toBe('Unauthorized')
  })

  it('saves program_id from form data', async () => {
    const { mockUpsert } = makeClient()
    const fd = new FormData()
    fd.set('program_id', 'prog-uuid-1')
    await updateProfile(fd)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ program_id: 'prog-uuid-1' })
    )
  })

  it('does NOT include a program text field in the payload', async () => {
    const { mockUpsert } = makeClient()
    await updateProfile(new FormData())
    const payload = mockUpsert.mock.calls[0][0]
    expect(payload).not.toHaveProperty('program')
  })

  it('saves student-specific fields when role is student', async () => {
    const { mockUpsert } = makeClient({
      user: { id: 'u1', email: 'u@test.com', app_metadata: { role: 'student' } },
    })
    const fd = new FormData()
    fd.set('startDate', '2023-09-01')
    fd.set('expectedGraduation', '2028-05-01')
    fd.set('stage', 'research')
    await updateProfile(fd)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        start_date: '2023-09-01',
        expected_graduation: '2028-05-01',
        stage: 'research',
      })
    )
  })

  it('skips student-specific fields when role is advisor', async () => {
    const { mockUpsert } = makeClient({
      user: { id: 'u1', email: 'u@test.com', app_metadata: { role: 'advisor' } },
    })
    const fd = new FormData()
    fd.set('startDate', '2023-09-01')
    fd.set('stage', 'research')
    await updateProfile(fd)
    const payload = mockUpsert.mock.calls[0][0]
    expect(payload).not.toHaveProperty('start_date')
    expect(payload).not.toHaveProperty('stage')
  })

  it('calls revalidatePath on success', async () => {
    makeClient()
    await updateProfile(new FormData())
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/profile')
  })

  it('returns error when upsert fails', async () => {
    makeClient({ upsertError: new Error('DB error') })
    const result = await updateProfile(new FormData())
    expect(result.error).toBe('DB error')
  })
})
