import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import NodeCache from 'node-cache';
import { config } from '../config';
import { TokenResponse } from '../types/kroger';

export class KrogerApiClient {
  private axiosInstance: AxiosInstance;
  private tokenCache: NodeCache;
  private readonly TOKEN_CACHE_KEY = 'kroger_access_token';

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.kroger.apiBaseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.tokenCache = new NodeCache({ stdTTL: 1740 });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      async (requestConfig) => {
        if (!requestConfig.url?.includes('/connect/oauth2/token')) {
          const token = await this.getAccessToken();
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }
        return requestConfig;
      },
      (error) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          this.tokenCache.del(this.TOKEN_CACHE_KEY);
          const token = await this.getAccessToken();
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return this.axiosInstance(originalRequest);
        }

        return Promise.reject(error);
      }
    );
  }

  private async getAccessToken(): Promise<string> {
    const cachedToken = this.tokenCache.get<string>(this.TOKEN_CACHE_KEY);
    if (cachedToken) {
      return cachedToken;
    }

    const token = await this.fetchNewToken();
    const ttl = Math.max(token.expires_in - 60, 60);
    this.tokenCache.set(this.TOKEN_CACHE_KEY, token.access_token, ttl);

    return token.access_token;
  }

  private async fetchNewToken(): Promise<TokenResponse> {
    const credentials = Buffer.from(
      `${config.kroger.clientId}:${config.kroger.clientSecret}`
    ).toString('base64');

    const scope = 'product.compact';
    const response = await axios.post<TokenResponse>(
      config.kroger.tokenUrl,
      `grant_type=client_credentials&scope=${encodeURIComponent(scope)}`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  async head(url: string, config?: AxiosRequestConfig): Promise<boolean> {
    try {
      await this.axiosInstance.head(url, config);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }
}