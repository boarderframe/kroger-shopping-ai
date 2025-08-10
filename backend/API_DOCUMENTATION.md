# Kroger Shopping AI FastAPI Backend

## Overview

This FastAPI backend provides a comprehensive API for the Kroger Shopping AI application, integrating with Kroger's Public APIs and managing shopping lists and cart functionality.

## Base URL

```
http://localhost:8000
```

## API Documentation

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Authentication

The backend handles Kroger OAuth2 authentication internally using client credentials from environment variables.

## Endpoints

### Health Check

#### GET `/health`
Returns the health status of the API.

**Response:**
```json
{
  "status": "ok"
}
```

### Location Services

#### GET `/api/locations/nearby`
Find Kroger stores near a ZIP code.

**Query Parameters:**
- `zipCode` (string, required): ZIP code to search near
- `radius` (int, optional): Search radius in miles (default: 50)
- `limit` (int, optional): Maximum number of results (default: 50)

**Response:**
```json
[
  {
    "locationId": "01400943",
    "chain": "KROGER",
    "name": "Dublin Marketplace",
    "address": {
      "addressLine1": "6005 Shier Rings Rd",
      "city": "Dublin",
      "state": "OH",
      "zipCode": "43016"
    },
    "geolocation": {
      "latitude": 40.099218,
      "longitude": -83.153393
    }
  }
]
```

### Product Services

#### GET `/api/products/search`
Search for products at a specific Kroger location.

**Query Parameters:**
- `term` (string, required): Search term
- `locationId` (string, required): Kroger location ID
- `limit` (int, optional): Maximum number of results (default: 10, max: 50)

**Response:**
```json
[
  {
    "productId": "0001111041700",
    "description": "Kroger 2% Reduced Fat Milk",
    "brand": "Kroger",
    "images": [...],
    "items": [
      {
        "price": {
          "regular": 3.99,
          "promo": 2.99
        }
      }
    ]
  }
]
```

#### GET `/api/products/sales`
Get products on sale for a search term and location.

**Query Parameters:**
- `locationId` (string, required): Kroger location ID
- `term` (string, required): Search term
- `limit` (int, optional): Maximum number of results (default: 50)

**Response:** Array of products where promo price < regular price

#### GET `/api/products/sales/all`
Get a broad set of sale items for a location.

**Query Parameters:**
- `locationId` (string, required): Kroger location ID
- `max` (int, optional): Maximum number of sale items (default: 150)

**Response:** Array of products on sale

### Shopping Lists

#### POST `/api/lists`
Create a new shopping list.

**Request Body:**
```json
{
  "name": "Weekly Groceries",
  "items": [
    {
      "productId": "0001111041700",
      "description": "Milk",
      "brand": "Kroger",
      "price": 3.99,
      "quantity": 2
    }
  ]
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "name": "Weekly Groceries",
  "items": [...],
  "createdAt": "2024-01-09T12:00:00",
  "updatedAt": "2024-01-09T12:00:00"
}
```

#### GET `/api/lists`
Get all shopping lists.

**Response:** Array of shopping lists

#### GET `/api/lists/{list_id}`
Get a specific shopping list.

**Response:** Shopping list object

#### PUT `/api/lists/{list_id}`
Update a shopping list.

**Request Body:**
```json
{
  "name": "Updated Name",
  "items": [...]
}
```

**Response:** Updated shopping list object

#### DELETE `/api/lists/{list_id}`
Delete a shopping list.

**Response:**
```json
{
  "message": "Shopping list deleted successfully"
}
```

### Cart Management

#### GET `/api/cart`
Get all items in the cart.

**Response:**
```json
[
  {
    "productId": "0001111041700",
    "description": "Milk",
    "brand": "Kroger",
    "price": 3.99,
    "quantity": 2,
    "images": [...]
  }
]
```

#### POST `/api/cart/add`
Add an item to the cart.

**Request Body:**
```json
{
  "productId": "0001111041700",
  "description": "Milk",
  "brand": "Kroger",
  "price": 3.99,
  "quantity": 1,
  "images": [...]
}
```

**Response:** Cart item object

#### DELETE `/api/cart/remove/{product_id}`
Remove an item from the cart.

**Response:**
```json
{
  "message": "Item removed from cart"
}
```

#### PUT `/api/cart/update/{product_id}`
Update the quantity of an item in the cart.

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response:** Updated cart item object

#### DELETE `/api/cart/clear`
Clear all items from the cart.

**Response:**
```json
{
  "message": "Cart cleared successfully"
}
```

#### GET `/api/cart/total`
Calculate the total price of items in the cart.

**Response:**
```json
{
  "total": 45.67,
  "itemCount": 12,
  "uniqueItems": 5
}
```

## Running the Backend

### Prerequisites

1. Python 3.9+
2. Environment variables in root `.env` file:
   ```
   KROGER_CLIENT_ID=your_client_id
   KROGER_CLIENT_SECRET=your_client_secret
   ```

### Installation

```bash
cd modern/backend
pip install -r requirements.txt
```

### Development Server

```bash
# Using the provided script
./run.sh

# Or directly with uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Architecture

### Token Management
- OAuth2 tokens are cached with automatic refresh
- Tokens expire after 30 minutes (cached for 25 minutes)

### Data Storage
- Currently uses in-memory storage for cart and lists
- Can be easily extended to use Redis or PostgreSQL

### Error Handling
- Comprehensive error responses with appropriate HTTP status codes
- Detailed logging for debugging

### CORS Configuration
- Currently allows all origins for development
- Should be restricted in production

## Rate Limits

Kroger API rate limits:
- Products: 10,000 requests/day
- Locations: 1,600 requests/day
- Cart: 5,000 requests/day

## Future Enhancements

1. **Persistent Storage**: Integrate Redis or PostgreSQL for data persistence
2. **User Authentication**: Add user accounts and authentication
3. **WebSocket Support**: Real-time updates for cart and lists
4. **Caching Layer**: Add Redis caching for product searches
5. **Analytics**: Track popular products and search terms
6. **Batch Operations**: Support bulk add/remove for cart and lists