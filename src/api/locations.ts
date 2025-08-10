import { KrogerApiClient } from './client';
import { Location, Chain, Department, LocationSearchParams } from '../types/kroger';

interface LocationsResponse {
  data: Location[];
}

interface ChainsResponse {
  data: Chain[];
}

interface DepartmentsResponse {
  data: Department[];
}

export class LocationsApi {
  constructor(private client: KrogerApiClient) {}

  async searchLocations(params: LocationSearchParams): Promise<Location[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const url = `/locations?${queryParams.toString()}`;
    console.log(`Calling Kroger API: ${url}`);

    try {
      const response = await this.client.get<LocationsResponse>(url);
      return response.data;
    } catch (error: any) {
      console.error('Locations search failed:', {
        url,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data
      });
      throw error;
    }
  }

  async getLocation(locationId: string): Promise<Location> {
    const response = await this.client.get<{ data: Location }>(
      `/locations/${locationId}`
    );
    return response.data;
  }

  async locationExists(locationId: string): Promise<boolean> {
    return this.client.head(`/locations/${locationId}`);
  }

  async searchByZipCode(
    zipCode: string,
    radiusInMiles: number = 50,
    limit: number = 50
  ): Promise<Location[]> {
    const params: LocationSearchParams = {
      'filter.zipCode.near': zipCode,
      'filter.radiusInMiles': radiusInMiles,
      'filter.limit': limit,
    };

    return this.searchLocations(params);
  }

  async searchByCoordinates(
    latitude: number,
    longitude: number,
    radiusInMiles: number = 50,
    limit: number = 50
  ): Promise<Location[]> {
    const params: LocationSearchParams = {
      'filter.lat.near': latitude,
      'filter.lon.near': longitude,
      'filter.radiusInMiles': radiusInMiles,
      'filter.limit': limit,
    };

    return this.searchLocations(params);
  }

  async searchByChain(
    chain: string,
    zipCode?: string,
    limit: number = 10
  ): Promise<Location[]> {
    const params: LocationSearchParams = {
      'filter.chain': chain,
      'filter.limit': limit,
    };

    if (zipCode) {
      params['filter.zipCode.near'] = zipCode;
    }

    return this.searchLocations(params);
  }

  async getChains(): Promise<Chain[]> {
    const response = await this.client.get<ChainsResponse>('/chains');
    return response.data;
  }

  async getChain(chainId: string): Promise<Chain> {
    const response = await this.client.get<{ data: Chain }>(`/chains/${chainId}`);
    return response.data;
  }

  async chainExists(chainId: string): Promise<boolean> {
    return this.client.head(`/chains/${chainId}`);
  }

  async getDepartments(locationId: string): Promise<Department[]> {
    const response = await this.client.get<DepartmentsResponse>(
      `/locations/${locationId}/departments`
    );
    return response.data;
  }

  async getDepartment(locationId: string, departmentId: string): Promise<Department> {
    const response = await this.client.get<{ data: Department }>(
      `/locations/${locationId}/departments/${departmentId}`
    );
    return response.data;
  }

  async departmentExists(locationId: string, departmentId: string): Promise<boolean> {
    return this.client.head(`/locations/${locationId}/departments/${departmentId}`);
  }

  async findLocationsWithDepartments(
    departments: string[],
    zipCode: string,
    radiusInMiles: number = 10
  ): Promise<Location[]> {
    const locations = await this.searchByZipCode(zipCode, radiusInMiles, 50);
    
    const locationsWithDepartments = await Promise.all(
      locations.map(async (location) => {
        const locationDepartments = await this.getDepartments(location.locationId);
        const hasDepartments = departments.every((dept) =>
          locationDepartments.some((d) => d.name.toLowerCase().includes(dept.toLowerCase()))
        );
        return hasDepartments ? location : null;
      })
    );

    return locationsWithDepartments.filter((loc): loc is Location => loc !== null);
  }
}