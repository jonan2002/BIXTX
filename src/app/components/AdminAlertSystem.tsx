import { useEffect, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { 
  Shield, 
  AlertTriangle, 
  Ban, 
  Database,
  Activity,
  Skull,
  AlertCircle,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Bell,
  Info
} from 'lucide-react';

export interface AdminAlert {
  id: string;
  type: 'threat' | 'security' | 'system' | 'device' | 'user';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  message: string;
  deviceId?: string;
  deviceName?: string;
  userId?: string;
  userName?: string;
  timestamp: Date;
  requiresAction?: boolean;
  actionUrl?: string;
}

interface AdminAlertSystemProps {
  enabled?: boolean;
  autoIsolate?: boolean;
  onAlert?: (alert: AdminAlert) => void;
}

// Singleton to manage alerts across the application
class AlertManager {
  private static instance: AlertManager;
  private listeners: ((alert: AdminAlert) => void)[] = [];
  
  private constructor() {}
  
  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }
  
  subscribe(callback: (alert: AdminAlert) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  emit(alert: AdminAlert) {
    this.listeners.forEach(listener => listener(alert));
  }
  
  // Public method to trigger alerts from anywhere in the app
  static sendAlert(
    type: AdminAlert['type'],
    severity: AdminAlert['severity'],
    title: string,
    message: string,
    options?: Partial<AdminAlert>
  ) {
    const alert: AdminAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      message,
      timestamp: new Date(),
      ...options
    };
    
    AlertManager.getInstance().emit(alert);
  }
}

export { AlertManager };

export function AdminAlertSystem({ 
  enabled = true, 
  autoIsolate = false,
  onAlert 
}: AdminAlertSystemProps) {
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = AlertManager.getInstance().subscribe((alert) => {
      handleNewAlert(alert);
      setAlertCount(prev => prev + 1);
      
      if (onAlert) {
        onAlert(alert);
      }
    });

    return unsubscribe;
  }, [enabled, onAlert]);

  const handleNewAlert = (alert: AdminAlert) => {
    const severityConfig = getSeverityConfig(alert.severity);
    const icon = getAlertIcon(alert);
    
    // Determine toast type based on severity
    const toastFn = alert.severity === 'critical' || alert.severity === 'high' 
      ? toast.error 
      : alert.severity === 'medium' 
      ? toast.warning 
      : toast.info;

    const description = alert.deviceName 
      ? `${alert.deviceName}: ${alert.message}`
      : alert.userName
      ? `${alert.userName}: ${alert.message}`
      : alert.message;

    toastFn(
      `${severityConfig.emoji} ${alert.title}`,
      {
        description,
        duration: severityConfig.duration,
        action: alert.requiresAction ? {
          label: 'Investigate',
          onClick: () => {
            if (alert.actionUrl) {
              // Navigate to the relevant page
              console.log('Navigate to:', alert.actionUrl);
            }
          }
        } : undefined,
        className: severityConfig.className,
      }
    );

    // Play alert sound for critical alerts
    if (alert.severity === 'critical') {
      playAlertSound();
    }

    // Log to console for debugging
    console.log('[Admin Alert]', {
      severity: alert.severity,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp
    });
  };

  const getSeverityConfig = (severity: AdminAlert['severity']) => {
    const configs = {
      critical: {
        emoji: '🚨',
        duration: Infinity, // Stay until dismissed
        className: 'border-red-500 bg-red-950',
      },
      high: {
        emoji: '⚠️',
        duration: 15000,
        className: 'border-orange-500 bg-orange-950',
      },
      medium: {
        emoji: '⚡',
        duration: 8000,
        className: 'border-yellow-500 bg-yellow-950',
      },
      low: {
        emoji: '💡',
        duration: 5000,
        className: 'border-blue-500 bg-blue-950',
      },
      info: {
        emoji: 'ℹ️',
        duration: 4000,
        className: 'border-cyan-500 bg-cyan-950',
      }
    };
    
    return configs[severity];
  };

  const getAlertIcon = (alert: AdminAlert) => {
    if (alert.type === 'threat') {
      return <Skull className="w-5 h-5" />;
    } else if (alert.type === 'security') {
      return <Shield className="w-5 h-5" />;
    } else if (alert.type === 'device') {
      return <Activity className="w-5 h-5" />;
    } else if (alert.type === 'user') {
      return <AlertCircle className="w-5 h-5" />;
    }
    return <Bell className="w-5 h-5" />;
  };

  const playAlertSound = () => {
    // Play a beep sound for critical alerts
    // In a real implementation, you would use an actual audio file
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Failed to play alert sound:', error);
    }
  };

  // This component doesn't render anything visible
  // It only manages the alert system
  return null;
}

