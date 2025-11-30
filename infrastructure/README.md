# AWS Infrastructure for AI Platform Generator

This directory contains all the infrastructure-as-code needed to deploy the AI Platform Generator to AWS.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Application Load   │
                    │     Balancer        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼────────┐      │       ┌────────▼────────┐
     │   Frontend      │      │       │    Backend      │
     │   (Next.js)     │      │       │   (Express)     │
     │   Port 3000     │      │       │   Port 3001     │
     └────────┬────────┘      │       └────────┬────────┘
              │               │                │
              └───────────────┼────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     ┌────────▼────────┐ ┌────▼────┐ ┌────────▼────────┐
     │   S3 Bucket     │ │ Secrets │ │  CloudWatch     │
     │ (Generated Apps)│ │ Manager │ │    Logs         │
     └─────────────────┘ └─────────┘ └─────────────────┘
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Terraform** v1.0+ installed
4. **Docker** installed locally

## Quick Start

### 1. Configure AWS CLI

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json
```

### 2. Initialize Terraform

```bash
cd infrastructure/terraform

# Copy and edit the variables file
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values (especially anthropic_api_key)

# Initialize Terraform
terraform init
```

### 3. Deploy Infrastructure

```bash
# Preview changes
terraform plan

# Apply changes (this takes ~10-15 minutes)
terraform apply
```

### 4. Build and Push Docker Images

After Terraform completes, it will output the deployment commands. Run them:

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
cd backend
docker build -t YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ai-platform-dev-backend:latest .
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ai-platform-dev-backend:latest

# Build and push frontend
cd ../frontend
docker build -t YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ai-platform-dev-frontend:latest .
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ai-platform-dev-frontend:latest
```

### 5. Force New Deployment

```bash
aws ecs update-service --cluster ai-platform-dev-cluster --service ai-platform-dev-backend --force-new-deployment
aws ecs update-service --cluster ai-platform-dev-cluster --service ai-platform-dev-frontend --force-new-deployment
```

### 6. Access Your Application

The ALB DNS name is output by Terraform. Access it at:
```
http://ai-platform-dev-alb-XXXXXXXXX.us-east-1.elb.amazonaws.com
```

## GitHub Actions CI/CD

To enable automatic deployments on push to main:

1. Go to your GitHub repository settings
2. Navigate to Secrets and variables > Actions
3. Add the following secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

Every push to `main` will automatically build and deploy.

## Cost Estimate

For development environment with minimal resources:

| Resource | Monthly Cost (approx) |
|----------|----------------------|
| ECS Fargate (2 tasks) | $15-30 |
| ALB | $16 |
| NAT Gateway | $32 |
| S3 (minimal) | $1-5 |
| CloudWatch Logs | $1-5 |
| **Total** | **~$65-90/month** |

To reduce costs:
- Use FARGATE_SPOT (already enabled for dev)
- Reduce NAT Gateway usage by running in public subnets
- Scale down when not in use

## Terraform State Management

For production, you should use remote state. Uncomment the backend configuration in `main.tf`:

```hcl
backend "s3" {
  bucket         = "your-terraform-state-bucket"
  key            = "ai-platform/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "terraform-locks"
}
```

## Common Operations

### View Logs
```bash
# Backend logs
aws logs tail /ecs/ai-platform-dev/backend --follow

# Frontend logs
aws logs tail /ecs/ai-platform-dev/frontend --follow
```

### Scale Services
```bash
# Scale to 2 instances
aws ecs update-service --cluster ai-platform-dev-cluster --service ai-platform-dev-backend --desired-count 2
```

### Destroy Infrastructure
```bash
cd infrastructure/terraform
terraform destroy
```

## Troubleshooting

### Tasks not starting
1. Check CloudWatch logs for errors
2. Verify security group rules
3. Check task definition for correct image URI

### ALB returning 503
1. Wait for health checks to pass (2-3 minutes)
2. Check target group health
3. Verify ECS tasks are running

### Cannot pull ECR image
1. Verify ECR repository exists
2. Check IAM permissions
3. Ensure image was pushed successfully

## Security Notes

- All traffic within VPC is encrypted
- Secrets stored in AWS Secrets Manager
- No public IPs on ECS tasks (uses NAT Gateway)
- S3 bucket blocks all public access
- ALB security group limits ingress to 80/443

## Next Steps

1. **Add HTTPS**: Configure ACM certificate and HTTPS listener
2. **Custom Domain**: Add Route 53 hosted zone and alias record
3. **Database**: Enable RDS for persistent storage
4. **Monitoring**: Set up CloudWatch alarms and dashboards
