import { useState } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Users, 
  ArrowRightLeft,
  Play,
  Pause,
  X,
  Activity,
  Clock,
  HardDrive,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';

interface Session {
  id: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile';
  os: string;
  status: 'active' | 'paused' | 'offline';
  duration: string;
  dataTransferred: string;
  latency: string;
  isRecording: boolean;
  offlineData: string;
}

interface SessionManagerProps {
  sessions: Session[];
  onSelectSession: (sessionId: string) => void;
  onTransferSession: (fromId: string, toId: string) => void;
  onUpdateSessions: (sessions: Session[]) => void;
}

export function SessionManager({ sessions, onSelectSession, onTransferSession, onUpdateSessions }: SessionManagerProps) {
  const [selectedForTransfer, setSelectedForTransfer] = useState<string | null>(null);

  const handlePauseResume = (sessionId: string) => {
    const updatedSessions = sessions.map(session => {
      if (session.id === sessionId) {
        const newStatus = session.status === 'active' ? 'paused' : 'active';
        toast.success(
          newStatus === 'active' ? 'Session Resumed' : 'Session Paused',
          { description: `${session.deviceName} is now ${newStatus}` }
        );
        return { ...session, status: newStatus as 'active' | 'paused' };
      }
      return session;
    });
    onUpdateSessions(updatedSessions);
  };

  const handleEndSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      toast.success('Session Ended', {
        description: `Connection to ${session.deviceName} terminated`
      });
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      onUpdateSessions(updatedSessions);
    }
  };

  const handleToggleRecording = (sessionId: string) => {
    const updatedSessions = sessions.map(session => {
      if (session.id === sessionId) {
        toast.success(
          !session.isRecording ? 'Recording Started' : 'Recording Stopped',
          { description: session.deviceName }
        );
        return { ...session, isRecording: !session.isRecording };
      }
      return session;
    });
    onUpdateSessions(updatedSessions);
  };

  const handleTransfer = (toSessionId: string) => {
    if (selectedForTransfer && selectedForTransfer !== toSessionId) {
      const fromSession = sessions.find(s => s.id === selectedForTransfer);
      const toSession = sessions.find(s => s.id === toSessionId);
      
      if (fromSession && toSession) {
        onTransferSession(selectedForTransfer, toSessionId);
        toast.success('Session Transferred', {
          description: `Transferred from ${fromSession.deviceName} to ${toSession.deviceName}`
        });
        setSelectedForTransfer(null);
      }
    } else {
      setSelectedForTransfer(toSessionId);
      toast.info('Transfer Mode', {
        description: 'Select another session to transfer to'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'offline':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl text-white mb-2">Multi-Session Manager</h1>
            <p className="text-slate-400">Manage all active remote sessions simultaneously</p>
          </div>
          <div className="flex items-center gap-4">
            <Card className="bg-slate-900 border-slate-800 px-4 py-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-xs text-slate-400">Active Sessions</p>
                  <p className="text-xl text-white">{sessions.filter(s => s.status === 'active').length}</p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-900 border-slate-800 px-4 py-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-xs text-slate-400">Total Data</p>
                  <p className="text-xl text-white">7.8 GB</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {selectedForTransfer && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-white">Transfer Mode Active</p>
                  <p className="text-sm text-slate-400">Select a destination session to complete transfer</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedForTransfer(null)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sessions.map((session) => (
          <Card
            key={session.id}
            className={`bg-slate-900 border-slate-800 p-6 transition-all ${
              selectedForTransfer === session.id ? 'ring-2 ring-cyan-500 border-cyan-500' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  session.deviceType === 'desktop' ? 'bg-cyan-500/20' : 'bg-purple-500/20'
                }`}>
                  {session.deviceType === 'desktop' ? (
                    <Monitor className={`w-6 h-6 ${
                      session.deviceType === 'desktop' ? 'text-cyan-400' : 'text-purple-400'
                    }`} />
                  ) : (
                    <Smartphone className="w-6 h-6 text-purple-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-white">{session.deviceName}</h3>
                  <p className="text-sm text-slate-400">{session.os}</p>
                </div>
              </div>
              <Badge className={getStatusColor(session.status)}>
                {session.status === 'offline' && <WifiOff className="w-3 h-3 mr-1" />}
                {session.status === 'active' && <div className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>}
                {session.status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-slate-400">Duration</p>
                </div>
                <p className="text-white">{session.duration}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <HardDrive className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-slate-400">Data</p>
                </div>
                <p className="text-white">{session.dataTransferred}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Wifi className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-slate-400">Latency</p>
                </div>
                <p className="text-white">{session.latency}</p>
              </div>
            </div>

            {session.status === 'offline' && session.offlineData !== '0 MB' && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-400" />
                  <div className="flex-1">
                    <p className="text-sm text-orange-400">Offline Recording Active</p>
                    <p className="text-xs text-slate-400">Cached data: {session.offlineData}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
              </div>
            )}

            {session.isRecording && session.status !== 'offline' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                  <p className="text-sm text-red-400">Recording in Progress</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                onClick={() => onSelectSession(session.id)}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
              >
                View Session
              </Button>
              
              {session.status !== 'offline' && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePauseResume(session.id)}
                    className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                  >
                    {session.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleToggleRecording(session.id)}
                    className={`border-slate-700 ${
                      session.isRecording 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                  </Button>
                </>
              )}
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleTransfer(session.id)}
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                title="Transfer Session"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleEndSession(session.id)}
                className="bg-slate-800 border-slate-700 text-red-400 hover:bg-red-500/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}