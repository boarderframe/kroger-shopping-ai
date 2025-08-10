# Setup Guide

## Quick Setup

1. **Create your .env file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your Kroger API credentials to the .env file:**
   ```
   KROGER_CLIENT_ID=aishoppingassistant-bbc7t938
   KROGER_CLIENT_SECRET=your_client_secret_here
   ```
   
   ⚠️ **Important**: You need to copy your client secret from the Kroger Developer Portal. Click the refresh icon next to "client_secret" to generate one if you haven't already.

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Test the connection:**
   ```bash
   npm run dev
   ```

## Getting Your Client Secret

1. Go to your [Kroger Developer Dashboard](https://developer.kroger.com/manage/apps)
2. Click on your "AI_Shopping_Assistant" application
3. In the OAuth2 section, click the refresh icon next to "client_secret"
4. Copy the generated secret immediately (it won't be shown again)
5. Paste it in your .env file

## Verify Setup

Run the example script to verify everything is working:

```bash
npm run dev
```

You should see:
- List of Kroger chains
- Nearby store locations (if you set a default ZIP code)
- Sample product search results

## Troubleshooting

### "Missing required environment variables" error
- Make sure you've created the .env file
- Verify both KROGER_CLIENT_ID and KROGER_CLIENT_SECRET are set

### 401 Unauthorized errors
- Your client secret may be incorrect
- Generate a new client secret from the Kroger Developer Portal

### No locations found
- Add a DEFAULT_ZIP_CODE to your .env file:
  ```
  DEFAULT_ZIP_CODE=45202
  ```

## Next Steps

Once setup is complete, you can:
1. Explore the example code in `src/index.ts`
2. Review the API documentation in `docs/api/`
3. Start building your AI shopping assistant features!