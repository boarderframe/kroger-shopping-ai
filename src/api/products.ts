import { KrogerApiClient } from './client';
import { Product, ProductSearchParams } from '../types/kroger';

/**
 * Products API for Kroger Shopping AI
 * 
 * IMPORTANT NOTES:
 * - The Kroger API uses 'filter.location.id' for product searches
 * - Most product search operations require either 'filter.term' or 'filter.productId'
 * - All search methods include proper validation and error handling
 * - Location ID parameter is optional for term searches but required for fulfillment searches
 */

interface ProductSearchResponse {
  data: Product[];
  meta: {
    pagination: {
      total: number;
      start: number;
      limit: number;
    };
  };
}

export class ProductsApi {
  constructor(private client: KrogerApiClient) {}

  async search(params: ProductSearchParams): Promise<ProductSearchResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const url = `/products?${queryParams.toString()}`;
    console.log(`Calling Kroger Products API: ${url}`);
    
    try {
      const response = await this.client.get<ProductSearchResponse>(url);
      console.log(`Found ${response.data?.length || 0} products`);
      return response;
    } catch (error: any) {
      console.error('Product search failed:', {
        url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      throw error;
    }
  }

  async getProduct(productId: string, locationId?: string): Promise<Product> {
    const queryParams = locationId ? `?filter.location.id=${locationId}` : ''; // Fixed: Use correct parameter name
    const response = await this.client.get<{ data: Product }>(
      `/products/${productId}${queryParams}`
    );
    return response.data;
  }

  async searchByTerm(
    term: string,
    locationId?: string,
    limit: number = 50
  ): Promise<Product[]> {
    if (!term?.trim()) {
      throw new Error('Search term is required and cannot be empty');
    }

    // Kroger API has a maximum limit of 50 per request
    if (limit <= 0 || limit > 50) {
      throw new Error('Limit must be between 1 and 50 (Kroger API maximum)');
    }

    const params: ProductSearchParams = {
      'filter.term': term.trim(),
      'filter.limit': limit,
    };

    if (locationId?.trim()) {
      params['filter.location.id'] = locationId.trim(); // Fixed: Use correct parameter name
    }

    const response = await this.search(params);
    return response.data;
  }

  async searchByBrand(
    brand: string,
    locationId?: string,
    limit: number = 50
  ): Promise<Product[]> {
    if (!brand?.trim()) {
      throw new Error('Brand name is required and cannot be empty');
    }

    // The Kroger API requires either 'term' or 'productId' in addition to brand filter
    // We'll use the brand name as the search term to satisfy this requirement
    const params: ProductSearchParams = {
      'filter.term': brand.trim(), // Use brand as search term to satisfy API requirement
      'filter.brand': brand.trim(),
      'filter.limit': limit,
    };

    if (locationId?.trim()) {
      params['filter.location.id'] = locationId.trim(); // Fixed: Use correct parameter name
    }

    const response = await this.search(params);
    return response.data;
  }

  async getProductsWithFulfillment(
    fulfillmentType: 'curbside' | 'delivery' | 'instore' | 'shiptohome',
    locationId: string,
    term?: string,
    limit: number = 50
  ): Promise<Product[]> {
    if (!locationId?.trim()) {
      throw new Error('Location ID is required for fulfillment searches');
    }

    if (!term?.trim()) {
      throw new Error('Search term is required when filtering by fulfillment type');
    }

    const params: ProductSearchParams = {
      'filter.term': term.trim(),
      'filter.fulfillment': fulfillmentType,
      'filter.location.id': locationId.trim(), // Fixed: Use correct parameter name
      'filter.limit': limit,
    };

    const response = await this.search(params);
    return response.data;
  }
}