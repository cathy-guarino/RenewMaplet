import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { App } from './app'

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

test('shows the shell and totals once live data arrives', async () => {
  vi.stubGlobal('fetch', respondWith(facilitiesResponse))

  expect(render(<App />)).toBeTruthy()

  expect(await screen.findByRole('heading', { name: 'Facilities by technology' })).toBeVisible()
  // The fixture's five parsed facilities total 694.01 MW.
  expect(screen.getByText(/5 facilities · 694 MW/)).toBeInTheDocument()

  // Scope panel and header-row controls are present as placeholders.
  for (const label of ['States', 'Technologies', 'Lifecycles', 'Commencement']) {
    expect(screen.getByLabelText(label)).toBeInTheDocument()
  }
  expect(screen.getByLabelText('Measure')).toBeInTheDocument()
  expect(screen.getByLabelText('Break down by')).toBeInTheDocument()
})

test('shows an error state with a retry action', async () => {
  vi.stubGlobal(
    'fetch',
    respondWith(
      { error: { code: 'upstream_unauthorized', message: 'OpenElectricity rejected it.' } },
      502,
    ),
  )

  render(<App />)

  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('We couldn’t load the facilities')
  expect(alert).toHaveTextContent('OpenElectricity rejected it.')
  expect(screen.getByRole('button', { name: 'Retry connection' })).toBeInTheDocument()
})

test('retries from the error state', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('nope', { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(facilitiesResponse), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)

  render(<App />)
  expect(await screen.findByRole('alert')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Retry connection' }))

  expect(await screen.findByRole('heading', { name: 'Facilities by technology' })).toBeVisible()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('shows an empty state when the response holds no facilities', async () => {
  vi.stubGlobal('fetch', respondWith({ data: [] }))

  render(<App />)

  expect(await screen.findByText('No facilities match this scope.')).toBeInTheDocument()
  // The shell stays put; only the results region changes.
  expect(screen.getByLabelText('States')).toBeInTheDocument()
})

test('the reset action is reachable by name', async () => {
  vi.stubGlobal('fetch', respondWith(facilitiesResponse))

  render(<App />)

  expect(await screen.findByRole('button', { name: 'Reset all filters' })).toBeInTheDocument()
})
