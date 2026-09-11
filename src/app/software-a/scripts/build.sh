#!/bin/bash

# Lawrix Link Software - Build Script

set -e

echo "🚀 Building Lawrix Link Software..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
  echo -e "${RED}❌ Node.js 16 or higher is required${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Node.js version: $(node -v)"

# Clean previous builds
echo -e "\n${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf dist/
rm -rf out/

# Install dependencies
echo -e "\n${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Compile TypeScript
echo -e "\n${YELLOW}🔨 Compiling TypeScript...${NC}"
npm run build

echo -e "${GREEN}✓${NC} TypeScript compiled successfully"

# Package application
echo -e "\n${YELLOW}📦 Packaging application...${NC}"
npm run package

echo -e "${GREEN}✓${NC} Application packaged successfully"

# Create distributables
echo -e "\n${YELLOW}📦 Creating distributables...${NC}"
npm run make

echo -e "${GREEN}✓${NC} Distributables created successfully"

# Show output
echo -e "\n${GREEN}✨ Build completed successfully!${NC}"
echo -e "\nDistributables can be found in: ${YELLOW}./out/make/${NC}"

ls -lh out/make/
