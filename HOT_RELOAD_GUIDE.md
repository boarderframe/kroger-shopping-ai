# Hot Reloading Development Guide

## Quick Start

### For Sub-Agents and Developers

**Single Command Setup:**
```bash
npm run dev
```

This starts both frontend (Vite) and backend (Node.js) with hot reloading enabled.

## Development Servers

- **Frontend**: http://localhost:3001 (Vite dev server with HMR)
- **Backend**: http://localhost:3000 (Express API server)
- **API Proxy**: All `/api/*` requests automatically proxied from frontend to backend

## What Gets Hot Reloaded

### Frontend (Instant Updates - No Browser Refresh Needed)
- ✅ **HTML files** - Changes appear instantly
- ✅ **CSS files** - Styles update without page reload
- ✅ **JavaScript files** - Hot module replacement (HMR)
- ✅ **Images and assets** - Automatic reload

### Backend (Server Restart - Sub-second)
- ✅ **TypeScript files** in `/src` folder
- ✅ **Configuration changes**
- ✅ **API route modifications**

## File Change Workflow

### For Sub-Agents Making Code Changes:

1. **Frontend Changes:**
   - Edit files in `/public/` folder
   - Changes appear instantly in browser
   - No manual refresh needed

2. **Backend Changes:**
   - Edit files in `/src/` folder  
   - Server automatically restarts
   - Frontend reconnects automatically

3. **No Build Step Required:**
   - Development uses direct TypeScript execution
   - No need to run `npm run build` during development

## Development Commands

```bash
# Start full development environment (recommended)
npm run dev

# Start only backend (if you need frontend separately)
npm run backend:only

# Start only frontend (if backend is running elsewhere)
npm run frontend:dev

# Run TypeScript checks without building
npm run typecheck

# Build for production
npm run build
```

## Troubleshooting

### If Hot Reload Stops Working:

1. **Check terminal for errors** - Both frontend and backend logs are shown
2. **Restart development server**: `Ctrl+C` then `npm run dev`
3. **Clear browser cache**: `Ctrl+Shift+R` or `Cmd+Shift+R`

### File Change Not Detected:

- Ensure files are saved properly
- Check file is in correct directory (`/public` for frontend, `/src` for backend)
- Verify file extension is supported (`.html`, `.css`, `.js`, `.ts`)

### API Calls Not Working:

- Verify backend server is running on port 3000
- Check API endpoints start with `/api/`
- Review proxy configuration in browser dev tools

## Sub-Agent Optimization Tips

1. **Edit files directly** - no need to stop/start servers
2. **Use browser dev tools** - changes reflect immediately
3. **Monitor terminal output** - logs show compilation and restart status
4. **Multiple file changes** - all changes are batched and applied together

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐
│   Frontend      │    │     Backend      │
│   (Vite HMR)    │    │   (ts-node-dev)  │
│   Port 3001     │◄──►│   Port 3000      │
│                 │    │                  │
│ • HTML/CSS/JS   │    │ • TypeScript API │
│ • Instant HMR   │    │ • Auto Restart   │
│ • Proxy to API  │    │ • File Watching  │
└─────────────────┘    └──────────────────┘
```

## Performance Features

- **Vite HMR**: Sub-100ms frontend updates
- **TypeScript compilation**: Transpile-only mode for speed
- **Smart caching**: Dependencies cached, source files watched
- **Proxy optimization**: Direct API forwarding without CORS issues