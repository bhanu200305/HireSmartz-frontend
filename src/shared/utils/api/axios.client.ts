import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

class AxiosClient {
  private instance: AxiosInstance;

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.initializeInterceptors();
  }

  private initializeInterceptors() {
    this.instance.interceptors.request.use(this.handleRequest, this.handleError);

    this.instance.interceptors.response.use(this.handleResponse, this.handleError);
  }

  private handleRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    // Add any request modifications here
    return config;
  }

  private handleResponse(response: AxiosResponse): AxiosResponse {
    // Add any response modifications here
    return response;
  }

  private handleError(error: AxiosError): Promise<AxiosError> {
    // Handle errors here
    return Promise.reject(error);
  }

  public getInstance(): AxiosInstance {
    return this.instance;
  }
}

const baseURL = `${import.meta.env.VITE_BACKEND_ENDPOINT}${import.meta.env.VITE_BACKEND_PREFIX}`;
const axiosClient = new AxiosClient(baseURL);

export default axiosClient.getInstance();
