#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# nyayai-launch.sh  — bring the NyayAI demo environment fully online
#
# What it does:
#   1. If the EC2 instance exists and is stopped  → start it
#      If no instance exists (or FORCE_NEW=1)     → launch from Launch Template
#   2. Wait for the instance to pass status checks
#   3. Recreate the ALB + listeners if they don't exist
#   4. Register the instance with both target groups
#   5. Update Route53 demo.nyayai.in → ALB DNS
#
# Usage:
#   ./nyayai-launch.sh              # start existing stopped instance or launch new
#   FORCE_NEW=1 ./nyayai-launch.sh  # always launch a fresh instance from LT
#   DRY_RUN=1   ./nyayai-launch.sh  # print what would happen, do nothing
#
# Prerequisites:
#   aws cli configured, profile with EC2/ELB/Route53 permissions
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REGION="us-east-1"
ACCOUNT_ID="665680504236"

# EC2
INSTANCE_ID="i-08659be72c4d0f441"       # last known instance — may be stopped/terminated
LAUNCH_TEMPLATE_ID="lt-0d80d584929668a3b"
LAUNCH_TEMPLATE_VERSION="\$Latest"
INSTANCE_TYPE="m5.2xlarge"
KEY_PAIR="NyayAI-DemoEnv"
IAM_PROFILE="Nyay-AWS_EC2"
EC2_SG="sg-0bef3e8c033c99dd5"
SUBNET="subnet-0ecbb68a5c87e31e4"       # us-east-1c (same AZ as EBS if any)

# ALB
ALB_NAME="nyayai-demo-lb"
ALB_SG="sg-0599b0d884f9705ac"
ALB_SUBNETS="subnet-027c6e12680025d27 subnet-06002c3e363824f5f subnet-0641dee4c278b9ed1 subnet-0ecbb68a5c87e31e4"
CERT_ARN="arn:aws:acm:us-east-1:${ACCOUNT_ID}:certificate/f928662b-d023-4b2d-a766-f89d1c324970"
VPC_ID="vpc-01aeb04ce15f2413a"

# Target groups (pre-existing — never deleted by shutdown script)
TG_MAIN_NAME="nyayai-demo-tg"           # port 3080  (LibreChat UI)
TG_MAIN_ARN="arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT_ID}:targetgroup/nyayai-demo-tg/ea74fe02acc02d48"
TG_BACKEND_NAME="nyayai-backend-outputs-tg"  # port 8001
TG_BACKEND_ARN="arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT_ID}:targetgroup/nyayai-backend-outputs-tg/f3c0ebc7cdf9a298"

# Route53
HOSTED_ZONE_ID="Z0949748MYHMWQ72PQM7"
DNS_RECORD="demo.nyayai.in"

FORCE_NEW="${FORCE_NEW:-0}"
DRY_RUN="${DRY_RUN:-0}"

run() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "[DRY-RUN] $*"
  else
    "$@"
  fi
}

echo "========================================"
echo "[+] NyayAI Launch Script — $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "========================================"

# ── Step 1: Find or launch EC2 ────────────────────────────────────────────────
echo ""
echo "[+] Checking EC2 instance state..."
INSTANCE_STATE=$(aws ec2 describe-instances --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text 2>/dev/null || echo "not-found")

echo "    Instance $INSTANCE_ID state: $INSTANCE_STATE"

if [ "$FORCE_NEW" = "1" ] || [ "$INSTANCE_STATE" = "terminated" ] || [ "$INSTANCE_STATE" = "not-found" ]; then
  echo "[+] Launching new EC2 instance from Launch Template $LAUNCH_TEMPLATE_ID..."
  if [ "$DRY_RUN" != "1" ]; then
    INSTANCE_ID=$(aws ec2 run-instances \
      --region "$REGION" \
      --launch-template "LaunchTemplateId=${LAUNCH_TEMPLATE_ID},Version=${LAUNCH_TEMPLATE_VERSION}" \
      --instance-type "$INSTANCE_TYPE" \
      --key-name "$KEY_PAIR" \
      --security-group-ids "$EC2_SG" \
      --subnet-id "$SUBNET" \
      --iam-instance-profile "Name=${IAM_PROFILE}" \
      --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=NyayAI-Demo},{Key=Project,Value=NyayAI}]" \
      --query 'Instances[0].InstanceId' \
      --output text)
    echo "[✓] Launched instance: $INSTANCE_ID"
  else
    echo "[DRY-RUN] Would launch from LT $LAUNCH_TEMPLATE_ID"
  fi

elif [ "$INSTANCE_STATE" = "stopped" ]; then
  echo "[+] Starting stopped instance $INSTANCE_ID..."
  run aws ec2 start-instances --region "$REGION" --instance-ids "$INSTANCE_ID"

elif [ "$INSTANCE_STATE" = "running" ]; then
  echo "[✓] Instance already running — skipping start."

