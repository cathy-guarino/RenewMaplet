import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { App } from './app'

/** The shell's four data states: loading, ready, error (with retry), and empty. */

afterEach(() => {
  vi.unstubAllGlobals()
})

const respondWith = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }))

test('shows a loading state while facilities are in flight', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>(() => {})),
  )

  render(<App />)

  expect(screen.getByRole('status')).toHaveTextContent('Loading facilities')
  // Nothing to scope yet, so the scope panel is not rendered (reference/07).
  expect(screen.queryByLabelText('States')).not.toBeInTheDocument()
})

test('shows the shell, totals and controls once live data arrives', async () => {
  vi.stubGlobal('fetch', respondWith(facilitiesResponse))

  render(<App />)

  expect(await screen.findByRole('heading', { name: 'Facilities by technology' })).toBeVisible()
  expect(screen.getByText(/5 facilities · 694 MW/)).toBeInTheDocument()
  for (const label of ['States', 'Technologies', 'Unit status', 'Commencement', 'Measure']) {
    expect(screen.getByLabelText(label)).toBeInTheDocument()
  }
})

test('shows an error, then recovers when the retry succeeds', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('nope', { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(facilitiesResponse), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)

  render(<App />)
  expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t load the facilities')

  await userEvent.click(screen.getByRole('button', { name: 'Retry connection' }))

  expect(await screen.findByRole('heading', { name: 'Facilities by technology' })).toBeVisible()
})

test('shows an empty state, with the shell intact, when nothing matches', async () => {
  vi.stubGlobal('fetch', respondWith({ data: [] }))

  render(<App />)

  expect(await screen.findByText('No facilities match this scope.')).toBeInTheDocument()
  expect(screen.getByLabelText('States')).toBeInTheDocument()
})
