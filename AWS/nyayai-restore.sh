#!/bin/bash
set -euo pipefail

LOG_FILE="/var/log/nyayai-restore.log"
exec > >(tee -a "$LOG_FILE") 2>&1

MARKER_DIR="/var/lib/nyayai"
MARKER_FILE="$MARKER_DIR/.restore_complete"

mkdir -p "$MARKER_DIR"

if [ -f "$MARKER_FILE" ]; then
  echo "[✓] Restore already completed — exiting"
  exit 0
fi

echo "========================================"
echo "[+] NyayAI restore started at $(date)"
echo "========================================"

S3_BUCKET="s3://nyayai-legal-data"
SECRET_NAME="nyayai/prod/platform-keys"
AWS_REGION="us-east-1"

CODE_DST="/home/ubuntu/NyayAI_Demo"
CODE_SRC="$S3_BUCKET/ebs-backup/NyayAI_Demo"

OLLAMA_DST="/home/ubuntu/.ollama/models"
OLLAMA_SRC="$S3_BUCKET/models/ollama/models"

QDRANT_DST="/data/qdrant"
QDRANT_SRC="$S3_BUCKET/qdrant/volume-backups"

DATA_MOUNT="/data"
OLLAMA_PORT="11434"

GITHUB_ORG="https://github.com/nyayai-ddn"  # overridden below once token is known

id ubuntu >/dev/null 2>&1 || useradd -m ubuntu

# ── Install jq (needed for secret parsing) ────────────────────────────────────
if ! command -v jq >/dev/null 2>&1; then
  apt-get update -y -qq
  apt-get install -y -qq jq
fi

# ── Fetch secrets from AWS Secrets Manager ────────────────────────────────────
echo "========================================"
echo "[+] $(date +%T) Fetching secrets from AWS Secrets Manager..."
echo "========================================"
SECRET_JSON=$(aws secretsmanager get-secret-value \
  --region "$AWS_REGION" \
  --secret-id "$SECRET_NAME" \
  --query SecretString \
  --output text)

# Parse each secret into a shell variable
OPENAI_API_KEY=$(echo "$SECRET_JSON"     | jq -r '.OPENAI_API_KEY')
ANTHROPIC_API_KEY=$(echo "$SECRET_JSON" | jq -r '.ANTHROPIC_API_KEY')
SARVAM_API_KEY=$(echo "$SECRET_JSON"    | jq -r '.SARVAM_API_KEY')
NYAY_SERVICE_KEY=$(echo "$SECRET_JSON"  | jq -r '.NYAY_SERVICE_KEY')
CREDS_KEY=$(echo "$SECRET_JSON"         | jq -r '.CREDS_KEY')
CREDS_IV=$(echo "$SECRET_JSON"          | jq -r '.CREDS_IV')
JWT_SECRET=$(echo "$SECRET_JSON"        | jq -r '.JWT_SECRET')
JWT_REFRESH_SECRET=$(echo "$SECRET_JSON"| jq -r '.JWT_REFRESH_SECRET')
MEILI_MASTER_KEY=$(echo "$SECRET_JSON"  | jq -r '.MEILI_MASTER_KEY')
GITHUB_TOKEN=$(echo "$SECRET_JSON"     | jq -r '.GITHUB_TOKEN // empty')

echo "[✓] Secrets fetched."

# Embed token in GitHub org base URL so all clone_or_pull calls authenticate
if [ -n "$GITHUB_TOKEN" ]; then
  GITHUB_ORG="https://${GITHUB_TOKEN}@github.com/nyayai-ddn"
fi

# ── Helper: inject a key=value into an .env file ──────────────────────────────
# Replaces an existing blank line (KEY=) or appends if key not present.
# Uses python3 to safely handle special characters in values.
inject_secret() {
  local file="$1" key="$2" value="$3"
  python3 -c "
import sys, re
key, val, path = sys.argv[1], sys.argv[2], sys.argv[3]
data = open(path).read()
pattern = r'^' + re.escape(key) + r'=.*'
replacement = key + '=' + val
if re.search(pattern, data, re.MULTILINE):
    data = re.sub(pattern, replacement, data, flags=re.MULTILINE)
else:
    data += '\n' + replacement + '\n'
open(path, 'w').write(data)
" "$key" "$value" "$file"
}

# ── Wait for Docker daemon ─────────────────────────────────────────────────────
echo "[+] Waiting for Docker daemon..."
until docker info >/dev/null 2>&1; do sleep 2; done
echo "[✓] Docker daemon ready."

