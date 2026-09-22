import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { App } from './app'

/**
 * Grouped results, driven through the UI. The aggregation itself is covered by
 * summary.test.ts; these tests check the measure/breakdown wiring and that the
 * groups (plus "All in scope") render as bars and rows.
 *
 * Fixture after parsing: 5 facilities, 694.01 MW, technologies Battery / Coal /
 * Onshore wind / Other / Utility solar.
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
  return screen.findByRole('table')
}

const rowLabels = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0]?.textContent ?? '')

// Radix's pointer path is unreliable in jsdom; the keyboard path is, and every
// control has to work by keyboard anyway (BEHAVIOUR_GUIDE.md).
const chooseOption = async (select: string, option: string) => {
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  screen.getByRole('combobox', { name: select }).focus()
  await user.keyboard('{ArrowDown}')
  await user.click(await screen.findByRole('option', { name: option }))
}

test('defaults to facilities measured by technology', async () => {
  await ready()

  expect(screen.getByRole('heading', { name: 'Facilities by technology' })).toBeVisible()
  expect(screen.getByRole('combobox', { name: 'Measure' })).toHaveTextContent('Distinct facilities')
  expect(rowLabels()).toEqual([
    'Battery',
    'Coal',
    'Onshore wind',
    'Other',
    'Utility solar',
    'All in scope',
  ])
})

test('changing the breakdown regroups and retitles', async () => {
  await ready()

  await chooseOption('Break down by', 'Unit status')
  expect(screen.getByRole('heading', { name: 'Facilities by unit status' })).toBeVisible()
  expect(rowLabels()).toEqual(['Committed', 'Operating', 'Retired', 'Unknown', 'All in scope'])

  await chooseOption('Break down by', 'State')
  expect(rowLabels()).toEqual(['NSW', 'SA', 'TAS', 'VIC', 'WA', 'All in scope'])
})

test('changing the measure retitles without changing the row set', async () => {
  await ready()

  await chooseOption('Measure', 'Registered capacity')

  expect(screen.getByRole('heading', { name: 'Registered capacity by technology' })).toBeVisible()
  expect(rowLabels()).toHaveLength(6)
})

test('"All in scope" is a full bar and each group is a share of it', async () => {
  await ready()

  const widths = screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => {
      const fill = r.querySelector('[style*="width"]') as HTMLElement | null
      return Number.parseFloat(fill?.style.width ?? '')
    })

  // Last row is "All in scope", the reference the others are read against.
  expect(widths.at(-1)).toBeCloseTo(100, 4)
  // Battery holds 2 of 5 facilities, Coal 1 of 5; no group exceeds the total.
  expect(widths[0]).toBeCloseTo(40, 4)
  expect(widths[1]).toBeCloseTo(20, 4)
  expect(Math.max(...widths)).toBeCloseTo(100, 4)
})