elif [ "$INSTANCE_STATE" = "stopping" ]; then
  echo "[!] Instance is stopping — waiting for it to fully stop before starting..."
  if [ "$DRY_RUN" != "1" ]; then
    aws ec2 wait instance-stopped --region "$REGION" --instance-ids "$INSTANCE_ID"
    aws ec2 start-instances --region "$REGION" --instance-ids "$INSTANCE_ID"
  fi
fi

# ── Step 2: Wait for instance to be running ───────────────────────────────────
if [ "$DRY_RUN" != "1" ]; then
  echo ""
  echo "[+] Waiting for instance $INSTANCE_ID to pass status checks (~2-3 min)..."
  aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"
  aws ec2 wait instance-status-ok --region "$REGION" --instance-ids "$INSTANCE_ID"
fi

INSTANCE_IP=$(aws ec2 describe-instances --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text 2>/dev/null || echo "unknown")
echo "[✓] Instance running — public IP: $INSTANCE_IP"

# ── Step 3: Ensure ALB exists ─────────────────────────────────────────────────
echo ""
echo "[+] Checking ALB..."
ALB_ARN=$(aws elbv2 describe-load-balancers --region "$REGION" \
  --names "$ALB_NAME" \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null || echo "None")

if [ "$ALB_ARN" = "None" ] || [ -z "$ALB_ARN" ]; then
  echo "[+] ALB not found — creating $ALB_NAME..."
  if [ "$DRY_RUN" != "1" ]; then
    ALB_ARN=$(aws elbv2 create-load-balancer \
      --region "$REGION" \
      --name "$ALB_NAME" \
      --type application \
      --scheme internet-facing \
      --ip-address-type ipv4 \
      --security-groups "$ALB_SG" \
      --subnets $ALB_SUBNETS \
      --query 'LoadBalancers[0].LoadBalancerArn' \
      --output text)
    echo "[✓] ALB created: $ALB_ARN"

    echo "[+] Waiting for ALB to become active..."
    aws elbv2 wait load-balancer-available --region "$REGION" --load-balancer-arns "$ALB_ARN"

    # HTTP → HTTPS redirect listener (port 80)
    aws elbv2 create-listener \
      --region "$REGION" \
      --load-balancer-arn "$ALB_ARN" \
      --protocol HTTP --port 80 \
      --default-actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]' \
      --output text > /dev/null

    # HTTPS listener (port 443) → nyayai-demo-tg
    aws elbv2 create-listener \
      --region "$REGION" \
      --load-balancer-arn "$ALB_ARN" \
      --protocol HTTPS --port 443 \
      --certificates "CertificateArn=${CERT_ARN}" \
      --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
      --default-actions "Type=forward,TargetGroupArn=${TG_MAIN_ARN}" \
      --output text > /dev/null
    echo "[✓] Listeners created (80→redirect, 443→TG)"
  else
    echo "[DRY-RUN] Would create ALB + listeners"
    ALB_ARN="arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT_ID}:loadbalancer/app/${ALB_NAME}/DRY-RUN"
  fi
else
  echo "[✓] ALB already exists: $ALB_ARN"
fi

# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers --region "$REGION" \
  --load-balancer-arns "$ALB_ARN" \
  --query 'LoadBalancers[0].DNSName' \
  --output text 2>/dev/null || echo "unknown")
echo "    ALB DNS: $ALB_DNS"

# ── Step 4: Register instance with target groups ──────────────────────────────
echo ""
echo "[+] Registering $INSTANCE_ID with target groups..."
run aws elbv2 register-targets --region "$REGION" \
  --target-group-arn "$TG_MAIN_ARN" \
  --targets "Id=${INSTANCE_ID}"
echo "[✓] Registered with $TG_MAIN_NAME (port 3080)"

run aws elbv2 register-targets --region "$REGION" \
  --target-group-arn "$TG_BACKEND_ARN" \
  --targets "Id=${INSTANCE_ID}"
echo "[✓] Registered with $TG_BACKEND_NAME (port 8001)"

# ── Step 5: Update Route53 ────────────────────────────────────────────────────
echo ""
echo "[+] Updating Route53 $DNS_RECORD → $ALB_DNS..."
CHANGE_BATCH=$(cat <<JSON
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "${DNS_RECORD}",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z35SXDOTRQ7X7K",
        "DNSName": "${ALB_DNS}",
        "EvaluateTargetHealth": true
      }
    }
  }]
}
JSON
)
run aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch "$CHANGE_BATCH" \
  --output text > /dev/null
echo "[✓] Route53 updated"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo "[✓] NyayAI environment is LIVE"
echo "========================================"
echo "  Instance:   $INSTANCE_ID  ($INSTANCE_IP)"
echo "  ALB:        $ALB_DNS"
echo "  URL:        https://${DNS_RECORD}"
echo ""
echo "  Note: if this was a FORCE_NEW launch, nyayai-restore.sh"
echo "  is running in the background (~10-15 min to be fully ready)."
echo "  Watch: ssh -i NyayAI-DemoEnv.pem ubuntu@${INSTANCE_IP} tail -f /var/log/nyayai-restore.log"
echo "========================================"
