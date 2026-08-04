import { useMemo } from 'react';
import {
  useGetCountriesQuery,
  useGetStatesByCountryIdQuery,
  useGetCitiesByStateIdQuery,
} from '../api/tenant-service/Company/addCompany';

interface City {
  id: number;
  name: string;
}

interface State {
  id: number;
  name: string;
  code: string;
}

interface Country {
  id: number;
  name: string;
  code: string;
}

interface UseLocationDropdownReturn {
  countries: Country[];
  states: State[];
  cities: City[];
  loadingCountries: boolean;
  loadingStates: boolean;
  loadingCities: boolean;
  refetchCountries: () => void;
  refetchStates: () => void;
  refetchCities: () => void;
}

const useLocationDropdown = (countryId?: number, stateId?: number): UseLocationDropdownReturn => {
  const {
    data: countriesData,
    isLoading: loadingCountries,
    refetch: refetchCountries,
  } = useGetCountriesQuery();

  const {
    data: statesData,
    isLoading: loadingStates,
    refetch: refetchStates,
  } = useGetStatesByCountryIdQuery({ countryId: countryId! }, { skip: !countryId });

  const {
    data: citiesData,
    isLoading: loadingCities,
    refetch: refetchCities,
  } = useGetCitiesByStateIdQuery({ stateId: stateId! }, { skip: !stateId });

  const countries = useMemo(() => {
    if (!countriesData) return [];

    const data = Array.isArray(countriesData) ? countriesData : (countriesData as any)?.data || [];

    if (!Array.isArray(data)) return [];

    return data.map((country: any) => ({
      id: country.id,
      name: country.name,
      code: country.code,
    }));
  }, [countriesData]);

  const states = useMemo(() => {
    if (!statesData) return [];

    const data = Array.isArray(statesData) ? statesData : (statesData as any)?.data || [];

    if (!Array.isArray(data)) return [];

    return data.map((state: any) => ({
      id: state.id,
      name: state.name,
      code: state.code,
    }));
  }, [statesData]);

  const cities = useMemo(() => {
    if (!citiesData) return [];

    const data = Array.isArray(citiesData) ? citiesData : (citiesData as any)?.data || [];

    if (!Array.isArray(data)) return [];

    return data.map((city: any) => ({
      id: city.id,
      name: city.name,
    }));
  }, [citiesData]);

  return {
    countries,
    states,
    cities,
    loadingCountries,
    loadingStates,
    loadingCities,
    refetchCountries,
    refetchStates,
    refetchCities,
  };
};

export default useLocationDropdown;
