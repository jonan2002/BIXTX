import { useState } from 'react';
import { 
  HardDrive, 
  FolderOpen, 
  Cloud,
  Server,
  Trash2,
  Settings,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Database,
  Save,
  RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { toast } from 'sonner@2.0.3';

export function StorageSettings() {
  const [localPath, setLocalPath] = useState('/Recordings');
  const [cloudEnabled, setCloudEnabled] = useState(true);
  const [autoCleanup, setAutoCleanup] = useState(true);
  const [compressionLevel, setCompressionLevel] = useState([70]);
  const [retentionDays, setRetentionDays] = useState([30]);
  const [autoUpload, setAutoUpload] = useState(true);
  const [encryptStorage, setEncryptStorage] = useState(true);

  const handleSaveSettings = () => {
    toast.success('Settings Saved', {
      description: 'Storage configuration has been updated successfully'
    });
  };

  const handleBrowseFolder = () => {
    toast.info('Select Folder', {
      description: 'Opening file browser...'
    });
  };

  const handleCleanupNow = () => {
    toast.success('Cleanup Started', {
      description: 'Removing old recordings and optimizing storage...'
    });
  };

  const handleTestConnection = () => {
    toast.success('Connection Successful', {
      description: 'Cloud storage is accessible and ready'
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-white mb-2">Storage Settings</h1>
        <p className="text-slate-400">Configure where monitored recordings are saved</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <HardDrive className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Local Storage</p>
                <p className="text-2xl text-white">245 GB</p>
              </div>
            </div>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div className="h-full w-[45%] bg-gradient-to-r from-cyan-500 to-blue-600"></div>
          </div>
          <p className="text-xs text-slate-400">45% of 500 GB used</p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Cloud className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Cloud Storage</p>
                <p className="text-2xl text-white">1.2 TB</p>
              </div>
            </div>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div className="h-full w-[24%] bg-gradient-to-r from-purple-500 to-pink-600"></div>
          </div>
          <p className="text-xs text-slate-400">24% of 5 TB used</p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Database className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Recordings</p>
                <p className="text-2xl text-white">2,847</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span>All synced</span>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Local Storage Settings */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <HardDrive className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl text-white">Local Storage</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Recording Path</label>
              <div className="flex items-center gap-3">
                <Input
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  className="flex-1 bg-slate-800 border-slate-700 text-white"
                  placeholder="/path/to/recordings"
                />
                <Button
                  onClick={handleBrowseFolder}
                  variant="outline"
                  className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Browse
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Current path: {localPath}
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-white mb-1">Auto Cleanup</p>
                <p className="text-sm text-slate-400">Automatically delete old recordings</p>
              </div>
              <Switch
                checked={autoCleanup}
                onCheckedChange={setAutoCleanup}
              />
            </div>

            {autoCleanup && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-400">Retention Period</label>
                  <span className="text-white">{retentionDays[0]} days</span>
                </div>
                <Slider
                  value={retentionDays}
                  onValueChange={setRetentionDays}
                  min={7}
                  max={90}
                  step={1}
                  className="cursor-pointer"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Recordings older than {retentionDays[0]} days will be automatically deleted
                </p>
              </div>
            )}

            <Button
              onClick={handleCleanupNow}
              variant="outline"
              className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Run Cleanup Now
            </Button>
          </div>
        </Card>

        {/* Cloud Storage Settings */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Cloud className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl text-white">Cloud Dashboard</h2>
            </div>
            <Badge className={cloudEnabled ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}>
              {cloudEnabled ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-white mb-1">Cloud Sync</p>
                <p className="text-sm text-slate-400">Sync recordings to cloud storage</p>
              </div>
              <Switch
                checked={cloudEnabled}
                onCheckedChange={setCloudEnabled}
              />
            </div>

            {cloudEnabled && (
              <>
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-white mb-1">Auto Upload</p>
                    <p className="text-sm text-slate-400">Upload recordings when online</p>
                  </div>
                  <Switch
                    checked={autoUpload}
                    onCheckedChange={setAutoUpload}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-white mb-1">Encrypted Transfer</p>
                    <p className="text-sm text-slate-400">Military-grade encryption for uploads</p>
                  </div>
                  <Switch
                    checked={encryptStorage}
                    onCheckedChange={setEncryptStorage}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-br from-purple-500/10 to-blue-600/10 border border-purple-500/30 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Upload Speed</p>
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-green-400" />
                      <p className="text-white">12.4 MB/s</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Download Speed</p>
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-cyan-400" />
                      <p className="text-white">45.2 MB/s</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleTestConnection}
                  variant="outline"
                  className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                >
                  <Server className="w-4 h-4 mr-2" />
                  Test Connection
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Compression Settings */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl text-white">Compression & Optimization</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-400">Compression Level</label>
                <span className="text-white">{compressionLevel[0]}%</span>
              </div>
              <Slider
                value={compressionLevel}
                onValueChange={setCompressionLevel}
                min={0}
                max={100}
                step={10}
                className="cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-2">
                Higher compression = smaller files but longer processing time
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Videos</p>
                <p className="text-white">H.264</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Audio</p>
                <p className="text-white">AAC</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Images</p>
                <p className="text-white">JPEG</p>
              </div>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-white">Bandwidth Optimization Active</p>
                  <p className="text-sm text-slate-400">Intelligent upload scheduling to avoid congestion</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          <Button
            variant="outline"
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSaveSettings}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
