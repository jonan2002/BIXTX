import { useState } from 'react';
import { Monitor, Video, Mic, Download, Trash2, Play, Pause, Circle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';

interface Recording {
  id: string;
  type: 'screen' | 'camera' | 'audio';
  name: string;
  duration: string;
  size: string;
  timestamp: string;
  format: string;
  status: 'recording' | 'completed';
}

interface RecordingsManagerProps {
  isScreenRecording: boolean;
  isCameraRecording: boolean;
  isAudioRecording: boolean;
}

export function RecordingsManager({
  isScreenRecording,
  isCameraRecording,
  isAudioRecording
}: RecordingsManagerProps) {
  const [recordings] = useState<Recording[]>([
    {
      id: '1',
      type: 'screen',
      name: 'Screen Recording - Device Control',
      duration: '00:05:23',
      size: '45.2 MB',
      timestamp: '2:30 PM',
      format: 'MP4',
      status: 'completed'
    },
    {
      id: '2',
      type: 'camera',
      name: 'Camera Recording - Surveillance',
      duration: '00:03:45',
      size: '28.5 MB',
      timestamp: '2:25 PM',
      format: 'MP4',
      status: 'completed'
    },
    {
      id: '3',
      type: 'audio',
      name: 'Audio Recording - Meeting',
      duration: '00:02:18',
      size: '3.2 MB',
      timestamp: '2:20 PM',
      format: 'MP3',
      status: 'completed'
    }
  ]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'screen':
        return <Monitor className="w-4 h-4 text-orange-400" />;
      case 'camera':
        return <Video className="w-4 h-4 text-cyan-400" />;
      case 'audio':
        return <Mic className="w-4 h-4 text-green-400" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'screen':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'camera':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'audio':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return '';
    }
  };

  const handleDownload = (recording: Recording) => {
    toast.success(`Downloading ${recording.name}`);
  };

  const handleDelete = (recording: Recording) => {
    toast.success(`Deleted ${recording.name}`);
  };

  const activeRecordings = [
    ...(isScreenRecording ? [{
      id: 'active-screen',
      type: 'screen' as const,
      name: 'Screen Recording - In Progress',
      duration: '00:05:23',
      size: '45.2 MB',
      timestamp: 'Now',
      format: 'MP4',
      status: 'recording' as const
    }] : []),
    ...(isCameraRecording ? [{
      id: 'active-camera',
      type: 'camera' as const,
      name: 'Camera Recording - In Progress',
      duration: '00:03:45',
      size: '28.5 MB',
      timestamp: 'Now',
      format: 'MP4',
      status: 'recording' as const
    }] : []),
    ...(isAudioRecording ? [{
      id: 'active-audio',
      type: 'audio' as const,
      name: 'Audio Recording - In Progress',
      duration: '00:02:18',
      size: '3.2 MB',
      timestamp: 'Now',
      format: 'MP3',
      status: 'recording' as const
    }] : [])
  ];

  const allRecordings = [...activeRecordings, ...recordings];
  const screenRecordings = allRecordings.filter(r => r.type === 'screen');
  const cameraRecordings = allRecordings.filter(r => r.type === 'camera');
  const audioRecordings = allRecordings.filter(r => r.type === 'audio');

  const RecordingsList = ({ items }: { items: Recording[] }) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400">No recordings available</p>
        </div>
      ) : (
        items.map((recording) => (
          <Card key={recording.id} className="bg-slate-800/50 border-slate-700 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {getTypeIcon(recording.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm text-white mb-1 truncate">{recording.name}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${getTypeColor(recording.type)} text-xs`}>
                        {recording.type.charAt(0).toUpperCase() + recording.type.slice(1)}
                      </Badge>
                      <span className="text-xs text-slate-400">{recording.format}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-400">{recording.timestamp}</span>
                    </div>
                  </div>
                  {recording.status === 'recording' && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 rounded-full">
                      <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
                      <span className="text-xs text-red-400">REC</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>Duration: {recording.duration}</span>
                    <span>Size: {recording.size}</span>
                  </div>
                </div>
                {recording.status === 'recording' ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full w-[65%] bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"></div>
                    </div>
                    <span className="text-xs text-slate-400">65%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(recording)}
                      className="h-7 text-xs bg-slate-900 border-slate-700"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(recording)}
                      className="h-7 text-xs bg-slate-900 border-slate-700 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-white mb-1">Recordings Manager</h3>
        <p className="text-xs text-slate-400">Manage all your screen, camera, and audio recordings</p>
      </div>

      {/* Active Recordings Summary */}
      {activeRecordings.length > 0 && (
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 mb-3">
            <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
            <span className="text-sm text-white">Active Recordings ({activeRecordings.length})</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {isScreenRecording && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <Monitor className="w-3 h-3 text-orange-400" />
                  <span className="text-xs text-orange-400">Screen</span>
                </div>
              </div>
            )}
            {isCameraRecording && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <Video className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs text-cyan-400">Camera</span>
                </div>
              </div>
            )}
            {isAudioRecording && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <Mic className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">Audio</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <TabsList className="w-full bg-slate-900 border-b border-slate-800 rounded-none px-4">
          <TabsTrigger value="all" className="data-[state=active]:bg-slate-800">
            All ({allRecordings.length})
          </TabsTrigger>
          <TabsTrigger value="screen" className="data-[state=active]:bg-slate-800">
            <Monitor className="w-3 h-3 mr-1" />
            Screen ({screenRecordings.length})
          </TabsTrigger>
          <TabsTrigger value="camera" className="data-[state=active]:bg-slate-800">
            <Video className="w-3 h-3 mr-1" />
            Camera ({cameraRecordings.length})
          </TabsTrigger>
          <TabsTrigger value="audio" className="data-[state=active]:bg-slate-800">
            <Mic className="w-3 h-3 mr-1" />
            Audio ({audioRecordings.length})
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="all" className="p-4 mt-0">
            <RecordingsList items={allRecordings} />
          </TabsContent>

          <TabsContent value="screen" className="p-4 mt-0">
            <RecordingsList items={screenRecordings} />
          </TabsContent>

          <TabsContent value="camera" className="p-4 mt-0">
            <RecordingsList items={cameraRecordings} />
          </TabsContent>

          <TabsContent value="audio" className="p-4 mt-0">
            <RecordingsList items={audioRecordings} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
