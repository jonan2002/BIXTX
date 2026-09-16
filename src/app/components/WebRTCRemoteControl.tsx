import { useState, useEffect, useRef } from 'react';
import { 
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Radio,
  Signal,
  Maximize2,
  Minimize2,
  Settings,
  Activity
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useWebRTC, useRemoteControl } from '../contexts/WebRTCContext';
import { toast } from 'sonner@2.0.3';

interface WebRTCRemoteControlProps {
  deviceId: string;
  deviceName: string;
  onClose?: () => void;
}

export function WebRTCRemoteControl({ deviceId, deviceName, onClose }: WebRTCRemoteControlProps) {
  const {
    remoteStreams,
    localStream,
    screenStream,
    connectionStats,
    connectToDevice,
    disconnectFromDevice,
    startCamera,
    stopCamera,
    startScreenShare,
    stopScreenShare,
    getDeviceStats,
    isInitialized
  } = useWebRTC();

  const {
    moveMouse,
    clickMouse,
    pressKey,
    typeText,
    scroll
  } = useRemoteControl(deviceId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScreenShareActive, setIsScreenShareActive] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Connect to device on mount
  useEffect(() => {
    if (isInitialized) {
      connectToDevice(deviceId);
    }

    return () => {
      disconnectFromDevice(deviceId);
    };
  }, [deviceId, isInitialized]);

  // Update video element when remote stream changes
  useEffect(() => {
    const stream = remoteStreams.get(deviceId);
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [remoteStreams, deviceId]);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const deviceStats = await getDeviceStats(deviceId);
      setStats(deviceStats);
    }, 2000);

    return () => clearInterval(interval);
  }, [deviceId, getDeviceStats]);

  // Update camera state
  useEffect(() => {
    setIsCameraActive(!!localStream);
  }, [localStream]);

  // Update screen share state
  useEffect(() => {
    setIsScreenShareActive(!!screenStream);
  }, [screenStream]);

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    moveMouse(x, y);
  };

  const handleMouseClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const button = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';
    clickMouse(button as any, x, y);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    e.preventDefault();
    const modifiers = [];
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.shiftKey) modifiers.push('shift');
    if (e.altKey) modifiers.push('alt');
    
    pressKey(e.key, modifiers);
  };

  const handleScroll = (e: React.WheelEvent) => {
    scroll(e.deltaX, e.deltaY);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getQualityColor = (quality?: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-cyan-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const remoteStream = remoteStreams.get(deviceId);
  const hasStream = !!remoteStream;

  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onClose && (
              <Button
                onClick={onClose}
                variant="outline"
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                ← Back
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white">{deviceName}</h3>
                <p className="text-xs text-slate-400">{deviceId}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Quality */}
            {stats && (
              <Badge className={`${getQualityColor(stats.quality)} text-white px-3 py-1`}>
                <Signal className="w-3 h-3 mr-1" />
                {stats.quality}
              </Badge>
            )}

            {/* Control Buttons */}
            <Button
              onClick={handleToggleCamera}
              variant="outline"
              size="sm"
              className={isCameraActive 
                ? 'bg-cyan-600 border-cyan-600 text-white hover:bg-cyan-700' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }
            >
              {isCameraActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>

            <Button
              onClick={handleToggleScreenShare}
              variant="outline"
              size="sm"
              className={isScreenShareActive 
                ? 'bg-cyan-600 border-cyan-600 text-white hover:bg-cyan-700' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }
            >
              {isScreenShareActive ? <Monitor className="w-4 h-4" /> : <MonitorOff className="w-4 h-4" />}
            </Button>

            <Button
              onClick={toggleFullscreen}
              variant="outline"
              size="sm"
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="w-4 h-4" />
              <span>RTT: {Math.round(stats.roundTripTime * 1000)}ms</span>
            </div>
            <div className="text-slate-400">
              Loss: {stats.packetsLost} packets
            </div>
            <div className="text-slate-400">
              ↓ {Math.round(stats.bytesReceived / 1024)} KB
            </div>
            <div className="text-slate-400">
              ↑ {Math.round(stats.bytesSent / 1024)} KB
            </div>
          </div>
        )}
      </div>

      {/* Video Display */}
      <div className="flex-1 bg-slate-950 p-4">
        <Card className="h-full bg-slate-900 border-slate-800 relative overflow-hidden">
          {hasStream ? (
            <div
              className="h-full relative"
              onMouseMove={handleMouseMove}
              onClick={handleMouseClick}
              onContextMenu={(e) => {
                e.preventDefault();
                handleMouseClick(e as any);
              }}
              onWheel={handleScroll}
              onKeyDown={handleKeyPress}
              tabIndex={0}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-contain bg-black"
                autoPlay
                playsInline
              />
              
              {/* Overlay Controls */}
              <div className="absolute top-4 right-4 space-y-2">
                <Badge className="bg-red-600 text-white animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full mr-2" />
                  LIVE
                </Badge>
              </div>

              {/* Instructions Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3">
                <p className="text-slate-300 text-sm">
                  <strong>Controls:</strong> Click to interact • Type to send keys • Scroll to scroll • Right-click for context menu
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <VideoOff className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl text-slate-400 mb-2">No Video Stream</h3>
                <p className="text-slate-500">
                  Waiting for remote device to share screen...
                </p>
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
