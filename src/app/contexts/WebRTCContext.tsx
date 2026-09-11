import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { WebRTCConnectionManager, DeviceInfo, ConnectionStats } from '../utils/webrtcManager';
import { toast } from 'sonner@2.0.3';

interface WebRTCContextType {
  manager: WebRTCConnectionManager | null;
  isInitialized: boolean;
  activeConnections: string[];
  remoteStreams: Map<string, MediaStream>;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  connectionStats: Map<string, ConnectionStats>;
  
  // Methods
  initialize: (deviceId: string, deviceInfo: DeviceInfo) => Promise<void>;
  connectToDevice: (deviceId: string) => Promise<void>;
  disconnectFromDevice: (deviceId: string) => void;
  startCamera: () => Promise<MediaStream | null>;
  stopCamera: () => void;
  startScreenShare: () => Promise<MediaStream | null>;
  stopScreenShare: () => void;
  sendControlCommand: (deviceId: string, command: string, params?: any) => boolean;
  getDeviceStats: (deviceId: string) => Promise<ConnectionStats | null>;
  cleanup: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

interface WebRTCProviderProps {
  children: ReactNode;
  signalingServerUrl?: string;
}

export function WebRTCProvider({ 
  children, 
  signalingServerUrl = 'wss://signaling.bixtx.com' 
}: WebRTCProviderProps) {
  const [manager, setManager] = useState<WebRTCConnectionManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeConnections, setActiveConnections] = useState<string[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [connectionStats, setConnectionStats] = useState<Map<string, ConnectionStats>>(new Map());

  // Initialize WebRTC manager
  const initialize = useCallback(async (deviceId: string, deviceInfo: DeviceInfo) => {
    if (manager) {
      console.warn('WebRTC manager already initialized');
      return;
    }

    try {
      // Dynamically import to avoid SSR issues
      const { createWebRTCManager } = await import('../utils/webrtcManager');
      
      const newManager = createWebRTCManager(signalingServerUrl, deviceId, deviceInfo);
      
      // Setup callbacks
      newManager.onRemoteStream((deviceId: string, stream: MediaStream) => {
        console.log('Remote stream received:', deviceId);
        setRemoteStreams(prev => new Map(prev).set(deviceId, stream));
      });

      newManager.onDataChannelMessage((deviceId: string, data: any) => {
        console.log('Data channel message:', deviceId, data);
        // Handle control messages
        if (data.type === 'control') {
          handleControlMessage(deviceId, data);
        }
      });

      newManager.onConnectionStateChange((deviceId: string, state: RTCPeerConnectionState) => {
        console.log('Connection state changed:', deviceId, state);
        
        if (state === 'connected') {
          setActiveConnections(prev => [...new Set([...prev, deviceId])]);
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          setActiveConnections(prev => prev.filter(id => id !== deviceId));
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(deviceId);
            return newMap;
          });
        }
      });

      // Connect to signaling server
      await newManager.connectSignalingServer();
      
      setManager(newManager);
      setIsInitialized(true);
      
      toast.success('WebRTC initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      toast.error('Failed to initialize WebRTC');
      throw error;
    }
  }, [manager, signalingServerUrl]);

  // Handle control messages
  const handleControlMessage = useCallback((deviceId: string, data: any) => {
    switch (data.command) {
      case 'mouse-move':
        console.log('Mouse move command:', data.params);
        break;
      case 'mouse-click':
        console.log('Mouse click command:', data.params);
        break;
      case 'keyboard':
        console.log('Keyboard command:', data.params);
        break;
      case 'request-stats':
        // Send stats back
        break;
      default:
        console.warn('Unknown control command:', data.command);
    }
  }, []);

  // Connect to a device
  const connectToDevice = useCallback(async (deviceId: string) => {
    if (!manager) {
      toast.error('WebRTC not initialized');
      return;
    }

    try {
      await manager.createOffer(deviceId);
      toast.info(`Connecting to ${deviceId}...`);
    } catch (error) {
      console.error('Failed to connect to device:', error);
      toast.error(`Failed to connect to ${deviceId}`);
    }
  }, [manager]);

