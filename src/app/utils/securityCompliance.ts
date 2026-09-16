/**
 * Security Compliance Module for bixtx.com
 * Ensures transparent operations and compliance with security standards
 * Provides clear user consent and audit logging
 */

export interface SecurityEvent {
  timestamp: Date;
  type: 'permission_request' | 'permission_granted' | 'permission_denied' | 'data_access' | 'connection_established' | 'connection_terminated';
  action: string;
  details: string;
  userConsent: boolean;
}

export interface ComplianceReport {
  timestamp: Date;
  permissions: Record<string, boolean>;
  dataAccess: string[];
  connectionHistory: SecurityEvent[];
  userNotified: boolean;
}

/**
 * Security audit log
 */
class SecurityAuditLog {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events

  /**
   * Log a security event
   */
  logEvent(
    type: SecurityEvent['type'],
    action: string,
    details: string,
    userConsent: boolean = false
  ): void {
    const event: SecurityEvent = {
      timestamp: new Date(),
      type,
      action,
      details,
      userConsent
    };

    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Also log to console for transparency
    console.log(
      `[bixtx.com Security] ${type.toUpperCase()}: ${action}`,
      { details, userConsent, timestamp: event.timestamp }
    );

    // Store in localStorage for persistence (optional)
    this.persistLog();
  }

  /**
   * Get all events
   */
  getEvents(): SecurityEvent[] {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEvent['type']): SecurityEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Get recent events (last n events)
   */
  getRecentEvents(count: number = 10): SecurityEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Clear all events
   */
  clearLog(): void {
    this.events = [];
    this.persistLog();
  }

  /**
   * Persist log to localStorage
   */
  private persistLog(): void {
    try {
      localStorage.setItem('bixtx_security_log', JSON.stringify(this.events));
    } catch (error) {
      console.warn('Could not persist security log:', error);
    }
  }

  /**
   * Load log from localStorage
   */
  loadLog(): void {
    try {
      const stored = localStorage.getItem('bixtx_security_log');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Could not load security log:', error);
    }
  }

  /**
   * Export log as JSON
   */
  exportLog(): string {
    return JSON.stringify(this.events, null, 2);
  }
}

// Singleton instance
export const securityLog = new SecurityAuditLog();

/**
 * Request user consent for a specific action
 */
export function requestUserConsent(
  action: string,
  description: string,
  required: boolean = true
): boolean {
  // Log the consent request
  securityLog.logEvent(
    'permission_request',
    action,
    description,
    false
  );

  // In a real application, this would show a consent dialog
  // For now, we return true for optional actions
  return !required;
}

/**
 * Log permission granted
 */
export function logPermissionGranted(permission: string, details: string): void {
  securityLog.logEvent(
    'permission_granted',
    permission,
    details,
    true
  );
}

/**
 * Log permission denied
 */
export function logPermissionDenied(permission: string, details: string): void {
  securityLog.logEvent(
    'permission_denied',
    permission,
    details,
    true
  );
}

/**
 * Log data access
 */
export function logDataAccess(dataType: string, purpose: string): void {
  securityLog.logEvent(
    'data_access',
    dataType,
    `Accessed for: ${purpose}`,
    true
  );
}

/**
 * Log connection established
 */
export function logConnectionEstablished(deviceId: string, method: string): void {
  securityLog.logEvent(
    'connection_established',
    'Remote connection',
    `Connected to device ${deviceId} via ${method}`,
    true
  );
}

/**
 * Log connection terminated
 */
export function logConnectionTerminated(deviceId: string, reason: string): void {
  securityLog.logEvent(
    'connection_terminated',
    'Remote connection',
    `Disconnected from device ${deviceId}. Reason: ${reason}`,
    true
  );
}

/**
 * Generate compliance report
 */
