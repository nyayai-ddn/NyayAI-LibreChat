#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# nyayai-shutdown.sh  — take down the NyayAI demo environment to save costs
#
# What it does:
#   1. Stops the EC2 instance (preserves EBS volumes — no data loss)
#   2. Deletes the ALB (biggest cost when idle: ~$0.19/day)
#   3. Takes a fresh AMI snapshot before stopping (optional, --snapshot flag)
#   4. Purges old AMIs/snapshots, keeping only the N most recent (default: 2)
#
# What it does NOT do:
#   - Does NOT terminate the EC2 (data is preserved)
#   - Does NOT delete target groups (they're free and needed for re-launch)
#   - Does NOT delete the Launch Template or secrets
#
# Usage:
#   ./nyayai-shutdown.sh                    # stop EC2 + delete ALB + prune old AMIs
#   ./nyayai-shutdown.sh --snapshot         # take AMI first, then shutdown
#   ./nyayai-shutdown.sh --keep 3           # keep 3 most recent AMIs (default: 2)
#   DRY_RUN=1 ./nyayai-shutdown.sh          # preview only, no changes
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REGION="us-east-1"
INSTANCE_ID="i-08659be72c4d0f441"
ALB_NAME="nyayai-demo-lb"
AMI_PREFIX="NyayAI-Demo"
KEEP_AMIS=2          # number of most-recent AMIs to keep
TAKE_SNAPSHOT=0
DRY_RUN="${DRY_RUN:-0}"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --snapshot)    TAKE_SNAPSHOT=1; shift ;;
    --keep)        KEEP_AMIS="$2"; shift 2 ;;
    --dry-run)     DRY_RUN=1; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

run() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "[DRY-RUN] $*"
  else
    "$@"
  fi
}

echo "========================================"
echo "[+] NyayAI Shutdown Script — $(date -u '+%Y-%m-%d %H:%M UTC')"
[ "$DRY_RUN" = "1" ] && echo "    DRY RUN — no changes will be made"
echo "========================================"

# ── Optional: Take AMI snapshot first ────────────────────────────────────────
if [ "$TAKE_SNAPSHOT" = "1" ]; then
  echo ""
  echo "[+] Taking AMI snapshot before shutdown..."
  DATE=$(date -u +%Y-%m-%d-%H%M)
  AMI_NAME="${AMI_PREFIX}-${DATE}"
  if [ "$DRY_RUN" != "1" ]; then
    NEW_AMI=$(aws ec2 create-image \
      --region "$REGION" \
      --instance-id "$INSTANCE_ID" \
      --name "$AMI_NAME" \
      --description "NyayAI Demo - pre-shutdown snapshot ${DATE}" \
      --no-reboot \
      --query 'ImageId' --output text)
    echo "[✓] AMI creation started: $NEW_AMI ($AMI_NAME)"
    echo "    (AMI creation continues in background — not waiting)"
  else
    echo "[DRY-RUN] Would create AMI: $AMI_NAME"
  fi
fi

# ── Step 1: Stop EC2 ──────────────────────────────────────────────────────────
echo ""
echo "[+] Checking EC2 instance state..."
INSTANCE_STATE=$(aws ec2 describe-instances --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text 2>/dev/null || echo "not-found")

echo "    Instance $INSTANCE_ID: $INSTANCE_STATE"

if [ "$INSTANCE_STATE" = "running" ]; then
  echo "[+] Stopping EC2 instance $INSTANCE_ID..."
  run aws ec2 stop-instances --region "$REGION" --instance-ids "$INSTANCE_ID" --output text > /dev/null
  if [ "$DRY_RUN" != "1" ]; then
    echo "[+] Waiting for instance to stop..."
    aws ec2 wait instance-stopped --region "$REGION" --instance-ids "$INSTANCE_ID"
  fi
  echo "[✓] EC2 stopped."
elif [ "$INSTANCE_STATE" = "stopped" ]; then
  echo "[✓] EC2 already stopped."
elif [ "$INSTANCE_STATE" = "not-found" ] || [ "$INSTANCE_STATE" = "terminated" ]; then
  echo "[!] Instance not found or already terminated — skipping."
else
  echo "[!] Instance in unexpected state '$INSTANCE_STATE' — skipping stop."
fi

