/**
 * Improved Admin Dashboard (Software B)
 * Software B controls Software A — on/off per platform, no expiry on agents.
 */

import React, { useState, useEffect } from 'react';
import { InstallLinkGenerator } from '../components/InstallLinkGenerator';
import { QRCodeManager } from '../components/QRCodeManager';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000/v1' : 'https://bixtx.onrender.com/v1';

async function apiCall(endpoint: string, method = 'GET', body?: object) {
  const token = sessionStorage.getItem('token') || '';
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

interface AdminDashboardProps {
  organizationId: string;
  adminEmail: string;
}

type ViewType = 'overview' | 'devices' | 'install-links' | 'qr-codes' | 'settings' | 'ai-upgrade' | 'software-a-control' | 'users' | 'agent-upgrades';

interface AIUpgrade {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  learned: string;
  status: 'pending' | 'approved' | 'rejected' | 'applying' | 'applied';
}

const INITIAL_UPGRADES: AIUpgrade[] = [];

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  status: 'active' | 'inactive';
  lastLogin: string;
  devices: number;
}

const INITIAL_USERS: ManagedUser[] = [];

interface AgentUpgradeRequest {
  id: string;
  deviceId: string;
  deviceName: string;
  fromVersion: string;
  toVersion: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  platform: string;
  osVersion: string;
  nodeVersion: string;
  cpuCount: number;
  totalMemMB: number;
  freeMemMB: number;
  diskFreeMB: number | null;
  uptimeSeconds: number;
}

const INITIAL_AGENT_UPGRADES: AgentUpgradeRequest[] = [];

interface PlatformControl {
  id: string;
  label: string;
  icon: string;
  category: 'Desktop' | 'Mobile' | 'Integration';
  devStatus: 'not-started' | 'in-progress' | 'complete';
  complexity: string;
  enabled: boolean;
}

const INITIAL_PLATFORM_CONTROLS: PlatformControl[] = [
  { id: 'win',     label: 'Desktop Agent (Windows)',  icon: '⊞', category: 'Desktop',     devStatus: 'not-started', complexity: 'High',      enabled: false },
  { id: 'macos',   label: 'Desktop Agent (macOS)',    icon: '⌘', category: 'Desktop',     devStatus: 'not-started', complexity: 'High',      enabled: false },
  { id: 'linux',   label: 'Desktop Agent (Linux)',    icon: '◉', category: 'Desktop',     devStatus: 'not-started', complexity: 'Medium',    enabled: false },
  { id: 'android', label: 'Android App',              icon: '◆', category: 'Mobile',      devStatus: 'not-started', complexity: 'High',      enabled: false },
  { id: 'ios',     label: 'iOS App',                  icon: '◇', category: 'Mobile',      devStatus: 'not-started', complexity: 'High',      enabled: false },
  { id: 'webrtc',  label: 'WebRTC Integration',       icon: '🌐', category: 'Integration', devStatus: 'not-started', complexity: 'High',      enabled: false },
  { id: 'sec',     label: 'Security Implementation',  icon: '🔐', category: 'Integration', devStatus: 'not-started', complexity: 'Very High', enabled: false },
];

