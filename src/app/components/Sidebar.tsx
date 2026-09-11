import { 
  Monitor, 
  Shield, 
  Settings, 
  Users, 
  LayoutDashboard,
  Zap,
  Link2,
  LogOut,
  Layers,
  HardDrive,
  WifiOff,
  Brain,
  Sun,
  Moon,
  Activity,
  FileText,
  LayoutGrid,
  Radio
} from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  userType: 'user' | 'admin' | 'none';
}

export function Sidebar({ activeView, onViewChange, onLogout, userType }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'sessions', icon: Layers, label: 'Sessions' },
    { id: 'multi-device', icon: LayoutGrid, label: 'Multi-Device Control' },
    { id: 'webrtc', icon: Radio, label: 'WebRTC Dashboard' },
    { id: 'connect', icon: Link2, label: 'Connect' },
    { id: 'remote', icon: Monitor, label: 'Remote Control' },
    { id: 'offline', icon: WifiOff, label: 'Offline Recording' },
    { id: 'storage', icon: HardDrive, label: 'Storage' },
    { id: 'system-health', icon: Activity, label: 'System Health' },
    { id: 'security-docs', icon: FileText, label: 'Security Docs' },
    { id: 'ai-security', icon: Brain, label: 'AI & Security' },
    { id: 'security', icon: Shield, label: 'Security Dashboard' },
    { id: 'admin', icon: Users, label: 'Admin Console' },
  ];

  return (
    <aside className="w-64 bg-slate-900 dark:bg-slate-900 bg-slate-100 border-r border-slate-800 dark:border-slate-800 border-slate-200 flex flex-col transition-colors">
      <div className="p-6 border-b border-slate-800 dark:border-slate-800 border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl text-white dark:text-white text-slate-900">bixtx.com</h1>
            <p className="text-xs text-slate-400 dark:text-slate-400 text-slate-600">Super-AI Control</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800 dark:border-slate-800 border-slate-200 space-y-3">
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-xs">
              AI
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400">AI Status</p>
              <p className="text-sm text-white">Active & Optimizing</p>
            </div>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full w-4/5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <Button 
          onClick={toggleTheme}
          variant="outline"
          className="w-full bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 mr-2" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 mr-2" />
              Dark Mode
            </>
          )}
        </Button>
        
        <Button 
          onClick={onLogout}
          variant="outline"
          className="w-full bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}