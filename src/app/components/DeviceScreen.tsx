import { useState } from 'react';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Globe,
  Music,
  Image as ImageIcon,
  Calendar,
  MapPin,
  Cloud,
  Clock,
  Settings,
  ShoppingBag,
  Video,
  FileText,
  Users,
  Chrome,
  Folder,
  PlaySquare
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface DeviceScreenProps {
  deviceType: 'android' | 'ios' | 'windows' | 'macos' | 'linux';
  deviceName: string;
}

interface App {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  action: string;
}

export function DeviceScreen({ deviceType, deviceName }: DeviceScreenProps) {
  const [time] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  
  const handleAppClick = (appName: string, action: string) => {
    toast.success(`${appName} Opened`, {
      description: `${action} on ${deviceName}`,
      duration: 2000,
    });
  };

  // Android Apps
  const androidApps: App[] = [
    { id: 'phone', name: 'Phone', icon: <Phone className="w-8 h-8 text-white" />, color: 'bg-blue-500', action: 'Making call...' },
    { id: 'messages', name: 'Messages', icon: <MessageSquare className="w-8 h-8 text-white" />, color: 'bg-green-500', action: 'Reading messages...' },
    { id: 'mail', name: 'Mail', icon: <Mail className="w-8 h-8 text-white" />, color: 'bg-blue-600', action: 'Checking email...' },
    { id: 'safari', name: 'Safari', icon: <Globe className="w-8 h-8 text-white" />, color: 'bg-orange-500', action: 'Opening browser...' },
    { id: 'music', name: 'Music', icon: <Music className="w-8 h-8 text-white" />, color: 'bg-pink-500', action: 'Playing music...' },
    { id: 'photos', name: 'Photos', icon: <ImageIcon className="w-8 h-8 text-white" />, color: 'bg-purple-500', action: 'Viewing photos...' },
    { id: 'calendar', name: 'Calendar', icon: <Calendar className="w-8 h-8 text-white" />, color: 'bg-blue-600', action: 'Checking calendar...' },
    { id: 'maps', name: 'Maps', icon: <MapPin className="w-8 h-8 text-white" />, color: 'bg-orange-500', action: 'Opening maps...' },
    { id: 'weather', name: 'Weather', icon: <Cloud className="w-8 h-8 text-white" />, color: 'bg-orange-400', action: 'Checking weather...' },
    { id: 'clock', name: 'Clock', icon: <Clock className="w-8 h-8 text-white" />, color: 'bg-orange-500', action: 'Opening clock...' },
    { id: 'settings', name: 'Settings', icon: <Settings className="w-8 h-8 text-white" />, color: 'bg-cyan-500', action: 'Accessing settings...' },
    { id: 'appstore', name: 'App Store', icon: <ShoppingBag className="w-8 h-8 text-white" />, color: 'bg-purple-600', action: 'Opening app store...' },
    { id: 'chrome', name: 'Chrome', icon: <Chrome className="w-8 h-8 text-white" />, color: 'bg-gradient-to-br from-red-500 to-yellow-500', action: 'Launching Chrome...' },
    { id: 'videos', name: 'Videos', icon: <Video className="w-8 h-8 text-white" />, color: 'bg-purple-500', action: 'Playing videos...' },
    { id: 'files', name: 'Files', icon: <FileText className="w-8 h-8 text-white" />, color: 'bg-cyan-500', action: 'Browsing files...' },
    { id: 'contacts', name: 'Contacts', icon: <Users className="w-8 h-8 text-white" />, color: 'bg-purple-600', action: 'Viewing contacts...' },
  ];

  // iOS Apps
  const iosApps: App[] = [
    { id: 'phone', name: 'Phone', icon: <Phone className="w-8 h-8 text-white" />, color: 'bg-green-500', action: 'Making call...' },
    { id: 'messages', name: 'Messages', icon: <MessageSquare className="w-8 h-8 text-white" />, color: 'bg-green-500', action: 'Reading messages...' },
    { id: 'mail', name: 'Mail', icon: <Mail className="w-8 h-8 text-white" />, color: 'bg-blue-500', action: 'Checking email...' },
    { id: 'safari', name: 'Safari', icon: <Globe className="w-8 h-8 text-white" />, color: 'bg-blue-400', action: 'Opening Safari...' },
    { id: 'music', name: 'Music', icon: <Music className="w-8 h-8 text-white" />, color: 'bg-red-500', action: 'Playing music...' },
    { id: 'photos', name: 'Photos', icon: <ImageIcon className="w-8 h-8 text-white" />, color: 'bg-gradient-to-br from-yellow-400 to-pink-500', action: 'Viewing photos...' },
    { id: 'calendar', name: 'Calendar', icon: <Calendar className="w-8 h-8 text-white" />, color: 'bg-red-500', action: 'Checking calendar...' },
    { id: 'maps', name: 'Maps', icon: <MapPin className="w-8 h-8 text-white" />, color: 'bg-green-500', action: 'Opening maps...' },
    { id: 'weather', name: 'Weather', icon: <Cloud className="w-8 h-8 text-white" />, color: 'bg-blue-400', action: 'Checking weather...' },
    { id: 'clock', name: 'Clock', icon: <Clock className="w-8 h-8 text-white" />, color: 'bg-gray-800', action: 'Opening clock...' },
    { id: 'settings', name: 'Settings', icon: <Settings className="w-8 h-8 text-white" />, color: 'bg-gray-600', action: 'Accessing settings...' },
    { id: 'appstore', name: 'App Store', icon: <ShoppingBag className="w-8 h-8 text-white" />, color: 'bg-blue-500', action: 'Opening App Store...' },
    { id: 'facetime', name: 'FaceTime', icon: <Video className="w-8 h-8 text-white" />, color: 'bg-green-500', action: 'Starting FaceTime...' },
    { id: 'files', name: 'Files', icon: <Folder className="w-8 h-8 text-white" />, color: 'bg-blue-500', action: 'Browsing files...' },
    { id: 'contacts', name: 'Contacts', icon: <Users className="w-8 h-8 text-white" />, color: 'bg-gray-600', action: 'Viewing contacts...' },
    { id: 'tv', name: 'TV', icon: <PlaySquare className="w-8 h-8 text-white" />, color: 'bg-gray-800', action: 'Watching TV...' },
  ];

  // Windows Apps
  const windowsApps: App[] = [
    { id: 'edge', name: 'Edge', icon: <Globe className="w-8 h-8 text-white" />, color: 'bg-blue-500', action: 'Opening Edge...' },
    { id: 'chrome', name: 'Chrome', icon: <Chrome className="w-8 h-8 text-white" />, color: 'bg-gradient-to-br from-red-500 to-yellow-500', action: 'Launching Chrome...' },
    { id: 'mail', name: 'Mail', icon: <Mail className="w-8 h-8 text-white" />, color: 'bg-blue-600', action: 'Checking email...' },
    { id: 'calendar', name: 'Calendar', icon: <Calendar className="w-8 h-8 text-white" />, color: 'bg-blue-500', action: 'Checking calendar...' },
    { id: 'photos', name: 'Photos', icon: <ImageIcon className="w-8 h-8 text-white" />, color: 'bg-purple-500', action: 'Viewing photos...' },
    { id: 'music', name: 'Music', icon: <Music className="w-8 h-8 text-white" />, color: 'bg-orange-500', action: 'Playing music...' },
    { id: 'videos', name: 'Videos', icon: <Video className="w-8 h-8 text-white" />, color: 'bg-blue-600', action: 'Playing videos...' },
    { id: 'files', name: 'File Explorer', icon: <Folder className="w-8 h-8 text-white" />, color: 'bg-yellow-500', action: 'Browsing files...' },
    { id: 'settings', name: 'Settings', icon: <Settings className="w-8 h-8 text-white" />, color: 'bg-gray-600', action: 'Accessing settings...' },
    { id: 'store', name: 'Store', icon: <ShoppingBag className="w-8 h-8 text-white" />, color: 'bg-blue-500', action: 'Opening store...' },
  ];

  // macOS Apps
  const macosApps: App[] = [
    { id: 'finder', name: 'Finder', icon: <Folder className="w-8 h-8 text-white" />, color: 'bg-blue-400', action: 'Opening Finder...' },
    { id: 'safari', name: 'Safari', icon: <Globe className="w-8 h-8 text-white" />, color: 'bg-blue-500', action: 'Opening Safari...' },
    { id: 'mail', name: 'Mail', icon: <Mail className="w-8 h-8 text-white" />, color: 'bg-blue-600', action: 'Checking email...' },
    { id: 'messages', name: 'Messages', icon: <MessageSquare className="w-8 h-8 text-white" />, color: 'bg-green-500', action: 'Reading messages...' },
    { id: 'calendar', name: 'Calendar', icon: <Calendar className="w-8 h-8 text-white" />, color: 'bg-red-500', action: 'Checking calendar...' },
    { id: 'photos', name: 'Photos', icon: <ImageIcon className="w-8 h-8 text-white" />, color: 'bg-gradient-to-br from-yellow-400 to-pink-500', action: 'Viewing photos...' },
    { id: 'music', name: 'Music', icon: <Music className="w-8 h-8 text-white" />, color: 'bg-red-500', action: 'Playing music...' },
    { id: 'facetime', name: 'FaceTime', icon: <Video className="w-8 h-8 text-white" />, color: 'bg-green-500', action: 'Starting FaceTime...' },
    { id: 'settings', name: 'System Preferences', icon: <Settings className="w-8 h-8 text-white" />, color: 'bg-gray-600', action: 'Accessing preferences...' },
    { id: 'appstore', name: 'App Store', icon: <ShoppingBag className="w-8 h-8 text-white" />, color: 'bg-blue-500', action: 'Opening App Store...' },
  ];

  // Linux Apps
  const linuxApps: App[] = [
    { id: 'firefox', name: 'Firefox', icon: <Globe className="w-8 h-8 text-white" />, color: 'bg-orange-500', action: 'Opening Firefox...' },
    { id: 'chrome', name: 'Chrome', icon: <Chrome className="w-8 h-8 text-white" />, color: 'bg-gradient-to-br from-red-500 to-yellow-500', action: 'Launching Chrome...' },
    { id: 'files', name: 'Files', icon: <Folder className="w-8 h-8 text-white" />, color: 'bg-gray-600', action: 'Browsing files...' },
    { id: 'terminal', name: 'Terminal', icon: <FileText className="w-8 h-8 text-white" />, color: 'bg-gray-800', action: 'Opening terminal...' },
    { id: 'mail', name: 'Thunderbird', icon: <Mail className="w-8 h-8 text-white" />, color: 'bg-blue-600', action: 'Checking email...' },
    { id: 'calendar', name: 'Calendar', icon: <Calendar className="w-8 h-8 text-white" />, color: 'bg-blue-500', action: 'Checking calendar...' },
    { id: 'music', name: 'Music Player', icon: <Music className="w-8 h-8 text-white" />, color: 'bg-purple-500', action: 'Playing music...' },
    { id: 'videos', name: 'Videos', icon: <Video className="w-8 h-8 text-white" />, color: 'bg-orange-500', action: 'Playing videos...' },
    { id: 'settings', name: 'Settings', icon: <Settings className="w-8 h-8 text-white" />, color: 'bg-gray-600', action: 'Accessing settings...' },
    { id: 'software', name: 'Software', icon: <ShoppingBag className="w-8 h-8 text-white" />, color: 'bg-orange-500', action: 'Opening software center...' },
  ];

  const getApps = () => {
    switch (deviceType) {
      case 'android':
        return androidApps;
      case 'ios':
        return iosApps;
      case 'windows':
        return windowsApps;
      case 'macos':
        return macosApps;
      case 'linux':
        return linuxApps;
      default:
        return androidApps;
    }
  };

  const getBackgroundGradient = () => {
    switch (deviceType) {
      case 'android':
        return 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950';
      case 'ios':
        return 'bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-slate-950';
      case 'windows':
        return 'bg-gradient-to-br from-blue-900/40 via-slate-900 to-slate-950';
      case 'macos':
        return 'bg-gradient-to-br from-gray-800 via-gray-900 to-slate-950';
      case 'linux':
        return 'bg-gradient-to-br from-orange-900/30 via-slate-900 to-slate-950';
      default:
        return 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950';
    }
  };

  const apps = getApps();

  return (
    <div className={`absolute inset-0 ${getBackgroundGradient()}`}>
      {/* Status Bar */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-6 text-white z-10">
        <div className="flex items-center gap-3">
          <span className="text-sm">{time}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-1 h-3 bg-white rounded-sm"></div>
            <div className="w-1 h-4 bg-white rounded-sm"></div>
            <div className="w-1 h-5 bg-white rounded-sm"></div>
            <div className="w-1 h-6 bg-white rounded-sm"></div>
          </div>
          <div className="w-6 h-3 border-2 border-white rounded-sm relative">
            <div className="absolute inset-0.5 bg-white rounded-sm"></div>
          </div>
        </div>
      </div>

      {/* Device Info Header */}
      <div className="absolute top-10 left-0 right-0 p-6 text-center">
        <h3 className="text-white text-sm opacity-75">{deviceName}</h3>
        <p className="text-slate-400 text-xs mt-1">
          {deviceType === 'android' && 'Android 14'}
          {deviceType === 'ios' && 'iOS 17.2'}
          {deviceType === 'windows' && 'Windows 11'}
          {deviceType === 'macos' && 'macOS Sonoma'}
          {deviceType === 'linux' && 'Ubuntu 22.04'}
        </p>
      </div>

      {/* App Grid */}
      <div className="absolute top-28 left-0 right-0 bottom-0 overflow-y-auto p-8">
        <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => handleAppClick(app.name, app.action)}
              className="flex flex-col items-center gap-2 group cursor-pointer transform transition-all hover:scale-105 active:scale-95"
            >
              <div className={`w-16 h-16 ${app.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all`}>
                {app.icon}
              </div>
              <span className="text-white text-xs text-center group-hover:text-cyan-400 transition-colors">
                {app.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Dock (for iOS/macOS style) */}
      {(deviceType === 'ios' || deviceType === 'macos') && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-xl rounded-3xl px-4 py-3 flex items-center gap-3 border border-slate-700/50">
          {apps.slice(0, 4).map((app) => (
            <button
              key={`dock-${app.id}`}
              onClick={() => handleAppClick(app.name, app.action)}
              className="transform transition-all hover:scale-110 active:scale-95"
            >
              <div className={`w-14 h-14 ${app.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                {app.icon}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