# ── EBS data volume ────────────────────────────────────────────────────────────
ROOT_DEV=$(lsblk -no PKNAME "$(df / | tail -1 | awk '{print $1}')")
DATA_DEV=$(lsblk -ndo NAME,TYPE | awk '$2=="disk"{print "/dev/"$1}' | grep -v "$ROOT_DEV" | head -n 1 || true)

if [ -n "$DATA_DEV" ]; then
  mkdir -p "$DATA_MOUNT"
  if ! blkid "$DATA_DEV" >/dev/null 2>&1; then
    mkfs.ext4 "$DATA_DEV"
  fi
  mount "$DATA_DEV" "$DATA_MOUNT" || true

  if ! grep -q "$DATA_MOUNT" /etc/fstab; then
    UUID=$(blkid -s UUID -o value "$DATA_DEV")
    echo "UUID=$UUID  $DATA_MOUNT  ext4  defaults,nofail  0  2" >> /etc/fstab
  fi
fi

# ── Create shared Docker network ───────────────────────────────────────────────
echo "[+] Ensuring paralx-network exists..."
docker network create paralx-network 2>/dev/null || true
echo "[✓] paralx-network ready."

# ── Helper: clone-or-pull a repo ───────────────────────────────────────────────
# Usage: clone_or_pull <dest_dir> <repo_name>
clone_or_pull() {
  local dest="$1"
  local repo="$2"
  if [ -d "$dest/.git" ]; then
    echo "[+] Pulling $repo..."
    sudo -u ubuntu git -C "$dest" fetch origin
    sudo -u ubuntu git -C "$dest" reset --hard origin/main
    sudo -u ubuntu git -C "$dest" clean -fd
  else
    echo "[+] Cloning $repo..."
    sudo -u ubuntu git clone "$GITHUB_ORG/$repo.git" "$dest"
  fi
  echo "[✓] $repo up to date."
}

# ── Restore application code from S3 snapshot ─────────────────────────────────
echo "========================================"
echo "[+] $(date +%T) Restoring application code from S3..."
echo "========================================"
rm -rf "$CODE_DST"
mkdir -p "$CODE_DST"
aws s3 sync "$CODE_SRC" "$CODE_DST"
chown -R ubuntu:ubuntu "$CODE_DST"

# ── NyayAI-LangTranslate-v1 (must be cloned before LibreChat build) ────────────
echo "============================================================"
echo "[+] $(date +%T) NyayAI-LangTranslate-v1"
echo "============================================================"
clone_or_pull "$CODE_DST/NyayAI-LangTranslate-v1" "NyayAI-LangTranslate-v1"
# No docker build here — nyay-ocr is built as part of LibreChat's override

# ── NyayAI-ContractReview-v1 ──────────────────────────────────────────────────
echo "============================================================"
echo "[+] $(date +%T) NyayAI-ContractReview-v1"
echo "============================================================"
clone_or_pull "$CODE_DST/NyayAI-ContractReview-v1" "NyayAI-ContractReview-v1"

echo "[+] Configuring and rebuilding legal-contract-agent service..."
cd "$CODE_DST/NyayAI-ContractReview-v1/legal-contract-agent"
cp .env.ec2 .env
inject_secret .env LLM__API_KEY       "$OPENAI_API_KEY"
inject_secret .env EMBEDDING__API_KEY "$OPENAI_API_KEY"
sudo -u ubuntu docker compose down || true
sudo -u ubuntu docker compose up -d --build
sudo -u ubuntu docker compose down
echo "[✓] legal-contract-agent rebuilt."

echo "[+] Configuring and rebuilding contract VectorDB service..."
cd "$CODE_DST/NyayAI-ContractReview-v1/contract_VectorDB"
cp .env.ec2 .env
chmod +x *.sh
sudo -u ubuntu docker compose down || true
sudo -u ubuntu docker compose up -d --build
sudo -u ubuntu docker compose down
echo "[✓] contract VectorDB rebuilt."

# ── NyayAI-LibreChat (includes nyay-ocr via override) ─────────────────────────
echo "============================================================"
echo "[+] $(date +%T) NyayAI-LibreChat"
echo "============================================================"
clone_or_pull "$CODE_DST/NyayAI-LibreChat" "NyayAI-LibreChat"

echo "[+] Injecting secrets into LibreChat .env..."
cd "$CODE_DST/NyayAI-LibreChat"
inject_secret .env OPENAI_API_KEY     "$OPENAI_API_KEY"
inject_secret .env ANTHROPIC_API_KEY  "$ANTHROPIC_API_KEY"
inject_secret .env SARVAM_API_KEY     "$SARVAM_API_KEY"
inject_secret .env NYAY_SERVICE_KEY   "$NYAY_SERVICE_KEY"
inject_secret .env CREDS_KEY          "$CREDS_KEY"
inject_secret .env CREDS_IV           "$CREDS_IV"
inject_secret .env JWT_SECRET         "$JWT_SECRET"
inject_secret .env JWT_REFRESH_SECRET "$JWT_REFRESH_SECRET"
inject_secret .env MEILI_MASTER_KEY   "$MEILI_MASTER_KEY"

