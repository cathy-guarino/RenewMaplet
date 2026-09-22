import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { App } from './app'

/**
 * Fixture after parsing (see summary.test.ts for the full breakdown):
 *   5 facilities, 694.01 MW, technologies Battery/Coal/Onshore wind/Other/Utility solar.
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

const rows = () => screen.getAllByRole('row')
const rowLabels = () =>
  rows()
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0]?.textContent ?? '')

const setup = () => userEvent.setup({ pointerEventsCheck: 0 })

/**
 * Opens a Select with the keyboard rather than a click.
 *
 * Radix's pointer path only opens the first Select rendered in a jsdom file —
 * something in its teardown does not reset between tests — while the keyboard
 * path is reliable. It also happens to be the interaction worth covering,
 * since every control has to work by keyboard (BEHAVIOUR_GUIDE.md).
 */
const chooseOption = async (
  user: ReturnType<typeof userEvent.setup>,
  select: string,
  option: string,
) => {
  screen.getByRole('combobox', { name: select }).focus()
  await user.keyboard('{ArrowDown}')
  await user.click(await screen.findByRole('option', { name: option }))
}

test('defaults to facilities measured by technology', async () => {
  await ready()

  expect(screen.getByRole('heading', { name: 'Facilities by technology' })).toBeVisible()
  expect(screen.getByRole('combobox', { name: 'Measure' })).toHaveTextContent('Distinct facilities')
  expect(screen.getByRole('combobox', { name: 'Break down by' })).toHaveTextContent('Technology')
  expect(screen.getByRole('columnheader', { name: 'Technology' })).toBeInTheDocument()
})

test('shows scope totals beneath the title', async () => {
  await ready()

  expect(screen.getByText('5 facilities · 694 MW')).toBeInTheDocument()
})

test('lists groups with "All in scope" last', async () => {
  await ready()

  expect(rowLabels()).toEqual([
    'Battery',
    'Coal',
    'Onshore wind',
    'Other',
    'Utility solar',
    'All in scope',
  ])
})

test('every row shows both numeric totals regardless of measure', async () => {
  const user = setup()
  await ready()

  const coal = rows().find((r) => within(r).queryByText('Coal'))!
  // Coal: 500 MW known, 1 facility. Both are present under the default measure.
  expect(within(coal).getByText('500')).toBeInTheDocument()
  expect(within(coal).getByText('1')).toBeInTheDocument()

  await chooseOption(user, 'Measure', 'Registered capacity')

  const coalAfter = rows().find((r) => within(r).queryByText('Coal'))!
  expect(within(coalAfter).getByText('500')).toBeInTheDocument()
  expect(within(coalAfter).getByText('1')).toBeInTheDocument()
})

test('the selected measure is the stronger column heading', async () => {
  const user = setup()
  await ready()

  // The heading row is muted; the selected measure lifts out of it.
  expect(screen.getByRole('columnheader', { name: 'Facilities' }).className).toContain(
    'font-semibold',
  )
  expect(screen.getByRole('columnheader', { name: 'Registered MW' }).className).not.toContain(
    'font-semibold',
  )

  await chooseOption(user, 'Measure', 'Registered capacity')

  expect(screen.getByRole('columnheader', { name: 'Registered MW' }).className).toContain(
    'font-semibold',
  )
  expect(screen.getByRole('columnheader', { name: 'Facilities' }).className).not.toContain(
    'font-semibold',
  )
})

test('row values stay full-strength in both columns, distinguished only by weight', async () => {
  const user = setup()
  await ready()

  const coalCells = () => {
    const row = rows().find((r) => within(r).queryByText('Coal'))!
    const cells = within(row).getAllByRole('cell')
    return { mw: cells.at(-2)!, facilities: cells.at(-1)! }
  }

  // Reference/01 renders both numerics black; muting the unselected one would
  // read as "less true" rather than "not the subject".
  let { mw, facilities } = coalCells()
  expect(mw.className).toContain('text-foreground')
  expect(facilities.className).toContain('text-foreground')
  expect(facilities.className).toContain('font-semibold')
  expect(mw.className).toContain('font-normal')

  await chooseOption(user, 'Measure', 'Registered capacity')
  ;({ mw, facilities } = coalCells())
  expect(mw.className).toContain('text-foreground')
  expect(facilities.className).toContain('text-foreground')
  expect(mw.className).toContain('font-semibold')
  expect(facilities.className).toContain('font-normal')
})

test('switching measure retitles and rescales without changing the row set', async () => {
  const user = setup()
  await ready()

  await chooseOption(user, 'Measure', 'Registered capacity')

  expect(screen.getByRole('heading', { name: 'Registered capacity by technology' })).toBeVisible()
  expect(rowLabels()).toHaveLength(6)
})

test('breaks down by unit status', async () => {
  const user = setup()
  await ready()

  await chooseOption(user, 'Break down by', 'Unit status')

  expect(screen.getByRole('heading', { name: 'Facilities by unit status' })).toBeVisible()
  expect(screen.getByRole('columnheader', { name: 'Unit status' })).toBeInTheDocument()
  expect(rowLabels()).toEqual(['Committed', 'Operating', 'Retired', 'Unknown', 'All in scope'])
})

test('breaks down by state', async () => {
  const user = setup()
  await ready()

  await chooseOption(user, 'Break down by', 'State')

  expect(screen.getByRole('heading', { name: 'Facilities by state' })).toBeVisible()
  expect(rowLabels()).toEqual(['NSW', 'SA', 'TAS', 'VIC', 'WA', 'All in scope'])
})

test('"All in scope" renders a full bar and the groups render shares of it', async () => {
  await ready()

  const widths = rows()
    .slice(1)
    .map((r) => {
      const fill = r.querySelector('[style*="width"]') as HTMLElement | null
      return Number.parseFloat(fill?.style.width ?? '')
    })

  // Last row is All in scope: the reference the others are read against.
  expect(widths.at(-1)).toBeCloseTo(100, 4)
  // Battery holds 2 of 5 facilities, Coal 1 of 5.
  expect(widths[0]).toBeCloseTo(40, 4)
  expect(widths[1]).toBeCloseTo(20, 4)
  // Shares are of the scope, so no group can exceed the total.
  expect(Math.max(...widths)).toBeCloseTo(100, 4)
})

test('columns keep their grid template as filters change', async () => {
  const user = setup()
  await ready()

  const templateBefore = rows()[0]?.className
  await user.click(screen.getByRole('combobox', { name: 'States' }))
  const group = screen.getByRole('group', { name: 'States' })
  await user.click(within(group).getByRole('checkbox', { name: 'VIC' }))
  await user.keyboard('{Escape}')

  expect(rowLabels()).toEqual(['Coal', 'All in scope'])
  expect(rows()[0]?.className).toBe(templateBefore)
})
