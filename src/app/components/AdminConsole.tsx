import { useState } from 'react';
import { 
  Users, 
  Activity, 
  Server,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  UserCheck,
  Settings,
  BarChart3,
  Zap,
  Database,
  Mail,
  Shield,
  Plus,
  Trash2,
  Edit
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { Switch } from './ui/switch';

interface Session {
  id: string;
  user: string;
  device: string;
  status: 'active' | 'idle';
  duration: string;
  dataTransfer: string;
}

const activeSessions: Session[] = [
  {
    id: 'ses-001',
    user: 'John Doe',
    device: 'MacBook Pro - Office',
    status: 'active',
    duration: '00:45:23',
    dataTransfer: '1.2 GB'
  },
  {
    id: 'ses-002',
    user: 'Jane Smith',
    device: 'Windows Workstation',
    status: 'active',
    duration: '01:12:45',
    dataTransfer: '3.4 GB'
  },
  {
    id: 'ses-003',
    user: 'Mike Johnson',
    device: 'Ubuntu Server',
    status: 'idle',
    duration: '00:08:12',
    dataTransfer: '0.3 GB'
  },
];

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive';
  lastLogin: string;
  devices: number;
}

const initialUsers: User[] = [
  {
    id: 'usr-001',
    name: 'John Doe',
    email: 'john.doe@bixtx.com',
    role: 'admin',
    status: 'active',
    lastLogin: '5 min ago',
    devices: 3
  },
  {
    id: 'usr-002',
    name: 'Jane Smith',
    email: 'jane.smith@bixtx.com',
    role: 'user',
    status: 'active',
    lastLogin: '2 hours ago',
    devices: 5
  },
  {
    id: 'usr-003',
    name: 'Mike Johnson',
    email: 'mike.johnson@bixtx.com',
    role: 'viewer',
    status: 'active',
    lastLogin: '1 day ago',
    devices: 2
  },
];