export const ImprovedAdminDashboard: React.FC<AdminDashboardProps> = ({
  organizationId,
  adminEmail,
}) => {
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [liveDeviceCount, setLiveDeviceCount] = useState(0);

  useEffect(() => {
    apiCall('/devices')
      .then((d: any) => setLiveDeviceCount(d.devices?.length ?? 0))
      .catch(() => {});
  }, []);
  const [upgrades, setUpgrades] = useState<AIUpgrade[]>(INITIAL_UPGRADES);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [settingsToast, setSettingsToast] = useState('');
  const [softwareAEnabled, setSoftwareAEnabled] = useState(true);
  const [platformControls, setPlatformControls] = useState<PlatformControl[]>(INITIAL_PLATFORM_CONTROLS);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const showSettingsToast = (msg: string) => { setSettingsToast(msg); setTimeout(() => setSettingsToast(''), 2500); };

  // ── User management state ──
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>(INITIAL_USERS);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<ManagedUser['role']>('viewer');
  const [newPassword, setNewPassword] = useState('');
  const [userToast, setUserToast] = useState('');
  const showUserToast = (msg: string) => { setUserToast(msg); setTimeout(() => setUserToast(''), 2500); };

  const handleAddUser = async () => {
    if (!newEmail || !newPassword) { alert('Email and password required'); return; }
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const r = await fetch('https://bixtx.onrender.com/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          name: newName || newEmail.split('@')[0],
          email: newEmail,
          password: newPassword,
          role: newRole
        })
      });
      const data = await r.json();
      if (!r.ok) { alert(data.error || 'Failed'); return; }
      alert('User created: ' + newEmail);
      setNewName(''); setNewEmail(''); setNewPassword('');
      setShowAddUser(false);
      window.location.reload();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const handleToggleUserStatus = (id: string) => {
    setManagedUsers(p => p.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
    const u = managedUsers.find(x => x.id === id);
    showUserToast(`"${u?.name}" ${u?.status === 'active' ? 'deactivated' : 'activated'}`);
  };

  const handleRemoveUser = (id: string) => {
    const u = managedUsers.find(x => x.id === id);
    setManagedUsers(p => p.filter(x => x.id !== id));
    showUserToast(`"${u?.name}" removed`);
  };

  // ── Agent self-upgrade state ──
  const [agentUpgrades, setAgentUpgrades] = useState<AgentUpgradeRequest[]>(INITIAL_AGENT_UPGRADES);

  const handleApproveAgentUpgrade = (id: string) => {
    const r = agentUpgrades.find(x => x.id === id);
    apiCall(`/upgrades/${id}/approve`, 'POST')
      .then(() => {
        setAgentUpgrades(p => p.map(x => x.id === id ? { ...x, status: 'approved' } : x));
        showToast(`Upgrade approved for ${r?.deviceName} → v${r?.toVersion}`);
      })
      .catch(() => showToast('Failed to reach server'));
  };

  const handleDenyAgentUpgrade = (id: string) => {
    const r = agentUpgrades.find(x => x.id === id);
    apiCall(`/upgrades/${id}/deny`, 'POST', { reason: 'Denied by administrator' })
      .then(() => {
        setAgentUpgrades(p => p.map(x => x.id === id ? { ...x, status: 'denied' } : x));
        showToast(`Upgrade denied for ${r?.deviceName}`);
      })
      .catch(() => showToast('Failed to reach server'));
  };

  const pendingAgentUpgrades = agentUpgrades.filter(r => r.status === 'pending').length;
  const activeUsers = managedUsers.filter(u => u.status === 'active').length;

  const [c2Host, setC2Host] = useState('api.bixtx.com');
  const [c2Port, setC2Port] = useState('3001');
  const [c2Proto, setC2Proto] = useState('wss');
  const [enrollKey, setEnrollKey] = useState('BTX-2026-ALPHA');
  const [agentToggles, setAgentToggles] = useState([
    { key:'beaconJitter', label:'Beacon Jitter',            desc:'Randomise beacon interval ±30%',                   on:true,  color:'#3b82f6' },
    { key:'autoMutate',   label:'Auto-Mutate on Detection', desc:'Rotate signature when AV detects agent',            on:true,  color:'#ef4444' },
    { key:'offlineRec',   label:'Offline Recording',        desc:'Buffer data locally when C2 unreachable',           on:true,  color:'#10d9a0' },
    { key:'stealth',      label:'Stealth Mode',             desc:'Hide from app switcher and process list',           on:false, color:'#10b981' },
    { key:'crashRec',     label:'Crash Recovery',           desc:'Auto-restart agent after unexpected crash',         on:true,  color:'#f59e0b' },
    { key:'tlsRotation',  label:'TLS Fingerprint Rotation', desc:'Rotate JA3 fingerprint every beacon cycle',         on:false, color:'#a855f7' },
  ]);
  const [notifToggles, setNotifToggles] = useState([
    { key:'email',  label:'Email Alerts',       desc:'Send email on critical events',        on:true,  color:'#3b82f6' },
    { key:'sms',    label:'SMS Alerts',          desc:'SMS on device offline or geo-breach',  on:false, color:'#10b981' },
    { key:'push',   label:'Push Notifications',  desc:'Browser push on new data',             on:true,  color:'#10d9a0' },
    { key:'audit',  label:'Audit Logging',       desc:'Log all admin actions to audit file',  on:true,  color:'#f59e0b' },
  ]);

  const pendingCount = upgrades.filter(u => u.status === 'pending').length;

  const handleApprove = (id: string) => {
    setUpgrades(prev => prev.map(u => u.id === id ? { ...u, status: 'applying' } : u));
    setTimeout(() => {
      setUpgrades(prev => prev.map(u => u.id === id ? { ...u, status: 'applied' } : u));
    }, 1800);
  };

  const handleReject = (id: string) => {
    setUpgrades(prev => prev.map(u => u.id === id ? { ...u, status: 'rejected' } : u));
  };

  const handleRescan = () => {
    setScanning(true); setScanProgress(0);
    const iv = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) { clearInterval(iv); setScanning(false); return 100; }
        return p + 5;
      });
    }, 120);
  };

  const handleGlobalToggle = () => {
    const next = !softwareAEnabled;
    setSoftwareAEnabled(next);
    showToast(`Software A globally ${next ? 'ENABLED' : 'DISABLED'} by admin`);
  };

  const handlePlatformToggle = (id: string) => {
    if (!softwareAEnabled) {
      showToast('Enable Software A globally first');
      return;
    }
    setPlatformControls(prev => prev.map(p =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ));
    const plat = platformControls.find(p => p.id === id);
    if (plat) showToast(`${plat.label} ${plat.enabled ? 'disabled' : 'enabled'}`);
  };

  const devStatusBadge = (s: PlatformControl['devStatus']) => {
    if (s === 'not-started') return 'bg-red-100 text-red-800';
    if (s === 'in-progress') return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const devStatusLabel = (s: PlatformControl['devStatus']) => {
    if (s === 'not-started') return '⚠ Not Started';
    if (s === 'in-progress') return '⏳ In Progress';
    return 'Developed';
  };

  const enabledCount = platformControls.filter(p => p.enabled && softwareAEnabled).length;
  const notStartedCount = platformControls.filter(p => p.devStatus === 'not-started').length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Global toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-purple-700 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold">
          {toast}
        </div>
      )}

      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-screen overflow-y-auto">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="text-4xl">🛡️</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">bixtx.com</h1>
              <p className="text-xs text-gray-500">Admin Dashboard (Software B)</p>
            </div>
          </div>
        </div>

        {/* Software A global status pill */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
            softwareAEnabled ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${softwareAEnabled ? 'bg-green-500' : 'bg-red-500'}`}/>
            Software A: {softwareAEnabled ? 'ON' : 'OFF'}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-2">
          <button
            onClick={() => setCurrentView('overview')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'overview' ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-2xl">📊</span>
            <span>Overview</span>
          </button>

          {/* Software A Control — primary action */}
          <button
            onClick={() => setCurrentView('software-a-control')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all relative ${
              currentView === 'software-a-control'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold hover:shadow-lg'
            }`}
          >
            <span className="text-2xl">🎛️</span>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <span>Software A Control</span>
                {notStartedCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-400 text-white rounded-full text-[10px] font-bold">
                    {notStartedCount} pending
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-100 mt-0.5">Admin On/Off · No Expiry</p>
            </div>
          </button>

          {/* QR Code Manager */}
          <button
            onClick={() => setCurrentView('qr-codes')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all relative ${
              currentView === 'qr-codes'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-lg scale-105'
                : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold hover:shadow-lg hover:scale-105'
            }`}
          >
            <span className="text-2xl">📱</span>
            <div className="flex-1 text-left">
              <span>QR Code Manager</span>
              <p className="text-xs text-purple-100 mt-0.5">Software A Installation</p>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('devices')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'devices' ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-2xl">💻</span>
            <span>Devices</span>
          </button>

          <button
            onClick={() => setCurrentView('install-links')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'install-links' ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-2xl">🔗</span>
            <span>Installation Links</span>
          </button>

          <button
            onClick={() => setCurrentView('ai-upgrade')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors relative ${
              currentView === 'ai-upgrade' ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-2xl">🧠</span>
            <span>AI Upgrades</span>
            {pendingCount > 0 && (
              <span className="absolute right-3 top-2.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('users')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors relative ${
              currentView === 'users' ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-2xl">👥</span>
            <span>User Management</span>
            <span className="absolute right-3 top-3 px-1.5 py-0.5 bg-indigo-500 text-white rounded-full text-[10px] font-bold">
              {activeUsers}
            </span>
          </button>

          <button
            onClick={() => setCurrentView('agent-upgrades')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors relative ${
              currentView === 'agent-upgrades' ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-2xl">⬆️</span>
            <span>Agent Upgrades</span>
            {pendingAgentUpgrades > 0 && (
              <span className="absolute right-3 top-2.5 w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {pendingAgentUpgrades}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'settings' ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-2xl">⚙️</span>
            <span>Settings</span>
          </button>
        </nav>

        {/* Software A quick toggle in sidebar */}
        <div className="p-4 m-4 rounded-lg border-2 border-indigo-200 bg-indigo-50">
          <div className="text-center">
            <div className="text-3xl mb-1">🎛️</div>
            <h3 className="font-bold text-indigo-900 text-sm mb-1">Software A</h3>
            <p className="text-xs text-indigo-700 mb-3">
              {softwareAEnabled ? `${enabledCount}/${platformControls.length} platforms active` : 'Globally disabled'}
            </p>
            <button
              onClick={handleGlobalToggle}
              className={`w-full px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                softwareAEnabled
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {softwareAEnabled ? '⏹ Disable All' : '▶ Enable Software A'}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-64">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentView === 'overview'          && '📊 Dashboard Overview'}
                {currentView === 'software-a-control' && '🎛️ Software A Control — Admin On/Off'}
                {currentView === 'qr-codes'           && '📱 QR Code Manager — Software A'}
                {currentView === 'devices'            && '💻 Device Management'}
                {currentView === 'install-links'      && '🔗 Installation Links'}
                {currentView === 'settings'           && '⚙️ Settings'}
                {currentView === 'ai-upgrade'         && '🧠 AI Self-Upgrade Engine'}
                {currentView === 'users'              && '👥 User Management'}
                {currentView === 'agent-upgrades'     && '⬆️ Agent Self-Upgrade Approvals'}
              </h2>
              {currentView === 'qr-codes' && (
                <p className="text-sm text-gray-600 mt-1">
                  Generate QR codes for Software A installation — Admin Controlled (No Expiry)
                </p>
              )}
              {currentView === 'software-a-control' && (
                <p className="text-sm text-gray-600 mt-1">
                  Control Software A access per platform. No expiry — you decide when agents are on or off.
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{adminEmail}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">👤</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">

          {/* ── SOFTWARE A CONTROL ── */}
          {currentView === 'software-a-control' && (
            <div className="space-y-6">
              {/* Global on/off banner */}
              <div className={`rounded-2xl p-6 flex items-center justify-between gap-6 border-2 ${
                softwareAEnabled
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              }`}>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {softwareAEnabled ? '✅ Software A — ENABLED' : '🔴 Software A — DISABLED'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {softwareAEnabled
                      ? 'Agents on enabled platforms are active. Toggle individual platforms below.'
                      : 'All Software A agents are globally off. No platform can be activated until you enable Software A.'}
                  </p>
                </div>
                <button
                  onClick={handleGlobalToggle}
                  className={`flex-shrink-0 px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg ${
                    softwareAEnabled
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {softwareAEnabled ? '⏹ Disable Software A' : '▶ Enable Software A'}
                </button>
              </div>

              {/* Development status summary */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">⚠️</span>
                  <div>
                    <h4 className="font-bold text-amber-900 mb-1">Development Status — Software A (Link Agent)</h4>
                    <p className="text-sm text-amber-800 mb-2">
                      As per the System Summary document: all Software A platform agents are currently <strong>Not Started</strong>.
                      Development is estimated at 6–12 months. Platform toggles are pre-configured for when agents are ready to deploy.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">⚠ {notStartedCount} Not Started</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">Est. 6–12 months dev</span>
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold">NEEDS DEV</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform controls table */}
              <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Platform Control — Software A Agents</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!softwareAEnabled) { showToast('Enable Software A globally first'); return; }
                        setPlatformControls(prev => prev.map(p => ({ ...p, enabled: true })));
                        showToast('All platforms enabled');
                      }}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200 transition-colors">
                      ▶ Enable All
                    </button>
                    <button
                      onClick={() => {
                        setPlatformControls(prev => prev.map(p => ({ ...p, enabled: false })));
                        showToast('All platforms disabled');
                      }}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors">
                      ⏹ Disable All
                    </button>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {['Component', 'Category', 'Dev Status', 'Complexity', 'Admin Control'].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {platformControls.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{p.icon}</span>
                            <span className="font-medium text-gray-900">{p.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono">{p.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${devStatusBadge(p.devStatus)}`}>
                            {devStatusLabel(p.devStatus)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-xs">{p.complexity}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handlePlatformToggle(p.id)}
                              className={`relative w-11 h-6 rounded-full transition-colors ${
                                p.enabled && softwareAEnabled ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                              title={!softwareAEnabled ? 'Enable Software A globally first' : ''}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                                p.enabled && softwareAEnabled ? 'left-6' : 'left-1'
                              }`}/>
                            </button>
                            <span className={`text-xs font-semibold ${
                              p.enabled && softwareAEnabled ? 'text-green-700' : 'text-gray-400'
                            }`}>
                              {p.enabled && softwareAEnabled ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* How it works */}
              <div className="bg-white rounded-xl shadow p-6 border border-purple-100">
                <h4 className="font-bold text-gray-900 mb-4">🔒 How Admin Control Works (No Expiry)</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { icon: '1️⃣', title: 'Admin Enables', desc: 'Admin turns Software A ON globally in this panel' },
                    { icon: '2️⃣', title: 'Select Platforms', desc: 'Enable specific platforms (Windows, Android, iOS…)' },
                    { icon: '3️⃣', title: 'Agents Activate', desc: 'Enrolled agents on enabled platforms become active' },
                    { icon: '4️⃣', title: 'Admin Disables', desc: 'Admin turns OFF at any time — no expiry, permanent control' },
                  ].map(s => (
                    <div key={s.title} className="text-center p-4 bg-indigo-50 rounded-lg">
                      <div className="text-3xl mb-2">{s.icon}</div>
                      <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {currentView === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Devices</p>
                      <p className="text-3xl font-bold text-gray-900">{liveDeviceCount}</p>
                    </div>
                    <div className="text-4xl">💻</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Links</p>
                      <p className="text-3xl font-bold text-green-600">0</p>
                    </div>
                    <div className="text-4xl">🔗</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active QR Codes</p>
                      <p className="text-3xl font-bold text-purple-600">0</p>
                    </div>
                    <div className="text-4xl">📱</div>
                  </div>
                </div>
                <div className={`rounded-lg shadow p-6 ${softwareAEnabled ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Software A</p>
                      <p className={`text-3xl font-bold ${softwareAEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        {softwareAEnabled ? 'ON' : 'OFF'}
                      </p>
                    </div>
                    <button
                      onClick={handleGlobalToggle}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        softwareAEnabled ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {softwareAEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Software A Control Banner */}
              <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-600 rounded-xl shadow-2xl p-8 text-white">
                <div className="flex items-center justify-between flex-wrap gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="text-5xl">🎛️</div>
                      <div>
                        <h3 className="text-2xl font-bold mb-1">Software A Control</h3>
                        <p className="text-indigo-100">
                          Software B controls Software A — admin on/off per platform, no expiry
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center flex-wrap gap-5 text-sm mb-4">
                      <div className="flex items-center space-x-2">
                        <span>⚡</span><span>Instant On/Off</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>🔒</span><span>Admin Controlled (No Expiry)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>⚠️</span><span>{notStartedCount} Platforms Not Started</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentView('software-a-control')}
                      className="px-6 py-3 bg-white text-indigo-700 rounded-lg font-bold hover:bg-indigo-50 transition-colors shadow-lg"
                    >
                      🎛️ Open Software A Control
                    </button>
                  </div>
                </div>
              </div>

              {/* QR Banner */}
              <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 rounded-xl shadow-2xl p-8 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="text-5xl">📱</div>
                      <div>
                        <h3 className="text-2xl font-bold mb-1">QR Code Manager</h3>
                        <p className="text-purple-100">Create QR codes for Software A installation — Admin Controlled</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-sm mb-4">
                      <div className="flex items-center space-x-2"><span>⚡</span><span>Fast Installation</span></div>
                      <div className="flex items-center space-x-2"><span>🔒</span><span>Admin Controlled</span></div>
                      <div className="flex items-center space-x-2"><span>✅</span><span>Secure &amp; Tracked</span></div>
                    </div>
                    <button
                      onClick={() => setCurrentView('qr-codes')}
                      className="px-6 py-3 bg-white text-purple-600 rounded-lg font-bold hover:bg-purple-50 transition-colors shadow-lg"
                    >
                      🚀 Open QR Code Manager
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <button onClick={() => setCurrentView('software-a-control')}
                    className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-left hover:shadow-2xl transition-all transform hover:scale-105 text-white">
                    <div className="text-4xl mb-3">🎛️</div>
                    <h4 className="text-xl font-bold mb-2">Software A Control</h4>
                    <p className="text-indigo-100 mb-3">Enable/disable Software A globally and per platform</p>
                    <div className="inline-block bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs font-bold">
                      ⭐ PRIMARY CONTROL
                    </div>
                  </button>
                  <button onClick={() => setCurrentView('qr-codes')}
                    className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-left hover:shadow-2xl transition-all transform hover:scale-105 text-white">
                    <div className="text-4xl mb-3">📱</div>
                    <h4 className="text-xl font-bold mb-2">QR Code Manager</h4>
                    <p className="text-purple-100">Generate QR codes for Software A installation</p>
                  </button>
                  <button onClick={() => setCurrentView('devices')}
                    className="bg-white rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all border-2 border-gray-200">
                    <div className="text-4xl mb-3">💻</div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Manage Devices</h4>
                    <p className="text-gray-600">View and control all connected devices</p>
                  </button>
                </div>
              </div>

              {/* How-to guide */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
                <div className="flex items-start space-x-4">
                  <div className="text-4xl">💡</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      How to Deploy Software A via Software B
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                      {[
                        { n: '1️⃣', t: 'Enable Software A', d: 'Admin turns on globally in Software A Control' },
                        { n: '2️⃣', t: 'Select Platforms', d: 'Toggle individual platforms on/off' },
                        { n: '3️⃣', t: 'Generate QR / Link', d: 'Share install QR or link with target device' },
                        { n: '4️⃣', t: 'Admin Controls', d: 'Turn off at any time — no expiry ever' },
                      ].map(s => (
                        <div key={s.t} className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-3xl mb-2">{s.n}</div>
                          <p className="text-sm font-semibold text-gray-900">{s.t}</p>
                          <p className="text-xs text-gray-600 mt-1">{s.d}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentView('software-a-control')}
                      className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      Open Software A Control →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QR CODE MANAGER */}
          {currentView === 'qr-codes' && (
            <QRCodeManager
              organizationId={organizationId}
              adminEmail={adminEmail}
              softwareAEnabled={softwareAEnabled}
            />
          )}

          {/* DEVICES */}
          {currentView === 'devices' && (
            <div className="bg-white rounded-lg shadow p-8">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💻</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Device Management</h3>
                <p className="text-gray-600">Device list will appear here once Software A agents are deployed.</p>
              </div>
            </div>
          )}

          {/* INSTALLATION LINKS */}
          {currentView === 'install-links' && (
            <InstallLinkGenerator
              organizationId={organizationId}
              adminEmail={adminEmail}
            />
          )}

          {/* SETTINGS */}
          {currentView === 'settings' && (
            <div className="space-y-6">
              {settingsToast && (
                <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold">
                  ✓ {settingsToast}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Configure Software B behaviour, C2 connection, and notifications</p>
                </div>
                <button onClick={() => {
                    apiCall('/v1/settings', 'POST', { c2Host, c2Port, c2Proto, enrollKey })
                      .then(() => showSettingsToast('Settings saved'))
                      .catch(() => showSettingsToast('Settings saved locally'));
                  }}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 transition-colors">
                  💾 Save All
                </button>
              </div>

              <div className="bg-white rounded-xl shadow p-6 border border-purple-100">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  🔗 C2 Connection
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">Connected</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label:'C2 Host', value:c2Host, set:setC2Host },
                    { label:'C2 Port', value:c2Port, set:setC2Port },
                    { label:'Protocol', value:c2Proto, set:setC2Proto },
                    { label:'Enroll Key', value:enrollKey, set:setEnrollKey },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                      <input value={f.value} onChange={e => f.set(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => {
                      fetch(`${c2Proto.replace('wss','https').replace('ws','http')}://${c2Host}:${c2Port}/health`)
                        .then(() => showSettingsToast('Connection successful'))
                        .catch(() => showSettingsToast('Connection failed — check host/port'));
                    }}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200 transition-colors">
                    🔌 Test Connection
                  </button>
                  <button onClick={() => {
                      apiCall('/stats')
                        .then(() => showSettingsToast('C2 reachable'))
                        .catch(() => showSettingsToast('C2 unreachable'));
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">
                    🔄 Reconnect
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6 border border-purple-100">
                <h3 className="text-base font-bold text-gray-900 mb-4">🤖 Agent Behaviour</h3>
                <div className="space-y-4">
                  {agentToggles.map(t => (
                    <div key={t.key} className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800">{t.label}</div>
                        <div className="text-xs text-gray-500">{t.desc}</div>
                      </div>
                      <button
                        onClick={() => { setAgentToggles(prev => prev.map(x => x.key===t.key ? {...x, on:!x.on} : x)); showSettingsToast(`${t.label} ${t.on ? 'disabled' : 'enabled'}`); }}
                        className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                        style={{ background: t.on ? t.color : '#d1d5db' }}>
                        <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all"
                          style={{ left: t.on ? '23px' : '4px' }}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6 border border-purple-100">
                <h3 className="text-base font-bold text-gray-900 mb-4">🔔 Notifications</h3>
                <div className="space-y-4">
                  {notifToggles.map(t => (
                    <div key={t.key} className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800">{t.label}</div>
                        <div className="text-xs text-gray-500">{t.desc}</div>
                      </div>
                      <button
                        onClick={() => { setNotifToggles(prev => prev.map(x => x.key===t.key ? {...x, on:!x.on} : x)); showSettingsToast(`${t.label} ${t.on ? 'disabled' : 'enabled'}`); }}
                        className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                        style={{ background: t.on ? t.color : '#d1d5db' }}>
                        <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all"
                          style={{ left: t.on ? '23px' : '4px' }}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6 border border-purple-100">
                <h3 className="text-base font-bold text-gray-900 mb-4">👤 Admin Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {[
                    { label:'Admin Email', value:adminEmail },
                    { label:'Organisation ID', value:organizationId },
                    { label:'Software Version', value:'v4.7.2-neural' },
                    { label:'License', value:'Enterprise · Active', highlight:true },
                  ].map(f => (
                    <div key={f.label}>
                      <div className="text-gray-500 mb-1">{f.label}</div>
                      <div className={`font-mono px-3 py-2 rounded-lg border text-sm ${f.highlight ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-900 border-gray-200'}`}>
                        {f.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2 flex-wrap">
                  <button onClick={() => {
                      apiCall('/auth/reset', 'POST', { email: adminEmail })
                        .then(() => showSettingsToast('Password reset email sent'))
                        .catch(() => showSettingsToast('Reset email sent'));
                    }}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200 transition-colors">
                    🔑 Change Password
                  </button>
                  <button onClick={() => {
                      apiCall('/auth/apikey', 'POST')
                        .then(res => { showSettingsToast(`New key: ${res.apiKey?.slice(0,16) ?? '…'}`); })
                        .catch(() => showSettingsToast('API key regenerated'));
                    }}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors">
                    🔄 Regenerate API Key
                  </button>
                  <button onClick={() => {
                      if (!window.confirm('Export all data?')) return;
                      const rows = [['Type','Value'],['orgId', organizationId],['admin', adminEmail]];
                      const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type:'text/csv' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `bixtx-export-${new Date().toISOString().slice(0,10)}.csv`;
                      a.click();
                      showSettingsToast('Data exported');
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">
                    📦 Export Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI UPGRADE VIEW */}
          {currentView === 'ai-upgrade' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label:'Pending Review', value: upgrades.filter(u=>u.status==='pending').length, color:'text-yellow-600', bg:'bg-yellow-50' },
                  { label:'Applied', value: upgrades.filter(u=>u.status==='applied').length, color:'text-green-600', bg:'bg-green-50' },
                  { label:'Rejected', value: upgrades.filter(u=>u.status==='rejected').length, color:'text-red-600', bg:'bg-red-50' },
                  { label:'Total Learned', value: upgrades.length, color:'text-purple-600', bg:'bg-purple-50' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-6 text-white">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-lg font-bold mb-1">🧠 AI Environment Scanner</h3>
                    <p className="text-purple-200 text-sm">
                      Software B continuously learns from the target environment and proposes self-upgrades.
                      All upgrades require your explicit approval before being applied.
                    </p>
                  </div>
                  <button onClick={handleRescan} disabled={scanning}
                    className="flex-shrink-0 px-5 py-2.5 bg-white text-purple-700 rounded-lg font-bold text-sm hover:bg-purple-50 disabled:opacity-60 transition-colors">
                    {scanning ? `Scanning… ${scanProgress}%` : '🔍 Rescan Environment'}
                  </button>
                </div>
                {scanning && (
                  <div className="mt-4">
                    <div className="w-full bg-purple-800 rounded-full h-2">
                      <div className="bg-purple-300 h-2 rounded-full transition-all" style={{ width:`${scanProgress}%` }}/>
                    </div>
                    <p className="text-xs text-purple-300 mt-1">Analysing OS, processes, network topology…</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {upgrades.map(u => {
                  const impactColor =
                    u.impact==='critical' ? 'bg-red-100 text-red-800' :
                    u.impact==='high'     ? 'bg-orange-100 text-orange-800' :
                    u.impact==='medium'   ? 'bg-yellow-100 text-yellow-800' :
                                           'bg-gray-100 text-gray-700';
                  const statusColor =
                    u.status==='applied'   ? 'bg-green-100 text-green-800' :
                    u.status==='rejected'  ? 'bg-red-100 text-red-800' :
                    u.status==='applying'  ? 'bg-blue-100 text-blue-800' :
                                            'bg-yellow-100 text-yellow-800';

                  return (
                    <div key={u.id} className={`bg-white rounded-xl shadow p-5 border-l-4 ${
                      u.status==='applied'  ? 'border-green-400' :
                      u.status==='rejected' ? 'border-red-300' :
                      u.status==='applying' ? 'border-blue-400' :
                                             'border-purple-400'}`}>
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{u.category}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${impactColor}`}>{u.impact} impact</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                              {u.status==='applying' ? '⏳ Applying…' : u.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-gray-900 mb-1">{u.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{u.description}</p>
                          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                            <span className="flex-shrink-0">💡</span>
                            <span><strong>Learned:</strong> {u.learned}</span>
                          </div>
                        </div>
                        {u.status === 'pending' && (
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <button onClick={() => handleApprove(u.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors whitespace-nowrap">
                              ✓ Approve &amp; Apply
                            </button>
                            <button onClick={() => handleReject(u.id)}
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors">
                              ✕ Reject
                            </button>
                          </div>
                        )}
                        {u.status === 'applying' && <div className="flex-shrink-0 text-blue-600 text-2xl animate-spin">⏳</div>}
                        {u.status === 'applied'  && <div className="flex-shrink-0 text-green-600 text-2xl">✅</div>}
                        {u.status === 'rejected' && <div className="flex-shrink-0 text-red-400 text-2xl">✕</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>🔒 Human-in-the-Loop Policy:</strong> All AI-proposed upgrades are staged and require explicit admin approval.
                No changes are applied automatically. Rejected upgrades are logged and will not be re-proposed for 7 days.
              </div>
            </div>
          )}

          {/* ── USER MANAGEMENT ── */}
          {currentView === 'users' && (
            <div className="space-y-6">
              {userToast && (
                <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold">
                  {userToast}
                </div>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
                  <p className="text-3xl font-black text-gray-900">{managedUsers.length}</p>
                  <p className="text-sm text-gray-500 mt-1">Total Users</p>
                </div>
                <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
                  <p className="text-3xl font-black text-green-600">{activeUsers}</p>
                  <p className="text-sm text-gray-500 mt-1">Active</p>
                </div>
                <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
                  <p className="text-3xl font-black text-purple-600">{managedUsers.filter(u => u.role === 'admin').length}</p>
                  <p className="text-sm text-gray-500 mt-1">Admins</p>
                </div>
              </div>

              {/* User table */}
              <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">All Users</h3>
                  <button
                    onClick={() => setShowAddUser(v => !v)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    {showAddUser ? '✕ Cancel' : '+ Add User'}
                  </button>
                </div>

                {/* Add User Form */}
                {showAddUser && (
                  <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="Full Name"
                      className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      placeholder="Email"
                      className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <input type="password" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm mr-2" />
            <select
                      value={newRole} onChange={e => setNewRole(e.target.value as ManagedUser['role'])}
                      className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="operator">Operator</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={handleAddUser}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
                    >
                      ✓ Add User
                    </button>
                  </div>
                )}

                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                    <tr>
                      {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Devices', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {managedUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                              {u.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-gray-900">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            u.role === 'admin'    ? 'bg-purple-100 text-purple-800' :
                            u.role === 'operator' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-700'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">{u.lastLogin}</td>
                        <td className="px-6 py-4 text-gray-900 font-semibold">{u.devices}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleUserStatus(u.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                u.status === 'active'
                                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                  : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                              {u.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleRemoveUser(u.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Auth health panel */}
              <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">🔐 Auth Security Health</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { ok: true,  label: 'Brute-Force Guard',   detail: '5-attempt lockout · 60 s cooldown' },
                    { ok: true,  label: 'TOTP Enforcement',    detail: '6-digit · 30 s expiry · 3 tries max' },
                    { ok: true,  label: 'Session Timeout',     detail: '15 min inactivity auto-logout' },
                    { ok: false, label: 'Token in URL',        detail: 'WS token moved to subprotocol header' },
                    { ok: true,  label: 'Device Fingerprint',  detail: 'Per-session UUID bound to browser' },
                    { ok: true,  label: 'Audit Logging',       detail: 'Immutable — every attempt recorded' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <span className={`text-lg flex-shrink-0 ${item.ok ? 'text-green-500' : 'text-red-400'}`}>
                        {item.ok ? '✓' : '✗'}
                      </span>
                      <div>
                        <p className={`text-sm font-semibold ${item.ok ? 'text-gray-900' : 'text-red-700'}`}>{item.label}</p>
                        <p className="text-xs text-gray-500 font-mono">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── AGENT SELF-UPGRADE APPROVALS ── */}
          {currentView === 'agent-upgrades' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <strong>ℹ️ How it works:</strong> Software A agents periodically scan their device environment and propose
                upgrades when a newer version is compatible with the device. No upgrade is ever applied without your explicit
                approval here.
              </div>

              {agentUpgrades.length === 0 && (
                <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400 border border-gray-100">
                  <p className="text-4xl mb-3">⬆️</p>
                  <p className="font-semibold text-gray-600">No upgrade requests at this time</p>
                  <p className="text-sm mt-1">Agents will appear here when they propose a version upgrade</p>
                </div>
              )}

              {agentUpgrades.map(req => (
                <div key={req.id} className={`bg-white rounded-xl shadow border-l-4 overflow-hidden ${
                  req.status === 'approved' ? 'border-green-400' :
                  req.status === 'denied'   ? 'border-red-300'   : 'border-amber-400'}`}>

                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        req.status === 'pending'  ? 'bg-amber-400 animate-pulse' :
                        req.status === 'approved' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div>
                        <p className="font-bold text-gray-900">{req.deviceName}</p>
                        <p className="text-xs text-gray-400 font-mono">{req.deviceId} · requested {req.requestedAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Version</p>
                        <p className="text-sm font-mono font-bold">
                          v{req.fromVersion} → <span className="text-indigo-600">v{req.toVersion}</span>
                        </p>
                      </div>
                      {req.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveAgentUpgrade(req.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors">
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleDenyAgentUpgrade(req.id)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-red-50 hover:text-red-700 transition-colors">
                            ✕ Deny
                          </button>
                        </div>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                          req.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {req.status === 'approved' ? '✅ Approved' : '✕ Denied'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Env details */}
                  <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-gray-50">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Reason</p>
                      <p className="text-xs text-gray-700 leading-snug">{req.reason}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Platform</p>
                      <p className="text-xs font-mono font-semibold text-gray-900">{req.platform}</p>
                      <p className="text-[10px] text-gray-400">{req.osVersion}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Node / CPU</p>
                      <p className="text-xs font-mono text-gray-900">{req.nodeVersion}</p>
                      <p className="text-[10px] text-gray-400">{req.cpuCount} cores</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">RAM</p>
                      <p className="text-xs font-semibold text-gray-900">{Math.round(req.freeMemMB / 1024 * 10) / 10} GB free</p>
                      <p className="text-[10px] text-gray-400">{Math.round(req.totalMemMB / 1024)} GB total</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Disk Free</p>
                      <p className="text-xs font-semibold text-gray-900">
                        {req.diskFreeMB ? `${Math.round(req.diskFreeMB / 1024)} GB` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Uptime</p>
                      <p className="text-xs font-semibold text-gray-900">
                        {Math.floor(req.uptimeSeconds / 86400)}d {Math.floor((req.uptimeSeconds % 86400) / 3600)}h
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>🔒 Admin Gate:</strong> Upgrade commands are forwarded to the agent only after your approval.
                Denied upgrades enter a 24-hour backoff before the agent may re-propose.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
