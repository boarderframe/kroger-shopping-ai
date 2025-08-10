import { KrogerApi } from '../api';
import { Product, Location } from '../types/kroger';

export interface ShoppingListItem {
  name: string;
  quantity?: number;
  brand?: string;
  notes?: string;
}

export interface ProductRecommendation {
  product: Product;
  reason: string;
  savings?: number;
}

export class ShoppingAssistant {
  constructor(private krogerApi: KrogerApi) {}

  async findBestDeals(
    shoppingList: ShoppingListItem[],
    locationId: string
  ): Promise<ProductRecommendation[]> {
    const recommendations: ProductRecommendation[] = [];

    for (const item of shoppingList) {
      const products = await this.krogerApi.products.searchByTerm(
        item.name,
        locationId,
        10
      );

      const dealsFound = products
        .filter(p => p.items?.[0]?.price?.promo)
        .map(product => {
          const regularPrice = product.items![0].price!.regular || 0;
          const promoPrice = product.items![0].price!.promo || regularPrice;
          const savings = regularPrice - promoPrice;

          return {
            product,
            reason: `On sale! Save $${savings.toFixed(2)}`,
            savings
          };
        })
        .sort((a, b) => (b.savings || 0) - (a.savings || 0));

      if (dealsFound.length > 0) {
        recommendations.push(dealsFound[0]);
      } else if (products.length > 0) {
        const lowestPrice = products.sort((a, b) => {
          const priceA = a.items?.[0]?.price?.regular || Infinity;
          const priceB = b.items?.[0]?.price?.regular || Infinity;
          return priceA - priceB;
        })[0];

        recommendations.push({
          product: lowestPrice,
          reason: 'Lowest price available'
        });
      }
    }

    return recommendations;
  }

  async findNearestStoreWithItems(
    shoppingList: string[],
    zipCode: string,
    maxRadius: number = 10
  ): Promise<{ store: Location; availableItems: string[] } | null> {
    const locations = await this.krogerApi.locations.searchByZipCode(
      zipCode,
      maxRadius,
      10
    );

    for (const location of locations) {
      const availableItems: string[] = [];

      for (const item of shoppingList) {
        const products = await this.krogerApi.products.searchByTerm(
          item,
          location.locationId,
          1
        );

        if (products.length > 0 && products[0].items?.[0]?.fulfillment?.instore) {
          availableItems.push(item);
        }
      }

      if (availableItems.length === shoppingList.length) {
        return { store: location, availableItems };
      }
    }

    const bestLocation = locations[0];
    if (bestLocation) {
      const availableItems: string[] = [];
      for (const item of shoppingList) {
        const products = await this.krogerApi.products.searchByTerm(
          item,
          bestLocation.locationId,
          1
        );
        if (products.length > 0) {
          availableItems.push(item);
        }
      }
      return { store: bestLocation, availableItems };
    }

    return null;
  }

  async compareProductPrices(
    productName: string,
    locationIds: string[]
  ): Promise<Array<{ location: Location; product: Product; price: number }>> {
    const results = [];

    for (const locationId of locationIds) {
      const location = await this.krogerApi.locations.getLocation(locationId);
      const products = await this.krogerApi.products.searchByTerm(
        productName,
        locationId,
        1
      );

      if (products.length > 0) {
        const product = products[0];
        const price = product.items?.[0]?.price?.regular || 0;
        results.push({ location, product, price });
      }
    }

    return results.sort((a, b) => a.price - b.price);
  }

  async buildSmartShoppingList(
    items: string[],
    locationId: string,
    budget?: number
  ): Promise<{
    items: Array<{ product: Product; quantity: number; subtotal: number }>;
    total: number;
    withinBudget: boolean;
  }> {
    const shoppingCart = [];
    let total = 0;

    for (const item of items) {
      const products = await this.krogerApi.products.searchByTerm(
        item,
        locationId,
        5
      );

      if (products.length > 0) {
        const cheapest = products.sort((a, b) => {
          const priceA = a.items?.[0]?.price?.promo || a.items?.[0]?.price?.regular || Infinity;
          const priceB = b.items?.[0]?.price?.promo || b.items?.[0]?.price?.regular || Infinity;
          return priceA - priceB;
        })[0];

        const price = cheapest.items?.[0]?.price?.promo || cheapest.items?.[0]?.price?.regular || 0;
        const subtotal = price;

        shoppingCart.push({
          product: cheapest,
          quantity: 1,
          subtotal
        });

        total += subtotal;
      }
    }

    return {
      items: shoppingCart,
      total,
      withinBudget: !budget || total <= budget
    };
  }

  async findProductInAisle(
    productName: string,
    locationId: string
  ): Promise<{ product: Product; aisle: string } | null> {
    const products = await this.krogerApi.products.searchByTerm(
      productName,
      locationId,
      10
    );

    for (const product of products) {
      if (product.aisleLocations && product.aisleLocations.length > 0) {
        const aisle = product.aisleLocations[0];
        const aisleDescription = `Aisle ${aisle.number}${aisle.side ? `, ${aisle.side} side` : ''}${
          aisle.shelfNumber ? `, Shelf ${aisle.shelfNumber}` : ''
        }`;

        return {
          product,
          aisle: aisleDescription
        };
      }
    }

    return null;
  }

  formatPrice(price?: number): string {
    return price ? `$${price.toFixed(2)}` : 'Price not available';
  }

  formatProduct(product: Product): string {
    const name = product.description || 'Unknown product';
    const brand = product.brand || '';
    const size = product.items?.[0]?.size || '';
    const price = product.items?.[0]?.price?.promo || product.items?.[0]?.price?.regular;
    
    return `${name}${brand ? ` - ${brand}` : ''}${size ? ` (${size})` : ''} - ${this.formatPrice(price)}`;
  }
}