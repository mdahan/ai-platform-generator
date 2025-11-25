/**
 * Simple API key authentication middleware
 * For now, validates against API_KEY environment variable
 * In production, this would use JWT, sessions, or OAuth
 */

const API_KEY = process.env.API_KEY || "dev-api-key-12345";

/**
 * Validates API key from request headers
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        code: "AUTH_REQUIRED",
        message: "Authorization header is required",
      },
    });
  }

  // Support both "Bearer <token>" and "ApiKey <key>" formats
  const [type, token] = authHeader.split(" ");

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_AUTH_FORMAT",
        message: "Invalid authorization format. Use 'Bearer <token>' or 'ApiKey <key>'",
      },
    });
  }

  if (type === "ApiKey" || type === "Bearer") {
    if (token === API_KEY) {
      // Set user info on request (in production, decode JWT here)
      req.user = {
        id: "user-1",
        email: "dev@example.com",
        name: "Developer",
      };
      return next();
    }
  }

  return res.status(403).json({
    success: false,
    error: {
      code: "INVALID_API_KEY",
      message: "Invalid API key",
    },
  });
}

/**
 * Optional auth - sets user if valid, continues if not
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const [type, token] = authHeader.split(" ");
    if ((type === "ApiKey" || type === "Bearer") && token === API_KEY) {
      req.user = {
        id: "user-1",
        email: "dev@example.com",
        name: "Developer",
      };
    }
  }

  // Set anonymous user if no auth
  if (!req.user) {
    req.user = {
      id: "anonymous",
      email: null,
      name: "Anonymous",
    };
  }

  next();
}

export default { requireAuth, optionalAuth };
