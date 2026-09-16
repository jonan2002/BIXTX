import { useState, useEffect } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Maximize2, 
  Minimize2,
  Grid3x3,
  Grid2x2,
  Layout,
  LayoutGrid,
  Plus,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  Settings,
  MoreVertical,
  Eye,
  Radio,
  Power,
  Zap,
  ChevronDown,
  CheckSquare,
  Square,
  Search,
  Filter
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { DeviceScreen } from './DeviceScreen';
import { toast } from 'sonner@2.0.3';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface Device {
  id: string;
  name: string;
  type: 'desktop' | 'mobile';
  os: string;
  osType: 'android' | 'ios' | 'windows' | 'macos' | 'linux';
  status: 'online' | 'offline' | 'connecting';
  ip: string;
  lastSeen: string;
  performance: number;
  cpu: number;
  memory: number;
  health: 'excellent' | 'good' | 'warning';
  isRecording?: boolean;
  isMuted?: boolean;
  isPaused?: boolean;
}

const mockDevices: Device[] = [
  {
    id: 'dev-001',
    name: 'MacBook Pro - Office',
    type: 'desktop',
    os: 'macOS 14.2',
    osType: 'macos',
    status: 'online',
    ip: '192.168.1.101',
    lastSeen: 'Now',
    performance: 94,
    cpu: 23,
    memory: 67,
    health: 'excellent',
    isRecording: false,
    isMuted: false,
    isPaused: false
  },
  {
    id: 'dev-002',
    name: 'iPhone 15 Pro',
    type: 'mobile',
    os: 'iOS 17.2',
    osType: 'ios',
    status: 'online',
    ip: '192.168.1.102',
    lastSeen: 'Now',
    performance: 98,
    cpu: 12,
    memory: 45,
    health: 'excellent',
    isRecording: false,
    isMuted: false,
    isPaused: false
  },
  {
    id: 'dev-003',
    name: 'Windows Workstation',
    type: 'desktop',
    os: 'Windows 11 Pro',
    osType: 'windows',
    status: 'online',
    ip: '192.168.1.103',
    lastSeen: 'Now',
    performance: 87,
    cpu: 45,
    memory: 78,
    health: 'good',
    isRecording: false,
    isMuted: false,
    isPaused: false
  },
  {
    id: 'dev-004',
    name: 'Samsung Galaxy S24',
    type: 'mobile',
    os: 'Android 14',
    osType: 'android',
    status: 'online',
    ip: '192.168.1.104',
    lastSeen: 'Now',
    performance: 91,
    cpu: 34,
    memory: 56,
    health: 'excellent',
    isRecording: false,
    isMuted: false,
    isPaused: false
  },
  {
    id: 'dev-005',
    name: 'Ubuntu Server',
    type: 'desktop',
    os: 'Ubuntu 22.04',
    osType: 'linux',
    status: 'online',
    ip: '192.168.1.105',
    lastSeen: 'Now',
    performance: 96,
    cpu: 18,
    memory: 42,
    health: 'excellent',
    isRecording: false,
    isMuted: false,
    isPaused: false
  },
  {
    id: 'dev-006',
    name: 'iPad Air',
    type: 'mobile',
    os: 'iPadOS 17.2',
    osType: 'ios',
    status: 'online',
    ip: '192.168.1.106',
    lastSeen: 'Now',
    performance: 95,
    cpu: 15,
    memory: 38,
    health: 'excellent',
    isRecording: false,
    isMuted: false,
    isPaused: false
  },
  {
    id: 'dev-007',
    name: 'Dell Laptop',
    type: 'desktop',
    os: 'Windows 11',
    osType: 'windows',
    status: 'online',
    ip: '192.168.1.107',
    lastSeen: 'Now',
    performance: 82,
    cpu: 52,
    memory: 81,
    health: 'good',
    isRecording: false,
    isMuted: false,
    isPaused: false
  },
  {
    id: 'dev-008',
    name: 'OnePlus 12',
    type: 'mobile',
    os: 'Android 14',
    osType: 'android',
    status: 'online',
    ip: '192.168.1.108',
    lastSeen: 'Now',
    performance: 89,
    cpu: 28,
    memory: 61,
    health: 'excellent',
    isRecording: false,
    isMuted: false,
    isPaused: false
  }
];

