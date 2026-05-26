# NyayAI AWS Launch Runbook

Complete record of the infrastructure setup and day-to-day operations for the
NyayAI demo environment at `demo.nyayai.in`.

---

## Quick Reference

| Script | Purpose |
|--------|---------|
| `./AWS/nyayai-launch.sh` | Bring the environment fully online |
| `./AWS/nyayai-shutdown.sh --snapshot` | Take AMI snapshot, then stop EC2 + delete ALB |
| `./AWS/nyayai-snapshot.sh` | Take AMI of running instance only |
| `./AWS/start-all.sh` | Start all Docker services on a running EC2 |
| `./AWS/stop-all.sh` | Stop all Docker services on a running EC2 |
| `./AWS/build-all.sh` | Rebuild all Docker images on a running EC2 |
| `./AWS/create-secrets.sh` | Seed AWS Secrets Manager from local .env (run once) |
| `./AWS/nyayai-restore.sh` | Full restore from S3+GitHub on a fresh instance (auto-run by UserData) |

---

## Infrastructure Inventory

### AWS Account & Region
| Key | Value |
|-----|-------|
| Account ID | `665680504236` |
| Primary Region | `us-east-1` |
| VPC | `vpc-01aeb04ce15f2413a` |

### EC2 Instance
| Key | Value |
|-----|-------|
| Instance ID | `i-08659be72c4d0f441` |
| Type | `m5.2xlarge` (8 vCPU, 32 GB RAM) |
| AMI (latest) | `ami-0cb47eeccd7f181aa` — NyayAI-Demo-2026-05-26-v3 |
| AMI (prev) | `ami-01e2e66fc995346ec` — NyayAI-Demo-2026-03-14-v2 |
| Key Pair | `NyayAI-DemoEnv` (PEM at `misc-tmp/AWS-key/NyayAI-DemoEnv.pem`) |
| Security Group | `sg-0bef3e8c033c99dd5` |
| Subnet | `subnet-0ecbb68a5c87e31e4` (us-east-1c) |
| IAM Role | `Nyay-AWS_EC2` (inline policy: `NyayAISecretsAccess`) |
| Launch Template | `NyayAI-Demo-v1_0` (`lt-0d80d584929668a3b`) v13 |

### Application Load Balancer
| Key | Value |
|-----|-------|
| Name | `nyayai-demo-lb` |
| ARN | `arn:aws:elasticloadbalancing:us-east-1:665680504236:loadbalancer/app/nyayai-demo-lb/30c2f28528631811` |
| Security Group | `sg-0599b0d884f9705ac` |
| Subnets | us-east-1a/1d/1e/1c (4 AZs) |
| Listener 80 | Redirect → HTTPS 443 |
| Listener 443 | HTTPS → `nyayai-demo-tg` (port 3080) |
| Certificate | `arn:aws:acm:us-east-1:665680504236:certificate/f928662b-d023-4b2d-a766-f89d1c324970` |
| SSL Policy | `ELBSecurityPolicy-TLS13-1-2-2021-06` |

### Target Groups (never deleted — free at rest)
| Name | Port | ARN suffix |
|------|------|-----------|
| `nyayai-demo-tg` | 3080 | `ea74fe02acc02d48` |
| `nyayai-backend-outputs-tg` | 8001 | `f3c0ebc7cdf9a298` |

### DNS
| Key | Value |
|-----|-------|
| Hosted Zone | `nyayai.in` — `Z0949748MYHMWQ72PQM7` |
| Record | `demo.nyayai.in` → ALB (A alias) |
| ALB Hosted Zone | `Z35SXDOTRQ7X7K` (AWS constant for us-east-1 ALBs) |

