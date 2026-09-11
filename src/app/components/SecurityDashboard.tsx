import { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Lock,
  Key,
  Eye,
  Activity,
  Clock,
  Globe,
  TrendingUp,
  AlertCircle,
  Ban,
  Unlock,
  Trash2,
  Bell,
  BellOff,
  Search,
  Filter,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  Server,
  Skull,
  Info,
  ZapOff,
  Database
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner@2.0.3';
import { SecurityAlerts } from './AdminAlertSystem';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Switch } from './ui/switch';

interface SecurityEvent {
  id: string;
  type: 'success' | 'warning' | 'danger';
  title: string;
  description: string;
  timestamp: string;
  location: string;
}

interface ThreatAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'malware' | 'intrusion' | 'anomaly' | 'bruteforce' | 'data-breach';
  title: string;
  description: string;
  deviceId: string;
  deviceName: string;
  timestamp: string;
  status: 'active' | 'investigating' | 'resolved';
  attackVector?: string;
  affectedFiles?: string[];
}

interface IsolatedDevice {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'server';
  os: string;
  ip: string;
  isolatedAt: string;
  reason: string;
  threatLevel: 'critical' | 'high' | 'medium';
  lastActivity: string;
  isolatedBy: string;
}

const securityEvents: SecurityEvent[] = [
  {
    id: '1',
    type: 'success',
    title: 'Successful Authentication',
    description: 'User logged in from MacBook Pro',
    timestamp: '2 minutes ago',
    location: 'San Francisco, CA'
  },
  {
    id: '2',
    type: 'warning',
    title: 'Unusual Access Pattern',
    description: 'Multiple login attempts detected',
    timestamp: '15 minutes ago',
    location: 'Unknown Location'
  },
  {
    id: '3',
    type: 'success',
    title: 'Security Scan Complete',
    description: 'All devices passed security audit',
    timestamp: '1 hour ago',
    location: 'System'
  },
  {
    id: '4',
    type: 'danger',
    title: 'Failed Login Attempt',
    description: 'Invalid credentials from 203.0.113.45',
    timestamp: '2 hours ago',
    location: 'Moscow, Russia'
  },
];

const initialThreats: ThreatAlert[] = [
  {
    id: 'thr-001',
    severity: 'critical',
    type: 'malware',
    title: 'Ransomware Detected',
    description: 'Suspicious encryption activity detected on multiple files',
    deviceId: 'dev-045',
    deviceName: 'WORKSTATION-05',
    timestamp: '3 minutes ago',
    status: 'active',
    attackVector: 'Email attachment',
    affectedFiles: ['document.pdf.exe', 'invoice.docx.scr']
  },
  {
    id: 'thr-002',
    severity: 'high',
    type: 'intrusion',
    title: 'Unauthorized Access Attempt',
    description: 'Multiple failed SSH login attempts from unknown IP',
    deviceId: 'dev-032',
    deviceName: 'UBUNTU-SERVER-02',
    timestamp: '12 minutes ago',
    status: 'investigating',
    attackVector: 'SSH brute force',
    affectedFiles: []
  },
  {
    id: 'thr-003',
    severity: 'medium',
    type: 'anomaly',
    title: 'Unusual Network Traffic',
    description: 'Abnormal data transfer to external server detected',
    deviceId: 'dev-018',
    deviceName: 'MACBOOK-PRO-07',
    timestamp: '45 minutes ago',
    status: 'investigating',
    attackVector: 'Network connection',
    affectedFiles: []
  },
  {
    id: 'thr-004',
    severity: 'high',
    type: 'bruteforce',
    title: 'Brute Force Attack',
    description: 'Automated password guessing detected on admin account',
    deviceId: 'dev-012',
    deviceName: 'WIN-DESKTOP-03',
    timestamp: '1 hour ago',
    status: 'active',
    attackVector: 'RDP connection',
    affectedFiles: []
  },
];

