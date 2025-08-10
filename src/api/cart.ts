import { KrogerApiClient } from './client';
import { CartItem } from '../types/kroger';

export class CartApi {
  constructor(private client: KrogerApiClient) {}

  async addToCart(items: CartItem[], accessToken: string): Promise<void> {
    await this.client.put(
      '/cart/add',
      { items },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  }

  async addSingleItem(
    upc: string,
    quantity: number = 1,
    modality: 'PICKUP' | 'DELIVERY' | 'SHIP' = 'PICKUP',
    accessToken: string
  ): Promise<void> {
    const item: CartItem = {
      upc,
      quantity,
      modality,
    };

    await this.addToCart([item], accessToken);
  }

  async addMultipleItems(
    items: Array<{
      upc: string;
      quantity?: number;
      modality?: 'PICKUP' | 'DELIVERY' | 'SHIP';
    }>,
    accessToken: string
  ): Promise<void> {
    const cartItems: CartItem[] = items.map((item) => ({
      upc: item.upc,
      quantity: item.quantity || 1,
      modality: item.modality || 'PICKUP',
    }));

    await this.addToCart(cartItems, accessToken);
  }
}