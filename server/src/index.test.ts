import { afterEach, describe, expect, it, vi } from 'vitest'
import app, { type FacilitiesErrorBody } from './index'

const ENV = { OPEN_ELECTRICITY_API_TOKEN: 'test-token' }
const UPSTREAM = 'https://api.openelectricity.org.au/v4/facilities/'

const PAYLOAD = { version: '4.0.1', success: true, data: [{ code: 'ADP', units: [] }] }

interface RecordedCall {
  url: string
  headers: Headers
}

/** Stub the upstream call and record what the Worker sent. */
function stubUpstream(respond: () => Promise<Response> | Response) {
  const calls: RecordedCall[] = []
  const fetchMock = vi.fn((url: string | URL, init?: { headers?: HeadersInit }) => {
    calls.push({ url: String(url), headers: new Headers(init?.headers) })
    return respond()
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

const get = () => app.request('/api/facilities', undefined, ENV)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GET /api/facilities', () => {
  it('passes the upstream payload through unchanged', async () => {
    stubUpstream(() => new Response(JSON.stringify(PAYLOAD), { status: 200 }))

    const res = await get()

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    await expect(res.json()).resolves.toEqual(PAYLOAD)
  })

  it('calls the documented endpoint with a bearer token', async () => {
    const calls = stubUpstream(() => new Response(JSON.stringify(PAYLOAD), { status: 200 }))

    await get()

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(UPSTREAM)
    expect(calls[0]?.headers.get('authorization')).toBe('Bearer test-token')
  })

  it('never leaks the credential to the caller', async () => {
    stubUpstream(() => new Response(JSON.stringify(PAYLOAD), { status: 200 }))

    const res = await get()
    const body = await res.text()

    expect(body).not.toContain('test-token')
    expect(JSON.stringify([...res.headers])).not.toContain('test-token')
  })
})

describe('error handling', () => {
  it('reports a missing server credential as a 500', async () => {
    stubUpstream(() => new Response('{}', { status: 200 }))

    const res = await app.request('/api/facilities', undefined, {
      OPEN_ELECTRICITY_API_TOKEN: '',
    })
    const body = (await res.json()) as FacilitiesErrorBody

    expect(res.status).toBe(500)
    expect(body.error.code).toBe('missing_credential')
  })

  it('translates a rejected credential into a 502, not a 401', async () => {
    stubUpstream(() => new Response('Unauthorized', { status: 401 }))

    const res = await get()
    const body = (await res.json()) as FacilitiesErrorBody

    // A 401 here would invite the browser to prompt the user for credentials
    // they do not have; the fault is the server's.
    expect(res.status).toBe(502)
    expect(body.error.code).toBe('upstream_unauthorized')
  })

  it('passes a rate limit through as 429', async () => {
    stubUpstream(() => new Response('Too Many Requests', { status: 429 }))

    const res = await get()
    const body = (await res.json()) as FacilitiesErrorBody

    expect(res.status).toBe(429)
    expect(body.error.code).toBe('upstream_rate_limited')
  })

  it('reports other upstream failures as 502 with the upstream status', async () => {
    stubUpstream(() => new Response('Boom', { status: 503 }))

    const res = await get()
    const body = (await res.json()) as FacilitiesErrorBody

    expect(res.status).toBe(502)
    expect(body.error.code).toBe('upstream_unavailable')
    expect(body.error.message).toContain('503')
  })

  it('reports an unreachable upstream as 504', async () => {
    stubUpstream(() => Promise.reject(new TypeError('network down')))

    const res = await get()
    const body = (await res.json()) as FacilitiesErrorBody

    expect(res.status).toBe(504)
    expect(body.error.code).toBe('upstream_unavailable')
  })

  it('reports a timeout distinctly', async () => {
    stubUpstream(() => {
      const error = new Error('timed out')
      error.name = 'TimeoutError'
      return Promise.reject(error)
    })

    const res = await get()
    const body = (await res.json()) as FacilitiesErrorBody

    expect(res.status).toBe(504)
    expect(body.error.code).toBe('upstream_timeout')
  })
})
