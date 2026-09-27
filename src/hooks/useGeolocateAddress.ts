import { useCallback, useState } from 'react';
import {
  findCountryByName,
  findStateByName,
  findCityByName,
} from '../shared/utils/geo/countryStateCity';
import type { LocationCascadeValue } from '../components/shared/ui/LocationCascadeFields';

type GeolocateResult =
  | { status: 'success'; value: LocationCascadeValue & { zip_code?: string } }
  | { status: 'error'; message: string };

// OpenStreetMap's Nominatim — free, keyless reverse/forward geocoding. Its
// usage policy (https://operations.osmfoundation.org/policies/nominatim/)
// asks for a descriptive User-Agent/Referer and caps automated use at ~1
// request/sec; both are satisfied here since reverse geocoding only ever
// runs once per explicit "Use my location" click, and the postal-code
// search below is debounced (see OfficeFormModal's `SEARCH_DEBOUNCE_MS`
// wait) rather than firing on every keystroke.
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
};

const NOMINATIM_HEADERS = {
  // Nominatim's policy asks every client to identify itself — this is that
  // identification, not an auth credential.
  'Accept-Language': 'en',
};

const reverseGeocode = async (lat: number, lon: number): Promise<NominatimAddress> => {
  const url = `${NOMINATIM_REVERSE_URL}?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`;
  const response = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as { address?: NominatimAddress };
  return body.address ?? {};
};

/** Forward lookup: postal code -> address. Unlike `reverseGeocode`, a miss
 * (unrecognized/incomplete code) is a normal, silent outcome — this runs on
 * every debounced keystroke while the user is still typing a zip code, not
 * on a single explicit click, so it returns `null` rather than throwing.
 *
 * `countryName` scopes the search to Nominatim's own structured `country=`
 * param when given. This isn't optional in practice — postal codes are only
 * unique WITHIN a country's own numbering scheme, not globally (e.g. India's
 * "140306" and a Moscow Oblast, Russia code collide), so a bare
 * `postalcode=` search with no country hint routinely returns a match from
 * the wrong country entirely. The caller (OfficeFormModal) only invokes this
 * once a country is already selected, for exactly that reason. */
const searchByPostalCode = async (
  postalCode: string,
  countryName: string
): Promise<NominatimAddress | null> => {
  const url =
    `${NOMINATIM_SEARCH_URL}?format=jsonv2&addressdetails=1&limit=1` +
    `&postalcode=${encodeURIComponent(postalCode)}&country=${encodeURIComponent(countryName)}`;
  const response = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!response.ok) {
    throw new Error(`Postal code lookup failed: HTTP ${response.status}`);
  }
  const results = (await response.json()) as { address?: NominatimAddress }[];
  return results[0]?.address ?? null;
};

const getCurrentPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000,
    });
  });

/** Shared by both "Use my location" and the postal-code lookup: resolves a
 * raw Nominatim address against this app's own vendored country/state/city
 * dataset so either result can drive LocationCascadeFields' Selects
 * directly. Passes the raw geocoded name through as-is only when
 * `findCityByName`'s own fuzzy match (see its doc comment) can't find
 * anything at all — the city picker's own options list still won't contain
 * it then, so the caller gets an unmatched string rather than a silently-
 * empty city field, but resolving it here first (rather than leaving that
 * to whatever raw string LocationCascadeFields was handed) is what lets its
 * City `<Select>` actually show a selection instead of appearing blank
 * despite `city` being genuinely set. Returns `null` only when there's no
 * country to even start from. */
const matchAddressToDataset = async (
  address: NominatimAddress
): Promise<LocationCascadeValue | null> => {
  if (!address.country) return null;

  const country = await findCountryByName(address.country);
  if (!country) return null;

  const stateName = address.state ?? '';
  const state = stateName ? await findStateByName(country.id, stateName) : undefined;

  const rawCity = address.city ?? address.town ?? address.village ?? address.county ?? '';
  const city = state && rawCity ? await findCityByName(country.id, state.id, rawCity) : undefined;

  return {
    country: country.name,
    state: state?.name ?? stateName,
    city: city?.name ?? rawCity,
  };
};

/**
 * "Use my location" — browser Geolocation (coordinates only) → Nominatim
 * reverse geocoding (coordinates → place name) → matched against this app's
 * own vendored dataset via `matchAddressToDataset`.
 *
 * Also exposes `lookupPostalCode` — the same Nominatim + dataset-match
 * pipeline, but forward (postal code → place) instead of reverse
 * (coordinates → place), for OfficeFormModal's zip code field.
 */
const useGeolocateAddress = () => {
  const [isLocating, setIsLocating] = useState(false);
  const [isLookingUpPostalCode, setIsLookingUpPostalCode] = useState(false);

  const locate = useCallback(async (): Promise<GeolocateResult> => {
    setIsLocating(true);
    try {
      const position = await getCurrentPosition();
      const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      const value = await matchAddressToDataset(address);

      if (!value) {
        return {
          status: 'error',
          message: address.country
            ? `${address.country} isn't in this app's country list.`
            : "Couldn't determine your country from your location.",
        };
      }

      return {
        status: 'success',
        value: address.postcode ? { ...value, zip_code: address.postcode } : value,
      };
    } catch (err) {
      const message =
        err instanceof GeolocationPositionError
          ? err.code === err.PERMISSION_DENIED
            ? 'Location access was denied.'
            : "Couldn't get your location."
          : err instanceof Error
            ? err.message
            : "Couldn't get your location.";
      return { status: 'error', message };
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Best-effort, silent on a miss — called on every debounced keystroke of
  // a zip code field, so an incomplete or unrecognized code while the user
  // is still typing is a normal outcome, not an error to surface. Wrapped in
  // `useCallback` (stable identity) so a caller can safely wrap it in its
  // own `debounce`/`useMemo` without that debounce being torn down and
  // recreated — losing its pending timer — on every render.
  //
  // `countryName` is required, not optional: see `searchByPostalCode`'s own
  // comment on why an unscoped postal-code search is unreliable across
  // country borders. The caller already has this value — it's the same
  // country the user picked in LocationCascadeFields before typing a zip.
  const lookupPostalCode = useCallback(
    async (postalCode: string, countryName: string): Promise<LocationCascadeValue | null> => {
      setIsLookingUpPostalCode(true);
      try {
        const address = await searchByPostalCode(postalCode, countryName);
        if (!address) return null;
        return await matchAddressToDataset(address);
      } catch {
        return null;
      } finally {
        setIsLookingUpPostalCode(false);
      }
    },
    []
  );

  return { locate, isLocating, lookupPostalCode, isLookingUpPostalCode };
};

export default useGeolocateAddress;
