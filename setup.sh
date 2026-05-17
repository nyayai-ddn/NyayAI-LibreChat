#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}LibreChat - Setup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Always operate from the active project root
cd "$(dirname "$0")"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found. Please install Docker Compose.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ docker-compose installed${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠ Node.js not found. Some local development features may not work.${NC}"
else
    echo -e "${GREEN}✓ Node.js installed ($(node -v))${NC}"
fi

echo ""

# Setup environment files
echo -e "${YELLOW}Setting up environment files...${NC}"

setup_env_file() {
    local env_file=$1
    local env_example="${env_file}.example"
    
    if [ ! -f "$env_file" ] && [ -f "$env_example" ]; then
        echo -e "${BLUE}Creating $env_file from $env_example${NC}"
        cp "$env_example" "$env_file"
        echo -e "${GREEN}✓ Created $env_file${NC}"
    elif [ -f "$env_file" ]; then
        echo -e "${GREEN}✓ $env_file already exists${NC}"
    fi
}

setup_env_file ".env"

# Check for librechat.yaml
if [ ! -f "librechat.yaml" ] && [ -f "librechat.example.yaml" ]; then
    echo -e "${BLUE}Creating librechat.yaml from librechat.example.yaml${NC}"
    cp librechat.example.yaml librechat.yaml
    echo -e "${GREEN}✓ Created librechat.yaml${NC}"
elif [ -f "librechat.yaml" ]; then
    echo -e "${GREEN}✓ librechat.yaml already exists${NC}"
fi

echo ""

# Build LibreChat services
echo -e "${YELLOW}Building LibreChat Docker services...${NC}"
docker-compose build --no-cache
echo -e "${GREEN}✓ LibreChat services built${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "${YELLOW}1. Start LibreChat:${NC}"
echo "   docker-compose up -d"
echo ""
echo -e "${YELLOW}2. Access LibreChat:${NC}"
echo "   http://localhost:3080"
echo ""
echo -e "${YELLOW}3. Configure LegalContract endpoint (optional):${NC}"
echo "   Edit librechat.yaml to point to:"
echo "   - Backend: http://legal-contract-backend:8000"
echo "   - Vector DB: http://contract-vectordb:6333"
echo ""
echo -e "${YELLOW}4. Stop LibreChat:${NC}"
echo "   docker-compose down"
echo ""
echo -e "${BLUE}View logs:${NC}"
echo "   docker-compose logs -f"
echo ""
echo -e "${BLUE}Note:${NC} To use LibreChat with NyayAI Contract Review backend:"
echo "  1. Start Contract Review services: paralx-06/./start-all.sh"
echo "  2. Start LibreChat: ./setup.sh && docker-compose up -d"
echo "  3. Use 'LegalContract' endpoint in LibreChat UI"
echo ""