### Secrets Manager
| Key | Value |
|-----|-------|
| Secret name | `nyayai/prod/platform-keys` |
| Region | `us-east-1` |
| Keys stored | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `SARVAM_API_KEY`, `NYAY_SERVICE_KEY`, `CREDS_KEY`, `CREDS_IV`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MEILI_MASTER_KEY`, `GITHUB_TOKEN` |
| IAM policy | `ec2-iam-policy.json` (attached to `Nyay-AWS_EC2` role) |
| Seed script | `./AWS/create-secrets.sh` — run once from Mac with your real .env |

### S3
| Bucket | Path | Contents |
|--------|------|---------|
| `nyayai-legal-data` | `scripts/nyayai-restore.sh` | Full restore script |
| `nyayai-legal-data` | `scripts/EC2-2-S3-*.sh` | EC2→S3 backup scripts |
| `nyayai-legal-data` | `ebs-backup/NyayAI_Demo/` | Code snapshot (S3 sync backup) |
| `nyayai-legal-data` | `qdrant/volume-backups/` | Qdrant vector DB backups |

### GitHub
| Key | Value |
|-----|-------|
| Org | `nyayai-ddn` |
| Auth | Fine-grained PAT stored as `GITHUB_TOKEN` in Secrets Manager |
| Repos | NyayAI-LibreChat, NyayAI-LangTranslate-v1, NyayAI-ContractReview-v1, NyayAI-LegalResearch-v1, NyayAI-LegalResearch-v3, NyayAI-Litigation-v1, NyayAI-DraftingAssistant-v1, NyayAI-WillsDrafting-v1, NyayAI-Legal-Workflows |

---

## Services Running on EC2

| Container | Port | Description |
|-----------|------|-------------|
| `LibreChat` | 3080 | Main NyayAI UI (proxied via ALB) |
| `nyay-ocr` | 8100 | LangTranslate-v1 OCR/translate service |
| `legal-contract-backend` | 8001 | ContractReview agent |
| `legal-research-backend` | 8104 | LegalResearch-v1 agent |
| `nyay-legal-research` | 8106 | LegalResearch-v3 agent |
| `nyayai-litigation-backend` | 8105 | Litigation-v1 agent |
| `nyayai-drafting-assistant` | 8004 | DraftingAssistant-v1 |
| `willgen-api` | 8003 | WillsDrafting-v1 |
| `contract-vectordb` | 6333 | Qdrant for contract embeddings |
| `chat-mongodb` | 27017 | LibreChat MongoDB |
| `chat-meilisearch` | 7700 | LibreChat search |
| `rag_api` | 8000 | LibreChat RAG API |
| `vectordb` | 5432 | RAG PGVector |
| `mongo-express` | 8081 | MongoDB admin UI |
| `willgen-redis` | 6379 | Wills service queue |

All containers share the `paralx-network` Docker bridge network.
Code lives at `/home/ubuntu/NyayAI_Demo/` on the instance.

---

## One-Time Setup Steps (already done — for reference)

These were done once and don't need repeating:

### 1. IAM Role for EC2
```bash
# Created role: Nyay-AWS_EC2
# Attached inline policy from ec2-iam-policy.json
# Grants: secretsmanager:GetSecretValue on nyayai/prod/platform-keys
```

### 2. ACM Certificate
```
arn:aws:acm:us-east-1:665680504236:certificate/f928662b-d023-4b2d-a766-f89d1c324970
```
Covers `demo.nyayai.in`. DNS-validated against the `nyayai.in` hosted zone.

### 3. Secrets Manager
```bash
cd NyayAI-LibreChat
./AWS/create-secrets.sh        # reads values from local .env, pushes to AWS
./AWS/create-secrets.sh --update   # rotate keys
```

### 4. Launch Template
Created `NyayAI-Demo-v1_0` with UserData that:
1. Deletes `/var/lib/nyayai/.restore_complete` (marker from AMI)
2. Downloads `nyayai-restore.sh` from S3
3. Runs it in the background (logs → `/var/log/nyayai-restore.log`)

### 5. Security Groups
- **EC2 SG** (`sg-0bef3e8c033c99dd5`): inbound 22 (SSH), 3080, 8001–8110 from ALB SG + VPC; outbound all
- **ALB SG** (`sg-0599b0d884f9705ac`): inbound 80+443 from 0.0.0.0/0; outbound all to EC2 SG

---

## Standard Launch Procedure

### Option A — Start stopped instance (fastest, <2 min)
```bash
./AWS/nyayai-launch.sh
# Starts EC2, recreates ALB if deleted, registers targets, updates Route53
```

### Option B — Launch fresh instance from AMI (full restore, ~15 min)
```bash
FORCE_NEW=1 ./AWS/nyayai-launch.sh
# Launches new EC2 from Launch Template
# UserData triggers nyayai-restore.sh automatically
# Watch restore progress:
ssh -i misc-tmp/AWS-key/NyayAI-DemoEnv.pem ubuntu@<IP> \
  "tail -f /var/log/nyayai-restore.log"
```

### After a fresh launch: update the instance ID
Edit `nyayai-launch.sh` and `nyayai-shutdown.sh` with the new `INSTANCE_ID`.
Or update Launch Template to a new default, then re-launch.

---

## Standard Shutdown Procedure

```bash
# Recommended: take snapshot first, then shut down
./AWS/nyayai-shutdown.sh --snapshot

# Or just shutdown (no snapshot):
./AWS/nyayai-shutdown.sh

# Keep more AMIs (default is 2):
./AWS/nyayai-shutdown.sh --snapshot --keep 3
```

**Cost savings**:
- EC2 m5.2xlarge stopped: saves ~$9.22/day
- ALB deleted: saves ~$0.19/day
- **Total: ~$9.41/day (~$282/month) while down**

---

## Updating Code on Live Instance

```bash
KEY="misc-tmp/AWS-key/NyayAI-DemoEnv.pem"
EC2_IP="34.229.6.52"   # update after each launch

# Pull latest code + rebuild + restart a single service
ssh -i $KEY ubuntu@$EC2_IP "
  cd /home/ubuntu/NyayAI_Demo/NyayAI-LibreChat
  git pull origin main
  docker compose -f docker-compose.yml -f docker-compose.override.yml build api
  docker compose -f docker-compose.yml -f docker-compose.override.yml stop api
  docker compose -f docker-compose.yml -f docker-compose.override.yml up -d api
"
```

---

## Injecting Secrets on a Running Instance

Use `nyayai-patch.sh` (kept at `/tmp/nyayai-patch.sh` locally):
```bash
KEY="misc-tmp/AWS-key/NyayAI-DemoEnv.pem"
scp -i $KEY /tmp/nyayai-patch.sh ubuntu@<IP>:/tmp/nyayai-patch.sh
ssh -i $KEY ubuntu@<IP> "chmod +x /tmp/nyayai-patch.sh && /tmp/nyayai-patch.sh"
```

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Site returns 503 | `docker ps` — are containers running? Check TG health in console |
| Container restart-looping | `docker logs <name> --tail 30` — usually a missing/bad env var |
| nyay-ocr fails pydantic | OPENAI_API_KEY must NOT be in LangTranslate .env — it's injected via docker-compose env block |
| Restore stuck | `tail -f /var/log/nyayai-restore.log` — check for git auth errors |
| Git clone fails | GITHUB_TOKEN expired — rotate in Secrets Manager + update secret |
| ALB shows "initial" | Wait 2-3 min; check EC2 SG allows traffic from ALB SG on port 3080 |
| Wrong AZ error | Ensure ALB has subnet for the AZ where EC2 launched (`aws elbv2 set-subnets`) |
