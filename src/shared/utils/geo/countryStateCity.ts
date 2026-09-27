/**
 * Country → state → city data access, backed entirely by the static files
 * vendored under `public/data/geo/` (see that folder's SOURCE.md) — same-
 * origin fetches only, no third-party API, no key, nothing that can go down
 * or start billing. Countries and states are small enough to load once and
 * keep in memory; cities are split one file per country (the combined file
 * is ~42MB) and only fetched once a country is actually picked.
 *
 * Every function is a plain fetch-and-cache — no React state, no hooks —
 * so it can be reused from anywhere (a hook, a form, geolocation matching)
 * without pulling in a component tree.
 */

export type GeoCountry = {
  id: number;
  name: string;
  iso2: string;
  hasStates: boolean;
};

export type GeoState = {
  id: number;
  name: string;
  hasCities: boolean;
};

export type GeoCity = {
  id: number;
  name: string;
};

let countriesPromise: Promise<GeoCountry[]> | null = null;
let statesPromise: Promise<Map<number, GeoState[]>> | null = null;
const cityFilesByCountry = new Map<number, Promise<Record<number, GeoCity[]>>>();

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const getCountries = (): Promise<GeoCountry[]> => {
  countriesPromise ??= fetchJson<GeoCountry[]>('/data/geo/countries.json');
  return countriesPromise;
};

const getStatesIndex = (): Promise<Map<number, GeoState[]>> => {
  statesPromise ??= fetchJson<{ countryId: number; states: GeoState[] }[]>(
    '/data/geo/states.json'
  ).then((entries) => new Map(entries.map((entry) => [entry.countryId, entry.states])));
  return statesPromise;
};

export const getStates = async (countryId: number): Promise<GeoState[]> => {
  const index = await getStatesIndex();
  return index.get(countryId) ?? [];
};

const getCityFile = (countryId: number): Promise<Record<number, GeoCity[]>> => {
  let promise = cityFilesByCountry.get(countryId);
  if (!promise) {
    promise = fetchJson<Record<number, GeoCity[]>>(`/data/geo/cities/${countryId}.json`).catch(
      // A country with no city file (none of the 201 source countries lack
      // one, but a future data refresh might drop one) just has no cities —
      // not a hard failure, since a city picker isn't required everywhere
      // this data is used.
      () => ({})
    );
    cityFilesByCountry.set(countryId, promise);
  }
  return promise;
};

export const getCities = async (countryId: number, stateId: number): Promise<GeoCity[]> => {
  const file = await getCityFile(countryId);
  return file[stateId] ?? [];
};

/** Case-insensitive exact-name lookup — used to resolve a geocoded place
 * name (from reverse geocoding) back to this dataset's records. Returns
 * undefined rather than guessing at a "closest" match on no hit. */
export const findCountryByName = async (name: string): Promise<GeoCountry | undefined> => {
  const countries = await getCountries();
  const target = name.trim().toLowerCase();
  return countries.find((c) => c.name.toLowerCase() === target);
};

export const findStateByName = async (
  countryId: number,
  name: string
): Promise<GeoState | undefined> => {
  const states = await getStates(countryId);
  const target = name.trim().toLowerCase();
  return states.find((s) => s.name.toLowerCase() === target);
};

/** Unlike `findCountryByName`/`findStateByName`, this also falls back to a
 * substring match (either direction) when there's no exact hit. Reverse/
 * postal-code geocoding often has no clean city/town/village field to give
 * — Nominatim's own `county`/`state_district` fallback is frequently a
 * larger administrative unit whose name just embeds the real settlement
 * name rather than matching it outright (e.g. a Mohali, Punjab postal code
 * search returns `county: "S.A.S. Nagar (Mohali) Tahsil"`, not a bare
 * "Mohali" — the vendored dataset's own entry). The length guard keeps a
 * short name (e.g. a 2-letter one) from spuriously matching almost anything
 * it happens to be a substring of. */
export const findCityByName = async (
  countryId: number,
  stateId: number,
  name: string
): Promise<GeoCity | undefined> => {
  const cities = await getCities(countryId, stateId);
  const target = name.trim().toLowerCase();
  if (!target) return undefined;

  const exact = cities.find((c) => c.name.toLowerCase() === target);
  if (exact) return exact;

  const MIN_FUZZY_LENGTH = 3;
  if (target.length < MIN_FUZZY_LENGTH) return undefined;
  return cities.find((c) => {
    const cityName = c.name.toLowerCase();
    return (
      cityName.length >= MIN_FUZZY_LENGTH &&
      (target.includes(cityName) || cityName.includes(target))
    );
  });
};