  // Disconnect from a device
  const disconnectFromDevice = useCallback((deviceId: string) => {
    if (!manager) return;

    manager.closePeerConnection(deviceId);
    setActiveConnections(prev => prev.filter(id => id !== deviceId));
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(deviceId);
      return newMap;
    });
    
    toast.info(`Disconnected from ${deviceId}`);
  }, [manager]);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!manager) {
      toast.error('WebRTC not initialized');
      return null;
    }

    const stream = await manager.startLocalStream({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    setLocalStream(stream);
    return stream;
  }, [manager]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (!manager) return;
    
    manager.stopLocalStream();
    setLocalStream(null);
  }, [manager]);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    if (!manager) {
      toast.error('WebRTC not initialized');
      return null;
    }

    try {
      const stream = await manager.startScreenShare({
        video: {
          displaySurface: 'monitor',
          cursor: 'always',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        } as any
      });
      
      setScreenStream(stream);
      return stream;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      return null;
    }
  }, [manager]);

  // Stop screen share
  const stopScreenShare = useCallback(() => {
    if (!manager) return;
    
    manager.stopScreenShare();
    setScreenStream(null);
  }, [manager]);

  // Send control command
  const sendControlCommand = useCallback((deviceId: string, command: string, params?: any) => {
    if (!manager) {
      console.error('WebRTC not initialized');
      return false;
    }

    return manager.sendControlCommand(deviceId, command, params);
  }, [manager]);

  // Get device statistics
  const getDeviceStats = useCallback(async (deviceId: string) => {
    if (!manager) return null;

    try {
      const stats = await manager.getStats(deviceId);
      if (stats) {
        setConnectionStats(prev => new Map(prev).set(deviceId, stats));
      }
      return stats;
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  }, [manager]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (!manager) return;
    
    manager.cleanup();
    setManager(null);
    setIsInitialized(false);
    setActiveConnections([]);
    setRemoteStreams(new Map());
    setLocalStream(null);
    setScreenStream(null);
    setConnectionStats(new Map());
    
    toast.info('WebRTC session ended');
  }, [manager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (manager) {
        manager.cleanup();
      }
    };
  }, [manager]);

  // Poll connection stats for active connections
  useEffect(() => {
    if (!manager || activeConnections.length === 0) return;

    const interval = setInterval(() => {
      activeConnections.forEach(async (deviceId) => {
        await getDeviceStats(deviceId);
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [manager, activeConnections, getDeviceStats]);

  const value: WebRTCContextType = {
    manager,
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
    sendControlCommand,
    getDeviceStats,
    cleanup
  };

  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
}

// Custom hook to use WebRTC context
export function useWebRTC() {
  const context = useContext(WebRTCContext);
  
  if (context === undefined) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  
  return context;
}

// Hook for easy control commands
export function useRemoteControl(deviceId: string) {
  const { sendControlCommand } = useWebRTC();

  const moveMouse = useCallback((x: number, y: number) => {
    return sendControlCommand(deviceId, 'mouse-move', { x, y });
  }, [deviceId, sendControlCommand]);

  const clickMouse = useCallback((button: 'left' | 'right' | 'middle', x: number, y: number) => {
    return sendControlCommand(deviceId, 'mouse-click', { button, x, y });
  }, [deviceId, sendControlCommand]);

  const pressKey = useCallback((key: string, modifiers?: string[]) => {
    return sendControlCommand(deviceId, 'keyboard', { key, modifiers });
  }, [deviceId, sendControlCommand]);

  const typeText = useCallback((text: string) => {
    return sendControlCommand(deviceId, 'type-text', { text });
  }, [deviceId, sendControlCommand]);

  const scroll = useCallback((deltaX: number, deltaY: number) => {
    return sendControlCommand(deviceId, 'scroll', { deltaX, deltaY });
  }, [deviceId, sendControlCommand]);

  return {
    moveMouse,
    clickMouse,
    pressKey,
    typeText,
    scroll
  };
}
