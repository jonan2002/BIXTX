import { useState } from 'react';
import { 
  Wifi, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Signal, 
  CheckCircle2, 
  Monitor,
  Smartphone,
  Link2,
  Eye,
  Check,
  X,
  Zap,
  Shield,
  Target,
  Radar,
  Activity,
  AlertTriangle,
  Radio
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';

interface WiFiDevice {
  id: string;
  name: string;
  type: 'desktop' | 'mobile';
  os: string;
  ip: string;
  paired: boolean;
  mac?: string;
  manufacturer?: string;
  vulnerabilities?: number;
  threatLevel?: 'low' | 'medium' | 'high' | 'critical';
}

interface WiFiNetwork {
  id: string;
  ssid: string;
  signal: number;
  security: 'open' | 'wpa2' | 'wpa3';
  frequency: '2.4GHz' | '5GHz';
  connected: boolean;
  deviceCount: number;
  devices?: WiFiDevice[];
  bssid?: string;
  channel?: number;
  encryption?: string;
}

interface Session {
  id: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile';
  os: string;
  status: 'active' | 'paused' | 'offline';
  duration: string;
  dataTransferred: string;
  latency: string;
  isRecording: boolean;
  offlineData: string;
}

interface WiFiNetworkScannerProps {
  onAddSession?: (session: Session) => void;
}

const mockWiFiNetworks: WiFiNetwork[] = [
  {
    id: 'net-001',
    ssid: 'Home WiFi',
    signal: 92,
    security: 'wpa3',
    frequency: '5GHz',
    connected: true,
    deviceCount: 5,
    bssid: '00:1A:2B:3C:4D:5E',
    channel: 36,
    encryption: 'AES-256',
    devices: [
      { 
        id: 'dev-1', 
        name: 'iPad Pro', 
        type: 'mobile', 
        os: 'iPadOS 17.2', 
        ip: '192.168.1.120', 
        paired: false,
        mac: '00:1B:44:11:3A:B7',
        manufacturer: 'Apple Inc.',
        vulnerabilities: 0,
        threatLevel: 'low'
      },
      { 
        id: 'dev-2', 
        name: 'Dell Laptop', 
        type: 'desktop', 
        os: 'Windows 11', 
        ip: '192.168.1.121', 
        paired: false,
        mac: '00:50:56:C0:00:08',
        manufacturer: 'Dell Inc.',
        vulnerabilities: 2,
        threatLevel: 'medium'
      },
      { 
        id: 'dev-3', 
        name: 'iPhone 14', 
        type: 'mobile', 
        os: 'iOS 17.1', 
        ip: '192.168.1.122', 
        paired: false,
        mac: '00:1C:B3:09:85:15',
        manufacturer: 'Apple Inc.',
        vulnerabilities: 0,
        threatLevel: 'low'
      },
      { 
        id: 'dev-4', 
        name: 'MacBook Air', 
        type: 'desktop', 
        os: 'macOS Sonoma', 
        ip: '192.168.1.123', 
        paired: false,
        mac: '00:1E:52:AB:CD:EF',
        manufacturer: 'Apple Inc.',
        vulnerabilities: 0,
        threatLevel: 'low'
      },
      { 
        id: 'dev-5', 
        name: 'Samsung Tab', 
        type: 'mobile', 
        os: 'Android 14', 
        ip: '192.168.1.124', 
        paired: false,
        mac: '00:1A:11:22:33:44',
        manufacturer: 'Samsung Electronics',
        vulnerabilities: 1,
        threatLevel: 'low'
      }
    ]
  },
  {
    id: 'net-002',
    ssid: 'Office_Network_5G',
    signal: 78,
    security: 'wpa2',
    frequency: '5GHz',
    connected: false,
    deviceCount: 12,
    bssid: '00:2A:3B:4C:5D:6E',
    channel: 44,
    encryption: 'AES-128',
    devices: []
  },
  {
    id: 'net-003',
    ssid: 'CoffeeShop_Public',
    signal: 65,
    security: 'open',
    frequency: '2.4GHz',
    connected: false,
    deviceCount: 8,
    bssid: '00:3A:4B:5C:6D:7E',
    channel: 6,
    encryption: 'None',
    devices: []
  },
  {
    id: 'net-004',
    ssid: 'Neighbor_WiFi',
    signal: 45,
    security: 'wpa2',
    frequency: '2.4GHz',
    connected: false,
    deviceCount: 3,
    bssid: '00:4A:5B:6C:7D:8E',
    channel: 11,
    encryption: 'AES-128',
    devices: []
  },
  {
    id: 'net-005',
    ssid: 'Guest_Network',
    signal: 82,
    security: 'wpa2',
    frequency: '5GHz',
    connected: false,
    deviceCount: 6,
    bssid: '00:5A:6B:7C:8D:9E',
    channel: 48,
    encryption: 'AES-128',
    devices: []
  }
];

export function WiFiNetworkScanner({ onAddSession }: WiFiNetworkScannerProps) {
  const [networks, setNetworks] = useState<WiFiNetwork[]>(mockWiFiNetworks);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showDevicesDialog, setShowDevicesDialog] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<WiFiNetwork | null>(null);
  const [password, setPassword] = useState('');
  const [stealthMode, setStealthMode] = useState(false);

  const handleScan = () => {
    setScanning(true);
    toast.info('🛰️ Initiating military-grade network scan...', {
      description: 'Advanced RF spectrum analysis in progress'
    });
    
    setTimeout(() => {
      setScanning(false);
      const totalDevices = networks.reduce((sum, net) => sum + net.deviceCount, 0);
      toast.success(`⚡ Scan complete: ${networks.length} networks | ${totalDevices} devices detected`, {
        description: 'All network signatures captured and analyzed',
        duration: 4000
      });
    }, 1500);
  };

  const handlePairDevice = (device: WiFiDevice, networkId: string) => {
    toast.info(`🔐 Establishing secure tunnel to "${device.name}"...`, {
      description: 'Military-grade E2E encryption handshake initiated'
    });
    
    setTimeout(() => {
      // Update device paired status
      setNetworks(networks.map(net => {
        if (net.id === networkId && net.devices) {
          return {
            ...net,
            devices: net.devices.map(d => 
              d.id === device.id ? { ...d, paired: true } : d
            )
          };
        }
        return net;
      }));
      
      // Update selected network if it's showing
      if (selectedNetwork && selectedNetwork.id === networkId && selectedNetwork.devices) {
        setSelectedNetwork({
          ...selectedNetwork,
          devices: selectedNetwork.devices.map(d => 
            d.id === device.id ? { ...d, paired: true } : d
          )
        });
      }
      
      toast.success(`✅ Secure link established with "${device.name}"`, {
        description: '🔒 AES-256 encrypted channel active | Zero-latency protocol enabled',
        duration: 4000
      });
    }, 800);
  };

  const handleUnpairDevice = (device: WiFiDevice, networkId: string) => {
    // Update device paired status
    setNetworks(networks.map(net => {
      if (net.id === networkId && net.devices) {
        return {
          ...net,
          devices: net.devices.map(d => 
            d.id === device.id ? { ...d, paired: false } : d
          )
        };
      }
      return net;
    }));
    
    // Update selected network if it's showing
    if (selectedNetwork && selectedNetwork.id === networkId && selectedNetwork.devices) {
      setSelectedNetwork({
        ...selectedNetwork,
        devices: selectedNetwork.devices.map(d => 
          d.id === device.id ? { ...d, paired: false } : d
        )
      });
    }
    
    toast.success(`🔓 Secure link terminated: "${device.name}"`);
  };

  const handleMonitorDevice = (device: WiFiDevice) => {
    if (!device.paired) {
      toast.error('❌ Device must be paired before initiating remote operations');
      return;
    }

    toast.success(`🎯 Deploying remote control interface for "${device.name}"...`, {
      description: 'Establishing command & control channel'
    });
    
    // Close the devices dialog
    setShowDevicesDialog(false);
    
    // Create a new session object
    const newSession: Session = {
      id: `session-wifi-${Date.now()}`,
      deviceName: device.name,
      deviceType: device.type,
      os: device.os,
      status: 'active',
      duration: '00:00:00',
      dataTransferred: '0 MB',
      latency: `${Math.floor(Math.random() * 10) + 3}ms`,
      isRecording: false,
      offlineData: '0 MB'
    };
    
    // Simulate session creation
    setTimeout(() => {
      // Add the session if onAddSession callback is provided
      if (onAddSession) {
        onAddSession(newSession);
      }
      
      toast.success(`🚀 ACTIVE: Full remote control session - "${device.name}"`, {
        description: '⚡ Ultra-low latency link established | Navigate to Sessions panel for C2 operations',
        duration: 5000,
      });
      
      // Show tip after a short delay
      setTimeout(() => {
        toast.info(`💡 Command Center: Access "Sessions" for complete device control suite`, {
          duration: 4000,
        });
      }, 1500);
    }, 600);
  };

  const handleConnectNetwork = (network: WiFiNetwork) => {
    if (network.connected) {
      // Show devices on this network
      setSelectedNetwork(network);
      setShowDevicesDialog(true);
    } else {
      // Show connection dialog
      setSelectedNetwork(network);
      setShowConnectDialog(true);
    }
  };

  const confirmConnect = () => {
    if (!selectedNetwork) return;
    
    if (selectedNetwork.security !== 'open' && password.length < 8) {
      toast.error('❌ Password must be at least 8 characters');
      return;
    }
    
    setConnecting(true);
    toast.info(`⚡ Swift infiltration protocol: "${selectedNetwork.ssid}"...`, {
      description: stealthMode ? '👻 Stealth mode: Ghost connection active' : '🔐 Secure authentication in progress'
    });
    
    setTimeout(() => {
      // Simulate discovering devices on the network
      const mockDevices: WiFiDevice[] = [
        { 
          id: `${selectedNetwork.id}-dev-1`, 
          name: 'HP Printer', 
          type: 'desktop', 
          os: 'Printer OS', 
          ip: '192.168.2.100', 
          paired: false,
          mac: '00:25:B3:97:65:43',
          manufacturer: 'HP Inc.',
          vulnerabilities: 3,
          threatLevel: 'medium'
        },
        { 
          id: `${selectedNetwork.id}-dev-2`, 
          name: 'Smart TV', 
          type: 'desktop', 
          os: 'Android TV', 
          ip: '192.168.2.101', 
          paired: false,
          mac: '00:11:22:33:44:55',
          manufacturer: 'Samsung',
          vulnerabilities: 5,
          threatLevel: 'high'
        },
        { 
          id: `${selectedNetwork.id}-dev-3`, 
          name: 'Pixel 8', 
          type: 'mobile', 
          os: 'Android 14', 
          ip: '192.168.2.102', 
          paired: false,
          mac: '00:1A:2B:3C:4D:5F',
          manufacturer: 'Google',
          vulnerabilities: 0,
          threatLevel: 'low'
        }
      ];
      
      setNetworks(networks.map(net => ({
        ...net,
        connected: net.id === selectedNetwork.id,
        devices: net.id === selectedNetwork.id ? mockDevices : net.devices
      })));
      
      setConnecting(false);
      toast.success(`✅ Network infiltration successful: "${selectedNetwork.ssid}"`, {
        description: `🎯 ${mockDevices.length} targets acquired | Threat analysis complete`,
        duration: 4000
      });
      
      setShowConnectDialog(false);
      setPassword('');
      
      // Show devices automatically
      setTimeout(() => {
        setSelectedNetwork({...selectedNetwork, connected: true, devices: mockDevices});
        setShowDevicesDialog(true);
      }, 400);
    }, 1200);
  };

  const getSignalIcon = (signal: number) => {
    if (signal >= 80) return <Signal className="w-5 h-5 text-green-400" />;
    if (signal >= 60) return <Signal className="w-5 h-5 text-yellow-400" />;
    return <Signal className="w-5 h-5 text-red-400" />;
  };

  const getSignalColor = (signal: number) => {
    if (signal >= 80) return 'text-green-400';
    if (signal >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getThreatBadge = (level?: 'low' | 'medium' | 'high' | 'critical') => {
    switch (level) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">CRITICAL</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">HIGH</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">MEDIUM</Badge>;
      default:
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">SECURE</Badge>;
    }
  };

  const connectedNetwork = networks.find(n => n.connected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Radar className="w-6 h-6 text-cyan-400 animate-pulse" />
            <h3 className="text-xl text-white">Military-Grade Network Intelligence</h3>
          </div>
          <p className="text-sm text-slate-400">Advanced RF spectrum analysis & swift infiltration protocol</p>
        </div>
        <Button 
          onClick={handleScan}
          disabled={scanning}
          className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 text-white hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 shadow-lg shadow-cyan-500/20"
        >
          <Zap className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning RF Spectrum...' : 'Deep Network Scan'}
        </Button>
      </div>

      {/* Current Connection */}
      {connectedNetwork && (
        <Card className="bg-gradient-to-r from-green-900/30 via-emerald-900/30 to-cyan-900/30 border-green-500/50 p-4 shadow-lg shadow-green-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg animate-pulse">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-medium">{connectedNetwork.ssid}</p>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    ACTIVE LINK
                  </Badge>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    <Shield className="w-3 h-3 mr-1" />
                    {connectedNetwork.encryption}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <span>{connectedNetwork.deviceCount} targets</span>
                  <span>•</span>
                  <span>Channel {connectedNetwork.channel}</span>
                  <span>•</span>
                  <span>{connectedNetwork.frequency}</span>
                  <span>•</span>
                  <span className={getSignalColor(connectedNetwork.signal)}>{connectedNetwork.signal}% signal</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => handleConnectNetwork(connectedNetwork)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg"
              size="sm"
            >
              <Target className="w-4 h-4 mr-2" />
              View Targets
            </Button>
          </div>
        </Card>
      )}

      {/* Available Networks */}
      <Card className="bg-slate-900 border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            Detected Networks ({networks.length})
          </h4>
          <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-600">
            Total Devices: {networks.reduce((sum, net) => sum + net.deviceCount, 0)}
          </Badge>
        </div>
        <div className="space-y-3">
          {networks.map((network) => (
            <div
              key={network.id}
              className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${
                network.connected
                  ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-500/50 shadow-lg shadow-green-500/10'
                  : 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50'
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`p-2 rounded-lg ${network.connected ? 'bg-green-500/20' : 'bg-slate-700/50'}`}>
                  <Wifi className={`w-5 h-5 ${network.connected ? 'text-green-400' : 'text-blue-400'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="text-white font-medium">{network.ssid}</h5>
                    {network.security === 'wpa3' ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <Shield className="w-3 h-3 mr-1" />
                        WPA3
                      </Badge>
                    ) : network.security === 'wpa2' ? (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        <Lock className="w-3 h-3 mr-1" />
                        WPA2
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        UNSECURED
                      </Badge>
                    )}
                    {network.encryption && (
                      <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-600 text-xs">
                        {network.encryption}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <span>{network.frequency}</span>
                    <span>•</span>
                    <span>Ch {network.channel}</span>
                    <span>•</span>
                    <span>{network.deviceCount} devices</span>
                    <span>•</span>
                    <span className="font-mono text-xs">{network.bssid}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-slate-400">Signal</p>
                  <div className="flex items-center gap-1">
                    {getSignalIcon(network.signal)}
                    <span className={`font-medium ${getSignalColor(network.signal)}`}>{network.signal}%</span>
                  </div>
                </div>
                <Button
                  onClick={() => handleConnectNetwork(network)}
                  className={network.connected 
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                    : "bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 text-white hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 shadow-lg"
                  }
                  size="sm"
                >
                  {network.connected ? (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      View Targets
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Swift Connect
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Swift Network Infiltration Protocol
            </DialogTitle>
            <DialogDescription>
              Establish secure military-grade connection to "{selectedNetwork?.ssid}"
            </DialogDescription>
          </DialogHeader>

          {selectedNetwork && (
            <div className="space-y-4">
              <Card className="bg-slate-800/50 border-slate-700 p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Target Network:</span>
                    <span className="text-white font-medium">{selectedNetwork.ssid}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Security Protocol:</span>
                    <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-600 uppercase">
                      {selectedNetwork.security} / {selectedNetwork.encryption}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Frequency Band:</span>
                    <span className="text-white">{selectedNetwork.frequency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Channel:</span>
                    <span className="text-white">{selectedNetwork.channel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Signal Strength:</span>
                    <span className={getSignalColor(selectedNetwork.signal)}>{selectedNetwork.signal}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">BSSID:</span>
                    <span className="text-white font-mono text-xs">{selectedNetwork.bssid}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Targets Detected:</span>
                    <span className="text-white">{selectedNetwork.deviceCount}</span>
                  </div>
                </div>
              </Card>

              {selectedNetwork.security !== 'open' && (
                <div className="space-y-2">
                  <Label htmlFor="wifi-password" className="text-white">Authentication Key</Label>
                  <Input
                    id="wifi-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter network passphrase"
                    className="bg-slate-800 border-slate-700 text-white font-mono"
                    disabled={connecting}
                  />
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <Zap className="w-5 h-5 text-cyan-400" />
                <p className="text-sm text-cyan-300">
                  Swift infiltration protocol will establish connection in &lt;2 seconds and auto-discover all network targets.
                </p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <Shield className="w-5 h-5 text-purple-400" />
                <p className="text-sm text-purple-300">
                  AES-256 military-grade encryption will secure all data transmission on this network.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setShowConnectDialog(false);
                setPassword('');
              }}
              variant="outline"
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              disabled={connecting}
            >
              Abort
            </Button>
            <Button
              onClick={confirmConnect}
              className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 text-white hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 shadow-lg"
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-spin" />
                  Infiltrating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Execute Swift Connect
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Devices Dialog */}
      <Dialog open={showDevicesDialog} onOpenChange={setShowDevicesDialog}>
        <DialogContent className="max-w-3xl border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400 animate-pulse" />
              Target Acquisition: "{selectedNetwork?.ssid}"
            </DialogTitle>
            <DialogDescription>
              {selectedNetwork?.devices?.length || 0} devices identified | Threat analysis complete
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {selectedNetwork?.devices && selectedNetwork.devices.length > 0 ? (
              selectedNetwork.devices.map((device) => (
                <div
                  key={device.id}
                  className={`p-4 rounded-lg transition-all duration-200 ${
                    device.paired 
                      ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-500/50 shadow-lg'
                      : 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        device.type === 'desktop' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                      }`}>
                        {device.type === 'desktop' ? (
                          <Monitor className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Smartphone className="w-5 h-5 text-purple-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="text-white font-medium">{device.name}</h5>
                          {device.paired && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              PAIRED
                            </Badge>
                          )}
                          {getThreatBadge(device.threatLevel)}
                        </div>
                        <p className="text-sm text-slate-400">{device.os}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {device.paired ? (
                        <>
                          <Button
                            onClick={() => handleMonitorDevice(device)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg"
                            size="sm"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Deploy C2
                          </Button>
                          <Button
                            onClick={() => handleUnpairDevice(device, selectedNetwork.id)}
                            variant="outline"
                            size="sm"
                            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => handlePairDevice(device, selectedNetwork.id)}
                          className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 text-white hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 shadow-lg"
                          size="sm"
                        >
                          <Link2 className="w-4 h-4 mr-2" />
                          Secure Link
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm bg-slate-900/50 p-3 rounded">
                    <div className="flex justify-between">
                      <span className="text-slate-400">IP Address:</span>
                      <span className="text-white font-mono">{device.ip}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">MAC Address:</span>
                      <span className="text-white font-mono text-xs">{device.mac}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Manufacturer:</span>
                      <span className="text-white text-xs">{device.manufacturer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vulnerabilities:</span>
                      <span className={device.vulnerabilities && device.vulnerabilities > 0 ? 'text-orange-400' : 'text-green-400'}>
                        {device.vulnerabilities || 0} found
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Radar className="w-12 h-12 mx-auto mb-3 text-slate-600 animate-pulse" />
                <p>No targets detected on this network</p>
                <p className="text-sm text-slate-500 mt-2">Devices will appear here once discovered</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-700">
            <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-600">
              <Shield className="w-3 h-3 mr-1" />
              All connections secured with AES-256 encryption
            </Badge>
            <Button
              onClick={() => setShowDevicesDialog(false)}
              variant="outline"
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}