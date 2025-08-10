#!/bin/bash

# Start FastAPI backend server
echo "Starting Kroger Shopping AI FastAPI Backend..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000