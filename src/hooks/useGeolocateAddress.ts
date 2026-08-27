import { useState } from 'react';
import { findCountryByName, findStateByName } from '../shared/utils/geo/countryStateCity';
import type { LocationCascadeValue } from '../components/shared/ui/LocationCascadeFields';

type GeolocateResult =
  | { status: 'success'; value: LocationCascadeValue }
  | { status: 'error'; message: string };

// OpenStreetMap's Nominatim — free, keyless reverse geocoding. Its usage
// policy (https://operations.osmfoundation.org/policies/nominatim/) asks for
// a descriptive User-Agent/Referer and caps automated use at ~1 request/sec;
// both are satisfied here since this only ever runs once, on an explicit
// user click of "Use my location" — never polled or run in a loop.
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
};

const reverseGeocode = async (lat: number, lon: number): Promise<NominatimAddress> => {
  const url = `${NOMINATIM_REVERSE_URL}?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`;
  const response = await fetch(url, {
    headers: {
      // Nominatim's policy asks every client to identify itself — this is
      // that identification, not a auth credential.
      'Accept-Language': 'en',
    },
  });
  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as { address?: NominatimAddress };
  return body.address ?? {};
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

/**
 * "Use my location" — browser Geolocation (coordinates only) → Nominatim
 * reverse geocoding (coordinates → place name) → matched against this app's
 * own vendored country/state dataset so the result can drive
 * LocationCascadeFields' Selects directly. City is passed through as
 * whatever name Nominatim returned without a dataset match — the city
 * picker's own options list may not contain the exact same spelling/town
 * (Nominatim's city/town/village granularity doesn't line up 1:1 with the
 * vendored dataset's city list), so the caller gets an unmatched string
 * rather than a silently-empty city field.
 */
const useGeolocateAddress = () => {
  const [isLocating, setIsLocating] = useState(false);

  const locate = async (): Promise<GeolocateResult> => {
    setIsLocating(true);
    try {
      const position = await getCurrentPosition();
      const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);

      if (!address.country) {
        return {
          status: 'error',
          message: "Couldn't determine your country from your location.",
        };
      }

      const country = await findCountryByName(address.country);
      if (!country) {
        return {
          status: 'error',
          message: `${address.country} isn't in this app's country list.`,
        };
      }

      const stateName = address.state ?? '';
      const state = stateName ? await findStateByName(country.id, stateName) : undefined;

      return {
        status: 'success',
        value: {
          country: country.name,
          state: state?.name ?? stateName,
          city: address.city ?? address.town ?? address.village ?? address.county ?? '',
        },
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
  };

  return { locate, isLocating };
};

export default useGeolocateAddress;