echo "[+] Rebuilding LibreChat + nyay-ocr services..."
sudo -u ubuntu docker compose -f docker-compose.yml -f docker-compose.override.yml down || true
sudo -u ubuntu docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
sudo -u ubuntu docker compose -f docker-compose.yml -f docker-compose.override.yml down
echo "[✓] LibreChat rebuilt."

# ── NyayAI-LegalResearch-v1 ───────────────────────────────────────────────────
echo "============================================================"
echo "[+] $(date +%T) NyayAI-LegalResearch-v1"
echo "============================================================"
clone_or_pull "$CODE_DST/NyayAI-LegalResearch-v1" "NyayAI-LegalResearch-v1"

cd "$CODE_DST/NyayAI-LegalResearch-v1/legal-research-agent"
cp .env.ec2 .env
inject_secret .env LLM__API_KEY       "$OPENAI_API_KEY"
inject_secret .env EMBEDDING__API_KEY "$OPENAI_API_KEY"
sudo -u ubuntu docker compose down || true
sudo -u ubuntu docker compose up -d --build
sudo -u ubuntu docker compose down
echo "[✓] NyayAI-LegalResearch-v1 rebuilt."

# ── NyayAI-LegalResearch-v3 ───────────────────────────────────────────────────
echo "============================================================"
echo "[+] $(date +%T) NyayAI-LegalResearch-v3"
echo "============================================================"
clone_or_pull "$CODE_DST/NyayAI-LegalResearch-v3" "NyayAI-LegalResearch-v3"

cd "$CODE_DST/NyayAI-LegalResearch-v3"
cp .env.ec2 .env
inject_secret .env OPENAI_API_KEY "$OPENAI_API_KEY"
sudo -u ubuntu docker compose down || true
sudo -u ubuntu docker compose up -d --build
sudo -u ubuntu docker compose down
echo "[✓] NyayAI-LegalResearch-v3 rebuilt."

# ── NyayAI-Litigation-v1 ──────────────────────────────────────────────────────
echo "============================================================"
echo "[+] $(date +%T) NyayAI-Litigation-v1"
echo "============================================================"
clone_or_pull "$CODE_DST/NyayAI-Litigation-v1" "NyayAI-Litigation-v1"

cd "$CODE_DST/NyayAI-Litigation-v1"
cp .env.ec2 .env
inject_secret .env OPENAI_API_KEY  "$OPENAI_API_KEY"
inject_secret .env NYAY_SERVICE_KEY "$NYAY_SERVICE_KEY"
sudo -u ubuntu docker compose down || true
sudo -u ubuntu docker compose up -d --build
sudo -u ubuntu docker compose down
echo "[✓] NyayAI-Litigation-v1 rebuilt."

# ── NyayAI-DraftingAssistant-v1 ───────────────────────────────────────────────
echo "============================================================"
echo "[+] $(date +%T) NyayAI-DraftingAssistant-v1"
echo "============================================================"
clone_or_pull "$CODE_DST/NyayAI-DraftingAssistant-v1" "NyayAI-DraftingAssistant-v1"

cd "$CODE_DST/NyayAI-DraftingAssistant-v1"
cp .env.ec2 .env
sudo -u ubuntu docker compose down || true
sudo -u ubuntu docker compose up -d --build
sudo -u ubuntu docker compose down
echo "[✓] NyayAI-DraftingAssistant-v1 rebuilt."

# ── NyayAI-WillsDrafting-v1 ───────────────────────────────────────────────────
echo "============================================================"
echo "[+] $(date +%T) NyayAI-WillsDrafting-v1"
echo "============================================================"
clone_or_pull "$CODE_DST/NyayAI-WillsDrafting-v1" "NyayAI-WillsDrafting-v1"

cd "$CODE_DST/NyayAI-WillsDrafting-v1"
sudo -u ubuntu docker compose down || true
sudo -u ubuntu docker compose up -d --build
sudo -u ubuntu docker compose down
echo "[✓] NyayAI-WillsDrafting-v1 rebuilt."

# ── NyayAI-Legal-Workflows (code only, no service) ────────────────────────────
echo "============================================================"
echo "[+] $(date +%T) NyayAI-Legal-Workflows"
echo "============================================================"
clone_or_pull "$CODE_DST/NyayAI-Legal-Workflows" "NyayAI-Legal-Workflows"
echo "[✓] NyayAI-Legal-Workflows checked out."

