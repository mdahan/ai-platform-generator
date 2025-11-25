/**
 * Standardized File Structure Map
 * This defines the EXACT file paths and structure for generated applications.
 * All generators MUST follow these paths exactly.
 */

const FILE_STRUCTURE = {
  // ============================================
  // BACKEND FILES - Express.js API
  // ============================================
  backend: {
    // Root files
    root: [
      'backend/package.json',
      'backend/.env',
      'backend/.env.example',
      'backend/.gitignore'
    ],

    // Source directory
    src: {
      // Main entry point - CRITICAL
      server: 'backend/src/server.js',

      // Configuration
      config: [
        'backend/src/config/index.js',
        'backend/src/config/database.js'
      ],

      // Routes - API endpoints
      routes: [
        'backend/src/routes/index.js',
        'backend/src/routes/auth.js',
        'backend/src/routes/users.js'
        // Additional routes based on entities
      ],

      // Controllers - Request handlers
      controllers: [
        'backend/src/controllers/authController.js',
        'backend/src/controllers/userController.js'
        // Additional controllers based on entities
      ],

      // Services - Business logic
      services: [
        'backend/src/services/authService.js',
        'backend/src/services/userService.js'
        // Additional services based on entities
      ],

      // Models - Sequelize models
      models: [
        'backend/src/models/index.js',
        'backend/src/models/User.js'
        // Additional models based on entities
      ],

      // Middleware
      middleware: [
        'backend/src/middleware/auth.js',
        'backend/src/middleware/errorHandler.js',
        'backend/src/middleware/validator.js'
      ],

      // Utilities
      utils: [
        'backend/src/utils/logger.js',
        'backend/src/utils/helpers.js',
        'backend/src/utils/constants.js'
      ]
    },

    // Database files
    database: [
      'backend/src/database/migrate.js',
      'backend/src/database/seed.js'
    ]
  },

  // ============================================
  // FRONTEND FILES - Next.js 14 App Router
  // ============================================
  frontend: {
    // Root files
    root: [
      'frontend/package.json',
      'frontend/.env.local',
      'frontend/.gitignore',
      'frontend/next.config.js',
      'frontend/tailwind.config.js',
      'frontend/postcss.config.js',
      'frontend/tsconfig.json'
    ],

    // App directory (Next.js 14 App Router)
    app: {
      // Layout and root page - CRITICAL
      layout: 'frontend/app/layout.tsx',
      page: 'frontend/app/page.tsx',
      globals: 'frontend/app/globals.css',

      // Auth pages
      auth: [
        'frontend/app/login/page.tsx',
        'frontend/app/register/page.tsx'
      ],

      // Dashboard
      dashboard: [
        'frontend/app/dashboard/page.tsx',
        'frontend/app/dashboard/layout.tsx'
      ]
      // Additional pages based on entities
    },

    // Components
    components: {
      common: [
        'frontend/components/common/Button.tsx',
        'frontend/components/common/Input.tsx',
        'frontend/components/common/Card.tsx',
        'frontend/components/common/Modal.tsx',
        'frontend/components/common/Loading.tsx'
      ],
      layout: [
        'frontend/components/layout/Header.tsx',
        'frontend/components/layout/Sidebar.tsx',
        'frontend/components/layout/Footer.tsx'
      ]
      // Additional components based on entities
    },

    // Libraries and utilities
    lib: [
      'frontend/lib/api.ts',
      'frontend/lib/auth.ts',
      'frontend/lib/utils.ts'
    ],

    // Types
    types: [
      'frontend/types/index.ts'
    ],

    // Hooks
    hooks: [
      'frontend/hooks/useAuth.ts',
      'frontend/hooks/useApi.ts'
    ],

    // Context
    context: [
      'frontend/context/AuthContext.tsx'
    ]
  },

  // ============================================
  // DATABASE FILES
  // ============================================
  database: {
    schema: 'database/schema.sql',
    migrations: 'database/migrations/',
    seeds: 'database/seeds/'
  },

  // ============================================
  // INFRASTRUCTURE FILES
  // ============================================
  infrastructure: {
    docker: [
      'docker-compose.yml',
      'backend/Dockerfile',
      'frontend/Dockerfile'
    ],
    scripts: [
      'scripts/setup.sh',
      'scripts/start.sh'
    ]
  },

  // ============================================
  // DOCUMENTATION
  // ============================================
  documentation: [
    'README.md',
    'docs/API.md',
    'docs/SETUP.md'
  ]
};

