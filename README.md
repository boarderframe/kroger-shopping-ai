# Kroger Shopping AI

AI-powered Kroger shopping assistant with product search, deals finder, and list management.

## Features

- 🔍 **Smart Product Search** - Search products with pagination and filters
- 🏪 **Store Locator** - Find nearby Kroger stores by ZIP code
- 💰 **Deals Finder** - Discover sales and special offers
- 📝 **Shopping Lists** - Create and manage multiple shopping lists
- 🛒 **Cart Management** - Add items to cart and track totals
- 🎨 **Beautiful UI** - Modern React interface with Material-UI
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

### Frontend
- React 18 with TypeScript
- Material-UI (MUI) for components
- Vite for build tooling
- Zustand for state management

### Backend
- FastAPI (Python)
- Kroger API integration
- Redis for caching
- PostgreSQL for data persistence

### Infrastructure
- Docker & Docker Compose
- Environment-based configuration

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Kroger API credentials ([Get them here](https://developer.kroger.com))

### Setup

1. Clone the repository:
```bash
git clone https://github.com/boarderframe/kroger-shopping-ai.git
cd kroger-shopping-ai
```

2. Create `.env` file in the root directory:
```env
KROGER_CLIENT_ID=your_client_id
KROGER_CLIENT_SECRET=your_client_secret
```

3. Start the application:
```bash
docker-compose up -d --build
```

4. Access the application:
- Frontend: http://localhost:9100
- Backend API: http://localhost:9000
- API Documentation: http://localhost:9000/docs

## Development

### Running locally without Docker

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
kroger-shopping-ai/
├── backend/           # FastAPI backend
│   ├── app/
│   │   └── main.py   # API endpoints and business logic
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/          # React frontend
│   ├── src/
│   │   ├── App.tsx   # Main application component
│   │   ├── components/
│   │   ├── services/
│   │   └── types/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## API Endpoints

- `GET /api/locations/nearby` - Find nearby stores
- `GET /api/products/search` - Search products
- `GET /api/products/search/all` - Search with aggregation
- `GET /api/products/sales` - Get sale items
- `GET /api/cart` - Get cart contents
- `POST /api/cart/add` - Add item to cart
- `DELETE /api/cart/remove/{id}` - Remove from cart

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `KROGER_CLIENT_ID` | Kroger API client ID | Yes |
| `KROGER_CLIENT_SECRET` | Kroger API client secret | Yes |
| `KROGER_API_BASE_URL` | Kroger API base URL | No (default: https://api.kroger.com/v1) |

## License

MIT

## Contributing

Pull requests are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please use the [GitHub Issues](https://github.com/boarderframe/kroger-shopping-ai/issues) page.