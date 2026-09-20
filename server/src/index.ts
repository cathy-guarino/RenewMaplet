import { Hono } from 'hono'

/**
 * Credential-protecting proxy for the OpenElectricity facilities endpoint.
 *
 * The API token is a server-side binding and is never sent to the browser: the
 * client calls `/api/facilities` and this Worker attaches the Authorization
 * header. The upstream payload is passed through untouched — parsing into
 * application types happens on the client (DATA_GUIDE.md, "Model").
 */

interface Env {
  OPEN_ELECTRICITY_API_TOKEN: string
}

const UPSTREAM_URL = 'https://api.openelectricity.org.au/v4/facilities/'
const UPSTREAM_TIMEOUT_MS = 15_000

/**
 * Stable codes so the client can distinguish "try again" from "this is broken"
 * without parsing prose.
 */
export type FacilitiesErrorCode =
  | 'missing_credential'
  | 'upstream_unauthorized'
  | 'upstream_rate_limited'
  | 'upstream_timeout'
  | 'upstream_unavailable'

export interface FacilitiesErrorBody {
  error: { code: FacilitiesErrorCode; message: string }
}

const app = new Hono<{ Bindings: Env }>()

app.get('/api/facilities', async (c) => {
  const token = c.env.OPEN_ELECTRICITY_API_TOKEN
  if (!token) {
    // A deployment problem, not a client one: the request was fine.
    return c.json<FacilitiesErrorBody>(
      {
        error: {
          code: 'missing_credential',
          message: 'The server has no OPEN_ELECTRICITY_API_TOKEN configured.',
        },
      },
      500,
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(UPSTREAM_URL, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === 'TimeoutError'
    return c.json<FacilitiesErrorBody>(
      {
        error: timedOut
          ? { code: 'upstream_timeout', message: 'OpenElectricity did not respond in time.' }
          : { code: 'upstream_unavailable', message: 'Could not reach OpenElectricity.' },
      },
      504,
    )
  }

  if (!upstream.ok) {
    // A rejected credential is ours to fix, so it must not surface as a 401
    // that would invite the browser to prompt for credentials.
    if (upstream.status === 401 || upstream.status === 403) {
      return c.json<FacilitiesErrorBody>(
        {
          error: {
            code: 'upstream_unauthorized',
            message: 'OpenElectricity rejected the server credential.',
          },
        },
        502,
      )
    }

    // Passed through, because the caller retrying sooner will not help.
    if (upstream.status === 429) {
      return c.json<FacilitiesErrorBody>(
        {
          error: {
            code: 'upstream_rate_limited',
            message: 'OpenElectricity rate limit reached. Try again shortly.',
          },
        },
        429,
      )
    }

    return c.json<FacilitiesErrorBody>(
      {
        error: {
          code: 'upstream_unavailable',
          message: `OpenElectricity returned ${upstream.status}.`,
        },
      },
      502,
    )
  }

  // Forwarded as text so the payload is not reserialised on the way through.
  return new Response(await upstream.text(), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
})

export default app
