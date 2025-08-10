# API Security Implementation

## Overview
This implementation provides focused security for the FootVault application with special emphasis on protecting the external sneaker API from abuse.

## Key Security Features

### 1. Rate Limiting
- **Product Search API**: 1 request per 2 seconds (strict limit to protect external API costs)
- **General APIs**: 60 requests per minute
- **Authentication**: 5 attempts per 15 minutes

### 2. Authentication
- All API endpoints require valid Supabase JWT tokens
- Token validation on every request
- User context maintained throughout request lifecycle

### 3. Input Validation
- XSS protection through input sanitization
- Length validation for all string inputs
- Proper error handling without exposing internal details

### 4. Security Headers
- XSS Protection
- Content Type Options
- Frame Options
- Referrer Policy

## Implementation Details

### Rate Limiting
The rate limiting is implemented in `/lib/simple-rate-limit.ts` with in-memory storage. For production, consider upgrading to Redis for better scalability.

### Secured Endpoints
- `/api/search-kicks-dev` - 2-second cooldown to protect external API costs
- `/api/add-product` - Standard rate limiting with authentication
- All other `/api/*` endpoints - General rate limiting applied

### Middleware
The security middleware (`middleware.ts`) automatically:
- Applies security headers to all responses
- Enforces rate limits based on endpoint
- Validates request sizes
- Blocks oversized requests

### Authentication
Uses Supabase JWT validation in `/lib/simple-security.ts`:
```typescript
const authResult = await validateAuth(request);
if (!authResult.valid) {
  // Handle unauthorized access
}
```

## Usage Example

To add security to a new API endpoint:

```typescript
import { validateAuth, validateInput, getSecurityHeaders } from '@/lib/simple-security';

export async function POST(request: NextRequest) {
  const securityHeaders = getSecurityHeaders();
  
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({
        error: "Authentication required"
      }, { status: 401, headers: securityHeaders });
    }

    // Your API logic here
    const user = authResult.user;
    
  } catch (error) {
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500, headers: securityHeaders });
  }
}
```

## Rate Limit Configuration

To modify rate limits, update `/lib/simple-rate-limit.ts`:

```typescript
export const rateLimits = {
  productSearch: {
    windowMs: 2000, // 2 seconds
    maxRequests: 1, // 1 request per 2 seconds
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // Adjust as needed
  }
}
```

## Monitoring

Rate limit violations and authentication failures are logged to the console. In production, integrate with your preferred logging service.

## Security Best Practices

1. **Environment Variables**: Keep API keys secure
2. **HTTPS**: Use HTTPS in production
3. **Regular Updates**: Keep dependencies updated
4. **Monitoring**: Monitor for unusual patterns
5. **Rate Limits**: Adjust based on usage patterns

## Production Considerations

- Replace in-memory rate limiting with Redis
- Add comprehensive logging service integration
- Consider implementing IP blocking for persistent abuse
- Regular security audits and dependency updates
