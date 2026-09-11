import { useState } from 'react';
import { 
  WifiOff, 
  Camera, 
  Mic,
  Image as ImageIcon,
  HardDrive,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Settings,
  Shield,
  Zap,
  Cloud
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import { toast } from 'sonner@2.0.3';

interface OfflineRecording {
  id: string;
  deviceName: string;
  type: 'video' | 'audio' | 'photo';
  size: string;
  timestamp: string;
  status: 'pending' | 'uploading' | 'completed';
  progress: number;
}

export function OfflineRecording() {
  const [offlineMode, setOfflineMode] = useState(true);
  const [recordVideo, setRecordVideo] = useState(true);
  const [recordAudio, setRecordAudio] = useState(true);
  const [capturePhotos, setCapturePhotos] = useState(true);
  const [autoUpload, setAutoUpload] = useState(true);
  const [smartStorage, setSmartStorage] = useState(true);

  const [recordings] = useState<OfflineRecording[]>([
    {
      id: 'rec-001',
      deviceName: 'Samsung Galaxy S23',
      type: 'video',
      size: '125 MB',
      timestamp: '2 hours ago',
      status: 'uploading',
      progress: 67
    },
    {
      id: 'rec-002',
      deviceName: 'iPhone 15 Pro',
      type: 'audio',
      size: '45 MB',
      timestamp: '3 hours ago',
      status: 'completed',
      progress: 100
    },
    {
      id: 'rec-003',
      deviceName: 'Samsung Galaxy S23',
      type: 'photo',
      size: '12 MB',
      timestamp: '4 hours ago',
      status: 'pending',
      progress: 0
    },
    {
      id: 'rec-004',
      deviceName: 'MacBook Pro',
      type: 'video',
      size: '280 MB',
      timestamp: '5 hours ago',
      status: 'uploading',
      progress: 34
    }
  ]);

  const handleToggleOfflineMode = (checked: boolean) => {
    setOfflineMode(checked);
    toast.success(
      checked ? 'Offline Recording Enabled' : 'Offline Recording Disabled',
      { description: checked ? 'Devices will record even when offline' : 'Offline recording has been turned off' }
    );
  };

  const handleRetryUpload = (recordingId: string) => {
    toast.info('Upload Retry', {
      description: 'Attempting to upload recording...'
    });
  };

  const pendingCount = recordings.filter(r => r.status === 'pending').length;
  const uploadingCount = recordings.filter(r => r.status === 'uploading').length;
  const completedCount = recordings.filter(r => r.status === 'completed').length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-white mb-2">Offline Recording Features</h1>
        <p className="text-slate-400">Continuous monitoring even when devices are offline</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Pending</p>
              <p className="text-2xl text-white">{pendingCount}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Upload className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Uploading</p>
              <p className="text-2xl text-white">{uploadingCount}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Completed</p>
              <p className="text-2xl text-white">{completedCount}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <HardDrive className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Size</p>
              <p className="text-2xl text-white">462 MB</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Offline Recording Settings */}
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <WifiOff className="w-6 h-6 text-orange-400" />
              <h2 className="text-xl text-white">Offline Recording Settings</h2>
            </div>
            <Badge className={offlineMode ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}>
              {offlineMode ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-white mb-1">Enable Offline Recording</p>
                <p className="text-sm text-slate-400">Record when device loses connection</p>
              </div>
              <Switch
                checked={offlineMode}
                onCheckedChange={handleToggleOfflineMode}
              />
            </div>

            {offlineMode && (
              <>
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">Continuous Monitoring</p>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Camera className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="text-white">Video Recording</p>
                        <p className="text-xs text-slate-400">Capture video feed</p>
                      </div>
                    </div>
                    <Switch
                      checked={recordVideo}
                      onCheckedChange={setRecordVideo}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mic className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-white">Audio Recording</p>
                        <p className="text-xs text-slate-400">Capture microphone input</p>
                      </div>
                    </div>
                    <Switch
                      checked={recordAudio}
                      onCheckedChange={setRecordAudio}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-white">Photo Capture</p>
                        <p className="text-xs text-slate-400">Take screenshots periodically</p>
                      </div>
                    </div>
                    <Switch
                      checked={capturePhotos}
                      onCheckedChange={setCapturePhotos}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Upload className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="text-white">Auto-Upload</p>
                        <p className="text-xs text-slate-400">Upload when device comes online</p>
                      </div>
                    </div>
                    <Switch
                      checked={autoUpload}
                      onCheckedChange={setAutoUpload}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-white">Smart Storage</p>
                        <p className="text-xs text-slate-400">Auto compression and cleanup</p>
                      </div>
                    </div>
                    <Switch
                      checked={smartStorage}
                      onCheckedChange={setSmartStorage}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Security Features */}
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl text-white">Security Features</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white mb-1">Encrypted Storage</p>
                <p className="text-sm text-slate-400">AES-256 encryption for local files</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white mb-1">Encrypted Transfer</p>
                <p className="text-sm text-slate-400">End-to-end encryption for uploads</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white mb-1">Bandwidth Optimization</p>
                <p className="text-sm text-slate-400">Smart scheduling to avoid congestion</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Cloud className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white mb-1">Cloud Backup</p>
                <p className="text-sm text-slate-400">Automatic redundant backups</p>
              </div>
            </div>

            <div className="pt-4 border-t border-cyan-500/30">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Encryption Status</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <p className="text-white">Military-Grade Active</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Uploads */}
      <Card className="bg-slate-900 border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl text-white">Offline Recordings Queue</h2>
          </div>
          <Button
            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
          >
            Upload All
          </Button>
        </div>

        <div className="space-y-4">
          {recordings.map((recording) => (
            <div key={recording.id} className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg">
              <div className={`p-3 rounded-lg ${
                recording.type === 'video' ? 'bg-cyan-500/20' :
                recording.type === 'audio' ? 'bg-green-500/20' : 'bg-purple-500/20'
              }`}>
                {recording.type === 'video' && <Camera className="w-5 h-5 text-cyan-400" />}
                {recording.type === 'audio' && <Mic className="w-5 h-5 text-green-400" />}
                {recording.type === 'photo' && <ImageIcon className="w-5 h-5 text-purple-400" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white">{recording.deviceName}</p>
                    <p className="text-sm text-slate-400">{recording.type.toUpperCase()} • {recording.size} • {recording.timestamp}</p>
                  </div>
                  <Badge className={
                    recording.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    recording.status === 'uploading' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                    'bg-orange-500/20 text-orange-400 border-orange-500/30'
                  }>
                    {recording.status === 'uploading' && <Upload className="w-3 h-3 mr-1" />}
                    {recording.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {recording.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                    {recording.status.toUpperCase()}
                  </Badge>
                </div>

                {recording.status === 'uploading' && (
                  <div>
                    <Progress value={recording.progress} className="h-2" />
                    <p className="text-xs text-slate-400 mt-1">{recording.progress}% complete</p>
                  </div>
                )}
              </div>

              {recording.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => handleRetryUpload(recording.id)}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
