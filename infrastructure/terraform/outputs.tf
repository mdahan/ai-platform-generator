# Terraform Outputs

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_url" {
  description = "URL of the Application Load Balancer"
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_backend_repository_url" {
  description = "URL of the backend ECR repository"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  description = "URL of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_backend_service_name" {
  description = "Name of the backend ECS service"
  value       = aws_ecs_service.backend.name
}

output "ecs_frontend_service_name" {
  description = "Name of the frontend ECS service"
  value       = aws_ecs_service.frontend.name
}

output "s3_generated_apps_bucket" {
  description = "S3 bucket for generated applications"
  value       = aws_s3_bucket.generated_apps.id
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

output "cloudwatch_log_group_backend" {
  description = "CloudWatch log group for backend"
  value       = aws_cloudwatch_log_group.backend.name
}

output "cloudwatch_log_group_frontend" {
  description = "CloudWatch log group for frontend"
  value       = aws_cloudwatch_log_group.frontend.name
}

# Deployment commands output
output "deployment_commands" {
  description = "Commands to deploy after terraform apply"
  value       = <<-EOT

    # 1. Login to ECR
    aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com

    # 2. Build and push backend
    docker build -t ${aws_ecr_repository.backend.repository_url}:latest ./backend
    docker push ${aws_ecr_repository.backend.repository_url}:latest

    # 3. Build and push frontend
    docker build -t ${aws_ecr_repository.frontend.repository_url}:latest ./frontend
    docker push ${aws_ecr_repository.frontend.repository_url}:latest

    # 4. Force new deployment
    aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service ${aws_ecs_service.backend.name} --force-new-deployment
    aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service ${aws_ecs_service.frontend.name} --force-new-deployment

    # 5. Access your application at:
    http://${aws_lb.main.dns_name}

  EOT
}
