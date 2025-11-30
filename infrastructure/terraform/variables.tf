# Terraform Variables for AI Platform Generator

variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "ai-platform"
}

variable "domain_name" {
  description = "Domain name for the platform (optional)"
  type        = string
  default     = ""
}

variable "anthropic_api_key" {
  description = "Anthropic API key for Claude"
  type        = string
  sensitive   = true
}

# ECS Configuration
variable "backend_cpu" {
  description = "CPU units for backend container (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memory for backend container in MB"
  type        = number
  default     = 1024
}

variable "frontend_cpu" {
  description = "CPU units for frontend container"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory for frontend container in MB"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired number of tasks for each service"
  type        = number
  default     = 1
}

# Database (optional - for future use)
variable "enable_rds" {
  description = "Enable RDS PostgreSQL database"
  type        = bool
  default     = false
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

# Tags
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project   = "ai-platform-generator"
    ManagedBy = "terraform"
  }
}
