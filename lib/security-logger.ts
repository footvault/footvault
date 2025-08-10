import { NextRequest } from 'next/server';

interface SecurityEvent {
  timestamp: Date;
  type: 'rate_limit' | 'auth_failure' | 'validation_error' | 'blocked_ip' | 'suspicious_activity';
  ip: string;
  userAgent?: string;
  endpoint: string;
  userId?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class SecurityLogger {
  private events: SecurityEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events in memory
  
  log(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };
    
    this.events.push(securityEvent);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SECURITY] ${event.type.toUpperCase()}:`, securityEvent);
    }
    
    // In production, you would send this to your logging service
    // Examples: Sentry, LogRocket, DataDog, etc.
    if (process.env.NODE_ENV === 'production' && event.severity === 'critical') {
      // Send alert for critical events
      this.sendAlert(securityEvent);
    }
  }
  
  getEvents(filter?: Partial<SecurityEvent>): SecurityEvent[] {
    if (!filter) return [...this.events];
    
    return this.events.filter(event => {
      return Object.entries(filter).every(([key, value]) => {
        if (key === 'timestamp') return true; // Skip timestamp filtering
        return event[key as keyof SecurityEvent] === value;
      });
    });
  }
  
  getEventsSince(minutes: number): SecurityEvent[] {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.events.filter(event => event.timestamp >= since);
  }
  
  private async sendAlert(event: SecurityEvent) {
    // In production, implement your alerting system here
    // Examples: Slack webhook, email, SMS, PagerDuty, etc.
    console.error('[CRITICAL SECURITY EVENT]', event);
  }
  
  // Get security statistics
  getStats(timeframeMinutes = 60): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    topIPs: Array<{ ip: string; count: number }>;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  } {
    const recentEvents = this.getEventsSince(timeframeMinutes);
    
    // Count events by type
    const eventsByType = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Count events by IP
    const ipCounts = recentEvents.reduce((acc, event) => {
      acc[event.ip] = (acc[event.ip] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Count events by endpoint
    const endpointCounts = recentEvents.reduce((acc, event) => {
      acc[event.endpoint] = (acc[event.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalEvents: recentEvents.length,
      eventsByType,
      topIPs: Object.entries(ipCounts)
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topEndpoints: Object.entries(endpointCounts)
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }
}

// Singleton logger instance
export const securityLogger = new SecurityLogger();

// Helper functions for common security events
export function logRateLimit(req: NextRequest, details: Record<string, any> = {}) {
  securityLogger.log({
    type: 'rate_limit',
    ip: getClientIP(req),
    userAgent: req.headers.get('user-agent') || 'unknown',
    endpoint: req.nextUrl.pathname,
    details,
    severity: 'medium',
  });
}

export function logAuthFailure(req: NextRequest, reason: string, details: Record<string, any> = {}) {
  securityLogger.log({
    type: 'auth_failure',
    ip: getClientIP(req),
    userAgent: req.headers.get('user-agent') || 'unknown',
    endpoint: req.nextUrl.pathname,
    details: { reason, ...details },
    severity: 'high',
  });
}

export function logValidationError(req: NextRequest, errors: string[], details: Record<string, any> = {}) {
  securityLogger.log({
    type: 'validation_error',
    ip: getClientIP(req),
    userAgent: req.headers.get('user-agent') || 'unknown',
    endpoint: req.nextUrl.pathname,
    details: { errors, ...details },
    severity: 'low',
  });
}

export function logBlockedIP(req: NextRequest, reason: string) {
  securityLogger.log({
    type: 'blocked_ip',
    ip: getClientIP(req),
    userAgent: req.headers.get('user-agent') || 'unknown',
    endpoint: req.nextUrl.pathname,
    details: { reason },
    severity: 'critical',
  });
}

export function logSuspiciousActivity(req: NextRequest, activity: string, details: Record<string, any> = {}) {
  securityLogger.log({
    type: 'suspicious_activity',
    ip: getClientIP(req),
    userAgent: req.headers.get('user-agent') || 'unknown',
    endpoint: req.nextUrl.pathname,
    userId: details.userId,
    details: { activity, ...details },
    severity: 'high',
  });
}

// Utility function to extract client IP
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfIP = req.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || cfIP || 'unknown';
}

// Security metrics for monitoring dashboard
export class SecurityMetrics {
  static async getSecurityDashboard() {
    const last24h = securityLogger.getStats(24 * 60); // 24 hours
    const lastHour = securityLogger.getStats(60); // 1 hour
    
    return {
      summary: {
        last24h: last24h.totalEvents,
        lastHour: lastHour.totalEvents,
        trend: this.calculateTrend(lastHour.totalEvents, last24h.totalEvents),
      },
      eventTypes: last24h.eventsByType,
      topThreats: {
        ips: last24h.topIPs,
        endpoints: last24h.topEndpoints,
      },
      alerts: securityLogger.getEvents({ severity: 'critical' }).slice(-10),
    };
  }
  
  private static calculateTrend(hourly: number, daily: number): 'up' | 'down' | 'stable' {
    const hourlyAverage = daily / 24;
    const threshold = 0.2; // 20% threshold
    
    if (hourly > hourlyAverage * (1 + threshold)) return 'up';
    if (hourly < hourlyAverage * (1 - threshold)) return 'down';
    return 'stable';
  }
}

// Automatic threat detection
export class ThreatDetector {
  static detectSuspiciousPatterns(req: NextRequest, userId?: string): string[] {
    const threats: string[] = [];
    const ip = getClientIP(req);
    
    // Check for rapid requests from same IP
    const recentEvents = securityLogger.getEventsSince(5) // Last 5 minutes
      .filter(event => event.ip === ip);
    
    if (recentEvents.length > 50) {
      threats.push('High request frequency detected');
    }
    
    // Check for authentication failures
    const authFailures = recentEvents.filter(event => event.type === 'auth_failure');
    if (authFailures.length > 10) {
      threats.push('Multiple authentication failures detected');
    }
    
    // Check for validation errors (possible attack attempts)
    const validationErrors = recentEvents.filter(event => event.type === 'validation_error');
    if (validationErrors.length > 20) {
      threats.push('Multiple validation errors detected');
    }
    
    // Check user agent patterns
    const userAgent = req.headers.get('user-agent') || '';
    const suspiciousAgents = ['bot', 'crawler', 'scanner', 'hack', 'exploit'];
    if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
      threats.push('Suspicious user agent detected');
    }
    
    // Log any detected threats
    if (threats.length > 0) {
      logSuspiciousActivity(req, threats.join(', '), {
        userId,
        threatCount: threats.length,
        recentEventCount: recentEvents.length,
      });
    }
    
    return threats;
  }
  
  static shouldBlockIP(ip: string): boolean {
    const recentEvents = securityLogger.getEventsSince(60) // Last hour
      .filter(event => event.ip === ip);
    
    // Block if too many critical events
    const criticalEvents = recentEvents.filter(event => event.severity === 'critical');
    if (criticalEvents.length > 5) return true;
    
    // Block if too many rate limit violations
    const rateLimitViolations = recentEvents.filter(event => event.type === 'rate_limit');
    if (rateLimitViolations.length > 20) return true;
    
    // Block if too many auth failures
    const authFailures = recentEvents.filter(event => event.type === 'auth_failure');
    if (authFailures.length > 15) return true;
    
    return false;
  }
}
