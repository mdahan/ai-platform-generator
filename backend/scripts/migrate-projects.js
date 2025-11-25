import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const GENERATED_APPS_DIR = path.join(__dirname, '..', '..', 'generated-apps');
const DATA_DIR = path.join(__dirname, '..', 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log('🔍 Scanning generated-apps folder...');

// Read all folders in generated-apps
if (!fs.existsSync(GENERATED_APPS_DIR)) {
  console.log('❌ No generated-apps folder found');
  process.exit(0);
}

const folders = fs.readdirSync(GENERATED_APPS_DIR);
const projects = [];

for (const folder of folders) {
  const folderPath = path.join(GENERATED_APPS_DIR, folder);
  const projectJsonPath = path.join(folderPath, 'project.json');

  // Check if project.json exists
  if (!fs.existsSync(projectJsonPath)) {
    console.log(`⚠️  Skipping ${folder} - no project.json found`);
    continue;
  }

  try {
    // Read project.json
    const projectData = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));

    // Create project entry matching the backend schema
    const project = {
      id: projectData.projectId,
      name: projectData.name,
      slug: projectData.slug,
      description: projectData.description,
      status: 'deployed', // Assume deployed since it exists
      config: projectData.config || {
        industry: null,
        features: [],
        integrations: [],
        multiTenant: false,
        authentication: 'basic'
      },
      generationPrompt: projectData.description,
      outputPath: folderPath,
      generatedFiles: projectData.files || [],
      generationStats: projectData.stats || null,
      testResults: null,
      error: null,
      createdAt: projectData.generatedAt,
      updatedAt: projectData.generatedAt,
      userId: 'anonymous'
    };

    projects.push(project);
    console.log(`✅ Found project: ${project.name} (${project.id})`);
  } catch (error) {
    console.error(`❌ Error processing ${folder}:`, error.message);
  }
}

// Save to projects.json
if (projects.length > 0) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
  console.log(`\n✨ Successfully migrated ${projects.length} project(s) to ${PROJECTS_FILE}`);
  console.log('\nProjects:');
  projects.forEach(p => {
    console.log(`  - ${p.name} (${p.status})`);
  });
} else {
  console.log('\n⚠️  No projects found to migrate');
}
