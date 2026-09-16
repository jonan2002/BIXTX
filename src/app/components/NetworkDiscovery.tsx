import { useState, useEffect } from 'react';
import { 
  Wifi, 
  Bluetooth, 
  Radio,
  Monitor,
  Smartphone,
  Check,
  X,
  RefreshCw,
  Link2,
  Settings,
  Shield,
  Eye,
  Download,
  Activity,
  HardDrive,
  Camera,
  Mic,
  ScreenShare,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Unlock,
  Signal
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { WiFiNetworkScanner } from './WiFiNetworkScanner';

interface NearbyDevice {
  id: string;
  name: string;
  type: 'desktop' | 'mobile';
  os: string;
  connectionType: 'wifi' | 'bluetooth';
  signal: number;
  ip: string;
  status: 'discovered' | 'paired' | 'connecting';
  authorized: boolean;
  softwareVersion?: string;
  lastSync?: string;
  battery?: number;
  networkId?: string; // Which network this device is on
  storage?: {
    used: number;
    total: number;
  };
}

interface WiFiNetwork {
  id: string;
  ssid: string;
  signal: number;
  security: 'open' | 'wpa2' | 'wpa3';
  frequency: '2.4GHz' | '5GHz';
  connected: boolean;
  deviceCount: number;
}

const mockNearbyDevices: NearbyDevice[] = [
  {
    id: 'nearby-001',
    name: 'iPad Pro',
    type: 'mobile',
    os: 'iPadOS 17.2',
    connectionType: 'wifi',
    signal: 95,
    ip: '192.168.1.120',
    status: 'discovered',
    authorized: false,
    softwareVersion: '2.4.1',
    lastSync: '2 hours ago',
    battery: 78,
    storage: { used: 45, total: 128 }
  },
  {
    id: 'nearby-002',
    name: 'Dell Laptop',
    type: 'desktop',
    os: 'Windows 11',
    connectionType: 'wifi',
    signal: 88,
    ip: '192.168.1.121',
    status: 'discovered',
    authorized: false,
    softwareVersion: '2.4.0',
    lastSync: '5 minutes ago',
    battery: 92,
    storage: { used: 256, total: 512 }
  },
  {
    id: 'nearby-003',
    name: 'AirPods Pro',
    type: 'mobile',
    os: 'Bluetooth Device',
    connectionType: 'bluetooth',
    signal: 75,
    ip: 'N/A',
    status: 'discovered',
    authorized: false,
    softwareVersion: '1.8.5',
    lastSync: 'Never',
    battery: 45,
    storage: { used: 0, total: 0 }
  },
];

type DeviceFilter = 'all' | 'paired' | 'wifi' | 'bluetooth';

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

interface NetworkDiscoveryProps {
  onAddSession?: (session: Session) => void;
}

export function NetworkDiscovery({ onAddSession }: NetworkDiscoveryProps = {}) {
  const [nearbyDevices, setNearbyDevices] = useState<NearbyDevice[]>(mockNearbyDevices);
  const [scanning, setScanning] = useState(false);
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);
  const [showPairDialog, setShowPairDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<NearbyDevice | null>(null);
  const [activeFilter, setActiveFilter] = useState<DeviceFilter>('all');
  const [showMonitorDialog, setShowMonitorDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeProgress, setUpgradeProgress] = useState(0);
  const [monitoringDevice, setMonitoringDevice] = useState<NearbyDevice | null>(null);

  const handleScan = () => {
    setScanning(true);
    toast.info('Scanning for nearby devices...');
    
    setTimeout(() => {
      setScanning(false);
      toast.success('Scan complete. Found ' + nearbyDevices.length + ' devices');
    }, 2000);
  };

  const handlePairDevice = (device: NearbyDevice) => {
    setSelectedDevice(device);
    setShowPairDialog(true);
  };

  const confirmPairing = () => {
    if (!selectedDevice) return;

    setNearbyDevices(nearbyDevices.map(d => 
      d.id === selectedDevice.id 
        ? { ...d, status: 'paired', authorized: true }
        : d
    ));

    toast.success(`Device "${selectedDevice.name}" paired successfully!`);
    setShowPairDialog(false);
    setSelectedDevice(null);
  };

  const handleUnpairDevice = (deviceId: string) => {
    const device = nearbyDevices.find(d => d.id === deviceId);
    
    setNearbyDevices(nearbyDevices.map(d => 
      d.id === deviceId 
        ? { ...d, status: 'discovered', authorized: false }
        : d
    ));

    toast.success(`Device "${device?.name}" unpaired`);
  };

  const handleToggleWifi = () => {
    setWifiEnabled(!wifiEnabled);
    toast.success(wifiEnabled ? 'WiFi discovery disabled' : 'WiFi discovery enabled');
  };

  const handleToggleBluetooth = () => {
    setBluetoothEnabled(!bluetoothEnabled);
    toast.success(bluetoothEnabled ? 'Bluetooth discovery disabled' : 'Bluetooth discovery enabled');
  };

  const wifiDevices = nearbyDevices.filter(d => d.connectionType === 'wifi');
  const bluetoothDevices = nearbyDevices.filter(d => d.connectionType === 'bluetooth');
  const pairedDevices = nearbyDevices.filter(d => d.status === 'paired');

  // Filter devices based on active filter
  const getFilteredDevices = () => {
    switch (activeFilter) {
      case 'paired':
        return pairedDevices;
      case 'wifi':
        return wifiDevices;
      case 'bluetooth':
        return bluetoothDevices;
      default:
        return nearbyDevices;
    }
  };

  const filteredDevices = getFilteredDevices();

  const handleFilterClick = (filter: DeviceFilter) => {
    setActiveFilter(filter);
    const filterLabels = {
      all: 'All Devices',
      paired: 'Paired Devices',
      wifi: 'WiFi Devices',
      bluetooth: 'Bluetooth Devices'
    };
    toast.info(`Showing ${filterLabels[filter]}`);
  };

  const handleMonitorDevice = (device: NearbyDevice) => {
    if (device.status !== 'paired') {
      toast.error('Device must be paired before monitoring');
      return;
    }
    setMonitoringDevice(device);
    setShowMonitorDialog(true);
  };

  const handleUpgradeDevice = (device: NearbyDevice) => {
    if (device.status !== 'paired') {
      toast.error('Device must be paired before upgrading');
      return;
    }
    setSelectedDevice(device);
    setShowUpgradeDialog(true);
  };

  const confirmUpgrade = () => {
    if (!selectedDevice) return;
    
    setUpgrading(true);
    setUpgradeProgress(0);
    toast.info(`Starting software upgrade for "${selectedDevice.name}"...`);

    // Simulate upgrade progress
    const interval = setInterval(() => {
      setUpgradeProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUpgrading(false);
          
          // Update device software version
          setNearbyDevices(nearbyDevices.map(d => 
            d.id === selectedDevice.id 
              ? { ...d, softwareVersion: '2.5.0' }
              : d
          ));
          
          toast.success(`Software upgrade complete for "${selectedDevice.name}"!`);
          setTimeout(() => {
            setShowUpgradeDialog(false);
            setUpgradeProgress(0);
            setSelectedDevice(null);
          }, 1500);
          
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  };

  const handleStartRemoteControl = (device: NearbyDevice) => {
    toast.success(`Initializing remote control session for \"${device.name}\"...`);
    
    // Close the monitor dialog
    setShowMonitorDialog(false);
    
    // Create a new session object
    const newSession: Session = {
      id: `session-net-${Date.now()}`, // Unique ID with timestamp
      deviceName: device.name,
      deviceType: device.type,
      os: device.os,
      status: 'active',
      duration: '00:00:00',
      dataTransferred: '0 MB',
      latency: device.ip !== 'N/A' ? `${Math.floor(Math.random() * 20) + 10}ms` : '-',
      isRecording: false,
      offlineData: '0 MB'
    };
    
    // Simulate session creation
    setTimeout(() => {
      // Add the session if onAddSession callback is provided
      if (onAddSession) {
        onAddSession(newSession);
      }
      
      toast.success(`🎮 Remote control session started for \"${device.name}\"`, {
        description: 'Device added to active sessions. Navigate to \"Sessions\" to view and control.',
        duration: 5000,
      });
      
      // Show tip after a short delay
      setTimeout(() => {
        toast.info(`💡 Tip: Check the \"Sessions\" menu to manage this remote control session`, {
          duration: 4000,
        });
      }, 1500);
    }, 800);
  };

  const handleCameraAccess = (device: NearbyDevice) => {
    toast.info(`Requesting camera access from "${device.name}"...`);
    setTimeout(() => {
      toast.success(`📷 Camera access granted for "${device.name}"`, {
        description: 'Live camera feed is now available',
      });
    }, 1000);
  };

  const handleMicrophoneAccess = (device: NearbyDevice) => {
    toast.info(`Requesting microphone access from "${device.name}"...`);
    setTimeout(() => {
      toast.success(`🎤 Microphone access granted for "${device.name}"`, {
        description: 'Audio monitoring is now active',
      });
    }, 1000);
  };

  const handleScreenRecording = (device: NearbyDevice) => {
    toast.info(`Starting screen recording for "${device.name}"...`);
    setTimeout(() => {
      toast.success(`🎬 Screen recording started for "${device.name}"`, {
        description: 'Recording session active. Stop recording from the control panel.',
      });
    }, 1200);
  };

  const handleAccessFiles = (device: NearbyDevice) => {
    toast.info(`Requesting file system access from "${device.name}"...`);
    setTimeout(() => {
      toast.success(`📁 File access granted for "${device.name}"`, {
        description: 'You can now browse and manage files on this device',
      });
    }, 1000);
  };

  const handleGetLocation = (device: NearbyDevice) => {
    toast.info(`Requesting location data from "${device.name}"...`);
    setTimeout(() => {
      const locations = [
        'San Francisco, CA',
        'New York, NY',
        'Los Angeles, CA',
        'Chicago, IL',
        'Seattle, WA'
      ];
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      toast.success(`📍 Location: ${randomLocation}`, {
        description: `GPS coordinates retrieved from "${device.name}"`,
      });
    }, 1500);
  };

  const handleRunCustomCommand = (device: NearbyDevice) => {
    toast.info(`Sending custom command to "${device.name}"...`);
    setTimeout(() => {
      toast.success(`⚡ Command executed successfully on "${device.name}"`, {
        description: 'Command output logged to device console',
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-white mb-2">Network Discovery</h2>
          <p className="text-slate-400">Discover and connect to nearby devices on the same network</p>
        </div>
        <Button 
          onClick={handleScan}
          disabled={scanning}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'Scan Network'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className={`bg-slate-900 p-4 cursor-pointer transition-all duration-200 ${
            activeFilter === 'all' 
              ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' 
              : 'border-slate-800 hover:border-cyan-500/50'
          }`}
          onClick={() => handleFilterClick('all')}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <Radio className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Discovered</p>
              <p className="text-xl text-white">{nearbyDevices.length}</p>
            </div>
          </div>
        </Card>

        <Card 
          className={`bg-slate-900 p-4 cursor-pointer transition-all duration-200 ${
            activeFilter === 'paired' 
              ? 'border-green-500 shadow-lg shadow-green-500/20' 
              : 'border-slate-800 hover:border-green-500/50'
          }`}
          onClick={() => handleFilterClick('paired')}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Link2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Paired Devices</p>
              <p className="text-xl text-white">{pairedDevices.length}</p>
            </div>
          </div>
        </Card>

        <Card 
          className={`bg-slate-900 p-4 cursor-pointer transition-all duration-200 ${
            activeFilter === 'wifi' 
              ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
              : 'border-slate-800 hover:border-blue-500/50'
          }`}
          onClick={() => handleFilterClick('wifi')}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Wifi className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">WiFi Devices</p>
              <p className="text-xl text-white">{wifiDevices.length}</p>
            </div>
          </div>
        </Card>

        <Card 
          className={`bg-slate-900 p-4 cursor-pointer transition-all duration-200 ${
            activeFilter === 'bluetooth' 
              ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
              : 'border-slate-800 hover:border-purple-500/50'
          }`}
          onClick={() => handleFilterClick('bluetooth')}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Bluetooth className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Bluetooth Devices</p>
              <p className="text-xl text-white">{bluetoothDevices.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Discovery Settings */}
      <Card className="bg-slate-900 border-slate-800 p-6">
        <h3 className="text-lg text-white mb-4">Discovery Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-blue-400" />
              <div>
                <Label className="text-white">WiFi Discovery</Label>
                <p className="text-sm text-slate-400">Discover devices on the same WiFi network</p>
              </div>
            </div>
            <Switch checked={wifiEnabled} onCheckedChange={handleToggleWifi} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bluetooth className="w-5 h-5 text-purple-400" />
              <div>
                <Label className="text-white">Bluetooth Discovery</Label>
                <p className="text-sm text-slate-400">Discover nearby Bluetooth devices</p>
              </div>
            </div>
            <Switch checked={bluetoothEnabled} onCheckedChange={handleToggleBluetooth} />
          </div>
        </div>
      </Card>

      {/* WiFi Network Scanner */}
      {wifiEnabled && <WiFiNetworkScanner onAddSession={onAddSession} />}

      {/* Nearby Devices */}
      <Card className="bg-slate-900 border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-white">
            {activeFilter === 'all' && 'Nearby Devices'}
            {activeFilter === 'paired' && 'Paired Devices'}
            {activeFilter === 'wifi' && 'WiFi Devices'}
            {activeFilter === 'bluetooth' && 'Bluetooth Devices'}
          </h3>
          <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700">
            {filteredDevices.length} {filteredDevices.length === 1 ? 'device' : 'devices'}
          </Badge>
        </div>
        <div className="space-y-4">
          {filteredDevices.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center p-4 bg-slate-800/50 rounded-full mb-4">
                {activeFilter === 'wifi' && <Wifi className="w-8 h-8 text-blue-400" />}
                {activeFilter === 'bluetooth' && <Bluetooth className="w-8 h-8 text-purple-400" />}
                {activeFilter === 'paired' && <Link2 className="w-8 h-8 text-green-400" />}
                {activeFilter === 'all' && <Radio className="w-8 h-8 text-cyan-400" />}
              </div>
              <p className="text-slate-400">
                {activeFilter === 'paired' && 'No paired devices found'}
                {activeFilter === 'wifi' && 'No WiFi devices found'}
                {activeFilter === 'bluetooth' && 'No Bluetooth devices found'}
                {activeFilter === 'all' && 'No devices found'}
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Click "Scan Network" to discover nearby devices
              </p>
            </div>
          ) : (
            filteredDevices.map((device) => (
            <div 
              key={device.id} 
              className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  device.type === 'desktop' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                }`}>
                  {device.type === 'desktop' ? (
                    <Monitor className="w-6 h-6 text-blue-400" />
                  ) : (
                    <Smartphone className="w-6 h-6 text-purple-400" />
                  )}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white">{device.name}</h4>
                    {device.status === 'paired' && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <Check className="w-3 h-3 mr-1" />
                        Paired
                      </Badge>
                    )}
                    {device.authorized && (
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                        <Shield className="w-3 h-3 mr-1" />
                        Authorized
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{device.os}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-slate-400">Connection</p>
                  <div className="flex items-center gap-1">
                    {device.connectionType === 'wifi' ? (
                      <Wifi className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Bluetooth className="w-4 h-4 text-purple-400" />
                    )}
                    <span className="text-white capitalize">{device.connectionType}</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-400">Signal</p>
                  <p className="text-white">{device.signal}%</p>
                </div>

                {device.status === 'paired' && device.softwareVersion && (
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Software</p>
                    <p className="text-white">v{device.softwareVersion}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {device.status === 'paired' ? (
                    <>
                      <Button
                        onClick={() => handleMonitorDevice(device)}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
                        size="sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Monitor
                      </Button>
                      <Button
                        onClick={() => handleUpgradeDevice(device)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                        size="sm"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upgrade
                      </Button>
                      <Button
                        onClick={() => handleUnpairDevice(device.id)}
                        variant="outline"
                        size="sm"
                        className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handlePairDevice(device)}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
                      size="sm"
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Pair
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )))
          }
        </div>
      </Card>

      {/* Pair Device Dialog */}
      <Dialog open={showPairDialog} onOpenChange={setShowPairDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pair Device</DialogTitle>
            <DialogDescription>
              Are you sure you want to pair with "{selectedDevice?.name}"? This will allow communication between devices.
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Device Name:</span>
                <span className="text-white">{selectedDevice.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Operating System:</span>
                <span className="text-white">{selectedDevice.os}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Connection Type:</span>
                <span className="text-white capitalize">{selectedDevice.connectionType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">IP Address:</span>
                <span className="text-white">{selectedDevice.ip}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Signal Strength:</span>
                <span className="text-white">{selectedDevice.signal}%</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <Shield className="w-5 h-5 text-amber-400" />
            <p className="text-sm text-amber-400">
              Admin approval may be required for this connection
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowPairDialog(false)}
              variant="outline"
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPairing}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
            >
              Confirm Pairing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Monitor Device Dialog */}
      <Dialog open={showMonitorDialog} onOpenChange={setShowMonitorDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" />
              Monitor Device - {monitoringDevice?.name}
            </DialogTitle>
            <DialogDescription>
              View real-time monitoring data and remote control options
            </DialogDescription>
          </DialogHeader>

          {monitoringDevice && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-slate-800">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="camera">Camera</TabsTrigger>
                <TabsTrigger value="screen">Screen</TabsTrigger>
                <TabsTrigger value="control">Control</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-slate-800/50 border-slate-700 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Activity className="w-5 h-5 text-cyan-400" />
                      <h4 className="text-white">Device Status</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <Activity className="w-3 h-3 mr-1" />
                          Online
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Last Sync:</span>
                        <span className="text-white">{monitoringDevice.lastSync}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Battery:</span>
                        <span className="text-white">{monitoringDevice.battery}%</span>
                      </div>
                      {monitoringDevice.battery && (
                        <Progress value={monitoringDevice.battery} className="h-2" />
                      )}
                    </div>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <HardDrive className="w-5 h-5 text-purple-400" />
                      <h4 className="text-white">Storage</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Used:</span>
                        <span className="text-white">{monitoringDevice.storage?.used} GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total:</span>
                        <span className="text-white">{monitoringDevice.storage?.total} GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Free:</span>
                        <span className="text-white">
                          {monitoringDevice.storage ? monitoringDevice.storage.total - monitoringDevice.storage.used : 0} GB
                        </span>
                      </div>
                      {monitoringDevice.storage && (
                        <Progress 
                          value={(monitoringDevice.storage.used / monitoringDevice.storage.total) * 100} 
                          className="h-2" 
                        />
                      )}
                    </div>
                  </Card>
                </div>

                <Card className="bg-slate-800/50 border-slate-700 p-4">
                  <h4 className="text-white mb-3">Device Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Device Name:</span>
                      <span className="text-white">{monitoringDevice.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">OS:</span>
                      <span className="text-white">{monitoringDevice.os}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Software Version:</span>
                      <span className="text-white">v{monitoringDevice.softwareVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Connection:</span>
                      <span className="text-white capitalize">{monitoringDevice.connectionType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">IP Address:</span>
                      <span className="text-white">{monitoringDevice.ip}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Signal:</span>
                      <span className="text-white">{monitoringDevice.signal}%</span>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="camera" className="space-y-4 mt-4">
                <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
                  <div className="text-center">
                    <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Camera Feed</p>
                    <p className="text-sm text-slate-500 mt-2">Live camera monitoring from {monitoringDevice.name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
                    onClick={() => handleCameraAccess(monitoringDevice)}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                  <Button 
                    variant="outline" 
                    className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                    onClick={() => {
                      toast.success('📸 Screenshot captured!', {
                        description: `Image saved from ${monitoringDevice.name}`,
                      });
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Capture
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="screen" className="space-y-4 mt-4">
                <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
                  <div className="text-center">
                    <ScreenShare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Screen Share</p>
                    <p className="text-sm text-slate-500 mt-2">View and control {monitoringDevice.name}'s screen</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
                    onClick={() => handleScreenRecording(monitoringDevice)}
                  >
                    <ScreenShare className="w-4 h-4 mr-2" />
                    Start Screen Share
                  </Button>
                  <Button 
                    variant="outline" 
                    className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                    onClick={() => handleStartRemoteControl(monitoringDevice)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Take Control
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="control" className="space-y-4 mt-4">
                <Card className="bg-slate-800/50 border-slate-700 p-4">
                  <h4 className="text-white mb-4">Remote Control Options</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
                      onClick={() => handleStartRemoteControl(monitoringDevice)}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Full Remote Control
                    </Button>
                    <Button 
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                      onClick={() => handleCameraAccess(monitoringDevice)}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Camera Access
                    </Button>
                    <Button 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                      onClick={() => handleMicrophoneAccess(monitoringDevice)}
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Microphone Access
                    </Button>
                    <Button 
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
                      onClick={() => handleScreenRecording(monitoringDevice)}
                    >
                      <ScreenShare className="w-4 h-4 mr-2" />
                      Screen Recording
                    </Button>
                  </div>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 p-4">
                  <h4 className="text-white mb-4">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                      onClick={() => handleAccessFiles(monitoringDevice)}
                    >
                      <HardDrive className="w-4 h-4 mr-2" />
                      Access Files
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                      onClick={() => handleGetLocation(monitoringDevice)}
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Get Location
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                      onClick={() => handleRunCustomCommand(monitoringDevice)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Run Custom Command
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={() => setShowMonitorDialog(false)}
              variant="outline"
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Software Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-400" />
              Software Upgrade - {selectedDevice?.name}
            </DialogTitle>
            <DialogDescription>
              Upgrade the bixtx.com software on this device to the latest version
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && !upgrading && (
            <div className="space-y-4">
              <Card className="bg-slate-800/50 border-slate-700 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Current Version:</span>
                    <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-600">
                      v{selectedDevice.softwareVersion}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Latest Version:</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      v2.5.0
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Download Size:</span>
                    <span className="text-white">45.2 MB</span>
                  </div>
                </div>
              </Card>

              <Card className="bg-cyan-500/10 border-cyan-500/30 p-4">
                <h4 className="text-cyan-400 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  What's New in v2.5.0
                </h4>
                <ul className="text-sm text-cyan-300 space-y-1 ml-6 list-disc">
                  <li>Enhanced AI monitoring capabilities</li>
                  <li>Improved camera and screen recording quality</li>
                  <li>Faster remote control response time</li>
                  <li>Bug fixes and performance improvements</li>
                  <li>New security features for encrypted communication</li>
                </ul>
              </Card>

              <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-400">
                  The device will remain operational during the upgrade. This process may take 2-5 minutes.
                </p>
              </div>
            </div>
          )}

          {upgrading && (
            <div className="space-y-4 py-6">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
                <h4 className="text-white mb-2">Upgrading Software...</h4>
                <p className="text-slate-400 text-sm mb-4">
                  Please do not close this dialog or disconnect the device
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-white">{upgradeProgress}%</span>
                </div>
                <Progress value={upgradeProgress} className="h-2" />
              </div>
              {upgradeProgress === 100 && (
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Upgrade Complete!</span>
                </div>
              )}
            </div>
          )}

          {!upgrading && (
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowUpgradeDialog(false)}
                variant="outline"
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmUpgrade}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Start Upgrade
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}