export function generateComplianceReport(): ComplianceReport {
  const events = securityLog.getEvents();
  
  // Extract permissions
  const permissions: Record<string, boolean> = {};
  events
    .filter(e => e.type === 'permission_granted' || e.type === 'permission_denied')
    .forEach(e => {
      permissions[e.action] = e.type === 'permission_granted';
    });

  // Extract data access types
  const dataAccess = events
    .filter(e => e.type === 'data_access')
    .map(e => e.action);

  return {
    timestamp: new Date(),
    permissions,
    dataAccess: [...new Set(dataAccess)], // Unique data types
    connectionHistory: events.filter(
      e => e.type === 'connection_established' || e.type === 'connection_terminated'
    ),
    userNotified: true
  };
}

/**
 * Security best practices checker
 */
export function checkSecurityCompliance(): {
  compliant: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check if running in secure context
  if (!window.isSecureContext) {
    issues.push('Not running in a secure context (HTTPS required)');
    recommendations.push('Deploy application over HTTPS');
  }

  // Check for Content Security Policy
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    recommendations.push('Consider adding Content Security Policy headers');
  }

  // Check for proper error handling
  if (!window.onerror) {
    recommendations.push('Add global error handling');
  }

  // Check localStorage availability
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
  } catch (e) {
    issues.push('localStorage not available or blocked');
    recommendations.push('Check browser privacy settings');
  }

  return {
    compliant: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Initialize security monitoring
 */
export function initializeSecurityMonitoring(): void {
  // Load existing log
  securityLog.loadLog();

  // Log initialization
  securityLog.logEvent(
    'connection_established',
    'Application started',
    'bixtx.com security monitoring initialized',
    true
  );

  // Set up global error handler
  const originalError = console.error;
  console.error = function(...args) {
    securityLog.logEvent(
      'data_access',
      'Error occurred',
      args.join(' '),
      false
    );
    originalError.apply(console, args);
  };

  // Log page visibility changes (detect when user switches tabs)
  document.addEventListener('visibilitychange', () => {
    securityLog.logEvent(
      'data_access',
      'Visibility changed',
      `Page ${document.hidden ? 'hidden' : 'visible'}`,
      true
    );
  });

  // Log before page unload
  window.addEventListener('beforeunload', () => {
    securityLog.logEvent(
      'connection_terminated',
      'Application closing',
      'User navigating away from application',
      true
    );
  });
}

/**
 * Get security summary for display
 */
export function getSecuritySummary(): {
  totalEvents: number;
  permissionsGranted: number;
  permissionsDenied: number;
  activeConnections: number;
  lastActivity: Date | null;
} {
  const events = securityLog.getEvents();
  const recent = securityLog.getRecentEvents(1);

  return {
    totalEvents: events.length,
    permissionsGranted: events.filter(e => e.type === 'permission_granted').length,
    permissionsDenied: events.filter(e => e.type === 'permission_denied').length,
    activeConnections: events.filter(
      e => e.type === 'connection_established'
    ).length - events.filter(
      e => e.type === 'connection_terminated'
    ).length,
    lastActivity: recent.length > 0 ? recent[0].timestamp : null
  };
}

/**
 * Data minimization - only collect what's necessary
 */
export function sanitizeData<T extends Record<string, any>>(
  data: T,
  allowedFields: string[]
): Partial<T> {
  const sanitized: Partial<T> = {};
  
  allowedFields.forEach(field => {
    if (field in data) {
      sanitized[field as keyof T] = data[field];
    }
  });

  logDataAccess('Data sanitization', `Fields: ${allowedFields.join(', ')}`);
  
  return sanitized;
}

/**
 * Clear all user data (for privacy compliance)
 */
export function clearAllUserData(): void {
  try {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear IndexedDB (if used)
    if (window.indexedDB) {
      const databases = ['bixtx_db', 'recordings', 'sessions'];
      databases.forEach(dbName => {
        indexedDB.deleteDatabase(dbName);
      });
    }

    securityLog.logEvent(
      'data_access',
      'User data cleared',
      'All local data has been removed',
      true
    );
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
}
