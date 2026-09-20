import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { App } from './app'

/**
 * The scope workflow end to end: open a filter, narrow it, see totals and the
 * badge change, then reset.
 *
 * Fixture facilities after parsing:
 *   ADP (SA) solar 24.75 + battery 7.76   DISCHONLY (NSW) battery 10
 *   MIXEDCOAL (VIC) coal 500 retired + coal null operating
 *   WESTWIND (WA) wind 100 committed      ODDBALL (TAS) other 1.5 + other 50
 */

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(facilitiesResponse), { status: 200 })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ready = async () => {
  render(<App />)
  return screen.findByRole('heading', { name: 'Facilities by technology' })
}

const filter = (name: string) => screen.getByRole('combobox', { name })
const totals = () => screen.getByText(/facilities ·/).textContent ?? ''

const openFilter = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(filter(name))
  return screen.getByRole('group', { name })
}

test('defaults to all available values with no count badges', async () => {
  await ready()

  expect(filter('States')).toHaveTextContent('All states')
  expect(filter('Technologies')).toHaveTextContent('All technologies')
  expect(filter('Lifecycles')).toHaveTextContent('All lifecycles')
  expect(filter('Commencement')).toHaveTextContent('Any date')
  expect(totals()).toContain('5 facilities')
})

test('narrowing a filter updates totals, summary and the count badge', async () => {
  const user = userEvent.setup()
  await ready()

  const group = await openFilter(user, 'States')
  await user.click(within(group).getByRole('checkbox', { name: 'SA' }))
  await user.click(within(group).getByRole('checkbox', { name: 'WA' }))
  await user.keyboard('{Escape}')

  expect(filter('States')).toHaveTextContent('2')
  expect(filter('States')).toHaveTextContent('SA, WA')
  // ADP (32.51 MW) + WESTWIND (100 MW).
  expect(totals()).toContain('2 facilities')
  expect(totals()).toContain('132.5 MW')
})

test('selecting every value is not a narrowing, so no badge appears', async () => {
  const user = userEvent.setup()
  await ready()

  const group = await openFilter(user, 'States')
  for (const state of ['NSW', 'SA', 'TAS', 'VIC', 'WA']) {
    await user.click(within(group).getByRole('checkbox', { name: state }))
  }
  await user.keyboard('{Escape}')

  expect(filter('States')).toHaveTextContent('All states')
  expect(totals()).toContain('5 facilities')
})

test('unit-level filters keep a facility but narrow its units', async () => {
  const user = userEvent.setup()
  await ready()

  const group = await openFilter(user, 'Lifecycles')
  await user.click(within(group).getByRole('checkbox', { name: 'Retired' }))
  await user.keyboard('{Escape}')

  // Only MIXEDCOAL has a retired unit, and only that unit counts.
  expect(totals()).toContain('1 facilities')
  expect(totals()).toContain('500 MW')
})

test('commencement narrows by year window', async () => {
  const user = userEvent.setup()
  vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
  await ready()

  await user.click(filter('Commencement'))
  await user.click(screen.getByRole('radio', { name: 'Last 5 years' }))

  // 2022 onwards: DISCHONLY (2022) and WESTWIND (2026).
  expect(filter('Commencement')).toHaveTextContent('Last 5 years')
  expect(totals()).toContain('2 facilities')
  vi.useRealTimers()
})

test('combining filters can produce no results, with a clear way out', async () => {
  const user = userEvent.setup()
  await ready()

  const states = await openFilter(user, 'States')
  await user.click(within(states).getByRole('checkbox', { name: 'WA' }))
  await user.keyboard('{Escape}')

  const techs = await openFilter(user, 'Technologies')
  await user.click(within(techs).getByRole('checkbox', { name: 'Coal' }))
  await user.keyboard('{Escape}')

  expect(screen.getByText('No facilities match this scope.')).toBeInTheDocument()
  expect(totals()).toContain('0 facilities')

  await user.click(screen.getByRole('button', { name: 'Clear filters' }))

  expect(totals()).toContain('5 facilities')
  expect(filter('States')).toHaveTextContent('All states')
})

test('the header reset returns every filter to its default', async () => {
  const user = userEvent.setup()
  await ready()

  const states = await openFilter(user, 'States')
  await user.click(within(states).getByRole('checkbox', { name: 'VIC' }))
  await user.keyboard('{Escape}')
  expect(filter('States')).toHaveTextContent('1')

  await user.click(screen.getByRole('button', { name: 'Reset all filters' }))

  expect(filter('States')).toHaveTextContent('All states')
  expect(filter('Commencement')).toHaveTextContent('Any date')
  expect(totals()).toContain('5 facilities')
})

test('filters are operable by keyboard alone', async () => {
  const user = userEvent.setup()
  await ready()

  filter('States').focus()
  await user.keyboard('{Enter}')

  const group = screen.getByRole('group', { name: 'States' })
  const nsw = within(group).getByRole('checkbox', { name: 'NSW' })
  const sa = within(group).getByRole('checkbox', { name: 'SA' })

  // The popover moves focus to its first option on open.
  expect(nsw).toHaveFocus()
  await user.keyboard(' ')
  expect(nsw).toBeChecked()

  await user.tab()
  expect(sa).toHaveFocus()
  await user.keyboard(' ')
  expect(sa).toBeChecked()

  // NSW (DISCHONLY) + SA (ADP).
  expect(totals()).toContain('2 facilities')
})
