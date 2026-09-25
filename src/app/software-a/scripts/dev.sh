#!/bin/bash

# bixtx Link Software - Development Script

set -e

echo "🔧 Starting bixtx Link in development mode..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installing dependencies...${NC}"
  npm install
fi

# Set development environment
export NODE_ENV=development
export DEBUG=true

# Start the application
echo -e "${GREEN}✓${NC} Starting application...\n"
npm run dev
