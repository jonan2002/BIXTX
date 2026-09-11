import { useState, useEffect } from 'react';
import { 
  Settings,
  Video,
  Mic,
  Monitor,
  Wifi,
  Server,
  Shield,
  Zap,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
import { 
  testWebRTCConnectivity, 
  getVideoDevices, 
  getAudioDevices,
  getSupportedVideoCodecs 
} from '../utils/webrtc';

interface WebRTCConfig {
  video: {
    enabled: boolean;
    resolution: string;
    frameRate: number;
    codec: string;
  };
  audio: {
    enabled: boolean;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
  };
  screen: {
    resolution: string;
    frameRate: number;
    cursor: boolean;
  };
  connection: {
    iceTransportPolicy: 'all' | 'relay';
    iceCandidatePoolSize: number;
  };
  signaling: {
    serverUrl: string;
    reconnectAttempts: number;
    reconnectDelay: number;
  };
}

export function WebRTCSettings() {
  const [config, setConfig] = useState<WebRTCConfig>({
    video: {
      enabled: true,
      resolution: '1280x720',
      frameRate: 30,
      codec: 'VP9'
    },
    audio: {
      enabled: true,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    screen: {
      resolution: '1920x1080',
      frameRate: 30,
      cursor: true
    },
    connection: {
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10
    },
    signaling: {
      serverUrl: 'wss://signaling.bixtx.com',
      reconnectAttempts: 5,
      reconnectDelay: 2000
    }
  });

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [supportedCodecs, setSupportedCodecs] = useState<string[]>([]);
  const [connectivity, setConnectivity] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadDevices();
    loadCodecs();
    testConnectivity();
  }, []);

  const loadDevices = async () => {
    try {
      const videos = await getVideoDevices();
      const audios = await getAudioDevices();
      setVideoDevices(videos);
      setAudioDevices(audios);
    } catch (error) {
      console.error('Failed to load devices:', error);
      toast.error('Failed to enumerate media devices');
    }
  };

  const loadCodecs = () => {
    const codecs = getSupportedVideoCodecs();
    setSupportedCodecs(codecs.map(c => c.split(';')[0].split('/')[1].toUpperCase()));
  };

  const testConnectivity = async () => {
    setIsTesting(true);
    try {
      const result = await testWebRTCConnectivity();
      setConnectivity(result);
      
      if (result.canConnect) {
        toast.success('WebRTC connectivity test passed');
      } else {
        toast.error('WebRTC not supported in this browser');
      }
    } catch (error) {
      console.error('Connectivity test failed:', error);
      toast.error('Failed to test connectivity');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem('bixtx-webrtc-config', JSON.stringify(config));
    toast.success('WebRTC settings saved successfully');
  };

  const handleReset = () => {
    localStorage.removeItem('bixtx-webrtc-config');
    window.location.reload();
  };

  const updateConfig = (section: keyof WebRTCConfig, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-white flex items-center gap-3">
              <Settings className="w-7 h-7 text-cyan-400" />
              WebRTC Settings
            </h2>
            <p className="text-slate-400 mt-1">
              Configure video, audio, and connection settings
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={testConnectivity}
              disabled={isTesting}
              variant="outline"
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              {isTesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500 mr-2"></div>
                  Testing...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              Reset to Default
            </Button>
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
            >
              Save Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Connectivity Status */}
          {connectivity && (
            <Card className="bg-slate-900 border-slate-800 p-6">
              <h3 className="text-white text-lg mb-4 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-cyan-400" />
                Connectivity Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                  {connectivity.canConnect ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <p className="text-white text-sm">WebRTC</p>
                    <p className="text-xs text-slate-400">
                      {connectivity.canConnect ? 'Supported' : 'Not Supported'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                  {connectivity.hasCamera ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <p className="text-white text-sm">Camera</p>
                    <p className="text-xs text-slate-400">
                      {connectivity.hasCamera ? 'Available' : 'Not Found'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                  {connectivity.hasMicrophone ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <p className="text-white text-sm">Microphone</p>
                    <p className="text-xs text-slate-400">
                      {connectivity.hasMicrophone ? 'Available' : 'Not Found'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                  {connectivity.canScreenShare ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <p className="text-white text-sm">Screen Share</p>
                    <p className="text-xs text-slate-400">
                      {connectivity.canScreenShare ? 'Supported' : 'Not Supported'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Tabs defaultValue="video" className="w-full">
            <TabsList className="bg-slate-800 border-slate-700">
              <TabsTrigger value="video" className="data-[state=active]:bg-slate-700">
                <Video className="w-4 h-4 mr-2" />
                Video
              </TabsTrigger>
              <TabsTrigger value="audio" className="data-[state=active]:bg-slate-700">
                <Mic className="w-4 h-4 mr-2" />
                Audio
              </TabsTrigger>
              <TabsTrigger value="screen" className="data-[state=active]:bg-slate-700">
                <Monitor className="w-4 h-4 mr-2" />
                Screen Share
              </TabsTrigger>
              <TabsTrigger value="connection" className="data-[state=active]:bg-slate-700">
                <Server className="w-4 h-4 mr-2" />
                Connection
              </TabsTrigger>
            </TabsList>

            <TabsContent value="video" className="mt-6">
              <Card className="bg-slate-900 border-slate-800 p-6">
                <h3 className="text-white text-lg mb-4">Video Settings</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Enable Video</Label>
                      <p className="text-sm text-slate-400">Allow video transmission</p>
                    </div>
                    <Switch
                      checked={config.video.enabled}
                      onCheckedChange={(checked) => updateConfig('video', 'enabled', checked)}
                    />
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="space-y-2">
                    <Label className="text-white">Resolution</Label>
                    <Select
                      value={config.video.resolution}
                      onValueChange={(value) => updateConfig('video', 'resolution', value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="640x480">640×480 (SD)</SelectItem>
                        <SelectItem value="1280x720">1280×720 (HD)</SelectItem>
                        <SelectItem value="1920x1080">1920×1080 (Full HD)</SelectItem>
                        <SelectItem value="2560x1440">2560×1440 (2K)</SelectItem>
                        <SelectItem value="3840x2160">3840×2160 (4K)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Frame Rate</Label>
                    <Select
                      value={config.video.frameRate.toString()}
                      onValueChange={(value) => updateConfig('video', 'frameRate', parseInt(value))}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="15">15 FPS</SelectItem>
                        <SelectItem value="24">24 FPS</SelectItem>
                        <SelectItem value="30">30 FPS</SelectItem>
                        <SelectItem value="60">60 FPS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Codec</Label>
                    <Select
                      value={config.video.codec}
                      onValueChange={(value) => updateConfig('video', 'codec', value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {supportedCodecs.map(codec => (
                          <SelectItem key={codec} value={codec}>{codec}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      VP9 offers better compression, VP8 has wider compatibility
                    </p>
                  </div>

                  {videoDevices.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-white">Camera Device</Label>
                      <Select>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="Select camera" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {videoDevices.map(device => (
                            <SelectItem key={device.deviceId} value={device.deviceId}>
                              {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="audio" className="mt-6">
              <Card className="bg-slate-900 border-slate-800 p-6">
                <h3 className="text-white text-lg mb-4">Audio Settings</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Enable Audio</Label>
                      <p className="text-sm text-slate-400">Allow audio transmission</p>
                    </div>
                    <Switch
                      checked={config.audio.enabled}
                      onCheckedChange={(checked) => updateConfig('audio', 'enabled', checked)}
                    />
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Echo Cancellation</Label>
                      <p className="text-sm text-slate-400">Remove echo from audio</p>
                    </div>
                    <Switch
                      checked={config.audio.echoCancellation}
                      onCheckedChange={(checked) => updateConfig('audio', 'echoCancellation', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Noise Suppression</Label>
                      <p className="text-sm text-slate-400">Filter background noise</p>
                    </div>
                    <Switch
                      checked={config.audio.noiseSuppression}
                      onCheckedChange={(checked) => updateConfig('audio', 'noiseSuppression', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Auto Gain Control</Label>
                      <p className="text-sm text-slate-400">Automatically adjust volume</p>
                    </div>
                    <Switch
                      checked={config.audio.autoGainControl}
                      onCheckedChange={(checked) => updateConfig('audio', 'autoGainControl', checked)}
                    />
                  </div>

                  {audioDevices.length > 0 && (
                    <>
                      <Separator className="bg-slate-800" />
                      <div className="space-y-2">
                        <Label className="text-white">Microphone Device</Label>
                        <Select>
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            <SelectValue placeholder="Select microphone" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {audioDevices.map(device => (
                              <SelectItem key={device.deviceId} value={device.deviceId}>
                                {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="screen" className="mt-6">
              <Card className="bg-slate-900 border-slate-800 p-6">
                <h3 className="text-white text-lg mb-4">Screen Share Settings</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-white">Resolution</Label>
                    <Select
                      value={config.screen.resolution}
                      onValueChange={(value) => updateConfig('screen', 'resolution', value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="1280x720">1280×720 (HD)</SelectItem>
                        <SelectItem value="1920x1080">1920×1080 (Full HD)</SelectItem>
                        <SelectItem value="2560x1440">2560×1440 (2K)</SelectItem>
                        <SelectItem value="3840x2160">3840×2160 (4K)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Frame Rate</Label>
                    <Select
                      value={config.screen.frameRate.toString()}
                      onValueChange={(value) => updateConfig('screen', 'frameRate', parseInt(value))}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="15">15 FPS</SelectItem>
                        <SelectItem value="24">24 FPS</SelectItem>
                        <SelectItem value="30">30 FPS</SelectItem>
                        <SelectItem value="60">60 FPS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Show Cursor</Label>
                      <p className="text-sm text-slate-400">Include cursor in screen share</p>
                    </div>
                    <Switch
                      checked={config.screen.cursor}
                      onCheckedChange={(checked) => updateConfig('screen', 'cursor', checked)}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="connection" className="mt-6">
              <Card className="bg-slate-900 border-slate-800 p-6">
                <h3 className="text-white text-lg mb-4">Connection Settings</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-white">Signaling Server URL</Label>
                    <Input
                      value={config.signaling.serverUrl}
                      onChange={(e) => updateConfig('signaling', 'serverUrl', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="wss://signaling.bixtx.com"
                    />
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      WebSocket server for signaling messages
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">ICE Transport Policy</Label>
                    <Select
                      value={config.connection.iceTransportPolicy}
                      onValueChange={(value: any) => updateConfig('connection', 'iceTransportPolicy', value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all">All (Recommended)</SelectItem>
                        <SelectItem value="relay">Relay Only (TURN)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400">
                      'All' allows P2P connections, 'Relay' forces traffic through TURN server
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">ICE Candidate Pool Size</Label>
                    <Input
                      type="number"
                      value={config.connection.iceCandidatePoolSize}
                      onChange={(e) => updateConfig('connection', 'iceCandidatePoolSize', parseInt(e.target.value))}
                      className="bg-slate-800 border-slate-700 text-white"
                      min="0"
                      max="50"
                    />
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="space-y-2">
                    <Label className="text-white">Reconnect Attempts</Label>
                    <Input
                      type="number"
                      value={config.signaling.reconnectAttempts}
                      onChange={(e) => updateConfig('signaling', 'reconnectAttempts', parseInt(e.target.value))}
                      className="bg-slate-800 border-slate-700 text-white"
                      min="0"
                      max="10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Reconnect Delay (ms)</Label>
                    <Input
                      type="number"
                      value={config.signaling.reconnectDelay}
                      onChange={(e) => updateConfig('signaling', 'reconnectDelay', parseInt(e.target.value))}
                      className="bg-slate-800 border-slate-700 text-white"
                      min="500"
                      max="10000"
                      step="500"
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