/**
 * Import path mappings - CRITICAL for consistent imports
 * Maps from the file doing the import to the file being imported
 */
const IMPORT_PATHS = {
  // From routes, import controllers
  'routes -> controllers': '../controllers/',

  // From routes, import middleware
  'routes -> middleware': '../middleware/',

  // From controllers, import services
  'controllers -> services': '../services/',

  // From controllers, import models
  'controllers -> models': '../models/',

  // From services, import models
  'services -> models': '../models/',

  // From any file, import config
  '* -> config': '../config/' // or adjust based on nesting level
};

/**
 * Critical files that MUST exist for the app to run
 */
const CRITICAL_FILES = {
  backend: [
    'backend/package.json',
    'backend/src/server.js',
    'backend/src/config/index.js',
    'backend/src/routes/index.js',
    'backend/src/models/index.js',
    'backend/src/middleware/auth.js',
    'backend/src/middleware/errorHandler.js'
  ],
  frontend: [
    'frontend/package.json',
    'frontend/app/layout.tsx',
    'frontend/app/page.tsx',
    'frontend/next.config.js',
    'frontend/tailwind.config.js'
  ],
  database: [
    'database/schema.sql'
  ]
};

/**
 * Generate dynamic file paths based on entities
 * @param {string[]} entities - Array of entity names (e.g., ['User', 'Product', 'Order'])
 * @returns {Object} Complete file structure with entity-specific files
 */
function generateFileStructure(entities = []) {
  const structure = JSON.parse(JSON.stringify(FILE_STRUCTURE));

  entities.forEach(entity => {
    const entityLower = entity.toLowerCase();
    const entityCapital = entity.charAt(0).toUpperCase() + entity.slice(1);

    // Add backend files for entity
    structure.backend.src.routes.push(`backend/src/routes/${entityLower}.js`);
    structure.backend.src.controllers.push(`backend/src/controllers/${entityLower}Controller.js`);
    structure.backend.src.services.push(`backend/src/services/${entityLower}Service.js`);
    structure.backend.src.models.push(`backend/src/models/${entityCapital}.js`);

    // Add frontend files for entity
    structure.frontend.app[entityLower] = [
      `frontend/app/${entityLower}/page.tsx`,
      `frontend/app/${entityLower}/[id]/page.tsx`
    ];
    structure.frontend.components[entityLower] = [
      `frontend/components/${entityLower}/${entityCapital}List.tsx`,
      `frontend/components/${entityLower}/${entityCapital}Form.tsx`,
      `frontend/components/${entityLower}/${entityCapital}Card.tsx`
    ];
  });

  return structure;
}

/**
 * Get all file paths as a flat array
 * @param {Object} structure - File structure object
 * @returns {string[]} Flat array of all file paths
 */
function flattenStructure(structure) {
  const files = [];

  function traverse(obj) {
    if (typeof obj === 'string') {
      files.push(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(item => traverse(item));
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach(value => traverse(value));
    }
  }

  traverse(structure);
  return files;
}

/**
 * Validate that a file path matches the expected structure
 * @param {string} filePath - The file path to validate
 * @returns {boolean} True if valid
 */
function isValidFilePath(filePath) {
  // Check it starts with a valid top-level directory
  const validPrefixes = ['backend/', 'frontend/', 'database/', 'docker-compose', 'scripts/', 'docs/', 'README'];
  return validPrefixes.some(prefix => filePath.startsWith(prefix));
}

module.exports = {
  FILE_STRUCTURE,
  IMPORT_PATHS,
  CRITICAL_FILES,
  generateFileStructure,
  flattenStructure,
  isValidFilePath
};
