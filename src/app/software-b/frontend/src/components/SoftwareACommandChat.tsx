/**
 * Software A Command Chat
 * Admin-to-Software A direct communication interface
 * Human admin sends commands/directives to Software A during monitoring
 */

import React, { useState, useEffect, useRef } from 'react';

interface SoftwareACommandChatProps {
  deviceId: string;
  deviceName: string;
  isConnected: boolean;
  onClose?: () => void;
}

interface Message {
  id: string;
  sender: 'admin' | 'software-a';
  content: string;
  timestamp: Date;
  type: 'command' | 'response' | 'status' | 'error';
  commandId?: string;
}

interface CommandSuggestion {
  command: string;
  description: string;
  category: 'monitoring' | 'control' | 'system' | 'file' | 'network';
}

export const SoftwareACommandChat: React.FC<SoftwareACommandChatProps> = ({
  deviceId,
  deviceName,
  isConnected,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Command suggestions
  const commandSuggestions: CommandSuggestion[] = [
    // Monitoring Commands
    { command: '/screenshot', description: 'Capture current screen', category: 'monitoring' },
    { command: '/camera on', description: 'Enable camera feed', category: 'monitoring' },
    { command: '/camera off', description: 'Disable camera feed', category: 'monitoring' },
    { command: '/mic on', description: 'Enable microphone', category: 'monitoring' },
    { command: '/mic off', description: 'Disable microphone', category: 'monitoring' },
    { command: '/record start', description: 'Start screen recording', category: 'monitoring' },
    { command: '/record stop', description: 'Stop screen recording', category: 'monitoring' },
    
    // Control Commands
    { command: '/mouse lock', description: 'Lock mouse input', category: 'control' },
    { command: '/mouse unlock', description: 'Unlock mouse input', category: 'control' },
    { command: '/keyboard lock', description: 'Lock keyboard input', category: 'control' },
    { command: '/keyboard unlock', description: 'Unlock keyboard input', category: 'control' },
    { command: '/screen lock', description: 'Lock device screen', category: 'control' },
    { command: '/screen unlock', description: 'Unlock device screen', category: 'control' },
    
    // System Commands
    { command: '/status', description: 'Get Software A status', category: 'system' },
    { command: '/sysinfo', description: 'Get system information', category: 'system' },
    { command: '/processes', description: 'List running processes', category: 'system' },
    { command: '/cpu', description: 'Get CPU usage', category: 'system' },
    { command: '/memory', description: 'Get memory usage', category: 'system' },
    { command: '/disk', description: 'Get disk usage', category: 'system' },
    { command: '/restart', description: 'Restart Software A', category: 'system' },
    
    // File Commands
    { command: '/files list', description: 'List files in directory', category: 'file' },
    { command: '/files download', description: 'Download file from device', category: 'file' },
    { command: '/files upload', description: 'Upload file to device', category: 'file' },
    { command: '/files delete', description: 'Delete file', category: 'file' },
    
    // Network Commands
    { command: '/network status', description: 'Get network status', category: 'network' },
    { command: '/connections', description: 'Show active connections', category: 'network' },
    { command: '/ping', description: 'Test connectivity', category: 'network' },
  ];

  useEffect(() => {
    // Add initial welcome message
    addMessage({
      sender: 'software-a',
      content: `Software A Link connected on ${deviceName}. Ready to receive commands.`,
      type: 'status',
    });

    // Add system status
    setTimeout(() => {
      addMessage({
        sender: 'software-a',
        content: 'System Status: All modules operational. Type /help for available commands.',
        type: 'status',
      });
    }, 500);
  }, [deviceId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (msg: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...msg,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendCommand = async () => {
    if (!command.trim() || !isConnected) return;

    const commandText = command.trim();
    setCommand('');
    setIsProcessing(true);

    // Add admin command to chat
    addMessage({
      sender: 'admin',
      content: commandText,
      type: 'command',
      commandId: Date.now().toString(),
    });

    // Simulate command processing
    setTimeout(() => {
      handleCommandResponse(commandText);
      setIsProcessing(false);
    }, 800);
  };

  const handleCommandResponse = (cmd: string) => {
    const lowerCmd = cmd.toLowerCase();

    // Help command
    if (lowerCmd === '/help' || lowerCmd === 'help') {
      addMessage({
        sender: 'software-a',
        content: `Available Commands:\n\n📊 Monitoring:\n/screenshot - Capture screen\n/camera on/off - Control camera\n/mic on/off - Control microphone\n/record start/stop - Control recording\n\n🎮 Control:\n/mouse lock/unlock - Control mouse\n/keyboard lock/unlock - Control keyboard\n/screen lock/unlock - Control screen\n\n⚙️ System:\n/status - Get status\n/sysinfo - System info\n/processes - Running processes\n/cpu, /memory, /disk - Usage stats\n\n📁 Files:\n/files list - List files\n/files download - Download files\n\n🌐 Network:\n/network status - Network info\n/connections - Active connections\n\nType any command to execute.`,
        type: 'response',
      });
      return;
    }

    // Screenshot
    if (lowerCmd === '/screenshot') {
      addMessage({
        sender: 'software-a',
        content: '📸 Screenshot captured successfully.\nResolution: 1920x1080\nSize: 1.2 MB\nSaved to: /screenshots/capture_001.png',
        type: 'response',
      });
      return;
    }

    // Camera control
    if (lowerCmd === '/camera on') {
      addMessage({
        sender: 'software-a',
        content: '📹 Camera enabled.\nResolution: 1280x720\nFPS: 30\nStatus: Streaming active',
        type: 'response',
      });
      return;
    }

    if (lowerCmd === '/camera off') {
      addMessage({
        sender: 'software-a',
        content: '📹 Camera disabled.\nStream stopped.',
        type: 'response',
      });
      return;
    }

    // Microphone control
    if (lowerCmd === '/mic on') {
      addMessage({
        sender: 'software-a',
        content: '🎤 Microphone enabled.\nSample Rate: 48kHz\nChannels: Stereo\nStatus: Recording active',
        type: 'response',
      });
      return;
    }

    if (lowerCmd === '/mic off') {
      addMessage({
        sender: 'software-a',
        content: '🎤 Microphone disabled.\nRecording stopped.',
        type: 'response',
      });
      return;
    }

    // Recording control
    if (lowerCmd === '/record start') {
      addMessage({
        sender: 'software-a',
        content: '⏺️ Screen recording started.\nCodec: H.264\nQuality: High\nOutput: /recordings/session_001.mp4',
        type: 'response',
      });
      return;
    }

    if (lowerCmd === '/record stop') {
      addMessage({
        sender: 'software-a',
        content: '⏹️ Recording stopped.\nDuration: 5m 32s\nSize: 42.3 MB\nFile saved successfully.',
        type: 'response',
      });
      return;
    }

    // Mouse/Keyboard control
    if (lowerCmd === '/mouse lock') {
      addMessage({
        sender: 'software-a',
        content: '🖱️ Mouse input locked.\nUser cannot move mouse.',
        type: 'response',
      });
      return;
    }

    if (lowerCmd === '/mouse unlock') {
      addMessage({
        sender: 'software-a',
        content: '🖱️ Mouse input unlocked.\nUser control restored.',
        type: 'response',
      });
      return;
    }

    if (lowerCmd === '/keyboard lock') {
      addMessage({
        sender: 'software-a',
        content: '⌨️ Keyboard input locked.\nUser cannot type.',
        type: 'response',
      });
      return;
    }

    if (lowerCmd === '/keyboard unlock') {
      addMessage({
        sender: 'software-a',
        content: '⌨️ Keyboard input unlocked.\nUser control restored.',
        type: 'response',
      });
      return;
    }

    // Screen lock
    if (lowerCmd === '/screen lock') {
      addMessage({
        sender: 'software-a',
        content: '🔒 Screen locked.\nDevice is now locked.\nUser must authenticate to unlock.',
        type: 'response',
      });
      return;
    }

    if (lowerCmd === '/screen unlock') {
      addMessage({
        sender: 'software-a',
        content: '🔓 Screen unlocked.\nDevice is now accessible.',
        type: 'response',
      });
      return;
    }

    // System status
    if (lowerCmd === '/status') {
      addMessage({
        sender: 'software-a',
        content: `✅ Software A Status Report:\n\n🔗 Connection: Active\n⚡ Mode: Stealth\n🛡️ Protection: Enabled\n📡 Server: Connected\n⏱️ Uptime: 12h 34m\n💾 Memory: 24.5 MB\n🔄 Last Update: 2m ago\n\nAll systems operational.`,
        type: 'response',
      });
      return;
    }

    // System info
    if (lowerCmd === '/sysinfo') {
      addMessage({
        sender: 'software-a',
        content: `💻 System Information:\n\nOS: Windows 11 Pro\nVersion: 22H2 (Build 22621)\nArchitecture: x64\nProcessor: Intel Core i7-12700K\nCores: 12 (8P+4E)\nRAM: 32 GB DDR5\nGPU: NVIDIA RTX 3080\nDisk: 1TB NVMe SSD\nNetwork: Ethernet 1Gbps\nHostname: ${deviceName}\nIP: 192.168.1.105\nMAC: 00:1B:63:84:45:E6`,
        type: 'response',
      });
      return;
    }

    // Processes
    if (lowerCmd === '/processes') {
      addMessage({
        sender: 'software-a',
        content: `⚙️ Running Processes (Top 5):\n\n1. chrome.exe - 450 MB\n2. explorer.exe - 120 MB\n3. Code.exe - 380 MB\n4. discord.exe - 250 MB\n5. spotify.exe - 180 MB\n\nTotal Processes: 127\nTotal Threads: 2,450`,
        type: 'response',
      });
      return;
    }

    // CPU usage
    if (lowerCmd === '/cpu') {
      addMessage({
        sender: 'software-a',
        content: `🔥 CPU Usage:\n\nCurrent: 34%\nAverage (5m): 28%\nPeak: 67%\nTemperature: 52°C\n\nTop Consumers:\n1. chrome.exe - 12%\n2. Code.exe - 8%\n3. System - 5%`,
        type: 'response',
      });
      return;
    }

    // Memory usage
    if (lowerCmd === '/memory') {
      addMessage({
        sender: 'software-a',
        content: `💾 Memory Usage:\n\nTotal: 32 GB\nUsed: 18.5 GB (58%)\nAvailable: 13.5 GB\nCommitted: 24.2 GB\nCached: 4.2 GB\n\nTop Consumers:\n1. chrome.exe - 3.8 GB\n2. Code.exe - 2.1 GB\n3. discord.exe - 1.5 GB`,
        type: 'response',
      });
      return;
    }

    // Disk usage
    if (lowerCmd === '/disk') {
      addMessage({
        sender: 'software-a',
        content: `💿 Disk Usage:\n\nC:\\ (System)\nTotal: 1 TB\nUsed: 456 GB (45%)\nFree: 544 GB\nType: NVMe SSD\n\nD:\\ (Data)\nTotal: 2 TB\nUsed: 1.2 TB (60%)\nFree: 800 GB\nType: HDD`,
        type: 'response',
      });
      return;
    }

    // Network status
    if (lowerCmd === '/network status') {
      addMessage({
        sender: 'software-a',
        content: `🌐 Network Status:\n\nConnection: Active\nType: Ethernet\nSpeed: 1 Gbps\nIP: 192.168.1.105\nGateway: 192.168.1.1\nDNS: 8.8.8.8, 8.8.4.4\n\nTraffic:\nDownload: 245 Mbps\nUpload: 89 Mbps\nLatency: 12ms`,
        type: 'response',
      });
      return;
    }

    // Connections
    if (lowerCmd === '/connections') {
      addMessage({
        sender: 'software-a',
        content: `🔌 Active Connections:\n\n1. chrome.exe → google.com:443\n2. discord.exe → discord.gg:443\n3. spotify.exe → spotify.com:443\n4. bixtx-link.exe → api.bixtx.com:8443\n\nTotal: 47 connections\nListening Ports: 8`,
        type: 'response',
      });
      return;
    }

    // Ping
    if (lowerCmd === '/ping') {
      addMessage({
        sender: 'software-a',
        content: `🏓 Connectivity Test:\n\nPinging api.bixtx.com...\n\nReply from 104.21.45.87: time=12ms\nReply from 104.21.45.87: time=11ms\nReply from 104.21.45.87: time=13ms\nReply from 104.21.45.87: time=12ms\n\nAverage: 12ms\nPacket Loss: 0%\nConnection: Excellent`,
        type: 'response',
      });
      return;
    }

    // Files list
    if (lowerCmd.startsWith('/files list')) {
      addMessage({
        sender: 'software-a',
        content: `📁 Files in C:\\Users\\Admin\\Documents:\n\n1. report.pdf - 2.3 MB\n2. presentation.pptx - 8.4 MB\n3. data.xlsx - 1.1 MB\n4. notes.txt - 45 KB\n5. image.png - 3.2 MB\n\nTotal: 23 files, 5 folders\nSize: 152 MB`,
        type: 'response',
      });
      return;
    }

    // Restart
    if (lowerCmd === '/restart') {
      addMessage({
        sender: 'software-a',
        content: '🔄 Restarting Software A Link...\nShutting down modules...\nReconnecting in 5 seconds...',
        type: 'status',
      });
      setTimeout(() => {
        addMessage({
          sender: 'software-a',
          content: '✅ Software A Link restarted successfully.\nAll modules operational.',
          type: 'status',
        });
      }, 5000);
      return;
    }

    // Unknown command
    addMessage({
      sender: 'software-a',
      content: `❌ Unknown command: "${cmd}"\n\nType /help to see available commands.`,
      type: 'error',
    });
  };

  const insertSuggestion = (suggestion: string) => {
    setCommand(suggestion);
    setShowSuggestions(false);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'monitoring': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'control': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'system': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'file': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'network': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const filteredSuggestions = commandSuggestions.filter(s =>
    s.command.toLowerCase().includes(command.toLowerCase()) ||
    s.description.toLowerCase().includes(command.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-xl">🛡️</span>
          </div>
          <div>
            <h3 className="font-semibold text-white">Software A Command Console</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <p className="text-sm text-gray-400">{deviceName}</p>
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Connection Status Bar */}
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <span className="text-green-400">● Connected</span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">Latency: 12ms</span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">Encryption: AES-256</span>
          </div>
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            📋 Command List
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${msg.sender === 'admin' ? 'order-2' : 'order-1'}`}>
              {/* Sender Info */}
              <div className={`flex items-center space-x-2 mb-1 ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'software-a' && (
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-xs">🛡️</span>
                  </div>
                )}
                <span className={`text-xs font-medium ${
                  msg.sender === 'admin' ? 'text-cyan-400' : 'text-purple-400'
                }`}>
                  {msg.sender === 'admin' ? 'Admin' : 'Software A'}
                </span>
                {msg.sender === 'admin' && (
                  <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-xs">👤</span>
                  </div>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-lg px-4 py-3 ${
                  msg.sender === 'admin'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                    : msg.type === 'error'
                    ? 'bg-red-900/50 text-red-200 border border-red-700'
                    : msg.type === 'status'
                    ? 'bg-gray-800 text-gray-300 border border-gray-700'
                    : 'bg-gray-800 text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{msg.content}</p>
                <p className="text-xs mt-2 opacity-70">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-xs">🛡️</span>
                </div>
                <span className="text-xs font-medium text-purple-400">Software A</span>
              </div>
              <div className="bg-gray-800 rounded-lg px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-400">Processing command...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Command Suggestions Panel */}
      {showSuggestions && (
        <div className="border-t border-gray-800 bg-gray-800 max-h-64 overflow-y-auto">
          <div className="p-4">
            <h4 className="text-sm font-semibold text-white mb-3">Available Commands</h4>
            <div className="space-y-2">
              {commandSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => insertSuggestion(suggestion.command)}
                  className="w-full text-left p-3 rounded-lg bg-gray-900 hover:bg-gray-700 transition-colors border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-sm font-mono text-cyan-400">{suggestion.command}</code>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryColor(suggestion.category)}`}>
                      {suggestion.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{suggestion.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendCommand()}
            placeholder="Enter command (type /help for commands)..."
            disabled={!isConnected}
            className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendCommand}
            disabled={!isConnected || !command.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        {filteredSuggestions.length > 0 && command && !showSuggestions && (
          <div className="mt-2 text-xs text-gray-400">
            💡 {filteredSuggestions.length} matching command{filteredSuggestions.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>
    </div>
  );
};
