# Country / state / city data — source & license

Vendored (self-hosted, not fetched from any third party at runtime) from the
`data/` folder of [react-country-state-city](https://github.com/venkatvidyut/react-country-state-city)
(MIT licensed), which itself compiles the open `countries-states-cities-database`
dataset. Re-processed into a leaner, differently-shaped set of files for this
app — see `src/shared/utils/geo/countryStateCity.ts` for how they're read.

- `countries.json` (~15KB) — every country: `{ id, name, iso2, hasStates }`.
- `states.json` (~250KB) — every state, grouped by country: `{ countryId, states: [{ id, name, hasCities }] }`.
- `cities/{countryId}.json` (201 files, ~5MB total, median ~10KB, largest —
  United States — ~2MB) — that country's cities, keyed by state id:
  `{ [stateId]: [{ id, name }] }`. Split per country instead of one ~42MB
  file so picking "France" never downloads Canada's cities too.

All three are served as plain static files from this app's own origin —
no API key, no third-party network call, no usage limit, nothing that can
go down or start billing. To refresh this data later (a country renaming a
city, a new administrative division, etc.), re-run the same extraction
against an updated copy of the source repo's `data/` folder and replace
these files — nothing else in the app needs to change.