const initialIsolatedDevices: IsolatedDevice[] = [
  {
    id: 'dev-045',
    name: 'WORKSTATION-05',
    type: 'desktop',
    os: 'Windows 11 Pro',
    ip: '192.168.1.145',
    isolatedAt: '3 minutes ago',
    reason: 'Ransomware detection - Suspicious encryption activity',
    threatLevel: 'critical',
    lastActivity: '5 minutes ago',
    isolatedBy: 'AI Security System'
  },
  {
    id: 'dev-032',
    name: 'UBUNTU-SERVER-02',
    type: 'server',
    os: 'Ubuntu 22.04 LTS',
    ip: '192.168.1.232',
    isolatedAt: '15 minutes ago',
    reason: 'Multiple failed authentication attempts detected',
    threatLevel: 'high',
    lastActivity: '17 minutes ago',
    isolatedBy: 'Admin (John Doe)'
  },
  {
    id: 'dev-067',
    name: 'IPHONE-12-PRO',
    type: 'mobile',
    os: 'iOS 17.2',
    ip: '192.168.1.67',
    isolatedAt: '2 hours ago',
    reason: 'Jailbreak detected - Potential security risk',
    threatLevel: 'medium',
    lastActivity: '2 hours ago',
    isolatedBy: 'AI Security System'
  },
];

