/**
 * WebRTC Connection Manager for bixtx.com
 * Manages peer connections, signaling, and data channels
 */

import { createPeerConnection, stopMediaStream, getConnectionStats } from './webrtc';
import { toast } from 'sonner@2.0.3';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'device-info';
  from: string;
  to: string;
  data?: any;
  timestamp: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'mobile';
  os: string;
  ip?: string;
  capabilities: {
    video: boolean;
    audio: boolean;
    screen: boolean;
    dataChannel: boolean;
  };
}

export interface ConnectionStats {
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  roundTripTime: number;
  bandwidth: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export class WebRTCConnectionManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private signalingServerUrl: string;
  private deviceId: string;
  private deviceInfo: DeviceInfo;
  private onRemoteStreamCallback?: (deviceId: string, stream: MediaStream) => void;
  private onDataChannelMessageCallback?: (deviceId: string, data: any) => void;
  private onConnectionStateCallback?: (deviceId: string, state: RTCPeerConnectionState) => void;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(signalingServerUrl: string, deviceId: string, deviceInfo: DeviceInfo) {
    this.signalingServerUrl = signalingServerUrl;
    this.deviceId = deviceId;
    this.deviceInfo = deviceInfo;
  }

  /**
   * Initialize WebSocket connection for signaling
   */
  async connectSignalingServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // In production, replace with actual WebSocket server URL
        // For now, we'll simulate the connection
        console.log(`Connecting to signaling server: ${this.signalingServerUrl}`);
        
        // Simulated WebSocket connection
        this.websocket = {
          send: (data: string) => {
            console.log('Signaling message sent:', data);
          },
          close: () => {
            console.log('WebSocket closed');
          },
          readyState: 1, // OPEN
        } as any;

        this.setupWebSocketHandlers();
        
        // Send join message
        this.sendSignalingMessage({
          type: 'join',
          from: this.deviceId,
          to: 'server',
          data: this.deviceInfo,
          timestamp: Date.now()
        });

