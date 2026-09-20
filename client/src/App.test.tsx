import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import App from './App'

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
})

test('shows scope totals once live data arrives', async () => {
  vi.stubGlobal('fetch', respondWith(facilitiesResponse))

  render(<App />)

  // The fixture's five parsed facilities total 694.01 MW.
  expect(await screen.findByText(/5 facilities/)).toBeInTheDocument()
  expect(screen.getByText(/694 MW/)).toBeInTheDocument()
})

test('surfaces the server error message when the request fails', async () => {
  vi.stubGlobal(
    'fetch',
    respondWith(
      { error: { code: 'upstream_unauthorized', message: 'OpenElectricity rejected it.' } },
      502,
    ),
  )

  render(<App />)

  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('Could not load facilities.')
  expect(alert).toHaveTextContent('OpenElectricity rejected it.')
})

test('retries on reload', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('nope', { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(facilitiesResponse), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)

  render(<App />)
  expect(await screen.findByRole('alert')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Reload' }))

  expect(await screen.findByText(/5 facilities/)).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
