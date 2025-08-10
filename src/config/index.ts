import dotenv from 'dotenv';

dotenv.config();

export const config = {
  kroger: {
    clientId: process.env.KROGER_CLIENT_ID || '',
    clientSecret: process.env.KROGER_CLIENT_SECRET || '',
    apiBaseUrl: process.env.KROGER_API_BASE_URL || 'https://api.kroger.com/v1',
    tokenUrl: 'https://api.kroger.com/v1/connect/oauth2/token',
  },
  server: {
    port: parseInt(process.env.PORT || '3100', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  defaults: {
    locationId: process.env.DEFAULT_LOCATION_ID || '',
    zipCode: process.env.DEFAULT_ZIP_CODE || '',
  },
  mock: {
    enabled: (process.env.MOCK_MODE || 'false').toLowerCase() === 'true',
  },
};

export const validateConfig = () => {
  const requiredEnvVars = ['KROGER_CLIENT_ID', 'KROGER_CLIENT_SECRET'];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
      'Please check your .env file or environment configuration.'
    );
  }
};