# Products API Overview

The Products API allows you to search the Kroger product catalog.

## API Reference
For specific parameters and response data, see the Products API Reference.

## Rate Limit
The Public Products API has a 10,000 call per day rate limit.

For all Public APIs, we enforce the rate limit by the number of calls the client makes to the endpoint, not individual API operations. This means you can distribute the 10,000 calls across all API operations using the /products endpoint as you see fit.

## Pagination
The Product Search operation supports pagination with a default value of 10 results per page. Using the following parameters, you can extend and skip results in the response:

- `filter.limit` - Sets a limit on the number of products returned.
- `filter.start` - Sets a number of results to skip in the response.

Note: Since searching by a term acts as a fuzzy search, the order of the results can change with each new request.

## API Operations
The Products API supports the following operations:

| Name | Method | Description |
|------|--------|-------------|
| Product search | GET | Allows you to find products by passing in either a search term or product Id. |
| Product details | GET | Returns product details for a specific product. |

## Response Data

### Product Page URI
`productPageURI` returns the URI portion of the URL required to build the product page URL.

Note: In order to access the product page, you must pre-pend the host name to the URI. Retrieve the host name from the domain value in the Locations API Chains endpoint `/v1/chains` endpoint. For example, with a domain of kroger.com and a URI of `/p/kroger-2-reduced-fat-milk/0001111041600?cid=dis.api.tpi_products-api_20240521_b:all_c:p_t:`, you would end up with a URL of `kroger.com/p/kroger-2-reduced-fat-milk/0001111041600?cid=dis.api.tpi_products-api_20240521_b:all_c:p_t:`

### Additional Response Data
To return the following data from the `/products` endpoint, you must include a location Id in the request. All operations for the products endpoint accept the `filter.locationId` query parameter.

#### Price
Returns the following price objects:
- `price` - Includes both the regular price of the item and the promo price of the item.
- `nationalPrice` - Includes both the regular national price of the item and the national promo price of the item.

Note: Seasonal products only return a price when available. Some items may not have a national prices available.

#### Fulfillment Type
Returns the following boolean objects to indicate an item's fulfillment availability:
- `instore` - The item is sold in store at the given location.
- `shiptohome` - The item is available to be shipped to home.
- `delivery` - The item is available for delivery from the given location.
- `curbside` - The item is available for curbside pickup from the given location.

Note: The instore fulfillment type only indicated that the item is sold by the given location, not that it is in stock.

#### Aisle Locations
Returns the aisle locations of the item for the given location.

#### Inventory
Returns the `stockLevel` of the item. This property is omitted when unavailable:
- `HIGH` - The stock level is high.
- `LOW` - The stock level is low.
- `TEMPORARILY_OUT_OF_STOCK` - The item is temporarily out of stock.