/**
 * A small, deterministic stand-in for `GET /v4/facilities/`.
 *
 * Test-only — the application always uses live data (DATA_GUIDE.md). Field
 * names, casing and value vocabulary mirror the real payload, including its
 * quirks: inconsistent UTC offsets, `null` capacities, and batteries listed
 * up to three times.
 *
 * Every facility exists to pin down one rule; see the comment above each.
 * Expected aggregates for the whole fixture are asserted in
 * `client/src/domain/summary.test.ts`.
 */

export const facilitiesResponse = {
  version: '4.0.1',
  created_at: '2026-09-20T00:00:00+10:00',
  success: true,
  total_records: 6,
  data: [
    // Battery deduplication, canonical path: one physical battery listed three
    // times at 7.76 MW. Only the canonical record counts. Also gives this
    // facility a second technology, so it overlaps two technology groups.
    {
      code: 'ADP',
      name: 'Adelaide Desalination',
      network_id: 'NEM',
      network_region: 'SA1',
      units: [
        {
          code: 'ADPPV1',
          fueltech_id: 'solar_utility',
          status_id: 'operating',
          dispatch_type: 'GENERATOR',
          capacity_registered: 24.75,
          commencement_date: '2021-05-17T14:00:00+10:00',
          commencement_date_specificity: 'day',
        },
        {
          code: 'ADPBA1G',
          fueltech_id: 'battery_discharging',
          status_id: 'operating',
          dispatch_type: 'GENERATOR',
          capacity_registered: 7.76,
          commencement_date: '2021-05-17T14:00:00+10:00',
          commencement_date_specificity: 'day',
        },
        {
          code: 'ADPBA1L',
          fueltech_id: 'battery_charging',
          status_id: 'operating',
          dispatch_type: 'LOAD',
          capacity_registered: 7.76,
          commencement_date: '2021-05-17T14:00:00+10:00',
          commencement_date_specificity: 'day',
        },
        {
          code: 'ADPBA1',
          fueltech_id: 'battery',
          status_id: 'operating',
          dispatch_type: 'BIDIRECTIONAL',
          capacity_registered: 7.76,
          commencement_date: '2021-05-17T14:00:00+10:00',
          commencement_date_specificity: 'day',
        },
      ],
    },

    // Battery deduplication, fallback path: no canonical record, so the
    // discharging record stands in and the charging record is still dropped.
    // Year-precision date written as an instant that lands in 2023 under UTC+10
    // but means 2022.
    {
      code: 'DISCHONLY',
      name: 'Discharge Only Battery',
      network_id: 'NEM',
      network_region: 'NSW1',
      units: [
        {
          code: 'DOB1G',
          fueltech_id: 'battery_discharging',
          status_id: 'operating',
          dispatch_type: 'GENERATOR',
          capacity_registered: 10,
          commencement_date: '2022-12-31T14:00:00Z',
          commencement_date_specificity: 'year',
        },
        {
          code: 'DOB1L',
          fueltech_id: 'battery_charging',
          status_id: 'operating',
          dispatch_type: 'LOAD',
          capacity_registered: 10,
          commencement_date: '2022-12-31T14:00:00Z',
          commencement_date_specificity: 'year',
        },
      ],
    },

    // Charging-only: nothing generating remains, so the facility leaves the
    // model rather than appearing with zero capacity.
    {
      code: 'CHARGEONLY',
      name: 'Charge Only Load',
      network_id: 'NEM',
      network_region: 'QLD1',
      units: [
        {
          code: 'COL1L',
          fueltech_id: 'battery_charging',
          status_id: 'operating',
          dispatch_type: 'LOAD',
          capacity_registered: 5,
          commencement_date: '2020-06-01T14:00:00+10:00',
          commencement_date_specificity: 'day',
        },
      ],
    },

    // Overlapping status groups plus missing capacity: one retired unit and one
    // operating unit with no registered capacity, which must be excluded from
    // MW rather than counted as zero. Month-precision date.
    {
      code: 'MIXEDCOAL',
      name: 'Mixed Coal',
      network_id: 'NEM',
      network_region: 'VIC1',
      units: [
        {
          code: 'MC1',
          fueltech_id: 'coal_brown',
          status_id: 'retired',
          dispatch_type: 'GENERATOR',
          capacity_registered: 500,
          commencement_date: '1970-12-31T14:00:00Z',
          commencement_date_specificity: 'year',
        },
        {
          code: 'MC2',
          fueltech_id: 'coal_brown',
          status_id: 'operating',
          dispatch_type: 'GENERATOR',
          capacity_registered: null,
          commencement_date: '1985-06-30T14:00:00Z',
          commencement_date_specificity: 'month',
        },
      ],
    },

    // State normalisation for the WEM, which is a network rather than a NEM
    // region, and a committed unit for forward-looking capacity.
    {
      code: 'WESTWIND',
      name: 'West Wind',
      network_id: 'WEM',
      network_region: 'WEM',
      units: [
        {
          code: 'WW1',
          fueltech_id: 'wind',
          status_id: 'committed',
          dispatch_type: 'GENERATOR',
          // WEM row carrying a NEM offset, as the live feed does.
          capacity_registered: 100,
          commencement_date: '2026-12-31T16:00:00+10:00',
          commencement_date_specificity: 'year',
        },
      ],
    },

    // Fallbacks: an unmapped fueltech and an unmapped status, plus a unit with
    // no commencement date at all. Hydro confirms it folds into "Other".
    {
      code: 'ODDBALL',
      name: 'Oddball Station',
      network_id: 'NEM',
      network_region: 'TAS1',
      units: [
        {
          code: 'UK1',
          fueltech_id: 'geothermal',
          status_id: 'mothballed',
          dispatch_type: 'GENERATOR',
          capacity_registered: 1.5,
          commencement_date: null,
          commencement_date_specificity: null,
        },
        {
          code: 'HY1',
          fueltech_id: 'hydro',
          status_id: 'operating',
          dispatch_type: 'GENERATOR',
          capacity_registered: 50,
          commencement_date: '2001-03-04T14:00:00+10:00',
          commencement_date_specificity: 'day',
        },
      ],
    },
  ],
}
