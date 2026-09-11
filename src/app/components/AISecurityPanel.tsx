import { useState } from 'react';
import { 
  Shield, 
  Brain,
  Zap,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Cpu,
  Activity,
  Settings,
  TrendingUp,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Switch } from './ui/switch';
import { toast } from 'sonner@2.0.3';

export function AISecurityPanel() {
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [aiLearning, setAILearning] = useState(true);
  const [threatProtection, setThreatProtection] = useState(true);
  const [deviceImmunization, setDeviceImmunization] = useState(true);

  const handleCheckUpdates = () => {
    toast.info('Checking for Updates', {
      description: 'Scanning for latest security patches and AI improvements...'
    });
    setTimeout(() => {
      toast.success('System Up to Date', {
        description: 'All components are running the latest versions'
      });
    }, 2000);
  };

  const handleRunSecurityScan = () => {
    toast.info('Security Scan Started', {
      description: 'Analyzing all monitored devices for vulnerabilities...'
    });
    setTimeout(() => {
      toast.success('Scan Complete', {
        description: 'No threats detected. All devices are secure.'
      });
    }, 3000);
  };

  const handleAIOptimization = () => {
    toast.info('AI Optimization', {
      description: 'Analyzing patterns and optimizing performance...'
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-white mb-2">AI Security & Updates</h1>
        <p className="text-slate-400">Military-grade encryption with comprehensive AI learning and self-update</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/30 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Security Status</p>
              <p className="text-xl text-green-400">Protected</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/30 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Brain className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">AI Learning</p>
              <p className="text-xl text-cyan-400">Active</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border-purple-500/30 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Performance</p>
              <p className="text-xl text-purple-400">Optimal</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-red-600/10 border-orange-500/30 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Eye className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Threats Blocked</p>
              <p className="text-xl text-orange-400">0</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Military-Grade Encryption */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-green-400" />
            <h2 className="text-xl text-white">Military-Grade Encryption</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <ShieldCheck className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-white">AES-256 Encryption</p>
                  <p className="text-sm text-slate-400">All data encrypted end-to-end</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900/50 rounded p-2">
                  <p className="text-slate-400">Cipher</p>
                  <p className="text-white">AES-256-GCM</p>
                </div>
                <div className="bg-slate-900/50 rounded p-2">
                  <p className="text-slate-400">Key Length</p>
                  <p className="text-white">256-bit</p>
                </div>
                <div className="bg-slate-900/50 rounded p-2">
                  <p className="text-slate-400">Protocol</p>
                  <p className="text-white">TLS 1.3</p>
                </div>
                <div className="bg-slate-900/50 rounded p-2">
                  <p className="text-slate-400">Status</p>
                  <p className="text-green-400">Active</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white text-sm">Session Encryption</p>
                    <p className="text-xs text-slate-400">Encrypted remote sessions</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white text-sm">File Transfer Encryption</p>
                    <p className="text-xs text-slate-400">Encrypted file uploads/downloads</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white text-sm">Storage Encryption</p>
                    <p className="text-xs text-slate-400">Encrypted local & cloud storage</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Active
                </Badge>
              </div>
            </div>

            <Button
              onClick={handleRunSecurityScan}
              variant="outline"
              className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              <Shield className="w-4 h-4 mr-2" />
              Run Security Scan
            </Button>
          </div>
        </Card>

        {/* AI Learning & Self-Update */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl text-white">AI Learning & Self-Update</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-white mb-1">Auto Update</p>
                <p className="text-sm text-slate-400">Automatic security patches and updates</p>
              </div>
              <Switch
                checked={autoUpdate}
                onCheckedChange={setAutoUpdate}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-white mb-1">AI Learning</p>
                <p className="text-sm text-slate-400">Continuous improvement from usage patterns</p>
              </div>
              <Switch
                checked={aiLearning}
                onCheckedChange={setAILearning}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-white mb-1">Threat Protection</p>
                <p className="text-sm text-slate-400">AI-powered threat detection</p>
              </div>
              <Switch
                checked={threatProtection}
                onCheckedChange={setThreatProtection}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-white mb-1">Device Immunization</p>
                <p className="text-sm text-slate-400">Auto-adapt to software upgrades</p>
              </div>
              <Switch
                checked={deviceImmunization}
                onCheckedChange={setDeviceImmunization}
              />
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white">AI Learning Progress</p>
                  <p className="text-sm text-slate-400">Training on 2.4M data points</p>
                </div>
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  <Activity className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
              <Progress value={87} className="h-2 mb-2" />
              <p className="text-xs text-slate-400">87% optimization complete</p>
            </div>

            <Button
              onClick={handleCheckUpdates}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check for Updates
            </Button>
          </div>
        </Card>
      </div>

      {/* Device Immunization */}
      <Card className="bg-slate-900 border-slate-800 p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Cpu className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl text-white">Device Immunization</h2>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            Adaptive Technology
          </Badge>
        </div>

        <p className="text-slate-400 mb-6">
          Automatically adapts and immunizes against device software upgrades and security patches, 
          ensuring continuous compatibility and protection.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <p className="text-white">Adaptive Compatibility</p>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              Automatically detects and adapts to OS updates on monitored devices
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">24 devices immunized</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-5 h-5 text-cyan-400" />
              <p className="text-white">Security Hardening</p>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              Strengthens security posture with each device software update
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">152 patches applied</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-5 h-5 text-green-400" />
              <p className="text-white">Zero-Day Protection</p>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              AI-powered detection and mitigation of new vulnerabilities
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">0 threats detected</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Update History */}
      <Card className="bg-slate-900 border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 text-slate-400" />
            <h2 className="text-xl text-white">Recent Updates</h2>
          </div>
          <Button
            onClick={handleAIOptimization}
            variant="outline"
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            <Brain className="w-4 h-4 mr-2" />
            AI Optimization
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white">Security Patch v2.4.1</p>
                <span className="text-sm text-slate-400">2 hours ago</span>
              </div>
              <p className="text-sm text-slate-400">Enhanced encryption protocols and performance improvements</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Brain className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white">AI Model Update</p>
                <span className="text-sm text-slate-400">1 day ago</span>
              </div>
              <p className="text-sm text-slate-400">Improved pattern recognition and threat detection accuracy</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Cpu className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white">Device Immunization Update</p>
                <span className="text-sm text-slate-400">3 days ago</span>
              </div>
              <p className="text-sm text-slate-400">Added compatibility for Android 14 and iOS 17.2</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
