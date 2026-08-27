import React, { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import {
  findCountryByName,
  findStateByName,
  getCities,
  getCountries,
  getStates,
  type GeoCity,
  type GeoCountry,
  type GeoState,
} from '../../../shared/utils/geo/countryStateCity';

export type LocationCascadeValue = {
  country: string;
  state: string;
  city: string;
};

type LocationCascadeFieldsProps = {
  value: LocationCascadeValue;
  onChange: (next: LocationCascadeValue) => void;
  /** Renders a State select — off for forms that don't collect one (mirrors
   * OfficeFormModal's own add-vs-edit distinction). */
  showState?: boolean;
  /** Renders a City select. */
  showCity?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Country → State → City, three cascading antd Selects backed by the static
 * data in `shared/utils/geo/countryStateCity.ts` (self-hosted, same-origin,
 * no third-party API — see public/data/geo/SOURCE.md). Picking a country
 * loads its states; picking a state loads its cities.
 *
 * `value`/`onChange` carry plain NAME strings, not this dataset's internal
 * numeric ids — every backend field this feeds (office `city`/`state`/
 * `country`, the demo form's `location`, etc.) already expects free-text
 * names, so the ids stay purely an implementation detail of which options
 * list to fetch next. This also means a value can arrive already set (an
 * existing office being edited, or a geolocation match) as plain names with
 * no id lookup required from the caller — this component resolves the id it
 * needs internally, once, from the name.
 */
const LocationCascadeFields: React.FC<LocationCascadeFieldsProps> = ({
  value,
  onChange,
  showState = true,
  showCity = true,
  disabled,
  className,
}) => {
  const [countries, setCountries] = useState<GeoCountry[]>([]);
  const [states, setStates] = useState<GeoState[]>([]);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<number | undefined>();
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>();

  useEffect(() => {
    let cancelled = false;
    getCountries().then((list) => {
      if (!cancelled) setCountries(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolves an incoming `value.country`/`value.state` name to this
  // dataset's ids so the State/City lists load — runs whenever the value's
  // names change out from under this component (edit-form prefill,
  // geolocation match) rather than only on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!value.country) {
        setSelectedCountryId(undefined);
        setStates([]);
        setSelectedStateId(undefined);
        setCities([]);
        return;
      }
      const country = await findCountryByName(value.country);
      if (cancelled) return;
      setSelectedCountryId(country?.id);
      if (!country) {
        setStates([]);
        setSelectedStateId(undefined);
        setCities([]);
        return;
      }
      const stateList = await getStates(country.id);
      if (cancelled) return;
      setStates(stateList);

      if (!value.state) {
        setSelectedStateId(undefined);
        setCities([]);
        return;
      }
      const state = await findStateByName(country.id, value.state);
      if (cancelled) return;
      setSelectedStateId(state?.id);
      if (!state) {
        setCities([]);
        return;
      }
      const cityList = await getCities(country.id, state.id);
      if (!cancelled) setCities(cityList);
    })();
    return () => {
      cancelled = true;
    };
    // Only re-resolve when the caller's own name values change (not on
    // every local selection — those already have the id in hand from the
    // click itself, handled directly in the handlers below).
  }, [value.country, value.state]);

  const countryOptions = useMemo(
    () => countries.map((c) => ({ label: c.name, value: c.id })),
    [countries]
  );
  const stateOptions = useMemo(() => states.map((s) => ({ label: s.name, value: s.id })), [states]);
  const cityOptions = useMemo(() => cities.map((c) => ({ label: c.name, value: c.id })), [cities]);

  const handleCountryChange = async (countryId: number) => {
    const country = countries.find((c) => c.id === countryId);
    setSelectedCountryId(countryId);
    setSelectedStateId(undefined);
    setCities([]);
    const stateList = await getStates(countryId);
    setStates(stateList);
    onChange({ country: country?.name ?? '', state: '', city: '' });
  };

  const handleStateChange = async (stateId: number) => {
    const state = states.find((s) => s.id === stateId);
    setSelectedStateId(stateId);
    onChange({ ...value, state: state?.name ?? '', city: '' });
    if (selectedCountryId != null && stateId != null) {
      const cityList = await getCities(selectedCountryId, stateId);
      setCities(cityList);
    } else {
      setCities([]);
    }
  };

  const handleCityChange = (cityId: number) => {
    const city = cities.find((c) => c.id === cityId);
    onChange({ ...value, city: city?.name ?? '' });
  };

  const filterOption = (input: string, option?: { label: string }) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase());

  return (
    <>
      <Select
        showSearch
        allowClear
        placeholder="Country"
        className={className}
        disabled={disabled}
        value={selectedCountryId}
        onChange={handleCountryChange}
        onClear={() => onChange({ country: '', state: '', city: '' })}
        options={countryOptions}
        filterOption={filterOption}
      />
      {showState && (
        <Select
          showSearch
          allowClear
          placeholder="State"
          className={className}
          disabled={disabled || !selectedCountryId}
          value={selectedStateId}
          onChange={handleStateChange}
          onClear={() => onChange({ ...value, state: '', city: '' })}
          options={stateOptions}
          filterOption={filterOption}
          notFoundContent={
            selectedCountryId && states.length === 0
              ? 'No states on file for this country'
              : undefined
          }
        />
      )}
      {showCity && (
        <Select
          showSearch
          allowClear
          placeholder="City"
          className={className}
          disabled={disabled || !selectedStateId}
          value={cities.find((c) => c.name === value.city)?.id}
          onChange={handleCityChange}
          onClear={() => onChange({ ...value, city: '' })}
          options={cityOptions}
          filterOption={filterOption}
          notFoundContent={
            selectedStateId && cities.length === 0 ? 'No cities on file for this state' : undefined
          }
        />
      )}
    </>
  );
};

export default LocationCascadeFields;
