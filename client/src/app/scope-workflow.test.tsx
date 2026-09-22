import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { App } from './app'

/**
 * The scope workflow through the UI: narrow a filter, watch totals and the count
 * badge respond, then clear or reset. The filtering logic itself is covered by
 * scope.test.ts and scope-options.test.ts; these tests check the wiring and the
 * badge rule ("all selected" is not a narrowing).
 *
 * Fixture after parsing:
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

test('narrowing a filter updates totals, summary and the count badge', async () => {
  const user = userEvent.setup()
  await ready()
  expect(totals()).toContain('5 facilities')

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

test('a technology group’s "Only" scopes to it, and Clear returns to all', async () => {
  const user = userEvent.setup()
  await ready()

  await openFilter(user, 'Technologies')
  await user.click(screen.getByRole('button', { name: 'Only Renewables' }))
  await user.keyboard('{Escape}')

  // Renewables = onshore wind + utility solar; the summary collapses to the name.
  expect(filter('Technologies')).toHaveTextContent('Renewables')
  // ADP (solar) and WESTWIND (wind); DISCHONLY (battery) is excluded.
  expect(totals()).toContain('2 facilities')

  await openFilter(user, 'Technologies')
  await user.click(screen.getByRole('button', { name: 'Clear' }))
  await user.keyboard('{Escape}')
  expect(filter('Technologies')).toHaveTextContent('All technologies')
  expect(totals()).toContain('5 facilities')
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
  expect(totals()).toContain('5 facilities')
})

test('filters are operable by keyboard alone', async () => {
  const user = userEvent.setup()
  await ready()

  filter('States').focus()
  await user.keyboard('{Enter}')

  const group = screen.getByRole('group', { name: 'States' })
  const nsw = within(group).getByRole('checkbox', { name: 'NSW' })
  nsw.focus()
  await user.keyboard(' ')
  expect(nsw).toBeChecked()

  // Tab reaches the next checkbox and Space toggles it too.
  await user.tab()
  const sa = within(group).getByRole('checkbox', { name: 'SA' })
  expect(sa).toHaveFocus()
  await user.keyboard(' ')

  // NSW (DISCHONLY) + SA (ADP).
  expect(totals()).toContain('2 facilities')
})
