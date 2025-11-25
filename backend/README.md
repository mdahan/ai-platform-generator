# AI Platform Backend

Backend API for the AI Platform that manages projects and triggers AI code generation.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. Ensure the AI engine is configured:
   - The backend requires `../ai-engine/.env` with `ANTHROPIC_API_KEY`

## Running

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Server health status
- `GET /api` - API documentation

### Projects
- `POST /api/projects` - Create a new project
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project
- `GET /api/projects/:id/files` - List generated files
- `GET /api/projects/:id/files/:filename` - Get file content

### Generation
- `POST /api/generate` - Start async code generation
- `POST /api/generate/sync` - Synchronous generation (waits for completion)
- `GET /api/generate/:projectId/status` - Check generation status
- `POST /api/generate/:projectId/cancel` - Cancel ongoing generation

## Authentication

For now, the API uses simple API key authentication:

```bash
curl -H "Authorization: ApiKey dev-api-key-12345" http://localhost:3001/api/projects
```

Or without auth for development:
```bash
curl http://localhost:3001/api/projects
```

## Example Usage

### Create a project and generate code

```bash
# 1. Create a project
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Task Manager API",
    "description": "A REST API for managing tasks with CRUD operations"
  }'

# Response includes project ID, e.g., "id": "abc123"

# 2. Start generation
curl -X POST http://localhost:3001/api/generate/sync \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "abc123",
    "prompt": "Create a task management API with: list tasks, create task, update task, delete task, mark as complete"
  }'

# 3. Check the generated files
curl http://localhost:3001/api/projects/abc123/files

# 4. Get the generated code
curl http://localhost:3001/api/projects/abc123/files/server.js
```

## Project Structure

```
/backend
  /src
    /routes
      projects.js     - Project CRUD endpoints
      generate.js     - Code generation endpoints
    /services
      aiEngine.js     - AI engine wrapper
      fileSystem.js   - File management
    /middleware
      auth.js         - Authentication
    /models
      Project.js      - Project model
    server.js         - Express app entry point
```

## Generated Apps

Generated applications are saved to:
```
/platform-core/generated-apps/[project-id]/
  server.js       - Generated API code
  package.json    - NPM dependencies
  project.json    - Project metadata
```
