# AI Engine Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create directories for generated code
RUN mkdir -p /app/generated /app/test-environments

# The AI engine is used as a library by the backend
# This container is for standalone testing only
CMD ["node", "src/generator.js"]