# ── Step 2: Delete ALB ────────────────────────────────────────────────────────
echo ""
echo "[+] Looking for ALB: $ALB_NAME..."
ALB_ARN=$(aws elbv2 describe-load-balancers --region "$REGION" \
  --names "$ALB_NAME" \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null || echo "None")

if [ "$ALB_ARN" != "None" ] && [ -n "$ALB_ARN" ]; then
  echo "    Found: $ALB_ARN"

  # Deregister targets first (clean shutdown)
  TG_MAIN="arn:aws:elasticloadbalancing:${REGION}:665680504236:targetgroup/nyayai-demo-tg/ea74fe02acc02d48"
  TG_BACKEND="arn:aws:elasticloadbalancing:${REGION}:665680504236:targetgroup/nyayai-backend-outputs-tg/f3c0ebc7cdf9a298"
  echo "[+] Deregistering instance from target groups..."
  run aws elbv2 deregister-targets --region "$REGION" \
    --target-group-arn "$TG_MAIN" \
    --targets "Id=${INSTANCE_ID}" 2>/dev/null || true
  run aws elbv2 deregister-targets --region "$REGION" \
    --target-group-arn "$TG_BACKEND" \
    --targets "Id=${INSTANCE_ID}" 2>/dev/null || true

  echo "[+] Deleting ALB $ALB_NAME..."
  run aws elbv2 delete-load-balancer --region "$REGION" --load-balancer-arn "$ALB_ARN"
  echo "[✓] ALB deleted."
else
  echo "[✓] ALB not found — already deleted or never created."
fi

# ── Step 3: Prune old AMIs (keep N most recent) ───────────────────────────────
echo ""
echo "[+] Pruning old AMIs (keeping $KEEP_AMIS most recent '${AMI_PREFIX}*')..."

# Get all NyayAI AMIs sorted by creation date, oldest first
AMI_LIST=$(aws ec2 describe-images --region "$REGION" --owners self \
  --filters "Name=name,Values=${AMI_PREFIX}*" \
  --query 'sort_by(Images, &CreationDate)[*].{ID:ImageId,Name:Name,Date:CreationDate,Snapshots:BlockDeviceMappings[*].Ebs.SnapshotId}' \
  --output json 2>/dev/null)

TOTAL=$(echo "$AMI_LIST" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")
TO_DELETE=$(( TOTAL - KEEP_AMIS ))

echo "    Found $TOTAL AMIs, will delete $TO_DELETE oldest."

if [ "$TO_DELETE" -gt 0 ]; then
  # Get the IDs and snapshot IDs of the ones to delete (oldest TO_DELETE)
  DELETE_INFO=$(echo "$AMI_LIST" | python3 -c "
import json, sys
amis = json.load(sys.stdin)
n = $TO_DELETE
for ami in amis[:n]:
    snapshots = [s for s in (ami.get('Snapshots') or []) if s]
    print(ami['ID'] + '|' + ','.join(snapshots) + '|' + ami['Name'])
")

  while IFS='|' read -r ami_id snapshot_ids ami_name; do
    echo "  [+] Deregistering $ami_name ($ami_id)..."
    run aws ec2 deregister-image --region "$REGION" --image-id "$ami_id"

    if [ -n "$snapshot_ids" ]; then
      for snap_id in $(echo "$snapshot_ids" | tr ',' ' '); do
        [ -z "$snap_id" ] && continue
        echo "  [+] Deleting snapshot $snap_id..."
        run aws ec2 delete-snapshot --region "$REGION" --snapshot-id "$snap_id"
      done
    fi
    echo "  [✓] Deleted $ami_name"
  done <<< "$DELETE_INFO"
else
  echo "    Nothing to prune."
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo "[✓] NyayAI environment is DOWN"
echo "========================================"
echo "  EC2 $INSTANCE_ID:  stopped (EBS volumes preserved)"
echo "  ALB:               deleted"
echo "  AMIs kept:         $KEEP_AMIS most recent"
echo ""
echo "  Estimated daily savings:"
echo "    EC2 m5.2xlarge:  ~\$0.384/hr = ~\$9.22/day"
echo "    ALB:             ~\$0.008/hr = ~\$0.19/day"
echo ""
echo "  To bring back online:"
echo "    ./AWS/nyayai-launch.sh"
echo "========================================"
