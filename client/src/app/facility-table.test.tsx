import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { FacilityTable } from '@/components/facility-table'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { FacilityRow } from '@/domain/facility-table'
import { App } from './app'

/**
 * The inline facility table: selection, scope-awareness, sorting, close-on-change
 * and pagination. Row-building and sorting logic live in facility-table.test.ts;
 * these tests cover the interactions. Integration runs through App on the fixture;
 * pagination needs more rows than the fixture holds, so it renders the table
 * directly with synthetic data.
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

const setup = () => userEvent.setup({ pointerEventsCheck: 0 })
const ready = async () => {
  render(<App />)
  return screen.findByRole('table', { name: /Groups by/ })
}
const facilityTable = () =>
  screen.queryByRole('table', { name: 'Facilities in the selected group' })
const openBattery = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('row', { name: /^Battery/ }))
  return screen.findByRole('table', { name: 'Facilities in the selected group' })
}
// The facility cell holds the name span then a muted state span; read the name.
const bodyRowNames = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[1]?.querySelector('span')?.textContent ?? '')

test('opening a group hides the others and lists its facilities as plain rows', async () => {
  const user = setup()
  await ready()

  // Five technology groups plus the expandable "All in scope" row.
  expect(screen.getAllByRole('row', { name: /facilities$/ })).toHaveLength(6)

  const table = await openBattery(user)

  // Only the Battery group row remains, marked expanded.
  const groupRows = screen.getAllByRole('row', { name: /facilities$/ })
  expect(groupRows).toHaveLength(1)
  expect(groupRows[0]).toHaveAttribute('aria-expanded', 'true')

  // Battery facilities from the fixture, with a plain state suffix and no links.
  expect(bodyRowNames(table)).toEqual(['Adelaide Desalination', 'Discharge Only Battery'])
  const firstRow = within(table).getAllByRole('row')[1]!
  expect(firstRow).toHaveTextContent('SA')
  expect(within(firstRow).queryByRole('link')).not.toBeInTheDocument()
})

test('opening "All in scope" shows every facility, with all its technologies', async () => {
  const user = setup()
  await ready()

  await user.click(screen.getByRole('row', { name: /^All in scope/ }))
  const table = await screen.findByRole('table', { name: 'Facilities in the selected group' })

  expect(bodyRowNames(table)).toEqual([
    'Adelaide Desalination',
    'Discharge Only Battery',
    'Mixed Coal',
    'Oddball Station',
    'West Wind',
  ])

  // ADP spans solar + battery, so its row shows two technology icons.
  const adp = within(table)
    .getAllByRole('row')
    .find((r) => within(r).queryByText('Adelaide Desalination'))!
  expect(within(adp).getAllByRole('cell')[0]?.querySelectorAll('svg').length).toBe(2)
})

test('the table reflects the current scope, not just the group', async () => {
  const user = setup()
  await ready()

  // Narrow to NSW, then open Battery: only the NSW battery facility remains.
  await user.click(screen.getByRole('combobox', { name: 'States' }))
  const states = screen.getByRole('group', { name: 'States' })
  await user.click(within(states).getByRole('checkbox', { name: 'NSW' }))
  await user.keyboard('{Escape}')

  const table = await openBattery(user)
  expect(bodyRowNames(table)).toEqual(['Discharge Only Battery'])
})

test('header clicks toggle ascending and descending, and expose aria-sort', async () => {
  const user = setup()
  await ready()
  const table = await openBattery(user)

  const mwHeader = within(table).getByRole('columnheader', { name: /MW/ })
  expect(mwHeader).toHaveAttribute('aria-sort', 'none')

  await user.click(within(mwHeader).getByRole('button'))
  expect(mwHeader).toHaveAttribute('aria-sort', 'ascending')
  expect(bodyRowNames(table)).toEqual(['Adelaide Desalination', 'Discharge Only Battery'])

  await user.click(within(mwHeader).getByRole('button'))
  expect(mwHeader).toHaveAttribute('aria-sort', 'descending')
  expect(bodyRowNames(table)).toEqual(['Discharge Only Battery', 'Adelaide Desalination'])
})

test('changing the scope, measure or breakdown closes the table', async () => {
  const user = setup()
  await ready()
  await openBattery(user)
  expect(facilityTable()).toBeInTheDocument()

  const breakdown = screen.getByRole('combobox', { name: 'Break down by' })
  breakdown.focus()
  await user.keyboard('{ArrowDown}')
  await user.click(await screen.findByRole('option', { name: 'State' }))

  expect(facilityTable()).not.toBeInTheDocument()
})

test('shows 50 facilities and reveals 50 more on request', async () => {
  const user = userEvent.setup()
  const rows: FacilityRow[] = Array.from({ length: 60 }, (_, i) => ({
    code: `F${i}`,
    name: `Facility ${String(i).padStart(2, '0')}`,
    state: 'NSW',
    technologies: ['battery'],
    unitStatuses: ['operating'],
    registeredMw: i,
    hasUnknownCapacity: false,
    unitCount: 1,
  }))

  render(
    <TooltipProvider>
      <FacilityTable rows={rows} />
    </TooltipProvider>,
  )
  const table = screen.getByRole('table', { name: 'Facilities in the selected group' })

  expect(within(table).getAllByRole('row')).toHaveLength(1 + 50) // header + 50

  await user.click(screen.getByRole('button', { name: 'Show more facilities' }))

  expect(within(table).getAllByRole('row')).toHaveLength(1 + 60)
  expect(screen.queryByRole('button', { name: 'Show more facilities' })).not.toBeInTheDocument()
})
