#!/bin/bash
# Start LibreChat UI Service Only

set -e

echo "════════════════════════════════════════════════════════════"
echo "  Starting LibreChat UI"
echo "════════════════════════════════════════════════════════════"
echo ""

# Change to LibreChat directory
cd "$(dirname "$0")"

# Check if network exists
if ! docker network ls | grep -q paralx-network; then
    echo "Creating paralx-network..."
    docker network create paralx-network
    echo "✓ Network created"
else
    echo "✓ Network exists: paralx-network"
fi

# Set UID/GID to avoid warnings (check if already set to avoid readonly error)
if [ -z "$USER_ID" ]; then
    export USER_ID=$(id -u)
fi
if [ -z "$GROUP_ID" ]; then
    export GROUP_ID=$(id -g)
fi

# Start LibreChat
echo ""
echo "Starting LibreChat services..."

CORE_SERVICES=(api mongodb vectordb rag_api nyay-ocr)
START_SERVICES=("${CORE_SERVICES[@]}")

if docker compose config --services 2>/dev/null | grep -qx "mongo-express"; then
    if docker ps -a --format '{{.Names}}' | grep -qx 'mongo-express'; then
        echo "⚠ mongo-express container already exists; skipping recreation"
        if ! docker ps --format '{{.Names}}' | grep -qx 'mongo-express'; then
            echo "↻ Starting existing mongo-express container"
            docker start mongo-express >/dev/null
        else
            echo "✓ Using existing mongo-express container"
        fi
    else
        START_SERVICES+=(mongo-express)
    fi
fi

docker compose up -d "${START_SERVICES[@]}"

# Wait for services to be ready
echo ""
echo -n "Waiting for LibreChat to be ready"
for i in {1..30}; do
    if curl -s http://localhost:3080 > /dev/null 2>&1; then
        echo " ✓"
        break
    fi
    echo -n "."
    sleep 1
done

# Show status
echo ""
echo "════════════════════════════════════════════════════════════"
docker compose ps
echo "════════════════════════════════════════════════════════════"
echo ""
echo "✅ LibreChat is running!"
echo ""
echo "   UI:           http://localhost:3080"
echo "   API:          http://localhost:3080/api"
echo "   OCR Service:  http://localhost:8100"
echo ""
echo "🔧 Available Endpoints:"
echo "   - OpenAI (configure API key in UI)"
echo "   - LegalContract (requires backend at localhost:8001)"
echo "   - Other configured endpoints"
echo ""
echo "Stop service:"
echo "   docker compose down"
echo ""
echo "View logs:"
echo "   docker logs -f LibreChat"
echo ""