export function AdminConsole() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user' | 'viewer'>('user');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [p2pEnabled, setP2pEnabled] = useState(true);
  const [autoDiscoveryEnabled, setAutoDiscoveryEnabled] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);

  const handleAddUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (newUserPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    const newUser: User = {
      id: `usr-${String(users.length + 1).padStart(3, '0')}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      status: 'active',
      lastLogin: 'Never',
      devices: 0
    };

    setUsers([...users, newUser]);
    toast.success(`User "${newUserName}" added successfully`);
    
    // Reset form
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('user');
    setNewUserPassword('');
    setShowAddUserDialog(false);
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setUsers(users.filter(u => u.id !== userId));
      toast.success(`User "${user.name}" removed`);
    }
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers(users.map(u => 
      u.id === userId 
        ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' as 'active' | 'inactive' }
        : u
    ));
    const user = users.find(u => u.id === userId);
    toast.success(`User "${user?.name}" ${user?.status === 'active' ? 'deactivated' : 'activated'}`);
  };

  const handleToggleP2P = () => {
    setP2pEnabled(!p2pEnabled);
    toast.success(p2pEnabled ? 'Device-to-device communication disabled' : 'Device-to-device communication enabled');
  };

  const handleToggleAutoDiscovery = () => {
    setAutoDiscoveryEnabled(!autoDiscoveryEnabled);
    toast.success(autoDiscoveryEnabled ? 'Auto discovery disabled' : 'Auto discovery enabled');
  };

  const handleToggleApproval = () => {
    setRequireApproval(!requireApproval);
    toast.success(requireApproval ? 'Admin approval no longer required' : 'Admin approval now required for device pairing');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'user':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'viewer':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-white mb-2">Admin Console</h1>
        <p className="text-slate-400">Enterprise management and analytics dashboard</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="flex items-center gap-1 text-green-400 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>+12%</span>
            </div>
          </div>
          <p className="text-3xl text-white mb-1">247</p>
          <p className="text-sm text-slate-400">Active Users</p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Activity className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex items-center gap-1 text-green-400 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>+8%</span>
            </div>
          </div>
          <p className="text-3xl text-white mb-1">89</p>
          <p className="text-sm text-slate-400">Active Sessions</p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Server className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex items-center gap-1 text-red-400 text-sm">
              <TrendingDown className="w-4 h-4" />
              <span>-3%</span>
            </div>
          </div>
          <p className="text-3xl text-white mb-1">12.4 TB</p>
          <p className="text-sm text-slate-400">Data Transfer</p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
            <div className="flex items-center gap-1 text-green-400 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>+5%</span>
            </div>
          </div>
          <p className="text-3xl text-white mb-1">99.9%</p>
          <p className="text-sm text-slate-400">System Uptime</p>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="sessions" className="data-[state=active]:bg-slate-800">
            Active Sessions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-800">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-slate-800">
            Performance
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-slate-800">
            User Management
          </TabsTrigger>
          <TabsTrigger value="network" className="data-[state=active]:bg-slate-800">
            Network Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-white">Active Remote Sessions</h2>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
                  Live
                </Badge>
                <Button variant="outline" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                  <Eye className="w-4 h-4 mr-2" />
                  Monitor All
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white mb-1">{session.user}</h3>
                      <p className="text-sm text-slate-400">{session.device}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Duration</p>
                      <p className="text-white">{session.duration}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Data Transfer</p>
                      <p className="text-white">{session.dataTransfer}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Status</p>
                      {session.status === 'active' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-700 text-slate-400 border-slate-600">
                          Idle
                        </Badge>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl text-white">Session Analytics</h2>
                <BarChart3 className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Average Session Duration</span>
                  <span className="text-white">00:42:15</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Peak Concurrent Sessions</span>
                  <span className="text-white">156</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Sessions Today</span>
                  <span className="text-white">1,247</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Success Rate</span>
                  <span className="text-green-400">99.7%</span>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl text-white">Resource Usage</h2>
                <Database className="w-5 h-5 text-purple-400" />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">CPU Usage</span>
                    <span className="text-white">34%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full w-[34%] bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">Memory Usage</span>
                    <span className="text-white">67%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full w-[67%] bg-gradient-to-r from-purple-500 to-pink-600 rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">Network Bandwidth</span>
                    <span className="text-white">45%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full w-[45%] bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-white">System Performance Metrics</h2>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                Optimal
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-cyan-500/20 rounded-lg">
                    <Zap className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Avg Latency</p>
                    <p className="text-2xl text-white">12ms</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Excellent</Badge>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Activity className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Throughput</p>
                    <p className="text-2xl text-white">2.4 Gbps</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">High</Badge>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Uptime</p>
                    <p className="text-2xl text-white">99.9%</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Stable</Badge>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-white">User Management</h2>
              <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white" onClick={() => setShowAddUserDialog(true)}>
                <Users className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 rounded-lg p-6">
                <UserCheck className="w-8 h-8 text-cyan-400 mb-4" />
                <p className="text-3xl text-white mb-2">247</p>
                <p className="text-sm text-slate-400">Total Users</p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6">
                <Activity className="w-8 h-8 text-green-400 mb-4" />
                <p className="text-3xl text-white mb-2">189</p>
                <p className="text-sm text-slate-400">Active Today</p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6">
                <Settings className="w-8 h-8 text-purple-400 mb-4" />
                <p className="text-3xl text-white mb-2">12</p>
                <p className="text-sm text-slate-400">Administrators</p>
              </div>
            </div>

            <div className="mt-6">
              <table className="w-full text-sm text-left text-slate-400">
                <thead className="text-xs text-slate-500 uppercase bg-slate-800">
                  <tr>
                    <th scope="col" className="px-6 py-3">Name</th>
                    <th scope="col" className="px-6 py-3">Email</th>
                    <th scope="col" className="px-6 py-3">Role</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3">Last Login</th>
                    <th scope="col" className="px-6 py-3">Devices</th>
                    <th scope="col" className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="bg-slate-900 border-b border-slate-800">
                      <td className="px-6 py-4">{user.name}</td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={user.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-700 text-slate-400 border-slate-600'}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">{user.lastLogin}</td>
                      <td className="px-6 py-4">{user.devices}</td>
                      <td className="px-6 py-4">
                        <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700" onClick={() => handleToggleUserStatus(user.id)}>
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 ml-2" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="mb-6">
              <h2 className="text-xl text-white mb-2">Device-to-Device Communication</h2>
              <p className="text-slate-400">Control how devices communicate with each other on the network</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cyan-500/20 rounded-lg">
                    <Shield className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <Label className="text-white text-base">Enable P2P Communication</Label>
                    <p className="text-sm text-slate-400 mt-1">
                      Allow devices with bixtx.com to communicate directly via WiFi and Bluetooth
                    </p>
                  </div>
                </div>
                <Switch checked={p2pEnabled} onCheckedChange={handleToggleP2P} />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Server className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <Label className="text-white text-base">Auto Network Discovery</Label>
                    <p className="text-sm text-slate-400 mt-1">
                      Automatically discover nearby devices on the same network
                    </p>
                  </div>
                </div>
                <Switch checked={autoDiscoveryEnabled} onCheckedChange={handleToggleAutoDiscovery} />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <UserCheck className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <Label className="text-white text-base">Require Admin Approval</Label>
                    <p className="text-sm text-slate-400 mt-1">
                      All device pairing requests must be approved by an administrator
                    </p>
                  </div>
                </div>
                <Switch checked={requireApproval} onCheckedChange={handleToggleApproval} />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="mb-6">
              <h2 className="text-xl text-white mb-2">Network Statistics</h2>
              <p className="text-slate-400">Overview of device-to-device connections</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/20 rounded">
                    <Server className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-sm text-slate-400">Active Connections</p>
                </div>
                <p className="text-2xl text-white">24</p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-cyan-500/20 rounded">
                    <Shield className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-sm text-slate-400">Paired Devices</p>
                </div>
                <p className="text-2xl text-white">56</p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-500/20 rounded">
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-sm text-slate-400">Pending Approvals</p>
                </div>
                <p className="text-2xl text-white">3</p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/20 rounded">
                    <Database className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-sm text-slate-400">Data Transferred</p>
                </div>
                <p className="text-2xl text-white">2.4TB</p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="mb-6">
              <h2 className="text-xl text-white mb-2">Security Settings</h2>
              <p className="text-slate-400">Configure security policies for device communication</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <Label className="text-white">Encryption Level</Label>
                  <p className="text-sm text-slate-400 mt-1">Military-grade E2E encryption (AES-256)</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <Shield className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <Label className="text-white">Connection Timeout</Label>
                  <p className="text-sm text-slate-400 mt-1">Auto-disconnect idle P2P connections after 30 minutes</p>
                </div>
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  Enabled
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <Label className="text-white">Geofencing</Label>
                  <p className="text-sm text-slate-400 mt-1">Restrict device pairing based on location</p>
                </div>
                <Badge className="bg-slate-700 text-slate-400 border-slate-600">
                  Disabled
                </Badge>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Enter the user's details to add them to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role">Role</Label>
              <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as 'admin' | 'user' | 'viewer')}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-4">
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser}>
              Add User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}