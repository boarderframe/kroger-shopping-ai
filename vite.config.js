import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  // Root directory for Vite (where index.html is located)
  root: 'public',
  
  // Development server configuration
  server: {
    port: 3101, // Frontend dev server port (moved from 3001)
    open: true, // Auto-open browser
    cors: true,
    host: 'localhost',
    
    // Proxy API calls to backend server
    proxy: {
      '/api': {
        target: 'http://localhost:3100', // Backend server (moved from 3000)
        changeOrigin: true,
        secure: false,
        // Add logging for debugging
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url);
          });
        }
      }
    }
  },
  
  // Build configuration
  build: {
    outDir: '../dist-frontend', // Output directory for production builds
    emptyOutDir: true,
    
    // Asset handling
    assetsDir: 'assets',
    
    // Generate sourcemaps for debugging
    sourcemap: true,
    
    // Optimize for modern browsers but include legacy support
    target: ['es2020', 'chrome80', 'firefox80', 'safari14'],
  },
  
  // Plugin configuration
  plugins: [
    // Add legacy browser support for production
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  
  // CSS configuration
  css: {
    devSourcemap: true, // Enable CSS sourcemaps in dev
  },
  
  // Enable advanced hot reload features
  optimizeDeps: {
    exclude: [] // Dependencies to exclude from pre-bundling
  },
  
  // File watching configuration
  define: {
    // Replace process.env variables if needed
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});