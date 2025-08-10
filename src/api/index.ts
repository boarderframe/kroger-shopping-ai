import { KrogerApiClient } from './client';
import { ProductsApi } from './products';
import { LocationsApi } from './locations';
import { CartApi } from './cart';
import { IdentityApi } from './identity';

export class KrogerApi {
  private client: KrogerApiClient;
  public products: ProductsApi;
  public locations: LocationsApi;
  public cart: CartApi;
  public identity: IdentityApi;

  constructor() {
    this.client = new KrogerApiClient();
    this.products = new ProductsApi(this.client);
    this.locations = new LocationsApi(this.client);
    this.cart = new CartApi(this.client);
    this.identity = new IdentityApi(this.client);
  }
}

export * from '../types/kroger';
export { KrogerApiClient } from './client';
export { ProductsApi } from './products';
export { LocationsApi } from './locations';
export { CartApi } from './cart';
export { IdentityApi } from './identity';