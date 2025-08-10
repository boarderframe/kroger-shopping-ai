import express from 'express';
import path from 'path';
import fs from 'fs';
import { config, validateConfig } from './config';
import { KrogerApi } from './api';
import { ShoppingAssistant } from './services/shopping-assistant';

const app = express();
const PORT = config.server.port;

// Middleware
app.use(express.json());

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

// Cache buster for development - updates on server restart
let cacheBuster = Date.now();

// Configure static file serving with cache-busting for development
const staticOptions = {
  maxAge: isDevelopment ? 0 : '1d', // No cache in development
  etag: !isDevelopment, // Disable etag in development
  lastModified: !isDevelopment, // Disable last-modified in development
  setHeaders: (res: express.Response, filePath: string) => {
    // Force no-cache for HTML, JS, and CSS files in development
    if (isDevelopment) {
      const ext = path.extname(filePath).toLowerCase();
      if (['.html', '.js', '.css'].includes(ext)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }
};

// Serve the main page with dynamic cache-busting BEFORE static middleware
app.get('/', (_req, res) => {
  const htmlPath = path.join(__dirname, '../public/index.html');
  
  // Set no-cache headers for development
  if (isDevelopment) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Read HTML file and replace cache buster placeholder
    fs.readFile(htmlPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading HTML file:', err);
        return res.status(500).send('Internal Server Error');
      }
      
      // Replace cache buster placeholder with current timestamp
      const dynamicHtml = data.replace(/CACHE_BUSTER_TIMESTAMP/g, cacheBuster.toString());
      
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      res.send(dynamicHtml);
    });
  } else {
    // Production: serve static file normally
    res.sendFile(htmlPath);
  }
});

app.use(express.static(path.join(__dirname, '../public'), staticOptions));

// Initialize API
validateConfig();
const krogerApi = new KrogerApi();
const assistant = new ShoppingAssistant(krogerApi);