// Helper functions to send specific types of alerts
export const SecurityAlerts = {
  threatDetected: (
    threatType: string,
    deviceName: string,
    deviceId: string,
    description: string
  ) => {
    AlertManager.sendAlert(
      'threat',
      'critical',
      `${threatType} Detected`,
      description,
      {
        deviceName,
        deviceId,
        requiresAction: true,
        actionUrl: '/security'
      }
    );
  },

  deviceIsolated: (deviceName: string, deviceId: string, reason: string) => {
    AlertManager.sendAlert(
      'device',
      'high',
      'Device Isolated',
      `${deviceName} has been isolated: ${reason}`,
      {
        deviceName,
        deviceId,
        requiresAction: true,
        actionUrl: '/security'
      }
    );
  },

  deviceRestored: (deviceName: string, deviceId: string) => {
    AlertManager.sendAlert(
      'device',
      'info',
      'Device Access Restored',
      `${deviceName} has been restored to the network`,
      {
        deviceName,
        deviceId,
      }
    );
  },

  unauthorizedAccess: (userName: string, location: string) => {
    AlertManager.sendAlert(
      'security',
      'high',
      'Unauthorized Access Attempt',
      `Failed login attempt from ${location}`,
      {
        userName,
        requiresAction: true,
        actionUrl: '/security'
      }
    );
  },

  bruteForceDetected: (deviceName: string, deviceId: string, attempts: number) => {
    AlertManager.sendAlert(
      'threat',
      'critical',
      'Brute Force Attack',
      `${attempts} failed login attempts detected on ${deviceName}`,
      {
        deviceName,
        deviceId,
        requiresAction: true,
        actionUrl: '/security'
      }
    );
  },

  malwareDetected: (
    deviceName: string,
    deviceId: string,
    malwareType: string,
    files: string[]
  ) => {
    AlertManager.sendAlert(
      'threat',
      'critical',
      'Malware Detected',
      `${malwareType} found on ${deviceName}. ${files.length} file(s) affected.`,
      {
        deviceName,
        deviceId,
        requiresAction: true,
        actionUrl: '/security'
      }
    );
  },

  suspiciousActivity: (
    deviceName: string,
    deviceId: string,
    activityType: string
  ) => {
    AlertManager.sendAlert(
      'threat',
      'medium',
      'Suspicious Activity',
      `${activityType} detected on ${deviceName}`,
      {
        deviceName,
        deviceId,
        requiresAction: true,
        actionUrl: '/security'
      }
    );
  },

  systemHealthWarning: (message: string) => {
    AlertManager.sendAlert(
      'system',
      'medium',
      'System Health Warning',
      message,
      {
        requiresAction: false,
      }
    );
  },

  userPermissionChange: (userName: string, action: string) => {
    AlertManager.sendAlert(
      'user',
      'info',
      'User Permission Changed',
      `${userName}: ${action}`,
      {
        userName,
        requiresAction: false,
      }
    );
  },

  securityScanComplete: (devicesScanned: number, threatsFound: number) => {
    AlertManager.sendAlert(
      'security',
      threatsFound > 0 ? 'high' : 'info',
      'Security Scan Complete',
      `Scanned ${devicesScanned} devices, found ${threatsFound} threat(s)`,
      {
        requiresAction: threatsFound > 0,
        actionUrl: '/security'
      }
    );
  },
};
