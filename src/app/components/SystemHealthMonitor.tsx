import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Lock,
  Globe,
  Cpu,
  Activity
} from 'lucide-react';
import { 
  detectCapabilities, 
  getBrowserInfo, 
  getCompatibilityScore,
  getMissingFeatures,
  logCapabilities 
} from '../utils/featureDetection';
import { 
  checkAllPermissions,
  type PermissionStatus 
} from '../utils/permissions';
import { 
  checkSecurityCompliance,
  getSecuritySummary,
  initializeSecurityMonitoring 
} from '../utils/securityCompliance';

export function SystemHealthMonitor() {
  const [compatibilityScore, setCompatibilityScore] = useState(0);
  const [browserInfo, setBrowserInfo] = useState<any>(null);
  const [permissions, setPermissions] = useState<Record<string, PermissionStatus>>({});
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [securitySummary, setSecuritySummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeSecurityMonitoring();
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    setIsLoading(true);
    
    // Get browser capabilities
    const score = getCompatibilityScore();
    const info = getBrowserInfo();
    
    // Check permissions
    const perms = await checkAllPermissions();
    
    // Check security compliance
    const security = checkSecurityCompliance();
    
    // Get security summary
    const summary = getSecuritySummary();
    
    setCompatibilityScore(score);
    setBrowserInfo(info);
    setPermissions(perms);
    setSecurityStatus(security);
    setSecuritySummary(summary);
    setIsLoading(false);

    // Log capabilities to console
    logCapabilities();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle2 className="w-8 h-8 text-green-500" />;
    if (score >= 70) return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
    return <XCircle className="w-8 h-8 text-red-500" />;
  };

  const getStatusBadge = (available: boolean, granted: boolean) => {
    if (!available) {
      return <Badge variant="destructive">Not Available</Badge>;
    }
    if (granted) {
      return <Badge className="bg-green-600">Granted</Badge>;
    }
    return <Badge variant="secondary">Not Granted</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Card className="p-8 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
            <span className="ml-4">Checking system health...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">System Health Monitor</h1>
          <p className="text-slate-400">
            Ensures bixtx.com runs smoothly and securely on your system
          </p>
        </div>
        <Button onClick={checkSystemHealth} className="bg-cyan-600 hover:bg-cyan-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Health Score */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getScoreIcon(compatibilityScore)}
            <div>
              <h2 className="text-xl mb-1">Overall Compatibility</h2>
              <p className="text-slate-400">
                {browserInfo?.name} {browserInfo?.version} • {browserInfo?.engine} Engine
              </p>
            </div>
          </div>
          <div className="text-center">
            <div className={`text-5xl ${getScoreColor(compatibilityScore)}`}>
              {compatibilityScore}%
            </div>
            <div className="text-slate-400 text-sm mt-1">Health Score</div>
          </div>
        </div>

        {compatibilityScore < 90 && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 mr-3" />
              <div>
                <p className="text-yellow-500 font-medium mb-1">Optimization Recommended</p>
                <p className="text-sm text-slate-400">
                  Your browser is missing some features. Update to the latest version for the best experience.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Browser Environment */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center mb-4">
          <Globe className="w-5 h-5 text-cyan-500 mr-2" />
          <h2 className="text-xl">Browser Environment</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-slate-400 text-sm mb-1">Browser</div>
            <div>{browserInfo?.name}</div>
          </div>
          <div>
            <div className="text-slate-400 text-sm mb-1">Version</div>
            <div>{browserInfo?.version}</div>
          </div>
          <div>
            <div className="text-slate-400 text-sm mb-1">Secure Context</div>
            <div className="flex items-center">
              {browserInfo?.secure ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" />
                  <span>Yes</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-500 mr-1" />
                  <span>No (HTTPS Required)</span>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-sm mb-1">Device Type</div>
            <div>{browserInfo?.mobile ? 'Mobile' : 'Desktop'}</div>
          </div>
        </div>
      </Card>

      {/* Permissions Status */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center mb-4">
          <Lock className="w-5 h-5 text-cyan-500 mr-2" />
          <h2 className="text-xl">Permissions Status</h2>
        </div>
        <div className="space-y-3">
          {Object.entries(permissions).map(([permission, status]) => (
            <div key={permission} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <div>
                <div className="capitalize mb-1">{permission.replace('-', ' ')}</div>
                <div className="text-sm text-slate-400">{status.message}</div>
              </div>
              {getStatusBadge(status.available, status.granted)}
            </div>
          ))}
        </div>
      </Card>

      {/* Security Compliance */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center mb-4">
          <Shield className="w-5 h-5 text-cyan-500 mr-2" />
          <h2 className="text-xl">Security Compliance</h2>
        </div>
        
        <div className="space-y-4">
          {/* Compliance Status */}
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center">
              {securityStatus?.compliant ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3" />
              )}
              <div>
                <div className="mb-1">Security Status</div>
                <div className="text-sm text-slate-400">
                  {securityStatus?.compliant ? 'All security checks passed' : 'Some issues detected'}
                </div>
              </div>
            </div>
            {securityStatus?.compliant ? (
              <Badge className="bg-green-600">Compliant</Badge>
            ) : (
              <Badge variant="secondary">Needs Attention</Badge>
            )}
          </div>

          {/* Issues */}
          {securityStatus?.issues?.length > 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="text-red-500 font-medium mb-2">Security Issues</div>
              <ul className="space-y-1 text-sm text-slate-400">
                {securityStatus.issues.map((issue: string, idx: number) => (
                  <li key={idx}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {securityStatus?.recommendations?.length > 0 && (
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <div className="text-cyan-500 font-medium mb-2">Recommendations</div>
              <ul className="space-y-1 text-sm text-slate-400">
                {securityStatus.recommendations.map((rec: string, idx: number) => (
                  <li key={idx}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Activity Summary */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center mb-4">
          <Activity className="w-5 h-5 text-cyan-500 mr-2" />
          <h2 className="text-xl">Security Activity</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <div className="text-slate-400 text-sm mb-1">Total Events</div>
            <div className="text-2xl">{securitySummary?.totalEvents || 0}</div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <div className="text-slate-400 text-sm mb-1">Permissions Granted</div>
            <div className="text-2xl text-green-500">{securitySummary?.permissionsGranted || 0}</div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <div className="text-slate-400 text-sm mb-1">Permissions Denied</div>
            <div className="text-2xl text-red-500">{securitySummary?.permissionsDenied || 0}</div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <div className="text-slate-400 text-sm mb-1">Active Connections</div>
            <div className="text-2xl text-cyan-500">{securitySummary?.activeConnections || 0}</div>
          </div>
        </div>
      </Card>

      {/* Transparency Notice */}
      <Card className="p-6 bg-cyan-500/10 border border-cyan-500/20">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-cyan-500 mt-0.5 mr-3" />
          <div>
            <h3 className="text-cyan-500 font-medium mb-2">Transparency & Privacy</h3>
            <p className="text-sm text-slate-400 mb-3">
              bixtx.com is designed with privacy and security in mind. All permissions are requested with explicit user consent, 
              and all security events are logged transparently. You maintain full control over your data and permissions.
            </p>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>✓ All permissions require explicit user consent</li>
              <li>✓ End-to-end encryption for all remote connections</li>
              <li>✓ No data collected without your knowledge</li>
              <li>✓ Full audit log of all security events</li>
              <li>✓ Compliant with modern browser security policies</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
