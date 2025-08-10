# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kroger Shopping AI is a full-stack application that integrates with Kroger's Public APIs to provide shopping assistance features. The project uses TypeScript/Node.js for the backend, vanilla JavaScript for the frontend, and includes a Python/Streamlit version under development.

## Development Commands

### Essential Commands
- `npm run dev` - Start both backend (port 3100) and frontend (port 3101) with hot reload
- `npm run build` - Build TypeScript backend and Vite frontend for production
- `npm test` - Run Jest unit tests from tests/ directory
- `npm run lint` - Run ESLint on TypeScript files
- `npm run typecheck` - Check TypeScript types without building

### Testing Commands
- `npx playwright test` - Run E2E tests with Playwright
- `npm test -- --coverage` - Run tests with coverage report
- `npm test tests/unit/specific.test.js` - Run a specific test file

### Python Version
- `streamlit run app.py` - Launch the Streamlit application (port 8501)
- `pip install -r requirements.txt` - Install Python dependencies

## Architecture Overview

### Backend Structure (TypeScript)
The backend serves as an API gateway to Kroger's APIs with caching and business logic:

- **src/server.ts**: Express server with API endpoints and development hot-reload support
- **src/api/**: Kroger API client modules organized by domain (products, locations, cart, identity)
  - `client.ts`: Base API client with OAuth2 token management and request handling
  - Each API module extends the base client with domain-specific methods
- **src/services/shopping-assistant.ts**: Business logic layer for shopping recommendations and deals
- **src/config/**: Configuration management using environment variables

### Frontend Structure
Two frontend implementations exist:

1. **public/**: Production vanilla JavaScript SPA
   - `app.js`: Main application logic with store persistence and search functionality
   - `js/`: Modular managers (StoreManager, ToastManager, InitializationManager)
   - Service worker (`sw.js`) for offline support

2. **modern/frontend/**: React/TypeScript version (in development)
   - Uses Vite, React, and Tailwind CSS
   - Component-based architecture with Zustand for state management

### API Integration
The application uses Kroger's OAuth2 authentication flow:
- Client credentials flow for public data (products, locations)
- Authorization code flow for user-specific operations (cart, profile)
- Token caching with automatic refresh on expiry

### Key API Endpoints
- `/api/stores/nearby`: Find stores by ZIP code
- `/api/products/search`: Search products with location-specific availability
- `/api/shopping-list/deals`: Find best deals for shopping list items
- `/api/products/:name/location`: Get aisle location for products

## Testing Strategy

- **Unit Tests** (`tests/unit/`): Component and function-level testing
- **Integration Tests** (`tests/integration/`): API and service layer testing
- **E2E Tests** (`tests/e2e/`): Full user flow testing with Playwright
- Test utilities and fixtures in `tests/fixtures/`

## Environment Configuration

Required environment variables (set in `.env`):
```
KROGER_CLIENT_ID=your_client_id
KROGER_CLIENT_SECRET=your_client_secret
```

The application defaults to ZIP code 45202 (Cincinnati, OH) if not specified.

## Development Notes

- Backend uses ts-node-dev for hot reloading during development
- Frontend dev server (Vite) proxies API calls to backend
- Cache busting is implemented for development mode to prevent stale content
- Service worker is registered for offline functionality
- Store persistence uses localStorage with migration support for legacy data

## Kroger API Constraints

- Rate limits: Products (10K/day), Locations (1.6K/day), Cart (5K/day)
- Maximum 50 items per product search request
- OAuth tokens expire after 30 minutes
- Location-specific product data requires valid locationId