import { NextRequest, NextResponse } from 'next/server';
import { secureAPI, secureConfigs } from '@/lib/secure-api';
import { SecurityMetrics, securityLogger } from '@/lib/security-logger';

async function handleGetSecurityDashboard(req: NextRequest, { user }: { user?: any }) {
  try {
    if (!user) {
      return NextResponse.json({
        success: false,
        error: "Authentication required"
      }, { status: 401 });
    }

    // Only allow admin users to access security dashboard
    // You would check user role from database here
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || '24'; // hours
    
    const dashboard = await SecurityMetrics.getSecurityDashboard();
    
    // Get detailed events if requested
    const includeEvents = searchParams.get('include_events') === 'true';
    let events: any[] = [];
    
    if (includeEvents) {
      const hours = parseInt(timeframe);
      events = securityLogger.getEventsSince(hours * 60); // Convert to minutes
    }

    return NextResponse.json({
      success: true,
      data: {
        dashboard,
        events: includeEvents ? events : undefined,
        timeframe: `${timeframe} hours`,
        generated_at: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error("Security dashboard error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to generate security dashboard"
    }, { status: 500 });
  }
}

async function handleGetSecurityStats(req: NextRequest, { user }: { user?: any }) {
  try {
    if (!user) {
      return NextResponse.json({
        success: false,
        error: "Authentication required"
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const minutes = parseInt(searchParams.get('minutes') || '60');
    const eventType = searchParams.get('type');
    const ip = searchParams.get('ip');

    let events = securityLogger.getEventsSince(minutes);
    
    // Filter by event type if specified
    if (eventType) {
      events = events.filter(event => event.type === eventType);
    }
    
    // Filter by IP if specified
    if (ip) {
      events = events.filter(event => event.ip === ip);
    }

    const stats = securityLogger.getStats(minutes);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        events: events.slice(-100), // Return last 100 events
        filters: {
          minutes,
          eventType: eventType || 'all',
          ip: ip || 'all',
        }
      }
    });

  } catch (error) {
    console.error("Security stats error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to get security stats"
    }, { status: 500 });
  }
}

// Create handlers for different HTTP methods
const handlers = {
  GET: async (req: NextRequest, context: { user?: any }) => {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint');
    
    switch (endpoint) {
      case 'dashboard':
        return handleGetSecurityDashboard(req, context);
      case 'stats':
        return handleGetSecurityStats(req, context);
      default:
        return handleGetSecurityDashboard(req, context);
    }
  }
};

export const GET = secureAPI(handlers.GET, {
  ...secureConfigs.authenticated,
  allowedMethods: ['GET'],
  rateLimit: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 requests per minute
});
