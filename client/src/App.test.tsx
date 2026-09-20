import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('renders the shell and the message returned by the API proxy', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ message: 'hello' }), { status: 200 })),
  )

  render(<App />)

  expect(screen.getByRole('heading', { name: 'RenewMaplet' })).toBeInTheDocument()
  expect(await screen.findByText('hello')).toBeInTheDocument()
})