# ── EC2→S3 backup scripts ─────────────────────────────────────────────────────
echo "========================================"
echo "[+] $(date +%T) Installing EC2→S3 backup scripts..."
echo "========================================"
SCRIPTS_S3_PREFIX="s3://nyayai-legal-data/scripts"
SCRIPTS_DST="/usr/local/bin"
mkdir -p "$SCRIPTS_DST"
aws s3 sync "$SCRIPTS_S3_PREFIX" "$SCRIPTS_DST" \
  --exclude "*" \
  --include "EC2-2-S3-*.sh"
chmod +x "$SCRIPTS_DST"/EC2-2-S3-*.sh
echo "[✓] Backup scripts installed:"
ls -1 "$SCRIPTS_DST"/EC2-2-S3-*.sh || true

# ── Permissions ───────────────────────────────────────────────────────────────
echo "========================================"
echo "[+] $(date +%T) Fixing mounts and permissions..."
echo "========================================"

cd "$CODE_DST/NyayAI-LibreChat"
mkdir -p uploads logs images
chown -R ubuntu:ubuntu uploads logs images librechat.yaml
chmod 755 uploads logs images
chmod 644 librechat.yaml
chmod +x *.sh

cd "$CODE_DST/NyayAI-ContractReview-v1/legal-contract-agent"
chmod +x *.sh 2>/dev/null || true

cd "$CODE_DST/NyayAI-LangTranslate-v1"
# env vars injected via LibreChat override — no .env copy needed here

cd "$CODE_DST/NyayAI-Litigation-v1"
chmod +x *.sh 2>/dev/null || true

cd "$CODE_DST/NyayAI-DraftingAssistant-v1"
chmod +x *.sh 2>/dev/null || true

chown -R ubuntu:ubuntu "$CODE_DST"
echo "[✓] Permissions fixed."

# ── Qdrant data from S3 ───────────────────────────────────────────────────────
echo "========================================"
echo "[+] $(date +%T) Restoring Qdrant data from S3..."
echo "========================================"
rm -rf "$QDRANT_DST"
mkdir -p "$QDRANT_DST"
aws s3 sync "$QDRANT_SRC" "$QDRANT_DST"

QDRANT_ARCHIVE=$(find "$QDRANT_DST" -maxdepth 1 -type f -name "*.tar.gz" | head -n 1 || true)
if [ -n "$QDRANT_ARCHIVE" ]; then
  echo "[+] Extracting Qdrant archive: $QDRANT_ARCHIVE"
  tar -xzf "$QDRANT_ARCHIVE" -C "$QDRANT_DST"
  rm -f "$QDRANT_ARCHIVE"
else
  echo "[!] No Qdrant .tar.gz archive found — skipping extraction"
fi

chown -R ubuntu:ubuntu "$QDRANT_DST"
echo "[✓] Qdrant data restored."

# ── Ollama ────────────────────────────────────────────────────────────────────
echo "========================================"
echo "[+] $(date +%T) Configuring Ollama..."
echo "========================================"
mkdir -p "$OLLAMA_DST"
# Ollama model sync commented out — restore from S3 on demand to save time
# aws s3 sync "$OLLAMA_SRC" "$OLLAMA_DST"
chown -R ubuntu:ubuntu /home/ubuntu/.ollama

systemctl stop ollama || true
systemctl disable ollama || true
systemctl mask ollama || true

if ! grep -q "OLLAMA_HOST=0.0.0.0:$OLLAMA_PORT" /home/ubuntu/.bashrc; then
  echo "export OLLAMA_HOST=0.0.0.0:$OLLAMA_PORT" >> /home/ubuntu/.bashrc
fi

if ! pgrep -f "ollama serve" >/dev/null; then
  sudo -u ubuntu bash -c "OLLAMA_HOST=0.0.0.0:$OLLAMA_PORT nohup ollama serve > /home/ubuntu/ollama.log 2>&1 &"
fi

# ── Start LibreChat + nyay-ocr ────────────────────────────────────────────────
echo "========================================"
echo "[+] $(date +%T) Starting NyayAI services..."
echo "========================================"
cd "$CODE_DST/NyayAI-LibreChat"
sudo -u ubuntu bash -c "./AWS/start-all.sh"
echo "[✓] NyayAI services started."

# ── Done ──────────────────────────────────────────────────────────────────────
touch "$MARKER_FILE"

echo "========================================"
echo "[✓] NyayAI restore completed at $(date)"
echo "========================================"
