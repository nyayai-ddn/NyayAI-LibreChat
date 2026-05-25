#!/bin/bash
# start-all.sh — Start all NyayAI Docker services
#
# Usage:
#   ./AWS/start-all.sh
#
# Services are started in dependency order (Qdrant first, LibreChat second,
# downstream MCP services last). Directories that don't exist are skipped
# gracefully — safe to run on a partial deployment.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE="$(cd "$SCRIPT_DIR/../.." && pwd)"   # paralx-09/ on Mac; NyayAI_Demo/ on EC2

log()  { echo "[+] $*"; }
ok()   { echo "[✓] $*"; }
warn() { echo "[!] $*"; }
sep()  { echo ""; echo "════════════════════════════════════════════════════"; echo "  $*"; echo "════════════════════════════════════════════════════"; echo ""; }

# svc_start NAME SUBDIR [compose global flags...]
# Starts a service with `docker compose [flags] up -d`.
# Skips gracefully if the directory doesn't exist.
svc_start() {
  local name="$1" subdir="$2"
  shift 2
  local dir="$BASE/$subdir"

  sep "$name"
  if [ ! -d "$dir" ]; then
    warn "$name — directory not found, skipping"
    return
  fi

  if [ ! -f "$dir/.env" ]; then
    warn "No .env in $subdir — service may fail to start"
  fi

  cd "$dir"
  docker compose "$@" up -d
  ok "$name started"
}

# ── Ensure shared network ─────────────────────────────────────────────────────
log "Ensuring paralx-network exists..."
docker network create paralx-network 2>/dev/null || true
ok "paralx-network ready"

# ── Services — in dependency order ───────────────────────────────────────────

# 1. Qdrant vector DB (ContractReview agent depends on it)
svc_start "Contract VectorDB (Qdrant)" \
  "NyayAI-ContractReview-v1/contract_VectorDB"

# 2. LibreChat + nyay-ocr (core UI; override adds nyay-ocr service)
svc_start "LibreChat + nyay-ocr" \
  "NyayAI-LibreChat" \
  -f docker-compose.yml -f docker-compose.override.yml

# 3. Contract Review backend (connects to Qdrant on paralx-network)
svc_start "Contract Review Agent" \
  "NyayAI-ContractReview-v1/legal-contract-agent"

# 4. Legal Research v1
svc_start "Legal Research v1" \
  "NyayAI-LegalResearch-v1/legal-research-agent"

# 5. Legal Research v3
svc_start "Legal Research v3" \
  "NyayAI-LegalResearch-v3"

# 6. Litigation v1
svc_start "Litigation v1" \
  "NyayAI-Litigation-v1"

# 7. Drafting Assistant v1
svc_start "Drafting Assistant v1" \
  "NyayAI-DraftingAssistant-v1"

# 8. Wills Drafting v1
svc_start "Wills Drafting v1" \
  "NyayAI-WillsDrafting-v1"

# 9. MS Word Add-in v2 (uses backend/.env, not root .env)
sep "MS Word Add-in v2"
MSWORD_DIR="$BASE/NyayAI-MSWordAddin-v2"
if [ ! -d "$MSWORD_DIR" ]; then
  warn "MS Word Add-in v2 — directory not found, skipping"
elif [ ! -f "$MSWORD_DIR/backend/.env" ]; then
  warn "No backend/.env in NyayAI-MSWordAddin-v2 — skipping"
else
  cd "$MSWORD_DIR"
  docker compose --env-file backend/.env up -d
  ok "MS Word Add-in v2 started"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════"
echo "  All NyayAI services started"
echo "════════════════════════════════════════════════════"
echo ""
echo "  LibreChat:           http://localhost:3080"
echo "  OCR Service:         http://localhost:8100"
echo "  Qdrant (Vector DB):  http://localhost:6333/dashboard"
echo "  Contract Review:     http://localhost:8001"
echo "  Legal Research v1:   http://localhost:8104"
echo "  Legal Research v3:   http://localhost:8106"
echo "  Litigation:          http://localhost:8105"
echo "  Drafting Assistant:  http://localhost:8004"
echo "  MS Word Add-in:      http://localhost:8007"
echo ""
