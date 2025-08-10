export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface Location {
  locationId: string;
  storeNumber?: string;
  vanityName?: string;
  divisionNumber?: string;
  phone?: string;
  showWeeklyAd?: boolean;
  showShopThisStore?: boolean;
  address: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    county?: string;
    state?: string;
    zipCode?: string;
  };
  geolocation?: {
    latitude?: number;
    longitude?: number;
    latLng?: string;
  };
  pharmacyHours?: any;
  hours?: any;
  name?: string;
  departments?: Department[];
}

export interface Department {
  departmentId: string;
  name: string;
  phone?: string;
  hours?: any;
}

export interface Product {
  productId: string;
  aisleLocations?: AisleLocation[];
  brand?: string;
  categories?: string[];
  countryOrigin?: string;
  description?: string;
  images?: Image[];
  items?: Item[];
  itemInformation?: ItemInformation;
  temperature?: Temperature;
  upc?: string;
  productPageURI?: string;
}

export interface AisleLocation {
  bayNumber?: string;
  description?: string;
  number?: string;
  numberOfFacings?: number;
  side?: string;
  shelfNumber?: string;
  shelfPositionInBay?: string;
}

export interface Image {
  perspective?: string;
  featured?: boolean;
  sizes?: ImageSize[];
}

export interface ImageSize {
  size: string;
  url: string;
}

export interface Item {
  itemId: string;
  favorite?: boolean;
  fulfillment?: Fulfillment;
  price?: Price;
  nationalPrice?: Price;
  size?: string;
  soldBy?: string;
  inventory?: Inventory;
}

export interface Fulfillment {
  curbside?: boolean;
  delivery?: boolean;
  instore?: boolean;
  shiptohome?: boolean;
}

export interface Price {
  regular?: number;
  promo?: number;
  regularPerUnitEstimate?: number;
  promoPerUnitEstimate?: number;
}

export interface Inventory {
  stockLevel?: 'LOW' | 'HIGH' | 'TEMPORARILY_OUT_OF_STOCK';
}

export interface ItemInformation {
  depth?: string;
  height?: string;
  width?: string;
}

export interface Temperature {
  indicator?: string;
  heatSensitive?: boolean;
}

export interface Chain {
  name: string;
  divisionNumber: string;
  domain?: string;
}

export interface CartItem {
  upc: string;
  quantity?: number;
  modality?: 'PICKUP' | 'DELIVERY' | 'SHIP';
}

export interface UserProfile {
  id: string;
}

export interface LocationSearchParams {
  'filter.zipCode.near'?: string;
  'filter.latLong.near'?: string;  // Added support for combined lat/long
  'filter.lat.near'?: number;
  'filter.lon.near'?: number;
  'filter.radiusInMiles'?: number;
  'filter.limit'?: number;
  'filter.chain'?: string;
  'filter.department'?: string;
  'filter.location.id'?: string;
}

export interface ProductSearchParams {
  'filter.term'?: string;
  'filter.location.id'?: string; // Fixed: Based on actual API error, Kroger API uses filter.location.id
  'filter.productId'?: string;
  'filter.brand'?: string;
  'filter.fulfillment'?: string;
  'filter.limit'?: number;
  'filter.start'?: number;
}