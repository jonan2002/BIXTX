import { useState, useEffect } from 'react';
import { 
  Radio,
  Wifi,
  WifiOff,
  Activity,
  TrendingUp,
  TrendingDown,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Settings,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Play,
  Pause,
  X
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useWebRTC } from '../contexts/WebRTCContext';
import { toast } from 'sonner@2.0.3';

export function WebRTCDashboard() {
  const {
    isInitialized,
    activeConnections,
    remoteStreams,
    localStream,
    screenStream,
    connectionStats,
    initialize,
    connectToDevice,
    disconnectFromDevice,
    startCamera,
    stopCamera,
    startScreenShare,
    stopScreenShare,
    getDeviceStats
  } = useWebRTC();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScreenShareActive, setIsScreenShareActive] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  useEffect(() => {
    setIsCameraActive(!!localStream);
  }, [localStream]);

  useEffect(() => {
    setIsScreenShareActive(!!screenStream);
  }, [screenStream]);

  // Initialize WebRTC on mount if not already initialized
  useEffect(() => {
    if (!isInitialized) {
      const deviceInfo = {
        id: 'admin-' + Date.now(),
        name: 'Admin Console',
        type: 'desktop' as const,
        os: navigator.platform,
        capabilities: {
          video: true,
          audio: true,
          screen: true,
          dataChannel: true
        }
      };
      
      initialize(deviceInfo.id, deviceInfo).catch(console.error);
    }
  }, [isInitialized, initialize]);

  const handleToggleCamera = async () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenShareActive) {
      stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  const handleDisconnect = (deviceId: string) => {
    disconnectFromDevice(deviceId);
    if (selectedConnection === deviceId) {
      setSelectedConnection(null);
    }
  };

  const getQualityIcon = (quality?: 'excellent' | 'good' | 'fair' | 'poor') => {
    switch (quality) {
      case 'excellent':
        return <SignalHigh className="w-4 h-4 text-green-500" />;
      case 'good':
        return <SignalMedium className="w-4 h-4 text-cyan-500" />;
      case 'fair':
        return <SignalLow className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <Signal className="w-4 h-4 text-red-500" />;
      default:
        return <Signal className="w-4 h-4 text-slate-500" />;
    }
  };

  const getQualityColor = (quality?: 'excellent' | 'good' | 'fair' | 'poor') => {
    switch (quality) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-cyan-500';
      case 'fair':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatLatency = (ms: number): string => {
    return `${Math.round(ms * 1000)}ms`;
  };

  if (!isInitialized) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <Card className="bg-slate-900 border-slate-800 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <h3 className="text-white text-lg mb-2">Initializing WebRTC</h3>
          <p className="text-slate-400 text-sm">Connecting to signaling server...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-white flex items-center gap-3">
              <Radio className="w-7 h-7 text-cyan-400" />
              WebRTC Dashboard
            </h2>
            <p className="text-slate-400 mt-1">
              Real-time peer-to-peer connections and media streaming
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Connected
            </Badge>
            <Badge className="bg-slate-800 text-slate-300 px-4 py-2">
              {activeConnections.length} Active
            </Badge>
          </div>
        </div>

        {/* Media Controls */}
        <div className="flex items-center gap-3 mt-4">
          <Button
            onClick={handleToggleCamera}
            variant={isCameraActive ? 'default' : 'outline'}
            className={isCameraActive 
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' 
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }
          >
            {isCameraActive ? (
              <>
                <Video className="w-4 h-4 mr-2" />
                Camera On
              </>
            ) : (
              <>
                <VideoOff className="w-4 h-4 mr-2" />
                Camera Off
              </>
            )}
          </Button>
          <Button
            onClick={handleToggleScreenShare}
            variant={isScreenShareActive ? 'default' : 'outline'}
            className={isScreenShareActive 
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' 
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }
          >
            {isScreenShareActive ? (
              <>
                <Monitor className="w-4 h-4 mr-2" />
                Sharing Screen
              </>
            ) : (
              <>
                <MonitorOff className="w-4 h-4 mr-2" />
                Share Screen
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <Tabs defaultValue="connections" className="h-full">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="connections" className="data-[state=active]:bg-slate-700">
              Active Connections
            </TabsTrigger>
            <TabsTrigger value="streams" className="data-[state=active]:bg-slate-700">
              Media Streams
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-slate-700">
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="mt-6">
            {activeConnections.length === 0 ? (
              <Card className="bg-slate-900 border-slate-800 p-12 text-center">
                <WifiOff className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl text-slate-400 mb-2">No Active Connections</h3>
                <p className="text-slate-500">
                  Connect to devices to start peer-to-peer communication
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeConnections.map((deviceId) => {
                  const stats = connectionStats.get(deviceId);
                  const stream = remoteStreams.get(deviceId);
                  
                  return (
                    <Card 
                      key={deviceId}
                      className="bg-slate-900 border-slate-800 p-4 hover:border-cyan-700 transition-colors cursor-pointer"
                      onClick={() => setSelectedConnection(deviceId)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg flex items-center justify-center">
                            <Radio className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-white">{deviceId}</h4>
                            <p className="text-xs text-slate-400">P2P Connection</p>
                          </div>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisconnect(deviceId);
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Connection Quality */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">Quality</span>
                          <div className="flex items-center gap-2">
                            {getQualityIcon(stats?.quality)}
                            <span className="text-sm text-white capitalize">
                              {stats?.quality || 'Unknown'}
                            </span>
                          </div>
                        </div>

                        {stats && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-400">Latency</span>
                              <span className="text-sm text-white">
                                {formatLatency(stats.roundTripTime)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-400">Packet Loss</span>
                              <span className="text-sm text-white">
                                {stats.packetsLost}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">↓ Received</span>
                                <span className="text-slate-300">
                                  {formatBytes(stats.bytesReceived)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">↑ Sent</span>
                                <span className="text-slate-300">
                                  {formatBytes(stats.bytesSent)}
                                </span>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Stream Status */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                          {stream ? (
                            <>
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                                <Play className="w-3 h-3 mr-1" />
                                Streaming
                              </Badge>
                            </>
                          ) : (
                            <Badge className="bg-slate-700 text-slate-400 text-xs">
                              <Pause className="w-3 h-3 mr-1" />
                              No Stream
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="streams" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Local Streams */}
              <Card className="bg-slate-900 border-slate-800 p-4">
                <h3 className="text-white text-lg mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-cyan-400" />
                  Local Media
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {isCameraActive ? (
                        <Video className="w-5 h-5 text-green-400" />
                      ) : (
                        <VideoOff className="w-5 h-5 text-slate-500" />
                      )}
                      <div>
                        <p className="text-white text-sm">Camera</p>
                        <p className="text-xs text-slate-400">
                          {isCameraActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                    <Badge className={isCameraActive ? 'bg-green-500' : 'bg-slate-700'}>
                      {isCameraActive ? 'On' : 'Off'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {isScreenShareActive ? (
                        <Monitor className="w-5 h-5 text-green-400" />
                      ) : (
                        <MonitorOff className="w-5 h-5 text-slate-500" />
                      )}
                      <div>
                        <p className="text-white text-sm">Screen Share</p>
                        <p className="text-xs text-slate-400">
                          {isScreenShareActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                    <Badge className={isScreenShareActive ? 'bg-green-500' : 'bg-slate-700'}>
                      {isScreenShareActive ? 'On' : 'Off'}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Remote Streams */}
              <Card className="bg-slate-900 border-slate-800 p-4">
                <h3 className="text-white text-lg mb-4 flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-cyan-400" />
                  Remote Streams
                </h3>
                {remoteStreams.size === 0 ? (
                  <div className="text-center py-8">
                    <WifiOff className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No remote streams</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.from(remoteStreams.entries()).map(([deviceId, stream]) => (
                      <div 
                        key={deviceId}
                        className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Radio className="w-5 h-5 text-cyan-400" />
                          <div>
                            <p className="text-white text-sm">{deviceId}</p>
                            <p className="text-xs text-slate-400">
                              {stream.getTracks().length} tracks
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          Live
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-slate-900 border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Active Connections</span>
                  <Wifi className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-2xl text-white">{activeConnections.length}</p>
              </Card>

              <Card className="bg-slate-900 border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Remote Streams</span>
                  <Video className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-2xl text-white">{remoteStreams.size}</p>
              </Card>

              <Card className="bg-slate-900 border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Local Streams</span>
                  <Monitor className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-2xl text-white">
                  {(isCameraActive ? 1 : 0) + (isScreenShareActive ? 1 : 0)}
                </p>
              </Card>

              <Card className="bg-slate-900 border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Avg Quality</span>
                  <Activity className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-2xl text-white">Good</p>
              </Card>
            </div>

            {/* Detailed Stats */}
            {selectedConnection && connectionStats.has(selectedConnection) && (
              <Card className="bg-slate-900 border-slate-800 p-6">
                <h3 className="text-white text-lg mb-4">
                  Connection Details: {selectedConnection}
                </h3>
                {(() => {
                  const stats = connectionStats.get(selectedConnection)!;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">
                            Connection Quality
                          </label>
                          <div className="flex items-center gap-3">
                            {getQualityIcon(stats.quality)}
                            <span className="text-white capitalize">{stats.quality}</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">
                            Round Trip Time
                          </label>
                          <p className="text-white">{formatLatency(stats.roundTripTime)}</p>
                        </div>

                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">
                            Packet Loss
                          </label>
                          <p className="text-white">{stats.packetsLost} packets</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">
                            Data Received
                          </label>
                          <p className="text-white">{formatBytes(stats.bytesReceived)}</p>
                        </div>

                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">
                            Data Sent
                          </label>
                          <p className="text-white">{formatBytes(stats.bytesSent)}</p>
                        </div>

                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">
                            Total Bandwidth
                          </label>
                          <p className="text-white">{formatBytes(stats.bandwidth)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