export function SecurityDashboard() {
  const [threats, setThreats] = useState<ThreatAlert[]>(initialThreats);
  const [isolatedDevices, setIsolatedDevices] = useState<IsolatedDevice[]>(initialIsolatedDevices);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [autoIsolate, setAutoIsolate] = useState(true);
  const [selectedThreat, setSelectedThreat] = useState<ThreatAlert | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<IsolatedDevice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  // Simulate real-time threat monitoring
  useEffect(() => {
    if (!alertsEnabled) return;

    const interval = setInterval(() => {
      // Randomly generate new threats (10% chance every 30 seconds)
      if (Math.random() < 0.1) {
        const newThreat = generateRandomThreat();
        setThreats(prev => [newThreat, ...prev]);
        
        // Show admin alert notification
        showAdminAlert(newThreat);
        
        // Auto-isolate if enabled and threat is critical
        if (autoIsolate && newThreat.severity === 'critical') {
          setTimeout(() => {
            isolateDeviceAuto(newThreat);
          }, 2000);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [alertsEnabled, autoIsolate]);

  const generateRandomThreat = (): ThreatAlert => {
    const types: ThreatAlert['type'][] = ['malware', 'intrusion', 'anomaly', 'bruteforce', 'data-breach'];
    const severities: ThreatAlert['severity'][] = ['critical', 'high', 'medium', 'low'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
    
    const threats = {
      malware: 'Malware Activity Detected',
      intrusion: 'Intrusion Attempt Blocked',
      anomaly: 'Anomalous Behavior Detected',
      bruteforce: 'Brute Force Attack',
      'data-breach': 'Data Exfiltration Attempt'
    };

    return {
      id: `thr-${Date.now()}`,
      severity: randomSeverity,
      type: randomType,
      title: threats[randomType],
      description: 'AI security system detected suspicious activity',
      deviceId: `dev-${Math.floor(Math.random() * 100)}`,
      deviceName: `DEVICE-${Math.floor(Math.random() * 100)}`,
      timestamp: 'Just now',
      status: 'active',
      attackVector: 'Network',
      affectedFiles: []
    };
  };

  const showAdminAlert = (threat: ThreatAlert) => {
    const severityConfig = {
      critical: { icon: '🚨', duration: Infinity },
      high: { icon: '⚠️', duration: 10000 },
      medium: { icon: '⚡', duration: 5000 },
      low: { icon: 'ℹ️', duration: 3000 }
    };

    const config = severityConfig[threat.severity];
    
    toast.error(
      `${config.icon} ${threat.title}`,
      {
        description: `${threat.deviceName}: ${threat.description}`,
        duration: config.duration,
        action: threat.severity === 'critical' || threat.severity === 'high' ? {
          label: 'Investigate',
          onClick: () => setSelectedThreat(threat)
        } : undefined,
      }
    );
  };

  const isolateDeviceAuto = (threat: ThreatAlert) => {
    // Check if device is already isolated
    const alreadyIsolated = isolatedDevices.some(d => d.id === threat.deviceId);
    
    if (alreadyIsolated) {
      // Device is already isolated, just show notification without adding duplicate
      toast.info('Device Already Isolated', {
        description: `${threat.deviceName} is already in quarantine.`
      });
      return;
    }

    const newIsolatedDevice: IsolatedDevice = {
      id: threat.deviceId,
      name: threat.deviceName,
      type: 'desktop',
      os: 'Unknown',
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      isolatedAt: 'Just now',
      reason: threat.description,
      threatLevel: threat.severity === 'critical' ? 'critical' : threat.severity === 'high' ? 'high' : 'medium',
      lastActivity: 'Just now',
      isolatedBy: 'AI Security System (Auto-Isolate)'
    };

    setIsolatedDevices(prev => [newIsolatedDevice, ...prev]);
    
    toast.success('🔒 Device Auto-Isolated', {
      description: `${threat.deviceName} has been automatically isolated to prevent spread of threat.`
    });
  };

  const handleIsolateDevice = (threat: ThreatAlert) => {
    // Check if device is already isolated
    const alreadyIsolated = isolatedDevices.some(d => d.id === threat.deviceId);
    
    if (alreadyIsolated) {
      toast.info('Device Already Isolated', {
        description: `${threat.deviceName} is already in quarantine.`
      });
      setThreats(prev => prev.map(t => 
        t.id === threat.id ? { ...t, status: 'investigating' as const } : t
      ));
      return;
    }

    const newIsolatedDevice: IsolatedDevice = {
      id: threat.deviceId,
      name: threat.deviceName,
      type: 'desktop',
      os: 'Unknown',
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      isolatedAt: 'Just now',
      reason: threat.description,
      threatLevel: threat.severity === 'critical' ? 'critical' : threat.severity === 'high' ? 'high' : 'medium',
      lastActivity: 'Just now',
      isolatedBy: 'Admin (Manual)'
    };

    setIsolatedDevices(prev => [newIsolatedDevice, ...prev]);
    setThreats(prev => prev.map(t => 
      t.id === threat.id ? { ...t, status: 'investigating' as const } : t
    ));
    
    toast.success('Device Isolated', {
      description: `${threat.deviceName} has been isolated from the network.`
    });
  };

  const handleResolveThreat = () => {
    if (!selectedThreat) return;
    
    setThreats(prev => prev.map(t => 
      t.id === selectedThreat.id ? { ...t, status: 'resolved' as const } : t
    ));
    
    toast.success('Threat Resolved', {
      description: `${selectedThreat.title} has been marked as resolved.`
    });
    
    setShowResolveDialog(false);
    setSelectedThreat(null);
  };

  const handleUnlockDevice = () => {
    if (!selectedDevice) return;
    
    setIsolatedDevices(prev => prev.filter(d => d.id !== selectedDevice.id));
    
    toast.success('Device Unlocked', {
      description: `${selectedDevice.name} has been restored to the network.`
    });
    
    setShowUnlockDialog(false);
    setSelectedDevice(null);
  };

  const handleDeleteDevice = (deviceId: string) => {
    setIsolatedDevices(prev => prev.filter(d => d.id !== deviceId));
    toast.success('Device Removed', {
      description: 'Device has been removed from isolated list.'
    });
  };

  const filteredThreats = threats.filter(threat => {
    const matchesSearch = threat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         threat.deviceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || threat.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  const activeThreatCount = threats.filter(t => t.status === 'active').length;
  const criticalThreatCount = threats.filter(t => t.severity === 'critical' && t.status === 'active').length;

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  const getThreatIcon = (type: string) => {
    const icons = {
      malware: Skull,
      intrusion: AlertTriangle,
      anomaly: Activity,
      bruteforce: Ban,
      'data-breach': Database
    };
    return icons[type as keyof typeof icons] || AlertCircle;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl text-white mb-2">Security Command Center</h1>
            <p className="text-slate-400">Real-time threat monitoring and device isolation management</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2">
              <Bell className={`w-4 h-4 ${alertsEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span className="text-sm text-slate-300">Admin Alerts</span>
              <Switch
                checked={alertsEnabled}
                onCheckedChange={setAlertsEnabled}
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2">
              <ZapOff className={`w-4 h-4 ${autoIsolate ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span className="text-sm text-slate-300">Auto-Isolate</span>
              <Switch
                checked={autoIsolate}
                onCheckedChange={setAutoIsolate}
              />
            </div>
            <Button variant="outline" className="border-slate-700 text-slate-300">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              className="border-cyan-700 text-cyan-300 hover:bg-cyan-900"
              onClick={() => {
                // Demo: Trigger various alert types
                SecurityAlerts.threatDetected(
                  'Ransomware',
                  'DEMO-WORKSTATION',
                  'demo-001',
                  'Critical threat detected by AI security system'
                );
              }}
            >
              <Bell className="w-4 h-4 mr-2" />
              Test Alert
            </Button>
          </div>
        </div>
      </div>

      {/* Security Score and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/30 p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl text-white mb-2">Overall Security Score</h2>
              <p className="text-slate-400">Your system is actively protected</p>
            </div>
            <div className="p-4 bg-green-500/20 rounded-xl">
              <Shield className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="flex items-end gap-4 mb-4">
            <div className="text-6xl text-white">{98 - (criticalThreatCount * 10)}</div>
            <div className="text-2xl text-green-400 mb-2">/100</div>
          </div>

          <div className="h-3 bg-slate-900 rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${98 - (criticalThreatCount * 10)}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-green-400" />
                <span className="text-sm text-slate-400">Encryption</span>
              </div>
              <p className="text-xl text-white">AES-256</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-slate-400">2FA Status</span>
              </div>
              <p className="text-xl text-white">Enabled</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-400">Monitoring</span>
              </div>
              <p className="text-xl text-white">Active</p>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white">Active Threats</h3>
              <Badge className={activeThreatCount > 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}>
                {activeThreatCount > 0 ? 'High Alert' : 'Safe'}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${activeThreatCount > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                {activeThreatCount > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                )}
              </div>
              <div>
                <p className="text-2xl text-white">{activeThreatCount}</p>
                <p className="text-sm text-slate-400">Requires Attention</p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white">Isolated Devices</h3>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Quarantine</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Ban className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl text-white">{isolatedDevices.length}</p>
                <p className="text-sm text-slate-400">In Lockdown</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl text-white mb-1">1,247</p>
          <p className="text-sm text-slate-400">Security Scans</p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl text-white mb-1">99.8%</p>
          <p className="text-sm text-slate-400">Uptime</p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Lock className="w-6 h-6 text-purple-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl text-white mb-1">256-bit</p>
          <p className="text-sm text-slate-400">Encryption</p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <Ban className="w-6 h-6 text-orange-400" />
            </div>
            <span className="text-sm text-orange-400">Today</span>
          </div>
          <p className="text-2xl text-white mb-1">23</p>
          <p className="text-sm text-slate-400">Blocked Attacks</p>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="threats" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="threats" className="data-[state=active]:bg-cyan-600">
            Threat Alerts ({threats.length})
          </TabsTrigger>
          <TabsTrigger value="isolated" className="data-[state=active]:bg-cyan-600">
            Isolated Devices ({isolatedDevices.length})
          </TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-cyan-600">
            Security Events
          </TabsTrigger>
        </TabsList>

        {/* Threat Alerts Tab */}
        <TabsContent value="threats" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-white">Active Threat Alerts</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search threats..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-700 text-white w-64"
                  />
                </div>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <Button variant="outline" className="border-slate-700 text-slate-300">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredThreats.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-slate-400">No threats found</p>
                </div>
              ) : (
                filteredThreats.map((threat) => {
                  const ThreatIcon = getThreatIcon(threat.type);
                  
                  return (
                    <div 
                      key={threat.id} 
                      className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700/50"
                    >
                      <div className={`p-3 rounded-lg ${
                        threat.severity === 'critical' ? 'bg-red-500/20' :
                        threat.severity === 'high' ? 'bg-orange-500/20' :
                        threat.severity === 'medium' ? 'bg-yellow-500/20' :
                        'bg-blue-500/20'
                      }`}>
                        <ThreatIcon className={`w-6 h-6 ${
                          threat.severity === 'critical' ? 'text-red-400' :
                          threat.severity === 'high' ? 'text-orange-400' :
                          threat.severity === 'medium' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-white">{threat.title}</h3>
                              <Badge className={getSeverityColor(threat.severity)}>
                                {threat.severity.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className={
                                threat.status === 'active' ? 'border-red-500/30 text-red-400' :
                                threat.status === 'investigating' ? 'border-yellow-500/30 text-yellow-400' :
                                'border-green-500/30 text-green-400'
                              }>
                                {threat.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-400 mb-2">{threat.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Server className="w-3 h-3" />
                            <span>{threat.deviceName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{threat.timestamp}</span>
                          </div>
                          {threat.attackVector && (
                            <div className="flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              <span>Vector: {threat.attackVector}</span>
                            </div>
                          )}
                        </div>

                        {threat.affectedFiles && threat.affectedFiles.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-slate-500 mb-1">Affected Files:</p>
                            <div className="flex flex-wrap gap-2">
                              {threat.affectedFiles.map((file, idx) => (
                                <Badge key={idx} variant="outline" className="border-red-500/30 text-red-400 text-xs">
                                  {file}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {threat.status === 'active' && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleIsolateDevice(threat)}
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Isolate Device
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-slate-700 text-slate-300"
                                onClick={() => {
                                  setSelectedThreat(threat);
                                  setShowResolveDialog(true);
                                }}
                              >
                                Mark Resolved
                              </Button>
                            </>
                          )}
                          {threat.status === 'investigating' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-slate-700 text-slate-300"
                              onClick={() => {
                                setSelectedThreat(threat);
                                setShowResolveDialog(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Resolve Threat
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-slate-400">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Isolated Devices Tab */}
        <TabsContent value="isolated" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-white">Quarantined Devices</h2>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                {isolatedDevices.length} Device{isolatedDevices.length !== 1 ? 's' : ''} in Lockdown
              </Badge>
            </div>

            <div className="space-y-4">
              {isolatedDevices.length === 0 ? (
                <div className="text-center py-12">
                  <Wifi className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-slate-400">No devices are currently isolated</p>
                </div>
              ) : (
                isolatedDevices.map((device) => (
                  <div 
                    key={device.id} 
                    className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg border border-orange-500/30"
                  >
                    <div className="p-3 bg-orange-500/20 rounded-lg">
                      <WifiOff className="w-6 h-6 text-orange-400" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white">{device.name}</h3>
                            <Badge className={getSeverityColor(device.threatLevel)}>
                              {device.threatLevel.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="border-slate-700 text-slate-400">
                              {device.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-400 mb-2">{device.os} • {device.ip}</p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-900 rounded-lg p-3 mb-3">
                        <p className="text-xs text-slate-500 mb-1">Isolation Reason:</p>
                        <p className="text-sm text-white">{device.reason}</p>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Isolated {device.isolatedAt}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          <span>Last activity: {device.lastActivity}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          <span>By: {device.isolatedBy}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            setSelectedDevice(device);
                            setShowUnlockDialog(true);
                          }}
                        >
                          <Unlock className="w-4 h-4 mr-2" />
                          Restore Access
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-slate-700 text-slate-300"
                        >
                          Run Scan
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleDeleteDevice(device.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Security Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-white">Recent Security Events</h2>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Live Monitor</Badge>
            </div>

            <div className="space-y-4">
              {securityEvents.map((event) => {
                const icons = {
                  success: CheckCircle,
                  warning: AlertTriangle,
                  danger: XCircle
                };
                const Icon = icons[event.type];
                const colors = {
                  success: 'text-green-400 bg-green-500/20',
                  warning: 'text-orange-400 bg-orange-500/20',
                  danger: 'text-red-400 bg-red-500/20'
                };

                return (
                  <div key={event.id} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                    <div className={`p-2 rounded-lg ${colors[event.type]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-white">{event.title}</h3>
                        <Badge variant="outline" className="border-slate-700 text-slate-400">
                          {event.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{event.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{event.timestamp}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resolve Threat Dialog */}
      <AlertDialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Resolve Threat</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to mark this threat as resolved? This action will remove it from active monitoring.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedThreat && (
            <div className="bg-slate-800 rounded-lg p-4 my-4">
              <p className="text-sm text-slate-400 mb-1">Threat:</p>
              <p className="text-white">{selectedThreat.title}</p>
              <p className="text-sm text-slate-400 mt-2">Device:</p>
              <p className="text-white">{selectedThreat.deviceName}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResolveThreat}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Confirm Resolution
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlock Device Dialog */}
      <AlertDialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Restore Device Access</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to restore network access to this device? Make sure the threat has been fully mitigated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedDevice && (
            <div className="bg-slate-800 rounded-lg p-4 my-4">
              <p className="text-sm text-slate-400 mb-1">Device:</p>
              <p className="text-white">{selectedDevice.name}</p>
              <p className="text-sm text-slate-400 mt-2">Isolation Reason:</p>
              <p className="text-white">{selectedDevice.reason}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUnlockDevice}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Restore Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}