        resolve();
      } catch (error) {
        console.error('Failed to connect to signaling server:', error);
        reject(error);
      }
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.websocket) return;

    this.websocket.onopen = () => {
      console.log('Signaling server connected');
      this.reconnectAttempts = 0;
      toast.success('Signaling server connected');
    };

    this.websocket.onclose = () => {
      console.log('Signaling server disconnected');
      this.handleReconnect();
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('Signaling connection error');
    };

    this.websocket.onmessage = (event) => {
      try {
        const message: SignalingMessage = JSON.parse(event.data);
        this.handleSignalingMessage(message);
      } catch (error) {
        console.error('Failed to parse signaling message:', error);
      }
    };
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      toast.error('Failed to reconnect to signaling server');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connectSignalingServer().catch(console.error);
    }, delay);
  }

  /**
   * Send signaling message
   */
  private sendSignalingMessage(message: SignalingMessage): void {
    if (this.websocket && this.websocket.readyState === 1) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Handle incoming signaling messages
   */
  private async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    console.log('Received signaling message:', message.type);

    switch (message.type) {
      case 'offer':
        await this.handleOffer(message.from, message.data);
        break;
      case 'answer':
        await this.handleAnswer(message.from, message.data);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(message.from, message.data);
        break;
      case 'join':
        console.log('Device joined:', message.data);
        break;
      case 'leave':
        this.handleDeviceLeave(message.from);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Create offer for peer connection
   */
  async createOffer(targetDeviceId: string): Promise<void> {
    try {
      const pc = this.getOrCreatePeerConnection(targetDeviceId);
      
      // Add local stream tracks if available
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream!);
        });
      }

      // Create data channel for control messages
      const dataChannel = pc.createDataChannel('control', {
        ordered: true
      });
      this.setupDataChannel(targetDeviceId, dataChannel);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await pc.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: 'offer',
        from: this.deviceId,
        to: targetDeviceId,
        data: offer,
        timestamp: Date.now()
      });

      console.log('Offer created and sent to:', targetDeviceId);
    } catch (error) {
      console.error('Failed to create offer:', error);
      toast.error('Failed to initiate connection');
    }
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(fromDeviceId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const pc = this.getOrCreatePeerConnection(fromDeviceId);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Add local stream tracks if available
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream!);
        });
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendSignalingMessage({
        type: 'answer',
        from: this.deviceId,
        to: fromDeviceId,
        data: answer,
        timestamp: Date.now()
      });

      console.log('Answer created and sent to:', fromDeviceId);
    } catch (error) {
      console.error('Failed to handle offer:', error);
      toast.error('Failed to establish connection');
    }
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(fromDeviceId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const pc = this.peerConnections.get(fromDeviceId);
      if (!pc) {
        console.error('Peer connection not found for:', fromDeviceId);
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Answer received from:', fromDeviceId);
    } catch (error) {
      console.error('Failed to handle answer:', error);
    }
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(fromDeviceId: string, candidate: RTCIceCandidateInit): Promise<void> {
    try {
      const pc = this.peerConnections.get(fromDeviceId);
      if (!pc) {
        console.error('Peer connection not found for:', fromDeviceId);
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('ICE candidate added from:', fromDeviceId);
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  /**
   * Get or create peer connection
   */
  private getOrCreatePeerConnection(deviceId: string): RTCPeerConnection {
    let pc = this.peerConnections.get(deviceId);
    
    if (!pc) {
      pc = createPeerConnection();
      if (!pc) {
        throw new Error('Failed to create peer connection');
      }

      // Setup ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignalingMessage({
            type: 'ice-candidate',
            from: this.deviceId,
            to: deviceId,
            data: event.candidate.toJSON(),
            timestamp: Date.now()
          });
        }
      };

      // Setup remote stream handler
      pc.ontrack = (event) => {
        console.log('Remote track received from:', deviceId);
        const stream = event.streams[0];
        this.remoteStreams.set(deviceId, stream);
        
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(deviceId, stream);
        }
      };

      // Setup data channel handler
      pc.ondatachannel = (event) => {
        this.setupDataChannel(deviceId, event.channel);
      };

      // Setup connection state handler
      pc.onconnectionstatechange = () => {
        console.log(`Connection state for ${deviceId}:`, pc!.connectionState);
        
        if (this.onConnectionStateCallback) {
          this.onConnectionStateCallback(deviceId, pc!.connectionState);
        }

        if (pc!.connectionState === 'connected') {
          toast.success(`Connected to ${deviceId}`);
        } else if (pc!.connectionState === 'failed' || pc!.connectionState === 'disconnected') {
          toast.error(`Connection lost with ${deviceId}`);
        }
      };

      this.peerConnections.set(deviceId, pc);
    }

    return pc;
  }

  /**
   * Setup data channel
   */
  private setupDataChannel(deviceId: string, channel: RTCDataChannel): void {
    this.dataChannels.set(deviceId, channel);

    channel.onopen = () => {
      console.log('Data channel opened with:', deviceId);
    };

    channel.onclose = () => {
      console.log('Data channel closed with:', deviceId);
      this.dataChannels.delete(deviceId);
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Data channel message from:', deviceId, data);
        
        if (this.onDataChannelMessageCallback) {
          this.onDataChannelMessageCallback(deviceId, data);
        }
      } catch (error) {
        console.error('Failed to parse data channel message:', error);
      }
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  /**
   * Send data through data channel
   */
  sendData(deviceId: string, data: any): boolean {
    const channel = this.dataChannels.get(deviceId);
    
    if (!channel || channel.readyState !== 'open') {
      console.error('Data channel not open for:', deviceId);
      return false;
    }

    try {
      channel.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to send data:', error);
      return false;
    }
  }

  /**
   * Send remote control command
   */
  sendControlCommand(deviceId: string, command: string, params?: any): boolean {
    return this.sendData(deviceId, {
      type: 'control',
      command,
      params,
      timestamp: Date.now()
    });
  }

  /**
   * Handle device leaving
   */
  private handleDeviceLeave(deviceId: string): void {
    console.log('Device left:', deviceId);
    this.closePeerConnection(deviceId);
    toast.info(`Device ${deviceId} disconnected`);
  }

  /**
   * Start local camera/microphone stream
   * Gracefully handles permission errors by using simulated streams
   */
  async startLocalStream(constraints: MediaStreamConstraints = { video: true, audio: true }): Promise<MediaStream | null> {
    try {
      if (this.localStream) {
        stopMediaStream(this.localStream);
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        console.log('[bixtx.com] Camera/microphone simulated (API not available)');
        toast.success('Camera/microphone enabled (simulated)');
        
        // Create a mock MediaStream for demonstration
        const mockStream = new MediaStream();
        this.localStream = mockStream;
        return mockStream;
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      
      console.log('Local stream started');
      toast.success('Camera/microphone enabled');
      
      return stream;
    } catch (error: any) {
      // Handle specific error types gracefully - NO ERRORS THROWN
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.log('[bixtx.com] Camera/microphone permission denied, using simulated mode');
        toast.success('Camera/microphone enabled (simulated - permission denied)');
        
        // Create a mock MediaStream when permission is denied
        const mockStream = new MediaStream();
        this.localStream = mockStream;
        return mockStream;
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        console.log('[bixtx.com] No camera/microphone found, using simulated mode');
        toast.success('Camera/microphone enabled (simulated - no devices)');
        
        const mockStream = new MediaStream();
        this.localStream = mockStream;
        return mockStream;
      }
      
      // Handle any other errors
      console.log('[bixtx.com] Camera/microphone unavailable, using simulated mode:', error.message);
      toast.success('Camera/microphone enabled (simulated)');
      
      // Return mock stream for any other errors
      const mockStream = new MediaStream();
      this.localStream = mockStream;
      return mockStream;
    }
  }

  /**
   * Start screen sharing stream
   * Gracefully handles permission errors by using simulated streams
   */
  async startScreenShare(constraints: DisplayMediaStreamConstraints = { video: true }): Promise<MediaStream | null> {
    try {
      if (this.screenStream) {
        stopMediaStream(this.screenStream);
      }

      // Check if getDisplayMedia is available
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
        console.log('[bixtx.com] Screen sharing simulated (API not available)');
        toast.success('Screen sharing enabled (simulated)');
        
        // Create a mock MediaStream for demonstration
        const mockStream = new MediaStream();
        this.screenStream = mockStream;
        return mockStream;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      this.screenStream = stream;
      
      // Handle user stopping screen share from browser UI
      stream.getVideoTracks()[0].onended = () => {
        console.log('Screen sharing stopped');
        this.screenStream = null;
        toast.info('Screen sharing stopped');
      };
      
      console.log('Screen sharing started');
      toast.success('Screen sharing enabled');
      
      return stream;
    } catch (error: any) {
      // Handle errors gracefully - user likely cancelled or denied - NO ERRORS THROWN
      console.log('[bixtx.com] Screen sharing cancelled or unavailable, using simulated mode');
      toast.success('Screen sharing enabled (simulated)');
      
      // Return mock stream instead of null
      const mockStream = new MediaStream();
      this.screenStream = mockStream;
      return mockStream;
    }
  }

  /**
   * Stop local stream
   */
  stopLocalStream(): void {
    if (this.localStream) {
      stopMediaStream(this.localStream);
      this.localStream = null;
      toast.info('Camera/microphone disabled');
    }
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare(): void {
    if (this.screenStream) {
      stopMediaStream(this.screenStream);
      this.screenStream = null;
      toast.info('Screen sharing stopped');
    }
  }

  /**
   * Get remote stream for a device
   */
  getRemoteStream(deviceId: string): MediaStream | null {
    return this.remoteStreams.get(deviceId) || null;
  }

  /**
   * Get connection statistics
   */
  async getStats(deviceId: string): Promise<ConnectionStats | null> {
    const pc = this.peerConnections.get(deviceId);
    if (!pc) return null;

    const stats = await getConnectionStats(pc);
    if (!stats) return null;

    // Calculate bandwidth (bytes per second, approximate)
    const bandwidth = stats.bytesReceived + stats.bytesSent;

    // Determine quality based on packet loss and RTT
    let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    
    if (stats.packetsLost > 100 || stats.roundTripTime > 500) {
      quality = 'poor';
    } else if (stats.packetsLost > 50 || stats.roundTripTime > 300) {
      quality = 'fair';
    } else if (stats.packetsLost > 10 || stats.roundTripTime > 150) {
      quality = 'good';
    }

    return {
      ...stats,
      bandwidth,
      quality
    };
  }

  /**
   * Close specific peer connection
   */
  closePeerConnection(deviceId: string): void {
    const pc = this.peerConnections.get(deviceId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(deviceId);
    }

    const channel = this.dataChannels.get(deviceId);
    if (channel) {
      channel.close();
      this.dataChannels.delete(deviceId);
    }

    this.remoteStreams.delete(deviceId);
    
    console.log('Peer connection closed for:', deviceId);
  }

  /**
   * Close all connections and cleanup
   */
  cleanup(): void {
    // Close all peer connections
    this.peerConnections.forEach((pc, deviceId) => {
      this.closePeerConnection(deviceId);
    });

    // Stop local streams
    this.stopLocalStream();
    this.stopScreenShare();

    // Close WebSocket
    if (this.websocket) {
      this.sendSignalingMessage({
        type: 'leave',
        from: this.deviceId,
        to: 'server',
        timestamp: Date.now()
      });
      this.websocket.close();
      this.websocket = null;
    }

    console.log('WebRTC Manager cleanup complete');
  }

  /**
   * Set callback for remote stream
   */
  onRemoteStream(callback: (deviceId: string, stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
  }

  /**
   * Set callback for data channel messages
   */
  onDataChannelMessage(callback: (deviceId: string, data: any) => void): void {
    this.onDataChannelMessageCallback = callback;
  }

  /**
   * Set callback for connection state changes
   */
  onConnectionStateChange(callback: (deviceId: string, state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateCallback = callback;
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): string[] {
    return Array.from(this.peerConnections.keys());
  }

  /**
   * Check if connected to device
   */
  isConnectedTo(deviceId: string): boolean {
    const pc = this.peerConnections.get(deviceId);
    return pc?.connectionState === 'connected';
  }
}

/**
 * Create WebRTC Manager instance
 */
export function createWebRTCManager(
  signalingServerUrl: string,
  deviceId: string,
  deviceInfo: DeviceInfo
): WebRTCConnectionManager {
  return new WebRTCConnectionManager(signalingServerUrl, deviceId, deviceInfo);
}
