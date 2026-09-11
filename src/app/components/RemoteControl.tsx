import { useState, useEffect } from 'react';
import { 
  Monitor,
  Settings,
  Camera,
  Video,
  VideoOff,
  Mic,
  MicOff,
  MessageSquare,
  Users,
  X,
  Maximize2,
  Minimize2,
  Cpu,
  Activity,
  HardDrive,
  Wifi,
  Download,
  Upload,
  Eye,
  EyeOff,
  Volume2,
  RefreshCw,
  Circle,
  MousePointer2,
  Keyboard,
  Clipboard,
  Square,
  Smartphone,
  Film
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DeviceScreen } from './DeviceScreen';
import { toast } from 'sonner@2.0.3';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Copy } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';
import { RecordingsManager } from './RecordingsManager';

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

interface RemoteControlProps {
  device: Device | null;
  onBack: () => void;
}

export function RemoteControl({ device, onBack }: RemoteControlProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState([80]);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'admin' | 'software-a'; text: string; time: string }>>([
    { sender: 'software-a', text: 'Software A Link connected. All systems operational. Ready to receive directives.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(true);
  const [audioLevel, setAudioLevel] = useState(45);
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'windows' | 'macos' | 'linux'>('android');
  const [deviceName, setDeviceName] = useState('Samsung Galaxy S23');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [mouseControlActive, setMouseControlActive] = useState(true);
  const [keyboardControlActive, setKeyboardControlActive] = useState(true);
  const [clipboardShared, setClipboardShared] = useState(false);
  
  // Separate recording states for different types
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const [isCameraRecording, setIsCameraRecording] = useState(false);
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [showRecordingsManager, setShowRecordingsManager] = useState(false);
  
  // Chat panel resize state
  const [chatWidth, setChatWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // Update device type and name when device changes
  useEffect(() => {
    if (device && device.os) {
      // Determine device type based on OS
      const os = device.os.toLowerCase();
      if (os.includes('android')) {
        setDeviceType('android');
      } else if (os.includes('ios')) {
        setDeviceType('ios');
      } else if (os.includes('windows')) {
        setDeviceType('windows');
      } else if (os.includes('mac') || os.includes('darwin')) {
        setDeviceType('macos');
      } else if (os.includes('linux') || os.includes('ubuntu')) {
        setDeviceType('linux');
      }
      
      setDeviceName(device.name);
    }
  }, [device]);

  // Handle chat panel resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 300;
      const maxWidth = 800;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleScreenshot = () => {
    console.log('Taking screenshot...');
    toast.success('Screenshot captured successfully');
  };

  const handleFileDownload = () => {
    console.log('Downloading files...');
    toast.success('File download started');
  };

  const handleFileUpload = () => {
    console.log('Uploading files...');
    toast.success('File upload started');
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const adminMessage = chatMessage.trim();
      
      // Add admin message
      setChatMessages(prev => [...prev, { 
        sender: 'admin', 
        text: adminMessage, 
        time: currentTime 
      }]);
      
      setChatMessage('');
      
      // Simulate Software A response after short delay
      setTimeout(() => {
        let response = '';
        const lowerCmd = adminMessage.toLowerCase();
        
        // Command responses
        if (lowerCmd.includes('/screenshot') || lowerCmd.includes('screenshot')) {
          response = '📸 Screenshot captured successfully.\nResolution: 1920x1080\nSaved to monitoring dashboard.';
        } else if (lowerCmd.includes('/camera on') || lowerCmd.includes('enable camera')) {
          response = '📹 Camera enabled.\nResolution: 1280x720 @ 30fps\nStreaming active.';
          setIsCameraOn(true);
        } else if (lowerCmd.includes('/camera off') || lowerCmd.includes('disable camera')) {
          response = '📹 Camera disabled.\nStream stopped.';
          setIsCameraOn(false);
        } else if (lowerCmd.includes('/mic on') || lowerCmd.includes('enable mic')) {
          response = '🎤 Microphone enabled.\nSample rate: 48kHz\nRecording active.';
          setIsMicOn(true);
        } else if (lowerCmd.includes('/mic off') || lowerCmd.includes('disable mic')) {
          response = '🎤 Microphone disabled.\nRecording stopped.';
          setIsMicOn(false);
        } else if (lowerCmd.includes('/record start') || lowerCmd.includes('start recording')) {
          response = '⏺️ Screen recording started.\nCodec: H.264\nQuality: High';
          setIsScreenRecording(true);
        } else if (lowerCmd.includes('/record stop') || lowerCmd.includes('stop recording')) {
          response = '⏹️ Recording stopped.\nDuration: 5m 32s\nSize: 42.3 MB';
          setIsScreenRecording(false);
        } else if (lowerCmd.includes('/status') || lowerCmd.includes('status')) {
          response = `✅ Software A Status:\n🔗 Connection: Active\n⚡ Mode: Stealth\n💾 Memory: 24.5 MB\n⏱️ Uptime: 12h 34m\n🛡️ All modules operational`;
        } else if (lowerCmd.includes('/lock') || lowerCmd.includes('lock screen')) {
          response = '🔒 Screen locked.\nUser input disabled.\nDevice secured.';
        } else if (lowerCmd.includes('/unlock') || lowerCmd.includes('unlock screen')) {
          response = '🔓 Screen unlocked.\nUser control restored.';
        } else if (lowerCmd.includes('/help')) {
          response = '📋 Available Commands:\n/screenshot - Capture screen\n/camera on/off - Control camera\n/mic on/off - Control microphone\n/record start/stop - Recording\n/status - System status\n/lock - Lock device\n/unlock - Unlock device';
        } else {
          response = `✓ Command received: "${adminMessage}"\nExecuting directive...`;
        }
        
        const responseTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setChatMessages(prev => [...prev, { 
          sender: 'software-a', 
          text: response, 
          time: responseTime 
        }]);
      }, 600);
    }
  };

  const handleShareSession = () => {
    const sessionLink = `https://bixtx.com/session/${device?.id || 'demo'}/${Math.random().toString(36).substring(7)}`;
    setShareLink(sessionLink);
    setShowShareDialog(true);
  };

  const handleCopyShareLink = () => {
    if (shareLink) {
      copyToClipboard(shareLink).then(success => {
        if (success) {
          toast.success('Share link copied to clipboard');
        } else {
          toast.error('Failed to copy. Please copy manually');
        }
      });
    }
  };

  const handleSettings = () => {
    console.log('Opening settings...');
    toast.info('Settings panel will open here');
  };

  const toggleMouseControl = () => {
    setMouseControlActive(!mouseControlActive);
    toast.success(mouseControlActive ? 'Mouse control disabled' : 'Mouse control enabled');
  };

  const toggleKeyboardControl = () => {
    setKeyboardControlActive(!keyboardControlActive);
    toast.success(keyboardControlActive ? 'Keyboard control disabled' : 'Keyboard control enabled');
  };

  const handleClipboardSync = () => {
    setClipboardShared(!clipboardShared);
    toast.success(clipboardShared ? 'Clipboard sync disabled' : 'Clipboard synced successfully');
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
  };

  const toggleMicrophone = () => {
    setIsMicOn(!isMicOn);
  };

  const toggleMonitoring = () => {
    setShowMonitoring(!showMonitoring);
  };

  if (!device) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Monitor className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">No Device Selected</h2>
          <p className="text-slate-400 mb-6">Select a device from the dashboard to start remote control</p>
          <Button onClick={onBack} className="bg-gradient-to-r from-cyan-600 to-blue-600">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Control Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={onBack}
              variant="ghost" 
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-white">{device.name}</h2>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
                  Connected
                </Badge>
              </div>
              <p className="text-sm text-slate-400">{device.ip} • Session: 00:12:34</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={toggleCamera}
              className={`${isCameraOn ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-700 text-white'} hover:bg-cyan-700`}
            >
              {isCameraOn ? <Video className="w-4 h-4 mr-2" /> : <VideoOff className="w-4 h-4 mr-2" />}
              Camera
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={toggleMicrophone}
              className={`${isMicOn ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-800 border-slate-700 text-white'} hover:bg-green-700`}
            >
              {isMicOn ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
              Mic
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={toggleMonitoring}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              {showMonitoring ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              Monitor
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowChat(!showChat)}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleShareSession}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              <Users className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleSettings}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Remote View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Monitoring Sidebar */}
        {showMonitoring && (
          <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col overflow-auto">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-white mb-1">Device Monitoring</h3>
              <p className="text-xs text-slate-400">Real-time system status</p>
            </div>

            <Tabs defaultValue="system" className="flex-1">
              <TabsList className="w-full bg-slate-900 border-b border-slate-800 rounded-none">
                <TabsTrigger value="system" className="flex-1 data-[state=active]:bg-slate-800">
                  System
                </TabsTrigger>
                <TabsTrigger value="media" className="flex-1 data-[state=active]:bg-slate-800">
                  Media
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex-1 data-[state=active]:bg-slate-800">
                  Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="system" className="p-4 space-y-4 mt-0">
                {/* CPU Usage */}
                <Card className="bg-slate-800/50 border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-white">CPU Usage</span>
                    </div>
                    <span className="text-sm text-cyan-400">34%</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full w-[34%] bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-slate-400">Cores</p>
                      <p className="text-white">8</p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-slate-400">Threads</p>
                      <p className="text-white">16</p>
                    </div>
                  </div>
                </Card>

                {/* Memory Usage */}
                <Card className="bg-slate-800/50 border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-white">Memory</span>
                    </div>
                    <span className="text-sm text-purple-400">67%</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full w-[67%] bg-gradient-to-r from-purple-500 to-pink-600 rounded-full"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-slate-400">Used</p>
                      <p className="text-white">10.7 GB</p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-slate-400">Total</p>
                      <p className="text-white">16 GB</p>
                    </div>
                  </div>
                </Card>

                {/* Disk Usage */}
                <Card className="bg-slate-800/50 border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-white">Disk Space</span>
                    </div>
                    <span className="text-sm text-green-400">45%</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full w-[45%] bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-slate-400">Used</p>
                      <p className="text-white">225 GB</p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-slate-400">Free</p>
                      <p className="text-white">275 GB</p>
                    </div>
                  </div>
                </Card>

                {/* Network */}
                <Card className="bg-slate-800/50 border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-orange-400" />
                      <span className="text-sm text-white">Network</span>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                      Active
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Download</span>
                      <span className="text-white">12.4 MB/s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Upload</span>
                      <span className="text-white">3.2 MB/s</span>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="media" className="p-4 space-y-4 mt-0">
                {/* Camera Video Recording */}
                <Card className="bg-slate-800/50 border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isCameraOn ? (
                        <Video className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <VideoOff className="w-4 h-4 text-slate-500" />
                      )}
                      <span className="text-sm text-white">Camera Video</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={toggleCamera}
                        size="sm"
                        variant="outline"
                        className="h-7 bg-slate-900 border-slate-700 text-xs"
                      >
                        {isCameraOn ? 'Stop' : 'Start'}
                      </Button>
                      {isCameraOn && (
                        <Button
                          onClick={() => {
                            setIsCameraRecording(!isCameraRecording);
                            toast.success(isCameraRecording ? 'Camera recording stopped' : 'Camera recording started');
                          }}
                          size="sm"
                          variant="outline"
                          className={`h-7 text-xs ${
                            isCameraRecording
                              ? 'bg-red-500 border-red-500 text-white hover:bg-red-600'
                              : 'bg-slate-900 border-slate-700'
                          }`}
                        >
                          {isCameraRecording ? 'Stop Rec' : 'Record'}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="aspect-video bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex items-center justify-center">
                    {isCameraOn ? (
                      <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Camera className="w-12 h-12 text-slate-600" />
                        </div>
                        {isCameraRecording && (
                          <div className="absolute top-2 left-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500 rounded-full">
                              <Circle className="w-2 h-2 fill-white text-white animate-pulse" />
                              <span className="text-xs text-white">REC</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <VideoOff className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">Camera Off</p>
                      </div>
                    )}
                  </div>
                  {isCameraOn && (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Resolution: 1920x1080</span>
                        <span className="text-slate-400">FPS: 30</span>
                      </div>
                      {isCameraRecording && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-red-400">Recording Time: 00:03:45</span>
                          <span className="text-red-400">Size: 28.5 MB</span>
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* Microphone Audio Recording */}
                <Card className="bg-slate-800/50 border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isMicOn ? (
                        <Mic className="w-4 h-4 text-green-400" />
                      ) : (
                        <MicOff className="w-4 h-4 text-slate-500" />
                      )}
                      <span className="text-sm text-white">Audio Recording</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={toggleMicrophone}
                        size="sm"
                        variant="outline"
                        className="h-7 bg-slate-900 border-slate-700 text-xs"
                      >
                        {isMicOn ? 'Mute' : 'Unmute'}
                      </Button>
                      {isMicOn && (
                        <Button
                          onClick={() => {
                            setIsAudioRecording(!isAudioRecording);
                            toast.success(isAudioRecording ? 'Audio recording stopped' : 'Audio recording started');
                          }}
                          size="sm"
                          variant="outline"
                          className={`h-7 text-xs ${
                            isAudioRecording
                              ? 'bg-red-500 border-red-500 text-white hover:bg-red-600'
                              : 'bg-slate-900 border-slate-700'
                          }`}
                        >
                          {isAudioRecording ? 'Stop Rec' : 'Record'}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {isMicOn ? (
                    <div className="space-y-3">
                      {/* Audio Level Visualization */}
                      <div className="flex items-center gap-2">
                        {[...Array(20)].map((_, i) => {
                          const threshold = (i + 1) * 5;
                          const isActive = audioLevel >= threshold;
                          const color = i < 12 ? 'bg-green-500' : i < 16 ? 'bg-yellow-500' : 'bg-red-500';
                          return (
                            <div
                              key={i}
                              className={`flex-1 h-8 rounded ${
                                isActive ? color : 'bg-slate-700'
                              } transition-colors`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Input Level</span>
                        <span className="text-green-400">{audioLevel}%</span>
                      </div>
                      {isAudioRecording && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                          <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
                          <span className="text-sm text-red-400">Recording: 00:02:18</span>
                        </div>
                      )}
                      <div className="text-xs text-slate-400">
                        <p>Device: Built-in Microphone</p>
                        <p>Sample Rate: 48kHz</p>
                        {isAudioRecording && <p className="text-red-400">Format: MP3 • Size: 3.2 MB</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <MicOff className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Microphone Muted</p>
                    </div>
                  )}
                </Card>

                {/* Screen Recording */}
                <Card className="bg-slate-800/50 border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-orange-400" />
                      <span className="text-sm text-white">Screen Recording</span>
                    </div>
                    <Button
                      onClick={() => {
                        setIsScreenRecording(!isScreenRecording);
                        toast.success(isScreenRecording ? 'Screen recording stopped' : 'Screen recording started');
                      }}
                      size="sm"
                      variant="outline"
                      className={`h-7 text-xs ${
                        isScreenRecording
                          ? 'bg-red-500 border-red-500 text-white hover:bg-red-600'
                          : 'bg-slate-900 border-slate-700'
                      }`}
                    >
                      {isScreenRecording ? 'Stop' : 'Record'}
                    </Button>
                  </div>
                  
                  {isScreenRecording ? (
                    <div className="space-y-3">
                      <div className="aspect-video bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex items-center justify-center">
                        <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Monitor className="w-12 h-12 text-slate-600" />
                          </div>
                          <div className="absolute top-2 left-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500 rounded-full">
                              <Circle className="w-2 h-2 fill-white text-white animate-pulse" />
                              <span className="text-xs text-white">REC</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
                        <span className="text-sm text-red-400">Recording: 00:05:23</span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <p>Format: MP4 (H.264)</p>
                        <p>Size: 45.2 MB</p>
                        <p>Quality: High (1080p)</p>
                        <p>Audio: Included</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Monitor className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-xs text-slate-400">Click Record to capture screen activity</p>
                      <p className="text-xs text-slate-500 mt-1">Records screen video with system audio</p>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="p-4 space-y-3 mt-0">
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm text-white">Session Started</p>
                      <p className="text-xs text-slate-400">12:34 PM</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm text-white">Camera Activated</p>
                      <p className="text-xs text-slate-400">12:35 PM</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm text-white">File Transfer: report.pdf</p>
                      <p className="text-xs text-slate-400">12:36 PM</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm text-white">Recording Started</p>
                      <p className="text-xs text-slate-400">12:40 PM</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm text-white">AI Optimization Applied</p>
                      <p className="text-xs text-slate-400">12:42 PM</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Screen Display */}
        <div className="flex-1 flex flex-col bg-slate-950">
          {/* Toolbar */}
          <div className="bg-slate-900/50 border-b border-slate-800 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                size="sm"
                variant="ghost"
                onClick={toggleMouseControl}
                className={mouseControlActive ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-red-400 hover:text-red-300'}
                title={mouseControlActive ? 'Mouse Control' : 'Mouse Control Disabled'}
              >
                <MousePointer2 className="w-4 h-4" />
              </Button>
              <Button 
                size="sm"
                variant="ghost"
                onClick={toggleKeyboardControl}
                className={keyboardControlActive ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-red-400 hover:text-red-300'}
                title={keyboardControlActive ? 'Keyboard' : 'Keyboard Disabled'}
              >
                <Keyboard className="w-4 h-4" />
              </Button>
              <Button 
                size="sm"
                variant="ghost"
                onClick={handleClipboardSync}
                className={clipboardShared ? 'text-red-400 hover:text-red-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                title={clipboardShared ? 'Clipboard Sync Disabled' : 'Clipboard Sync'}
              >
                <Clipboard className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-slate-800 mx-2"></div>
              <Button 
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsScreenRecording(!isScreenRecording);
                  toast.success(isScreenRecording ? 'Screen recording stopped' : 'Screen recording started');
                }}
                className={isScreenRecording ? 'text-orange-400 hover:text-orange-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                title={isScreenRecording ? 'Stop Screen Recording' : 'Start Screen Recording'}
              >
                {isScreenRecording ? <Square className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              </Button>
              <Button 
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (!isCameraOn) {
                    toast.error('Please enable camera first');
                    return;
                  }
                  setIsCameraRecording(!isCameraRecording);
                  toast.success(isCameraRecording ? 'Camera recording stopped' : 'Camera recording started');
                }}
                className={isCameraRecording ? 'text-cyan-400 hover:text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                title={isCameraRecording ? 'Stop Camera Recording' : 'Start Camera Recording'}
              >
                {isCameraRecording ? <Square className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </Button>
              <Button 
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (!isMicOn) {
                    toast.error('Please enable microphone first');
                    return;
                  }
                  setIsAudioRecording(!isAudioRecording);
                  toast.success(isAudioRecording ? 'Audio recording stopped' : 'Audio recording started');
                }}
                className={isAudioRecording ? 'text-green-400 hover:text-green-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                title={isAudioRecording ? 'Stop Audio Recording' : 'Start Audio Recording'}
              >
                {isAudioRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <div className="w-px h-6 bg-slate-800 mx-2"></div>
              <Button 
                size="sm"
                variant="ghost"
                onClick={handleFileDownload}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
                title="Download Files"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button 
                size="sm"
                variant="ghost"
                onClick={handleFileUpload}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
                title="Upload Files"
              >
                <Upload className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-slate-800 mx-2"></div>
              <Button 
                size="sm"
                variant="ghost"
                onClick={() => setShowRecordingsManager(true)}
                className={`${(isScreenRecording || isCameraRecording || isAudioRecording) ? 'text-red-400 hover:text-red-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                title="Recordings Manager"
              >
                <Film className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Quality:</span>
                <div className="w-32">
                  <Slider
                    value={quality}
                    onValueChange={setQuality}
                    max={100}
                    step={10}
                    className="cursor-pointer"
                  />
                </div>
                <span className="text-sm text-white w-12">{quality}%</span>
              </div>
              <Button 
                size="sm"
                variant="ghost"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Screen Canvas */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950">
            {/* Device Type Selector */}
            <div className="w-full max-w-5xl mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Device Type:</span>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
                  <Button
                    size="sm"
                    onClick={() => { setDeviceType('android'); setDeviceName('Samsung Galaxy S23'); }}
                    className={`h-7 text-xs ${deviceType === 'android' ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-transparent hover:bg-slate-800'}`}
                  >
                    <Smartphone className="w-3 h-3 mr-1" />
                    Android
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setDeviceType('ios'); setDeviceName('iPhone 15 Pro'); }}
                    className={`h-7 text-xs ${deviceType === 'ios' ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-transparent hover:bg-slate-800'}`}
                  >
                    <Smartphone className="w-3 h-3 mr-1" />
                    iOS
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setDeviceType('windows'); setDeviceName('Windows PC'); }}
                    className={`h-7 text-xs ${deviceType === 'windows' ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-transparent hover:bg-slate-800'}`}
                  >
                    <Monitor className="w-3 h-3 mr-1" />
                    Windows
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setDeviceType('macos'); setDeviceName('MacBook Pro'); }}
                    className={`h-7 text-xs ${deviceType === 'macos' ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-transparent hover:bg-slate-800'}`}
                  >
                    <Monitor className="w-3 h-3 mr-1" />
                    macOS
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setDeviceType('linux'); setDeviceName('Ubuntu Desktop'); }}
                    className={`h-7 text-xs ${deviceType === 'linux' ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-transparent hover:bg-slate-800'}`}
                  >
                    <Monitor className="w-3 h-3 mr-1" />
                    Linux
                  </Button>
                </div>
              </div>
            </div>

            <div className="relative w-full max-w-5xl aspect-video bg-slate-900 rounded-lg border-2 border-slate-800 overflow-hidden shadow-2xl">
              {/* Real Device Screen with Interactive Apps */}
              <DeviceScreen deviceType={deviceType} deviceName={deviceName} />

              {/* Software A Status Overlay */}
              <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-purple-500/50 rounded-lg px-4 py-2 flex items-center gap-2 z-20">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-purple-400 font-medium">🛡️</span>
                <span className="text-sm text-white">Software A Active</span>
              </div>

              {/* Recording Indicators */}
              {(isScreenRecording || isCameraRecording || isAudioRecording) && (
                <div className="absolute top-4 right-4 space-y-2 z-20">
                  {isScreenRecording && (
                    <div className="bg-orange-500/90 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <Monitor className="w-3 h-3 text-white" />
                      <span className="text-sm text-white">Screen Recording</span>
                    </div>
                  )}
                  {isCameraRecording && (
                    <div className="bg-cyan-500/90 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <Video className="w-3 h-3 text-white" />
                      <span className="text-sm text-white">Camera Recording</span>
                    </div>
                  )}
                  {isAudioRecording && (
                    <div className="bg-green-500/90 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <Mic className="w-3 h-3 text-white" />
                      <span className="text-sm text-white">Audio Recording</span>
                    </div>
                  )}
                </div>
              )}

              {/* Performance Stats */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20">
                <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-4 py-2 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-white">60 FPS</span>
                  </div>
                  <div className="w-px h-4 bg-slate-700"></div>
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-white">12ms</span>
                  </div>
                </div>

                <Badge className="bg-gradient-to-r from-purple-500/20 to-indigo-600/20 text-purple-400 border-purple-500/30">
                  🛡️ Software A Link • Secure Connection
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Sidebar - Admin to Software A */}
        {showChat && (
          <div className="bg-slate-900 border-l border-slate-800 flex flex-col relative" style={{ width: chatWidth }}>
            {/* Resize Handle */}
            <div
              onMouseDown={() => setIsResizing(true)}
              className="absolute left-0 top-0 bottom-0 w-1 hover:w-1.5 bg-transparent hover:bg-purple-500 cursor-ew-resize transition-all z-50 group"
            >
              <div className="absolute inset-y-0 left-0 w-4 -ml-2"></div>
            </div>
            
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🛡️</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold">Software A</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-xs text-slate-400">Connected • {deviceName}</p>
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>Send directives to Software A</span>
                <span className="text-green-400">12ms</span>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <div className="space-y-3">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${msg.sender === 'admin' ? 'order-2' : 'order-1'}`}>
                      {/* Sender Info */}
                      <div className={`flex items-center gap-2 mb-1 ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'software-a' && (
                          <div className="w-5 h-5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-xs">
                            🛡️
                          </div>
                        )}
                        <span className={`text-xs font-medium ${msg.sender === 'admin' ? 'text-cyan-400' : 'text-purple-400'}`}>
                          {msg.sender === 'admin' ? 'Admin' : 'Software A'}
                        </span>
                        {msg.sender === 'admin' && (
                          <div className="w-5 h-5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-xs">
                            👤
                          </div>
                        )}
                      </div>
                      
                      {/* Message Bubble */}
                      <div className={`rounded-lg px-3 py-2 ${
                        msg.sender === 'admin'
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}>
                        <p className="text-sm whitespace-pre-line">{msg.text}</p>
                        <p className="text-xs mt-1 opacity-70">{msg.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-slate-800">
              <div className="mb-2 flex flex-wrap gap-1">
                <button
                  onClick={() => setChatMessage('/screenshot')}
                  className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  /screenshot
                </button>
                <button
                  onClick={() => setChatMessage('/camera on')}
                  className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  /camera
                </button>
                <button
                  onClick={() => setChatMessage('/status')}
                  className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  /status
                </button>
                <button
                  onClick={() => setChatMessage('/help')}
                  className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  /help
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Send directive to Software A..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim()}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl text-white mb-4">Share Session Link</h3>
            <p className="text-sm text-slate-400 mb-4">Copy the link below to share this session with others:</p>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
              />
              <Button
                onClick={handleCopyShareLink}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
              >
                Copy Link
              </Button>
            </div>
            <Button
              onClick={() => setShowShareDialog(false)}
              className="bg-slate-800 text-white hover:bg-slate-700"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Recordings Manager Dialog */}
      {showRecordingsManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl text-white">Recordings Manager</h3>
                <p className="text-sm text-slate-400">View and manage all recordings</p>
              </div>
              <Button
                onClick={() => setShowRecordingsManager(false)}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <RecordingsManager
                isScreenRecording={isScreenRecording}
                isCameraRecording={isCameraRecording}
                isAudioRecording={isAudioRecording}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}