// API Routes
app.get('/api/stores/nearby', async (req, res) => {
  try {
    const { zipCode = config.defaults.zipCode, radius = '50' } = req.query;
    console.log(`\n=== STORE SEARCH REQUEST ===`);
    console.log(`Request ZIP: ${zipCode}, radius: ${radius} miles`);
    console.log(`Config default ZIP: ${config.defaults.zipCode}`);
    
    // Try using ZIP code directly first
    console.log('Making API call with ZIP code...');
    const stores = await krogerApi.locations.searchByZipCode(
      zipCode as string,
      parseInt(radius as string),
      50
    );
    console.log('API call completed');
    
    console.log(`Found ${stores.length} stores`);
    if (stores.length > 0) {
      console.log(`First store: ${stores[0].name} in ${stores[0].address.city}, ${stores[0].address.state}`);
      console.log(`Store coordinates: ${stores[0].geolocation?.latitude}, ${stores[0].geolocation?.longitude}`);
      console.log(`Store division: ${stores[0].divisionNumber}`);
    }
    
    console.log('About to send response...');
    try {
      res.json(stores);
      console.log('Response sent successfully');
    } catch (jsonError) {
      console.error('JSON serialization error:', jsonError);
      console.error('Store data causing issue:', JSON.stringify(stores, null, 2));
      throw jsonError;
    }
  } catch (error: any) {
    console.error('Error fetching stores:', error);
    if (error.response) {
      console.error('API Response status:', error.response.status);
      console.error('API Response data:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// Debug endpoint for chain information
app.get('/api/debug/chains', async (_req, res) => {
  try {
    console.log('Getting chain information...');
    const chains = await krogerApi.locations.getChains();
    console.log(`Found ${chains.length} chains:`, chains.map(c => c.name));
    res.json(chains);
  } catch (error) {
    console.error('Error fetching chains:', error);
    // Provide clearer error details to aid setup
    res.status(500).json({ 
      error: 'Failed to fetch chains',
      hint: 'Verify Kroger credentials and application scopes. For public data, ensure your app has access to product and locations APIs.',
    });
  }
});

app.get('/api/products/search', async (req, res) => {
  try {
    const { term, locationId, limit = '10' } = req.query;
    if (!term || !locationId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Enforce Kroger API limit constraint (max 50)
    const parsedLimit = parseInt(limit as string);
    if (parsedLimit > 50) {
      return res.status(400).json({ error: 'Limit cannot exceed 50 (Kroger API maximum)' });
    }

    const products = await krogerApi.products.searchByTerm(
      term as string,
      locationId as string,
      Math.min(parsedLimit, 50)
    );

    const formattedProducts = products.map(product => ({
      id: product.productId,
      name: product.description,
      brand: product.brand,
      size: product.items?.[0]?.size,
      price: product.items?.[0]?.price?.regular,
      salePrice: product.items?.[0]?.price?.promo,
      image: product.images?.[0]?.sizes?.find(s => s.size === 'medium')?.url,
      aisle: product.aisleLocations?.[0] ? {
        number: product.aisleLocations[0].number,
        side: product.aisleLocations[0].side,
        shelf: product.aisleLocations[0].shelfNumber
      } : null
    }));

    res.json(formattedProducts);
  } catch (error: any) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

app.post('/api/shopping-list/deals', async (req, res) => {
  try {
    const { items, locationId } = req.body;
    if (!items || !locationId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const deals = await assistant.findBestDeals(items, locationId);
    
    const formattedDeals = deals.map(deal => ({
      product: {
        id: deal.product.productId,
        name: deal.product.description,
        brand: deal.product.brand,
        size: deal.product.items?.[0]?.size,
        price: deal.product.items?.[0]?.price?.regular,
        salePrice: deal.product.items?.[0]?.price?.promo,
        image: deal.product.images?.[0]?.sizes?.find(s => s.size === 'medium')?.url
      },
      reason: deal.reason,
      savings: deal.savings
    }));

    res.json(formattedDeals);
  } catch (error: any) {
    console.error('Error finding deals:', error);
    res.status(500).json({ error: 'Failed to find deals' });
  }
});

app.post('/api/shopping-list/budget', async (req, res) => {
  try {
    const { items, locationId, budget } = req.body;
    if (!items || !locationId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const smartList = await assistant.buildSmartShoppingList(items, locationId, budget);
    
    const formattedList = {
      items: smartList.items.map(item => ({
        product: {
          id: item.product.productId,
          name: item.product.description,
          brand: item.product.brand,
          size: item.product.items?.[0]?.size,
          price: item.product.items?.[0]?.price?.regular,
          salePrice: item.product.items?.[0]?.price?.promo,
          image: item.product.images?.[0]?.sizes?.find(s => s.size === 'medium')?.url
        },
        quantity: item.quantity,
        subtotal: item.subtotal
      })),
      total: smartList.total,
      withinBudget: smartList.withinBudget
    };

    res.json(formattedList);
  } catch (error: any) {
    console.error('Error building smart list:', error);
    res.status(500).json({ error: 'Failed to build smart list' });
  }
});

app.get('/api/products/:productName/location', async (req, res) => {
  try {
    const { productName } = req.params;
    const { locationId } = req.query;
    
    if (!locationId) {
      return res.status(400).json({ error: 'Missing locationId parameter' });
    }

    const result = await assistant.findProductInAisle(
      productName,
      locationId as string
    );

    if (!result) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      product: {
        id: result.product.productId,
        name: result.product.description,
        brand: result.product.brand,
        image: result.product.images?.[0]?.sizes?.find(s => s.size === 'medium')?.url
      },
      aisle: result.aisle
    });
  } catch (error: any) {
    console.error('Error finding product location:', error);
    res.status(500).json({ error: 'Failed to find product location' });
  }
});

// Development utility to refresh cache buster
if (isDevelopment) {
  app.get('/api/dev/refresh-cache', (_req, res) => {
    cacheBuster = Date.now();
    console.log(`🔄 Cache buster updated to: ${cacheBuster}`);
    res.json({ 
      message: 'Cache buster refreshed', 
      cacheBuster,
      instruction: 'Refresh your browser to see changes'
    });
  });

  app.get('/api/dev/status', (_req, res) => {
    res.json({
      environment: 'development',
      cacheBuster,
      timestamp: new Date().toISOString(),
      message: 'Development mode active - no caching',
      hotReloadTest: '🔥 Backend hot reload test - changed at 02:54:31 EDT 2025',
      serverRestartTime: new Date().toLocaleString()
    });
  });

  app.get('/api/integration-test', (_req, res) => {
    res.json({
      message: '🚀 RAPID CHANGES: Multiple updates demo',
      timestamp: new Date().toISOString(),
      testId: 'rapid-' + Date.now(),
      status: 'sub-agent-workflow-active',
      changesCount: 4,
      demo: 'Hot reloading for AI agents'
    });
  });
}


const server = app.listen(PORT, () => {
  console.log(`🛒 Kroger Shopping AI Assistant is running!`);
  console.log(`🌐 Open your browser to: http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${isDevelopment ? 'Development' : 'Production'}`);
  console.log(`🔄 Cache buster: ${cacheBuster}`);
  console.log(`📝 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
});

// Development mode: disable automatic shutdown
if (process.env.NODE_ENV !== 'development') {
  // Graceful shutdown handling (only in production)
  process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
} else {
  // Development mode: just log signals but don't shutdown
  process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received in development - ignoring');
  });

  process.on('SIGINT', () => {
    console.log('🔄 SIGINT received in development - shutting down...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}

// Handle uncaught exceptions - don't exit in development
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    console.log('🔄 Continuing in development mode...');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    console.log('🔄 Continuing in development mode...');
  }
});