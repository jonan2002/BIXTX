import { useState } from 'react';
import { Network, Monitor, Smartphone, Lock, Key, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';

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

interface AddDeviceByIPProps {
  onDeviceAdded: (device: Device) => void;
  onCancel: () => void;
}

export function AddDeviceByIP({ onDeviceAdded, onCancel }: AddDeviceByIPProps) {
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState('5938');
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState<'desktop' | 'mobile'>('desktop');
  const [useAuthentication, setUseAuthentication] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate IP address format
  const validateIP = (ip: string): boolean => {
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  const validatePort = (portNum: string): boolean => {
    const port = parseInt(portNum);
    return !isNaN(port) && port >= 1 && port <= 65535;
  };

  const handleTestConnection = async () => {
    const newErrors: Record<string, string> = {};

    // Validation
    if (!ipAddress) {
      newErrors.ipAddress = 'IP address is required';
    } else if (!validateIP(ipAddress)) {
      newErrors.ipAddress = 'Invalid IP address format';
    }

    if (!port) {
      newErrors.port = 'Port is required';
    } else if (!validatePort(port)) {
      newErrors.port = 'Port must be between 1 and 65535';
    }

    if (useAuthentication) {
      if (!accessCode) {
        newErrors.accessCode = 'Access code is required';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setConnectionStatus('testing');
    setIsConnecting(true);

    // Simulate connection test
    setTimeout(() => {
      const isSuccess = Math.random() > 0.3; // 70% success rate for demo
      
      if (isSuccess) {
        setConnectionStatus('success');
        toast.success('Connection test successful!');
      } else {
        setConnectionStatus('failed');
        toast.error('Connection failed. Please check the IP address and credentials.');
      }
      setIsConnecting(false);
    }, 2000);
  };

  const handleAddDevice = async () => {
    if (connectionStatus !== 'success') {
      toast.error('Please test the connection first');
      return;
    }

    setIsConnecting(true);

    // Simulate adding device
    setTimeout(() => {
      const newDevice: Device = {
        id: `dev-${Date.now()}`,
        name: deviceName || `Device at ${ipAddress}`,
        type: deviceType,
        os: deviceType === 'desktop' ? 'Unknown Desktop OS' : 'Unknown Mobile OS',
        status: 'online',
        ip: ipAddress,
        lastSeen: 'Now',
        performance: 85,
        cpu: 34,
        memory: 56,
        health: 'good'
      };

      onDeviceAdded(newDevice);
      toast.success(`Device ${newDevice.name} added successfully!`);
      setIsConnecting(false);
    }, 1500);
  };

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'testing':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Testing Connection
          </Badge>
        );
      case 'success':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Check className="w-3 h-3 mr-1" />
            Connection Successful
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Connection Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      {connectionStatus !== 'idle' && (
        <div className="flex justify-center">
          {getConnectionStatusBadge()}
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* Device Information */}
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <h3 className="text-white mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-cyan-400" />
            Device Information
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="deviceName" className="text-slate-300 mb-2">
                Device Name (Optional)
              </Label>
              <Input
                id="deviceName"
                placeholder="e.g., Office Workstation"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="deviceType" className="text-slate-300 mb-2">
                Device Type
              </Label>
              <Select value={deviceType} onValueChange={(value: 'desktop' | 'mobile') => setDeviceType(value)}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="desktop" className="text-white">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Desktop / Laptop
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile" className="text-white">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Mobile / Tablet
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Network Configuration */}
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <h3 className="text-white mb-4 flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-400" />
            Network Configuration
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="ipAddress" className="text-slate-300 mb-2">
                IP Address *
              </Label>
              <Input
                id="ipAddress"
                placeholder="192.168.1.100"
                value={ipAddress}
                onChange={(e) => {
                  setIpAddress(e.target.value);
                  if (errors.ipAddress) {
                    setErrors({ ...errors, ipAddress: '' });
                  }
                  setConnectionStatus('idle');
                }}
                className={`bg-slate-900 border-slate-700 text-white ${errors.ipAddress ? 'border-red-500' : ''}`}
              />
              {errors.ipAddress && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.ipAddress}
                </p>
              )}
              <p className="text-slate-500 text-xs mt-1">IPv4 format: 192.168.1.100</p>
            </div>

            <div>
              <Label htmlFor="port" className="text-slate-300 mb-2">
                Port *
              </Label>
              <Input
                id="port"
                placeholder="5938"
                value={port}
                onChange={(e) => {
                  setPort(e.target.value);
                  if (errors.port) {
                    setErrors({ ...errors, port: '' });
                  }
                  setConnectionStatus('idle');
                }}
                className={`bg-slate-900 border-slate-700 text-white ${errors.port ? 'border-red-500' : ''}`}
              />
              {errors.port && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.port}
                </p>
              )}
              <p className="text-slate-500 text-xs mt-1">Default bixtx.com port: 5938</p>
            </div>
          </div>
        </Card>

        {/* Authentication */}
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              Authentication
            </h3>
            <Badge className={useAuthentication ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-700 text-slate-400'}>
              {useAuthentication ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-300 text-sm">Require authentication</span>
              <button
                onClick={() => setUseAuthentication(!useAuthentication)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useAuthentication ? 'bg-cyan-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useAuthentication ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {useAuthentication && (
              <>
                <div>
                  <Label htmlFor="accessCode" className="text-slate-300 mb-2">
                    Access Code *
                  </Label>
                  <Input
                    id="accessCode"
                    type="password"
                    placeholder="Enter device access code"
                    value={accessCode}
                    onChange={(e) => {
                      setAccessCode(e.target.value);
                      if (errors.accessCode) {
                        setErrors({ ...errors, accessCode: '' });
                      }
                      setConnectionStatus('idle');
                    }}
                    className={`bg-slate-900 border-slate-700 text-white ${errors.accessCode ? 'border-red-500' : ''}`}
                  />
                  {errors.accessCode && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.accessCode}
                    </p>
                  )}
                  <p className="text-slate-500 text-xs mt-1">6-digit code from target device</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username" className="text-slate-300 mb-2">
                      Username (Optional)
                    </Label>
                    <Input
                      id="username"
                      placeholder="admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-slate-300 mb-2">
                      Password (Optional)
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Connection Info */}
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/30 p-4">
          <h3 className="text-white mb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            Connection Steps
          </h3>
          <ol className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">1.</span>
              <span>Ensure bixtx.com is installed on the target device</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">2.</span>
              <span>Verify both devices are on the same network or accessible</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">3.</span>
              <span>Get the access code from the target device settings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">4.</span>
              <span>Test connection before adding to dashboard</span>
            </li>
          </ol>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleTestConnection}
          disabled={isConnecting || !ipAddress || !port}
          className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50"
        >
          {isConnecting && connectionStatus === 'testing' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Network className="w-4 h-4 mr-2" />
              Test Connection
            </>
          )}
        </Button>
        
        <Button
          onClick={handleAddDevice}
          disabled={isConnecting || connectionStatus !== 'success'}
          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
        >
          {isConnecting && connectionStatus === 'success' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Add Device
            </>
          )}
        </Button>
      </div>

      <Button
        onClick={onCancel}
        variant="outline"
        className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
      >
        Cancel
      </Button>
    </div>
  );
}