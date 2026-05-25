// src/__tests__/api/check-admin.test.ts
import { GET } from '@/app/api/check-admin/route'

// Mock the admin Supabase client so tests never call real Supabase
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

// Import the mock AFTER jest.mock so we can control its return value per test
import { createAdminClient } from '@/lib/supabase/admin'
const mockCreateAdminClient = createAdminClient as jest.Mock

describe('GET /api/check-admin', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns { exists: false } when no users exist', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: { users: [] },
            error: null,
          }),
        },
      },
    })

    const res = await GET()
    const body = await res.json() as { exists: boolean }

    expect(res.status).toBe(200)
    expect(body.exists).toBe(false)
  })

  it('returns { exists: false } when users exist but none are admin', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: {
              users: [
                { id: 'u1', app_metadata: { role: 'student' } },
                { id: 'u2', app_metadata: {} },
                { id: 'u3', app_metadata: { role: 'advisor' } },
              ],
            },
            error: null,
          }),
        },
      },
    })

    const res = await GET()
    const body = await res.json() as { exists: boolean }

    expect(body.exists).toBe(false)
  })

  it('returns { exists: true } when at least one admin user exists', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: {
              users: [
                { id: 'u1', app_metadata: { role: 'student' } },
                { id: 'u2', app_metadata: { role: 'admin' } },
              ],
            },
            error: null,
          }),
        },
      },
    })

    const res = await GET()
    const body = await res.json() as { exists: boolean }

    expect(body.exists).toBe(true)
  })

  it('returns { exists: true } when Supabase returns an error (fail open)', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Supabase unavailable'),
          }),
        },
      },
    })

    const res = await GET()
    const body = await res.json() as { exists: boolean }

    expect(res.status).toBe(200)
    expect(body.exists).toBe(true)
  })

  it('returns { exists: true } when createAdminClient throws (fail open)', async () => {
    mockCreateAdminClient.mockImplementation(() => {
      throw new Error('Missing env vars')
    })

    const res = await GET()
    const body = await res.json() as { exists: boolean }

    expect(body.exists).toBe(true)
  })
})