type GridLayout = '2x2' | '3x3' | '2x3' | '1x2' | '1x3' | '1x4';

export function MultiDeviceControl() {
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [gridLayout, setGridLayout] = useState<GridLayout>('2x2');
  const [fullscreenDevice, setFullscreenDevice] = useState<string | null>(null);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [filterType, setFilterType] = useState<'all' | 'desktop' | 'mobile'>('all');

  // Auto-select first 4 devices on mount
  useEffect(() => {
    const onlineDevices = devices.filter(d => d.status === 'online');
    setSelectedDevices(onlineDevices.slice(0, 4).map(d => d.id));
  }, []);

  const getGridColumns = () => {
    switch (gridLayout) {
      case '2x2': return 'grid-cols-2';
      case '3x3': return 'grid-cols-3';
      case '2x3': return 'grid-cols-3';
      case '1x2': return 'grid-cols-2';
      case '1x3': return 'grid-cols-3';
      case '1x4': return 'grid-cols-4';
      default: return 'grid-cols-2';
    }
  };

  const getMaxDevices = () => {
    switch (gridLayout) {
      case '2x2': return 4;
      case '3x3': return 9;
      case '2x3': return 6;
      case '1x2': return 2;
      case '1x3': return 3;
      case '1x4': return 4;
      default: return 4;
    }
  };

  const handleDeviceToggle = (deviceId: string) => {
    const maxDevices = getMaxDevices();
    
    if (selectedDevices.includes(deviceId)) {
      setSelectedDevices(selectedDevices.filter(id => id !== deviceId));
    } else {
      if (selectedDevices.length >= maxDevices) {
        toast.error(`Maximum ${maxDevices} devices allowed in ${gridLayout} layout`, {
          description: 'Remove a device or change layout to add more',
        });
        return;
      }
      setSelectedDevices([...selectedDevices, deviceId]);
    }
  };

  const handleRemoveDevice = (deviceId: string) => {
    setSelectedDevices(selectedDevices.filter(id => id !== deviceId));
    toast.success('Device removed from multi-view');
  };

  const handleToggleRecording = (deviceId: string) => {
    setDevices(devices.map(d => 
      d.id === deviceId ? { ...d, isRecording: !d.isRecording } : d
    ));
    const device = devices.find(d => d.id === deviceId);
    toast.success(device?.isRecording ? 'Recording stopped' : 'Recording started', {
      description: device?.name,
    });
  };

  const handleToggleMute = (deviceId: string) => {
    setDevices(devices.map(d => 
      d.id === deviceId ? { ...d, isMuted: !d.isMuted } : d
    ));
    const device = devices.find(d => d.id === deviceId);
    toast.success(device?.isMuted ? 'Audio enabled' : 'Audio muted', {
      description: device?.name,
    });
  };

  const handleTogglePause = (deviceId: string) => {
    setDevices(devices.map(d => 
      d.id === deviceId ? { ...d, isPaused: !d.isPaused } : d
    ));
    const device = devices.find(d => d.id === deviceId);
    toast.success(device?.isPaused ? 'Session resumed' : 'Session paused', {
      description: device?.name,
    });
  };

  const handleFullscreen = (deviceId: string) => {
    setFullscreenDevice(deviceId);
  };

  const handleExitFullscreen = () => {
    setFullscreenDevice(null);
  };

  const selectedDeviceObjects = devices.filter(d => selectedDevices.includes(d.id));

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         device.ip.includes(searchQuery);
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    const matchesType = filterType === 'all' || device.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getDeviceIcon = (device: Device) => {
    return device.type === 'mobile' ? Smartphone : Monitor;
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-cyan-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (fullscreenDevice) {
    const device = devices.find(d => d.id === fullscreenDevice);
    if (!device) return null;

    return (
      <div className="h-screen bg-slate-950 flex flex-col">
        {/* Fullscreen Header */}
        <div className="bg-slate-900 border-b border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleExitFullscreen}
                variant="outline"
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                <Minimize2 className="w-4 h-4 mr-2" />
                Exit Fullscreen
              </Button>
              <div className="flex items-center gap-3">
                {device.type === 'mobile' ? (
                  <Smartphone className="w-5 h-5 text-cyan-400" />
                ) : (
                  <Monitor className="w-5 h-5 text-cyan-400" />
                )}
                <div>
                  <h3 className="text-white">{device.name}</h3>
                  <p className="text-xs text-slate-400">{device.os} • {device.ip}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${getHealthColor(device.health)} text-white`}>
                {device.health}
              </Badge>
              <Badge className="bg-slate-800 text-slate-300">
                <Cpu className="w-3 h-3 mr-1" />
                {device.cpu}%
              </Badge>
              <Badge className="bg-slate-800 text-slate-300">
                <HardDrive className="w-3 h-3 mr-1" />
                {device.memory}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Fullscreen Device View */}
        <div className="flex-1 bg-slate-900 p-4">
          <Card className="h-full bg-slate-950 border-slate-800 relative overflow-hidden">
            <DeviceScreen 
              deviceType={device.osType}
              deviceName={device.name}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl text-white flex items-center gap-3">
              <LayoutGrid className="w-7 h-7 text-cyan-400" />
              Multi-Device Control
            </h2>
            <p className="text-slate-400 mt-1">
              Monitor and control multiple devices simultaneously
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2">
              <Activity className="w-4 h-4 mr-2" />
              {selectedDevices.length} Active Devices
            </Badge>
            <Button
              onClick={() => setShowDeviceSelector(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Manage Devices
            </Button>
          </div>
        </div>

        {/* Layout Controls */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Grid Layout:</span>
          <div className="flex gap-2">
            <Button
              onClick={() => setGridLayout('2x2')}
              variant={gridLayout === '2x2' ? 'default' : 'outline'}
              size="sm"
              className={gridLayout === '2x2' 
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }
            >
              <Grid2x2 className="w-4 h-4 mr-2" />
              2×2
            </Button>
            <Button
              onClick={() => setGridLayout('3x3')}
              variant={gridLayout === '3x3' ? 'default' : 'outline'}
              size="sm"
              className={gridLayout === '3x3' 
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }
            >
              <Grid3x3 className="w-4 h-4 mr-2" />
              3×3
            </Button>
            <Button
              onClick={() => setGridLayout('2x3')}
              variant={gridLayout === '2x3' ? 'default' : 'outline'}
              size="sm"
              className={gridLayout === '2x3' 
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }
            >
              <Layout className="w-4 h-4 mr-2" />
              2×3
            </Button>
            <Button
              onClick={() => setGridLayout('1x2')}
              variant={gridLayout === '1x2' ? 'default' : 'outline'}
              size="sm"
              className={gridLayout === '1x2' 
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }
            >
              1×2
            </Button>
            <Button
              onClick={() => setGridLayout('1x3')}
              variant={gridLayout === '1x3' ? 'default' : 'outline'}
              size="sm"
              className={gridLayout === '1x3' 
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }
            >
              1×3
            </Button>
            <Button
              onClick={() => setGridLayout('1x4')}
              variant={gridLayout === '1x4' ? 'default' : 'outline'}
              size="sm"
              className={gridLayout === '1x4' 
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }
            >
              1×4
            </Button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      <div className="flex-1 p-6 overflow-auto">
        {selectedDevices.length === 0 ? (
          <Card className="h-full bg-slate-900 border-slate-800 flex items-center justify-center">
            <div className="text-center">
              <LayoutGrid className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl text-slate-400 mb-2">No devices selected</h3>
              <p className="text-slate-500 mb-6">
                Add devices to start monitoring multiple screens
              </p>
              <Button
                onClick={() => setShowDeviceSelector(true)}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Devices
              </Button>
            </div>
          </Card>
        ) : (
          <div className={`grid ${getGridColumns()} gap-4 h-full`}>
            {selectedDeviceObjects.map((device) => {
              const DeviceIcon = getDeviceIcon(device);
              
              return (
                <Card 
                  key={device.id} 
                  className="bg-slate-900 border-slate-800 flex flex-col overflow-hidden group"
                >
                  {/* Device Header */}
                  <div className="bg-slate-800/50 border-b border-slate-700 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <DeviceIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-white text-sm truncate">{device.name}</h4>
                        <p className="text-xs text-slate-400 truncate">{device.os}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge className={`${getHealthColor(device.health)} text-white text-xs px-1.5 py-0.5`}>
                        {device.cpu}%
                      </Badge>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 bg-slate-800 border-slate-700 p-2">
                          <div className="space-y-1">
                            <Button
                              onClick={() => handleFullscreen(device.id)}
                              variant="ghost"
                              className="w-full justify-start text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                              <Maximize2 className="w-4 h-4 mr-2" />
                              Fullscreen View
                            </Button>
                            <Button
                              onClick={() => handleToggleRecording(device.id)}
                              variant="ghost"
                              className="w-full justify-start text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                              <Radio className={`w-4 h-4 mr-2 ${device.isRecording ? 'text-red-500' : ''}`} />
                              {device.isRecording ? 'Stop Recording' : 'Start Recording'}
                            </Button>
                            <Button
                              onClick={() => handleToggleMute(device.id)}
                              variant="ghost"
                              className="w-full justify-start text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                              {device.isMuted ? (
                                <><Volume2 className="w-4 h-4 mr-2" />Enable Audio</>
                              ) : (
                                <><VolumeX className="w-4 h-4 mr-2" />Mute Audio</>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleTogglePause(device.id)}
                              variant="ghost"
                              className="w-full justify-start text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                              {device.isPaused ? (
                                <><Play className="w-4 h-4 mr-2" />Resume Session</>
                              ) : (
                                <><Pause className="w-4 h-4 mr-2" />Pause Session</>
                              )}
                            </Button>
                            <div className="h-px bg-slate-700 my-1" />
                            <Button
                              onClick={() => handleRemoveDevice(device.id)}
                              variant="ghost"
                              className="w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-400"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Remove from Grid
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Device Screen */}
                  <div className="flex-1 bg-slate-950 relative overflow-hidden min-h-0">
                    {device.isPaused ? (
                      <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                        <div className="text-center">
                          <Pause className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-400">Session Paused</p>
                        </div>
                      </div>
                    ) : (
                      <DeviceScreen 
                        deviceType={device.osType}
                        deviceName={device.name}
                      />
                    )}
                    
                    {/* Recording Indicator */}
                    {device.isRecording && (
                      <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-xs animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        REC
                      </div>
                    )}

                    {/* Mute Indicator */}
                    {device.isMuted && (
                      <div className="absolute top-2 left-2 bg-slate-900/90 text-white px-2 py-1 rounded-lg text-xs">
                        <VolumeX className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Device Stats Footer */}
                  <div className="bg-slate-800/50 border-t border-slate-700 p-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Cpu className="w-3 h-3" />
                        <span>{device.cpu}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <HardDrive className="w-3 h-3" />
                        <span>{device.memory}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-green-400">
                      <Wifi className="w-3 h-3" />
                      <span>{device.ip}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Device Selector Dialog */}
      <Dialog open={showDeviceSelector} onOpenChange={setShowDeviceSelector}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white">Manage Multi-Device View</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select up to {getMaxDevices()} devices for {gridLayout} layout
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Search devices by name or IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Device List */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredDevices.map((device) => {
                const isSelected = selectedDevices.includes(device.id);
                const DeviceIcon = getDeviceIcon(device);
                
                return (
                  <Card
                    key={device.id}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-cyan-700'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-750'
                    }`}
                    onClick={() => handleDeviceToggle(device.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-cyan-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <DeviceIcon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white">{device.name}</h4>
                        <p className="text-sm text-slate-400">{device.os} • {device.ip}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getHealthColor(device.health)} text-white`}>
                          {device.health}
                        </Badge>
                        {device.status === 'online' ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                            <Wifi className="w-3 h-3 mr-1" />
                            Online
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-700 text-slate-400">
                            <WifiOff className="w-3 h-3 mr-1" />
                            Offline
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Selection Info */}
            <div className="bg-slate-800 rounded-lg p-3 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                {selectedDevices.length} of {getMaxDevices()} devices selected
              </div>
              <Button
                onClick={() => setShowDeviceSelector(false)}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
              >
                Apply Selection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
