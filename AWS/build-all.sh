#!/bin/bash
# build-all.sh — Rebuild Docker images for all NyayAI services (no start)
#
# Usage:
#   ./AWS/build-all.sh           # incremental build (uses layer cache)
#   ./AWS/build-all.sh --no-cache  # full rebuild, no cache
#
# Builds images for every service and immediately brings containers down.
# Use this after pulling new code to pre-warm images before start-all.sh.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE="$(cd "$SCRIPT_DIR/../.." && pwd)"

BUILD_FLAGS=()
if [[ "${1:-}" == "--no-cache" ]]; then
  BUILD_FLAGS=(--no-cache)
  echo "[i] Building with --no-cache"
fi

log()  { echo "[+] $*"; }
ok()   { echo "[✓] $*"; }
warn() { echo "[!] $*"; }
sep()  { echo ""; echo "════════════════════════════════════════════════════"; echo "  $*"; echo "════════════════════════════════════════════════════"; echo ""; }

# svc_build NAME SUBDIR [compose global flags...]
# Runs `docker compose [flags] build` in the service directory.
svc_build() {
  local name="$1" subdir="$2"
  shift 2
  local dir="$BASE/$subdir"

  sep "$name"
  if [ ! -d "$dir" ]; then
    warn "$name — directory not found, skipping"
    return
  fi

  if [ ! -f "$dir/.env" ]; then
    warn "No .env in $subdir — build may fail if compose requires env vars"
  fi

  cd "$dir"
  docker compose "$@" build "${BUILD_FLAGS[@]}"
  ok "$name built"
}

echo ""
echo "════════════════════════════════════════════════════"
echo "  Building all NyayAI service images"
echo "════════════════════════════════════════════════════"

# ── Build in the same order as start-all ─────────────────────────────────────

svc_build "Contract VectorDB (Qdrant)" \
  "NyayAI-ContractReview-v1/contract_VectorDB"

# LibreChat + nyay-ocr built together via override file
svc_build "LibreChat + nyay-ocr" \
  "NyayAI-LibreChat" \
  -f docker-compose.yml -f docker-compose.override.yml

svc_build "Contract Review Agent" \
  "NyayAI-ContractReview-v1/legal-contract-agent"

svc_build "Legal Research v1" \
  "NyayAI-LegalResearch-v1/legal-research-agent"

svc_build "Legal Research v3" \
  "NyayAI-LegalResearch-v3"

svc_build "Litigation v1" \
  "NyayAI-Litigation-v1"

svc_build "Drafting Assistant v1" \
  "NyayAI-DraftingAssistant-v1"

svc_build "Wills Drafting v1" \
  "NyayAI-WillsDrafting-v1"

# MSWordAddin needs --env-file for variable substitution in compose
sep "MS Word Add-in v2"
MSWORD_DIR="$BASE/NyayAI-MSWordAddin-v2"
if [ ! -d "$MSWORD_DIR" ]; then
  warn "MS Word Add-in v2 — directory not found, skipping"
elif [ ! -f "$MSWORD_DIR/backend/.env" ]; then
  warn "No backend/.env in NyayAI-MSWordAddin-v2 — skipping build"
else
  cd "$MSWORD_DIR"
  docker compose --env-file backend/.env build "${BUILD_FLAGS[@]}"
  ok "MS Word Add-in v2 built"
fi

echo ""
echo "════════════════════════════════════════════════════"
echo "  All NyayAI images built"
echo "════════════════════════════════════════════════════"
echo ""
echo "  Run ./AWS/start-all.sh to bring services up"
echo ""
