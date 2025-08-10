# Locations API Overview

The Locations API provides access to all locations, chains, and departments that are owned by The Kroger Co.

## API Reference
For specific parameters and response data, see the Locations API Reference.

## Rate Limit
The Public Locations API has a 1,600 call a day per endpoint rate limit.

For the Locations API, there are three endpoints that each have a 1,600 call per day rate limit. Since we enforce the rate limit by the number of calls the client makes to the endpoint and not individual operations, you can distribute the 1,600 calls across operations using the same endpoint as you see fit.

## Pagination
The Locations API does not support pagination. The response has a default limit of 9999 results. You can limit the total number of results for the page using the filter.limit parameter (9999 maximum).

Note: The mile radius is set to a 10 mile default. If you extend the number of results using the filter.limit parameter, you may need to extend the mile radius using the filter.radiusInMiles parameter to get the correct number of results.

## API Operations
The Locations API supports the following operations:

| Name | Method | Description |
|------|--------|-------------|
| Location list | GET | Returns a list of locations matching a given criteria. |
| Location details | GET | Returns the details of a specific location. |
| Location query | HEAD | Determines if a specific location exists. |
| Chain list | GET | Returns a list of all chains owned by The Kroger Co. |
| Chain details | GET | Returns the details of a specific chain. |
| Chain query | HEAD | Determines if a specific chain exists. |
| Department list | GET | Returns a list of all departments for a specific location. |
| Department details | GET | Returns the details of a specific department. |
| Department query | HEAD | Determines if a specific department exists. |