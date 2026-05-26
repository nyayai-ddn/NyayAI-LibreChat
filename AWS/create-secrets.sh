#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# create-secrets.sh — run ONCE from your Mac to seed AWS Secrets Manager.
#
# Reads live values from NyayAI-LibreChat/.env and stores them as a single
# JSON secret: nyayai/prod/platform-keys
#
# Prerequisites:
#   aws cli configured (aws configure) with a profile that has:
#     secretsmanager:CreateSecret  OR  secretsmanager:PutSecretValue
#
# Usage:
#   cd NyayAI-LibreChat
#   ./AWS/create-secrets.sh [--update]
#
#   --update   overwrites an existing secret (use after rotating a key)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
SECRET_NAME="nyayai/prod/platform-keys"
REGION="us-east-1"

MODE="${1:-create}"

# ── Read values from .env ────────────────────────────────────────────────────
read_env() {
  grep "^${1}=" "$ENV_FILE" | cut -d= -f2- | head -1
}

OPENAI_API_KEY=$(read_env OPENAI_API_KEY)
ANTHROPIC_API_KEY=$(read_env ANTHROPIC_API_KEY)
SARVAM_API_KEY=$(read_env SARVAM_API_KEY)
NYAY_SERVICE_KEY=$(read_env NYAY_SERVICE_KEY)
CREDS_KEY=$(read_env CREDS_KEY)
CREDS_IV=$(read_env CREDS_IV)
JWT_SECRET=$(read_env JWT_SECRET)
JWT_REFRESH_SECRET=$(read_env JWT_REFRESH_SECRET)
MEILI_MASTER_KEY=$(read_env MEILI_MASTER_KEY)

# Validate nothing is empty
for var in OPENAI_API_KEY SARVAM_API_KEY NYAY_SERVICE_KEY CREDS_KEY CREDS_IV JWT_SECRET JWT_REFRESH_SECRET; do
  if [ -z "${!var}" ]; then
    echo "❌ $var is empty in .env — aborting"
    exit 1
  fi
done

# ── Build JSON payload ───────────────────────────────────────────────────────
SECRET_JSON=$(python3 -c "
import json, sys
d = {
    'OPENAI_API_KEY':      sys.argv[1],
    'ANTHROPIC_API_KEY':   sys.argv[2],
    'SARVAM_API_KEY':      sys.argv[3],
    'NYAY_SERVICE_KEY':    sys.argv[4],
    'CREDS_KEY':           sys.argv[5],
    'CREDS_IV':            sys.argv[6],
    'JWT_SECRET':          sys.argv[7],
    'JWT_REFRESH_SECRET':  sys.argv[8],
    'MEILI_MASTER_KEY':    sys.argv[9],
}
print(json.dumps(d))
" \
  "$OPENAI_API_KEY" \
  "$ANTHROPIC_API_KEY" \
  "$SARVAM_API_KEY" \
  "$NYAY_SERVICE_KEY" \
  "$CREDS_KEY" \
  "$CREDS_IV" \
  "$JWT_SECRET" \
  "$JWT_REFRESH_SECRET" \
  "$MEILI_MASTER_KEY"
)

# ── Create or update ─────────────────────────────────────────────────────────
if [ "${MODE}" = "--update" ]; then
  echo "[+] Updating secret: $SECRET_NAME ..."
  aws secretsmanager put-secret-value \
    --region "$REGION" \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_JSON"
  echo "[✓] Secret updated."
else
  echo "[+] Creating secret: $SECRET_NAME ..."
  aws secretsmanager create-secret \
    --region "$REGION" \
    --name "$SECRET_NAME" \
    --description "NyayAI platform API keys — injected by nyayai-restore.sh during EC2 provisioning" \
    --secret-string "$SECRET_JSON"
  echo "[✓] Secret created."
fi

echo ""
echo "Secret ARN:"
aws secretsmanager describe-secret \
  --region "$REGION" \
  --secret-id "$SECRET_NAME" \
  --query ARN \
  --output text
