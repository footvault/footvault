// Security configuration for the application

export const securityConfig = {
  // Rate limiting configurations
  rateLimits: {
    // API endpoints
    api: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 120, // 120 requests per minute
    },
    
    // Dashboard/Stats endpoints - more permissive for frequent updates
    dashboard: {
      windowMs: 30 * 1000, // 30 seconds
      maxRequests: 30, // 30 requests per 30 seconds
    },
    
    // Search endpoints
    search: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 requests per minute
    },
    
   
    
    // Upload endpoints
    upload: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 requests per minute
    },
    
    // Sensitive operations
    sensitive: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10, // 10 requests per 15 minutes
    },
  },
  
  // Request size limits
  maxRequestSize: {
    default: 10 * 1024 * 1024, // 10MB
    upload: 50 * 1024 * 1024, // 50MB
    avatar: 5 * 1024 * 1024, // 5MB
  },
  
  // Content types
  allowedContentTypes: {
    json: ['application/json'],
    upload: ['multipart/form-data'],
    both: ['application/json', 'multipart/form-data'],
  },
  
  // Security headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; '),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=(self)',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()',
      'fullscreen=(self)'
    ].join(', ')
  },
  
  // Password requirements
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  
  // Input validation limits
  validation: {
    maxStringLength: 1000,
    maxEmailLength: 254,
    maxNameLength: 255,
    maxDescriptionLength: 2000,
    maxSkuLength: 100,
    maxLocationLength: 100,
    maxSizeLength: 20,
    maxPrice: 999999.99,
    maxQuantity: 10000,
    maxVariantsPerRequest: 100,
  },
  
  // Blocked patterns (for basic XSS prevention)
  blockedPatterns: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b/gi,
    /<object\b/gi,
    /<embed\b/gi,
    /<link\b/gi,
    /<meta\b/gi,
  ],
  
  // API endpoint configurations
  endpoints: {
    '/api/add-product': {
      methods: ['POST'],
      rateLimit: 'api',
      requireAuth: true,
      maxRequestSize: 'default',
      contentTypes: 'json',
    },
    '/api/search-kicks-dev': {
      methods: ['GET', 'POST'],
      rateLimit: 'search',
      requireAuth: true,
      maxRequestSize: 'default',
      contentTypes: 'json',
    },
    '/api/inventory-value': {
      methods: ['GET'],
      rateLimit: 'api',
      requireAuth: true,
      maxRequestSize: 'default',
      contentTypes: 'json',
    },
    '/api/update-avatar': {
      methods: ['POST'],
      rateLimit: 'upload',
      requireAuth: true,
      maxRequestSize: 'avatar',
      contentTypes: 'upload',
    },
    '/api/auth/*': {
      methods: ['POST'],
      rateLimit: 'auth',
      requireAuth: false,
      maxRequestSize: 'default',
      contentTypes: 'json',
    },
    '/api/user-plan': {
      methods: ['GET'],
      rateLimit: 'api',
      requireAuth: true,
      maxRequestSize: 'default',
      contentTypes: 'json',
    },
    '/api/variant-limits': {
      methods: ['GET'],
      rateLimit: 'api',
      requireAuth: true,
      maxRequestSize: 'default',
      contentTypes: 'json',
    },
  },
  
  // Environment-specific settings
  development: {
    logSecurityEvents: true,
    bypassRateLimit: false,
    strictCSP: false,
  },
  
  production: {
    logSecurityEvents: true,
    bypassRateLimit: false,
    strictCSP: true,
    requireHTTPS: true,
  },
};

// Helper function to get config for current environment
export function getSecurityConfig() {
  const env = process.env.NODE_ENV || 'development';
  const base = { ...securityConfig };
  const envConfig = securityConfig[env as keyof typeof securityConfig];
  
  if (envConfig && typeof envConfig === 'object') {
    return { ...base, ...envConfig };
  }
  
  return base;
}
