import { useState } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Cpu, 
  Wifi, 
  WifiOff,
  Activity,
  Clock,
  Shield,
  Zap,
  TrendingUp,
  Search,
  Filter,
  Plus,
  Download,
  Copy,
  Check,
  QrCode,
  X,
  Settings,
  Trash2,
  Edit,
  Info,
  Power,
  Radio,
  Bluetooth,
  Network,
  Globe,
  Server
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { NetworkDiscovery } from './NetworkDiscovery';
import { copyToClipboard } from '../utils/clipboard';
import { AddDeviceByIP } from './AddDeviceByIP';

interface DashboardProps {
  onConnectDevice: (device: Device) => void;
  onAddSession?: (session: Session) => void;
}

interface Device {
  id: string;
  name: string;
  type: 'desktop' | 'mobile';
  os: string;
  status: 'online' | 'offline' | 'connecting';
  ip: string;
  lastSeen: string;
  performance: number;
  cpu: number;
  memory: number;
  health: 'excellent' | 'good' | 'warning';
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

const mockDevices: Device[] = [
  {
    id: 'dev-001',
    name: 'MacBook Pro - Office',
    type: 'desktop',
    os: 'macOS 14.2',
    status: 'online',
    ip: '192.168.1.101',
    lastSeen: 'Now',
    performance: 94,
    cpu: 23,
    memory: 67,
    health: 'excellent'
  },
  {
    id: 'dev-002',
    name: 'iPhone 15 Pro',
    type: 'mobile',
    os: 'iOS 17.2',
    status: 'online',
    ip: '192.168.1.102',
    lastSeen: 'Now',
    performance: 98,
    cpu: 12,
    memory: 45,
    health: 'excellent'
  },
  {
    id: 'dev-003',
    name: 'Windows Workstation',
    type: 'desktop',
    os: 'Windows 11 Pro',
    status: 'online',
    ip: '192.168.1.103',
    lastSeen: 'Now',
    performance: 87,
    cpu: 56,
    memory: 78,
    health: 'good'
  },
  {
    id: 'dev-004',
    name: 'Samsung Galaxy S24',
    type: 'mobile',
    os: 'Android 14',
    status: 'offline',
    ip: '192.168.1.104',
    lastSeen: '2 hours ago',
    performance: 91,
    cpu: 0,
    memory: 0,
    health: 'good'
  },
  {
    id: 'dev-005',
    name: 'Ubuntu Server',
    type: 'desktop',
    os: 'Ubuntu 22.04',
    status: 'online',
    ip: '192.168.1.105',
    lastSeen: 'Now',
    performance: 96,
    cpu: 34,
    memory: 52,
    health: 'excellent'
  },
];

export function Dashboard({ onConnectDevice, onAddSession }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<'desktop' | 'mobile'>('desktop');
  const [newDeviceOS, setNewDeviceOS] = useState('');
  const [connectionCode, setConnectionCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [filterType, setFilterType] = useState<'all' | 'desktop' | 'mobile'>('all');
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [selectedDeviceForManage, setSelectedDeviceForManage] = useState<Device | null>(null);
  const [editDeviceName, setEditDeviceName] = useState('');
  const [connectionMethod, setConnectionMethod] = useState<'code' | 'manual'>('code');
  const [manualDeviceIP, setManualDeviceIP] = useState('');
  const [manualDevicePort, setManualDevicePort] = useState('5900');
  const [manualDeviceUsername, setManualDeviceUsername] = useState('');
  const [manualDevicePassword, setManualDevicePassword] = useState('');
  const [showAddByIPDialog, setShowAddByIPDialog] = useState(false);

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const totalDevices = devices.length;
  const avgPerformance = Math.round(devices.reduce((acc, d) => acc + d.performance, 0) / devices.length);

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.os.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    const matchesType = filterType === 'all' || device.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleRefresh = () => {
    setShowFilters(!showFilters);
  };

  const handleAddDevice = () => {
    generateConnectionCode();
    setShowAddDialog(true);
  };

  const handleCopyCode = () => {
    copyToClipboard(connectionCode).then(success => {
      if (success) {
        setCodeCopied(true);
        toast.success('Connection code copied to clipboard');
        setTimeout(() => setCodeCopied(false), 2000);
      } else {
        toast.error('Failed to copy. Please copy manually: ' + connectionCode);
      }
    });
  };

  const handleSubmitDevice = () => {
    if (!newDeviceName || !newDeviceOS) {
      toast.error('Please fill in all fields');
      return;
    }

    const newDevice: Device = {
      id: `dev-${String(devices.length + 1).padStart(3, '0')}`,
      name: newDeviceName,
      type: newDeviceType,
      os: newDeviceOS,
      status: 'offline',
      ip: '0.0.0.0',
      lastSeen: 'Never',
      performance: 0,
      cpu: 0,
      memory: 0,
      health: 'good'
    };

    setDevices([...devices, newDevice]);
    toast.success(`Device "${newDeviceName}" added successfully! Install the agent to connect.`);
    
    // Reset form
    setShowAddDialog(false);
    setNewDeviceName('');
    setNewDeviceOS('');
    setNewDeviceType('desktop');
    setConnectionCode('');
  };
  
  const getDownloadLink = (os: string) => {
    const osLower = os.toLowerCase();
    if (osLower.includes('windows')) return 'https://bixtx.com/download/windows';
    if (osLower.includes('mac') || osLower.includes('darwin')) return 'https://bixtx.com/download/macos';
    if (osLower.includes('linux')) return 'https://bixtx.com/download/linux';
    if (osLower.includes('android')) return 'https://bixtx.com/download/android';
    if (osLower.includes('ios')) return 'https://bixtx.com/download/ios';
    return 'https://bixtx.com/download';
  };

  const generateConnectionCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setConnectionCode(code);
    return code;
  };

  const handleManageDevice = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      setSelectedDeviceForManage(device);
      setEditDeviceName(device.name);
      setShowManageDialog(true);
    }
  };

  const handleRenameDevice = () => {
    if (!selectedDeviceForManage || !editDeviceName.trim()) {
      toast.error('Please enter a valid device name');
      return;
    }

    setDevices(devices.map(d => 
      d.id === selectedDeviceForManage.id 
        ? { ...d, name: editDeviceName }
        : d
    ));
    
    toast.success(`Device renamed to "${editDeviceName}"`);
    setShowManageDialog(false);
    setSelectedDeviceForManage(null);
  };

  const handleRemoveDevice = () => {
    if (!selectedDeviceForManage) return;

    setDevices(devices.filter(d => d.id !== selectedDeviceForManage.id));
    toast.success(`Device "${selectedDeviceForManage.name}" removed`);
    setShowManageDialog(false);
    setSelectedDeviceForManage(null);
  };

  const handleResetFilters = () => {
    setFilterStatus('all');
    setFilterType('all');
    toast.success('Filters reset');
  };

  const handleManualConnect = () => {
    if (!newDeviceName.trim() || !newDeviceOS.trim() || !manualDeviceIP.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(manualDeviceIP)) {
      toast.error('Please enter a valid IP address');
      return;
    }

    const newDevice: Device = {
      id: `dev-${String(devices.length + 1).padStart(3, '0')}`,
      name: newDeviceName,
      type: newDeviceType,
      os: newDeviceOS,
      status: 'online',
      ip: manualDeviceIP,
      lastSeen: 'Just now',
      performance: Math.floor(Math.random() * 20) + 80,
      cpu: Math.floor(Math.random() * 50) + 20,
      memory: Math.floor(Math.random() * 50) + 30,
      health: 'excellent'
    };

    setDevices([...devices, newDevice]);
    toast.success(`Device "${newDeviceName}" connected successfully!`);
    
    // Reset form
    setNewDeviceName('');
    setNewDeviceOS('');
    setManualDeviceIP('');
    setManualDevicePort('5900');
    setManualDeviceUsername('');
    setManualDevicePassword('');
    setShowAddDialog(false);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-white mb-2">Device Command Center</h1>
        <p className="text-slate-400">AI-powered device management and remote access</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-lg">
              <Wifi className="w-6 h-6 text-green-400" />
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Live</Badge>
          </div>
          <div className="text-3xl text-white mb-1">{onlineDevices}/{totalDevices}</div>
          <div className="text-sm text-slate-400">Devices Online</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-lg">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Optimal</Badge>
          </div>
          <div className="text-3xl text-white mb-1">{avgPerformance}%</div>
          <div className="text-sm text-slate-400">Avg Performance</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-lg">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Secure</Badge>
          </div>
          <div className="text-3xl text-white mb-1">100%</div>
          <div className="text-sm text-slate-400">Security Score</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-lg">
              <Zap className="w-6 h-6 text-orange-400" />
            </div>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Active</Badge>
          </div>
          <div className="text-3xl text-white mb-1">12</div>
          <div className="text-sm text-slate-400">Active Sessions</div>
        </Card>
      </div>

      <Tabs defaultValue="devices" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="devices" className="data-[state=active]:bg-slate-800">
            My Devices
          </TabsTrigger>
          <TabsTrigger value="network" className="data-[state=active]:bg-slate-800">
            Network Discovery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search devices by name, OS, or IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-800 text-white"
              />
            </div>
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-slate-900 border-slate-800 text-white p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="filterStatus">Status</Label>
                    <Select
                      value={filterStatus}
                      onValueChange={(value) => setFilterStatus(value as 'all' | 'online' | 'offline')}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue>
                          {filterStatus === 'all' ? 'All' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filterType">Device Type</Label>
                    <Select
                      value={filterType}
                      onValueChange={(value) => setFilterType(value as 'all' | 'desktop' | 'mobile')}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue>
                          {filterType === 'all' ? 'All' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="desktop">Desktop</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator className="bg-slate-800" />

                  <Button
                    onClick={handleResetFilters}
                    variant="outline"
                    className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button 
              onClick={handleAddDevice}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
            <Button 
              onClick={() => setShowAddByIPDialog(true)}
              variant="outline"
              className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800"
            >
              <Server className="w-4 h-4 mr-2" />
              Add by IP
            </Button>
          </div>

          {/* Devices Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDevices.map((device) => (
              <Card key={device.id} className="bg-slate-900 border-slate-800 p-6 hover:border-cyan-500/50 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      device.type === 'desktop' 
                        ? 'bg-blue-500/20' 
                        : 'bg-purple-500/20'
                    }`}>
                      {device.type === 'desktop' ? (
                        <Monitor className={`w-6 h-6 ${
                          device.type === 'desktop' ? 'text-blue-400' : 'text-purple-400'
                        }`} />
                      ) : (
                        <Smartphone className="w-6 h-6 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-white">{device.name}</h3>
                      <p className="text-sm text-slate-400">{device.os}</p>
                    </div>
                  </div>
                  {device.status === 'online' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 rounded-full">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-400">Online</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-full">
                      <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                      <span className="text-xs text-slate-400">Offline</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Performance</span>
                    <span className="text-white">{device.performance}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all"
                      style={{ width: `${device.performance}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">CPU</p>
                        <p className="text-sm text-white">{device.cpu}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">Memory</p>
                        <p className="text-sm text-white">{device.memory}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 text-sm">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-400">Last seen: {device.lastSeen}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => onConnectDevice(device)}
                    disabled={device.status !== 'online'}
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    Connect
                  </Button>
                  <Button 
                    onClick={() => handleManageDevice(device.id)}
                    variant="outline"
                    className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                  >
                    Manage
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="network" className="space-y-6">
          <NetworkDiscovery onAddSession={onAddSession} />
        </TabsContent>
      </Tabs>

      {/* Add Device Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Device</DialogTitle>
            <DialogDescription>
              Enter the details of the new device and download the agent to connect it to your network.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="e.g. MacBook Pro - Office"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceType">Device Type</Label>
              <Select
                value={newDeviceType}
                onValueChange={(value) => setNewDeviceType(value as 'desktop' | 'mobile')}
              >
                <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                  <SelectValue>
                    {newDeviceType === 'desktop' ? 'Desktop' : 'Mobile'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceOS">Operating System</Label>
              <Input
                id="deviceOS"
                value={newDeviceOS}
                onChange={(e) => setNewDeviceOS(e.target.value)}
                placeholder="e.g. macOS 14.2"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <Tabs defaultValue="code" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code">Connection Code</TabsTrigger>
                <TabsTrigger value="manual">Manual Connection</TabsTrigger>
              </TabsList>
              <TabsContent value="code">
                <div className="space-y-2">
                  <Label htmlFor="connectionCode">Connection Code</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="connectionCode"
                      value={connectionCode}
                      readOnly
                      className="bg-slate-900 border-slate-800 text-white"
                    />
                    <Button
                      onClick={handleCopyCode}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
                    >
                      {codeCopied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="downloadLink">Download Agent</Label>
                  <a
                    href={getDownloadLink(newDeviceOS)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 px-4 py-2 rounded-full"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
              </TabsContent>
              <TabsContent value="manual">
                <div className="space-y-2">
                  <Label htmlFor="manualDeviceIP">IP Address</Label>
                  <Input
                    id="manualDeviceIP"
                    value={manualDeviceIP}
                    onChange={(e) => setManualDeviceIP(e.target.value)}
                    placeholder="e.g. 192.168.1.101"
                    className="bg-slate-900 border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualDevicePort">Port</Label>
                  <Input
                    id="manualDevicePort"
                    value={manualDevicePort}
                    onChange={(e) => setManualDevicePort(e.target.value)}
                    placeholder="e.g. 5900"
                    className="bg-slate-900 border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualDeviceUsername">Username</Label>
                  <Input
                    id="manualDeviceUsername"
                    value={manualDeviceUsername}
                    onChange={(e) => setManualDeviceUsername(e.target.value)}
                    placeholder="e.g. admin"
                    className="bg-slate-900 border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualDevicePassword">Password</Label>
                  <Input
                    id="manualDevicePassword"
                    value={manualDevicePassword}
                    onChange={(e) => setManualDevicePassword(e.target.value)}
                    placeholder="e.g. password123"
                    className="bg-slate-900 border-slate-800 text-white"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={connectionMethod === 'code' ? handleSubmitDevice : handleManualConnect}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
            >
              Add Device
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Device Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Device</DialogTitle>
            <DialogDescription>
              Edit or remove the device from your network.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                value={editDeviceName}
                onChange={(e) => setEditDeviceName(e.target.value)}
                placeholder="e.g. MacBook Pro - Office"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceType">Device Type</Label>
              <Select
                value={selectedDeviceForManage?.type}
                onValueChange={(value) => {
                  if (selectedDeviceForManage) {
                    setDevices(devices.map(d => 
                      d.id === selectedDeviceForManage.id 
                        ? { ...d, type: value as 'desktop' | 'mobile' }
                        : d
                    ));
                  }
                }}
              >
                <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                  <SelectValue>
                    {selectedDeviceForManage?.type === 'desktop' ? 'Desktop' : 'Mobile'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceOS">Operating System</Label>
              <Input
                id="deviceOS"
                value={selectedDeviceForManage?.os}
                onChange={(e) => {
                  if (selectedDeviceForManage) {
                    setDevices(devices.map(d => 
                      d.id === selectedDeviceForManage.id 
                        ? { ...d, os: e.target.value }
                        : d
                    ));
                  }
                }}
                placeholder="e.g. macOS 14.2"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceIP">IP Address</Label>
              <Input
                id="deviceIP"
                value={selectedDeviceForManage?.ip}
                onChange={(e) => {
                  if (selectedDeviceForManage) {
                    setDevices(devices.map(d => 
                      d.id === selectedDeviceForManage.id 
                        ? { ...d, ip: e.target.value }
                        : d
                    ));
                  }
                }}
                placeholder="e.g. 192.168.1.101"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceStatus">Status</Label>
              <Select
                value={selectedDeviceForManage?.status}
                onValueChange={(value) => {
                  if (selectedDeviceForManage) {
                    setDevices(devices.map(d => 
                      d.id === selectedDeviceForManage.id 
                        ? { ...d, status: value as 'online' | 'offline' | 'connecting' }
                        : d
                    ));
                  }
                }}
              >
                <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                  <SelectValue>
                    {selectedDeviceForManage?.status}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="connecting">Connecting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceLastSeen">Last Seen</Label>
              <Input
                id="deviceLastSeen"
                value={selectedDeviceForManage?.lastSeen}
                onChange={(e) => {
                  if (selectedDeviceForManage) {
                    setDevices(devices.map(d => 
                      d.id === selectedDeviceForManage.id 
                        ? { ...d, lastSeen: e.target.value }
                        : d
                    ));
                  }
                }}
                placeholder="e.g. Now"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="devicePerformance">Performance</Label>
              <Input
                id="devicePerformance"
                value={selectedDeviceForManage?.performance.toString()}
                onChange={(e) => {
                  if (selectedDeviceForManage) {
                    setDevices(devices.map(d => 
                      d.id === selectedDeviceForManage.id 
                        ? { ...d, performance: parseInt(e.target.value) }
                        : d
                    ));
                  }
                }}
                placeholder="e.g. 94"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceCPU">CPU</Label>
              <Input
                id="deviceCPU"
                value={selectedDeviceForManage?.cpu.toString()}
                onChange={(e) => {
                  if (selectedDeviceForManage) {
                    setDevices(devices.map(d => 
                      d.id === selectedDeviceForManage.id 
                        ? { ...d, cpu: parseInt(e.target.value) }
                        : d
                    ));
                  }
                }}
                placeholder="e.g. 23"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceMemory">Memory</Label>
              <Input
                id="deviceMemory"
                value={selectedDeviceForManage?.memory.toString()}
                onChange={(e) => {
                  if (selectedDeviceForManage) {
                    setDevices(devices.map(d => 
                      d.id === selectedDeviceForManage.id 
                        ? { ...d, memory: parseInt(e.target.value) }
                        : d
                    ));
                  }
                }}
                placeholder="e.g. 67"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceHealth">Health</Label>
              <Select
                value={selectedDeviceForManage?.health}
                onValueChange={(value) => {
                  if (selectedDeviceForManage) {
                    setDevices(devices.map(d => 
                      d.id === selectedDeviceForManage.id 
                        ? { ...d, health: value as 'excellent' | 'good' | 'warning' }
                        : d
                    ));
                  }
                }}
              >
                <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                  <SelectValue>
                    {selectedDeviceForManage?.health}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={handleRenameDevice}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
            >
              Rename Device
            </Button>
            <Button
              onClick={handleRemoveDevice}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800"
            >
              Remove Device
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Device by IP Dialog */}
      <Dialog open={showAddByIPDialog} onOpenChange={setShowAddByIPDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Device by IP Address</DialogTitle>
            <DialogDescription>
              Connect to a remote device directly using its IP address and authentication credentials.
            </DialogDescription>
          </DialogHeader>
          <AddDeviceByIP
            onDeviceAdded={(device) => {
              setDevices([...devices, device]);
              setShowAddByIPDialog(false);
            }}
            onCancel={() => setShowAddByIPDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}