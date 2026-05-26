#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# nyayai-snapshot.sh — create a named AMI of the running EC2 instance
#
# Usage:
#   ./AWS/nyayai-snapshot.sh              # auto-name: NyayAI-Demo-YYYY-MM-DD-v<N>
#   ./AWS/nyayai-snapshot.sh "my-label"   # NyayAI-Demo-YYYY-MM-DD-my-label
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REGION="us-east-1"
INSTANCE_ID="i-08659be72c4d0f441"
DATE=$(date -u +%Y-%m-%d)
LABEL="${1:-}"

if [ -n "$LABEL" ]; then
  AMI_NAME="NyayAI-Demo-${DATE}-${LABEL}"
else
  # Auto-increment: find how many AMIs exist for today
  COUNT=$(aws ec2 describe-images --region "$REGION" --owners self \
    --filters "Name=name,Values=NyayAI-Demo-${DATE}*" \
    --query 'length(Images)' --output text 2>/dev/null || echo "0")
  N=$(( COUNT + 1 ))
  AMI_NAME="NyayAI-Demo-${DATE}-v${N}"
fi

echo "[+] Creating AMI: $AMI_NAME from instance $INSTANCE_ID (no-reboot)..."
AMI_ID=$(aws ec2 create-image \
  --region "$REGION" \
  --instance-id "$INSTANCE_ID" \
  --name "$AMI_NAME" \
  --description "NyayAI Demo snapshot - ${DATE}" \
  --no-reboot \
  --query 'ImageId' --output text)

echo "[✓] AMI creation started: $AMI_ID"
echo "    Name:   $AMI_NAME"
echo "    Status: pending (typically 5-10 min to become available)"
echo ""
echo "    Watch:  aws ec2 describe-images --region $REGION --image-ids $AMI_ID --query 'Images[0].State' --output text"
echo "    Wait:   aws ec2 wait image-available --region $REGION --image-ids $AMI_ID"
echo ""
echo "  To use this AMI for future launches, update LAUNCH_TEMPLATE_ID or pass"
echo "  --image-id $AMI_ID to nyayai-launch.sh."
