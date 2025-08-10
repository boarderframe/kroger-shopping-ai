# Kroger Shopping AI

AI-powered Kroger shopping assistant with product search, deals finder, and list management.

## Features

- 🔍 Product search and recommendations
- 📍 Store location finder
- 🛒 Cart management
- 🏪 Department and chain information
- 🔐 Secure OAuth2 authentication

## Prerequisites

- Node.js 18+ and npm
- Kroger Developer Account
- Kroger API credentials (client ID and secret)

## Setup

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your Kroger API credentials:
   ```
   KROGER_CLIENT_ID=aishoppingassistant-bbc7t938
   KROGER_CLIENT_SECRET=your_client_secret_here
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## API Client Usage

### Initialize the API Client

```typescript
import { KrogerApi } from './src/api';

const krogerApi = new KrogerApi();
```

### Search for Products

```typescript
// Search by term
const products = await krogerApi.products.searchByTerm('milk', locationId);

// Search by brand
const brandProducts = await krogerApi.products.searchByBrand('Kroger', locationId);

// Get products available for delivery
const deliveryProducts = await krogerApi.products.getProductsWithFulfillment(
  'delivery',
  locationId,
  'bread'
);
```

### Find Locations

```typescript
// Search by ZIP code
const locations = await krogerApi.locations.searchByZipCode('45202', 10, 20);

// Search by coordinates
const nearbyStores = await krogerApi.locations.searchByCoordinates(
  39.1031, // latitude
  -84.5120, // longitude
  5 // radius in miles
);

// Find locations with specific departments
const storesWithPharmacy = await krogerApi.locations.findLocationsWithDepartments(
  ['pharmacy', 'gas station'],
  '45202'
);
```

### Manage Shopping Cart

```typescript
// Add a single item to cart (requires user authentication)
await krogerApi.cart.addSingleItem(
  '0001111041600', // UPC
  2, // quantity
  'PICKUP', // modality
  userAccessToken
);

// Add multiple items
await krogerApi.cart.addMultipleItems([
  { upc: '0001111041600', quantity: 2 },
  { upc: '0001111042713', quantity: 1, modality: 'DELIVERY' }
], userAccessToken);
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the TypeScript project
- `npm start` - Run the built application
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Project Structure

```
kroger_shopping_ai/
├── docs/api/           # API documentation
├── src/
│   ├── api/           # Kroger API client modules
│   ├── config/        # Configuration management
│   ├── types/         # TypeScript type definitions
│   ├── services/      # Business logic services
│   └── utils/         # Utility functions
├── .env.example       # Environment variables template
├── package.json       # Project dependencies
└── tsconfig.json      # TypeScript configuration
```

## Rate Limits

Be aware of Kroger API rate limits:
- Products API: 10,000 calls/day
- Locations API: 1,600 calls/day per endpoint
- Cart API: 5,000 calls/day
- Identity API: 5,000 calls/day

## Security Notes

- Never commit your `.env` file or expose your client credentials
- Use environment variables for all sensitive configuration
- Implement proper error handling for API failures
- Cache responses when appropriate to reduce API calls

## Next Steps

1. Implement user authentication flow for cart operations
2. Add shopping list management features
3. Create recommendation engine based on user preferences
4. Build conversational AI interface
5. Add recipe integration and meal planning

## Support

For Kroger API issues, visit the [Kroger Developer Portal](https://developer.kroger.com/).

## License

ISC