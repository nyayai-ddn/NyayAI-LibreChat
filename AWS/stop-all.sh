#!/bin/bash
# stop-all.sh — Stop all NyayAI Docker services
#
# Usage:
#   ./AWS/stop-all.sh
#
# Stops services in reverse dependency order (LibreChat first, Qdrant last).
# Missing directories are silently skipped.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE="$(cd "$SCRIPT_DIR/../.." && pwd)"

log()  { echo "[+] $*"; }
ok()   { echo "[✓] $*"; }
warn() { echo "[!] $*"; }

# svc_stop NAME SUBDIR [compose global flags...]
svc_stop() {
  local name="$1" subdir="$2"
  shift 2
  local dir="$BASE/$subdir"

  if [ ! -d "$dir" ]; then
    return
  fi

  log "Stopping $name..."
  cd "$dir"
  docker compose "$@" down || true
  ok "$name stopped"
}

echo ""
echo "════════════════════════════════════════════════════"
echo "  Stopping all NyayAI services"
echo "════════════════════════════════════════════════════"
echo ""

# ── Reverse dependency order ──────────────────────────────────────────────────

svc_stop "MS Word Add-in v2"        "NyayAI-MSWordAddin-v2"
svc_stop "Wills Drafting v1"        "NyayAI-WillsDrafting-v1"
svc_stop "Drafting Assistant v1"    "NyayAI-DraftingAssistant-v1"
svc_stop "Litigation v1"            "NyayAI-Litigation-v1"
svc_stop "Legal Research v3"        "NyayAI-LegalResearch-v3"
svc_stop "Legal Research v1"        "NyayAI-LegalResearch-v1/legal-research-agent"
svc_stop "Contract Review Agent"    "NyayAI-ContractReview-v1/legal-contract-agent"

svc_stop "LibreChat + nyay-ocr" \
  "NyayAI-LibreChat" \
  -f docker-compose.yml -f docker-compose.override.yml

# Qdrant last (shared infrastructure)
svc_stop "Contract VectorDB (Qdrant)" \
  "NyayAI-ContractReview-v1/contract_VectorDB"

echo ""
echo "════════════════════════════════════════════════════"
echo "  All NyayAI services stopped"
echo "════════════════════════════════════════════════════"
echo ""
