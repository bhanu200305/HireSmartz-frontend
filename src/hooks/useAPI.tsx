import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../shared/utils/api/axios.client';
import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

interface UseAPIResult {
  data: any;
  error: AxiosError | null;
  loading: boolean;
  fetchData: (config: AxiosRequestConfig) => Promise<void>;
}

interface UseAPIOptions {
  initialConfig: AxiosRequestConfig;
}

const useAPI = (auth: boolean = false, options: UseAPIOptions): UseAPIResult => {
  const { initialConfig } = options;
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<AxiosError | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(
    async (config: AxiosRequestConfig) => {
      if (auth) {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`,
          };
        } else {
          throw new Error('No token found');
        }
      }

      setLoading(true);
      setError(null);

      try {
        const response: AxiosResponse = await axiosClient(config);
        setData(response.data);
      } catch (err) {
        setError(err as AxiosError);
      } finally {
        setLoading(false);
      }
    },
    [auth]
  );

  useEffect(() => {
    fetchData(initialConfig);
  }, [initialConfig, fetchData]);

  return { data, error, loading, fetchData };
};

export default useAPI;
