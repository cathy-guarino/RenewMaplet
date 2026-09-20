/**
 * Client adapter for the Worker's facilities proxy.
 *
 * The application always fetches live data through `/api/facilities`; fixtures
 * exist only in tests (DATA_GUIDE.md). The response goes straight through the
 * domain parser so callers receive application types, never raw payload shapes.
 */

import { parseFacilitiesResponse } from './parse-facilities'
import type { Facility } from './types'

export const FACILITIES_ENDPOINT = '/api/facilities'

/** Mirrors the Worker's error codes, plus the two failures it cannot report. */
export type FacilitiesErrorCode =
  | 'missing_credential'
  | 'upstream_unauthorized'
  | 'upstream_rate_limited'
  | 'upstream_timeout'
  | 'upstream_unavailable'
  | 'network'
  | 'malformed_response'

export class FacilitiesRequestError extends Error {
  readonly code: FacilitiesErrorCode
  readonly status: number | null

  constructor(code: FacilitiesErrorCode, message: string, status: number | null = null) {
    super(message)
    this.name = 'FacilitiesRequestError'
    this.code = code
    this.status = status
  }
}

interface ErrorEnvelope {
  error?: { code?: unknown; message?: unknown }
}

const KNOWN_CODES: ReadonlySet<string> = new Set<FacilitiesErrorCode>([
  'missing_credential',
  'upstream_unauthorized',
  'upstream_rate_limited',
  'upstream_timeout',
  'upstream_unavailable',
])

async function errorFromResponse(response: Response): Promise<FacilitiesRequestError> {
  let envelope: ErrorEnvelope | null = null
  try {
    envelope = (await response.json()) as ErrorEnvelope
  } catch {
    // A proxy or crash can return HTML; fall back to the status below.
  }

  const rawCode = envelope?.error?.code
  const code =
    typeof rawCode === 'string' && KNOWN_CODES.has(rawCode)
      ? (rawCode as FacilitiesErrorCode)
      : 'upstream_unavailable'
  const message =
    typeof envelope?.error?.message === 'string'
      ? envelope.error.message
      : `Request failed with status ${response.status}.`

  return new FacilitiesRequestError(code, message, response.status)
}

export async function fetchFacilities(signal?: AbortSignal): Promise<Facility[]> {
  let response: Response
  try {
    response = await fetch(FACILITIES_ENDPOINT, {
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    })
  } catch (cause) {
    // An aborted request is the caller unmounting, not a failure to report.
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new FacilitiesRequestError('network', 'Could not reach the RenewMaplet server.')
  }

  if (!response.ok) throw await errorFromResponse(response)

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new FacilitiesRequestError(
      'malformed_response',
      'The facilities response was not valid JSON.',
      response.status,
    )
  }

  try {
    return parseFacilitiesResponse(payload)
  } catch (cause) {
    throw new FacilitiesRequestError(
      'malformed_response',
      cause instanceof Error ? cause.message : 'The facilities response could not be read.',
      response.status,
    )
  }
}
