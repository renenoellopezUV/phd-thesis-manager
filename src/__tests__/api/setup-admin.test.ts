// src/__tests__/api/setup-admin.test.ts
import { POST } from '@/app/api/setup-admin/route'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
const mockCreateAdminClient = createAdminClient as jest.Mock

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/setup-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/setup-admin', () => {
  afterEach(() => jest.clearAllMocks())

  // ── Input validation ────────────────────────────────────────────────────
  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ password: 'password123' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/email/i)
  })

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeRequest({ email: 'admin@test.com' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/password/i)
  })

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await POST(makeRequest({ email: 'admin@test.com', password: 'short' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/8 characters/i)
  })

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/setup-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // ── Race condition guard ────────────────────────────────────────────────
  it('returns 409 when an admin already exists', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: {
              users: [{ id: 'existing', app_metadata: { role: 'admin' } }],
            },
            error: null,
          }),
          createUser: jest.fn(), // should never be called
        },
      },
    })

    const res = await POST(makeRequest({ email: 'admin@test.com', password: 'password123' }))
    expect(res.status).toBe(409)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Admin already exists')
  })

  it('does not call createUser when admin already exists', async () => {
    const mockCreateUser = jest.fn()
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: { users: [{ id: 'u1', app_metadata: { role: 'admin' } }] },
            error: null,
          }),
          createUser: mockCreateUser,
        },
      },
    })

    await POST(makeRequest({ email: 'admin@test.com', password: 'password123' }))
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  // ── Happy path ──────────────────────────────────────────────────────────
  it('creates admin user and returns { ok: true } when no admin exists', async () => {
    const mockCreateUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    })
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: { users: [] },
            error: null,
          }),
          createUser: mockCreateUser,
        },
      },
    })

    const res = await POST(makeRequest({ email: 'admin@test.com', password: 'password123' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  it('calls createUser with correct payload', async () => {
    const mockCreateUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    })
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: { users: [] },
            error: null,
          }),
          createUser: mockCreateUser,
        },
      },
    })

    await POST(makeRequest({ email: 'admin@test.com', password: 'password123' }))

    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'admin@test.com',
      password: 'password123',
      email_confirm: true,
      app_metadata: { role: 'admin' },
    })
  })

  // ── Supabase errors ─────────────────────────────────────────────────────
  it('returns 500 when listUsers fails', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('DB error'),
          }),
          createUser: jest.fn(),
        },
      },
    })

    const res = await POST(makeRequest({ email: 'admin@test.com', password: 'password123' }))
    expect(res.status).toBe(500)
  })

  it('returns 500 when createUser fails', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: { users: [] },
            error: null,
          }),
          createUser: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Email already registered'),
          }),
        },
      },
    })

    const res = await POST(makeRequest({ email: 'admin@test.com', password: 'password123' }))
    expect(res.status).toBe(500)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Email already registered')
  })
})
