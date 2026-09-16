import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Shield, 
  CheckCircle2, 
  Lock, 
  Eye,
  Code,
  RefreshCw,
  Globe,
  AlertTriangle,
  FileCheck,
  Activity
} from 'lucide-react';

export function SecurityDocumentation() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Security & Compliance Documentation</h1>
        <p className="text-slate-400">
          How bixtx.com is hardened against antiviruses and browser updates
        </p>
      </div>

      {/* Overview */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-start">
          <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mr-4">
            <Shield className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl mb-2">Antivirus & Browser Compliant Design</h2>
            <p className="text-slate-400 mb-4">
              bixtx.com is built with security best practices and browser standards to ensure smooth operation 
              without triggering antivirus warnings or breaking during browser updates.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-600">Transparent Operations</Badge>
              <Badge className="bg-green-600">Standard APIs Only</Badge>
              <Badge className="bg-green-600">User Consent First</Badge>
              <Badge className="bg-green-600">Future-Proof Architecture</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Key Security Features */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Explicit Permission Management */}
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-center mb-4">
            <Lock className="w-5 h-5 text-cyan-500 mr-2" />
            <h3 className="text-lg">Explicit Permission Management</h3>
          </div>
          <ul className="space-y-3 text-sm text-slate-400">
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>All sensitive permissions require explicit user consent</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Camera and microphone access requested only when needed</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Screen sharing requires user selection every time</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Users can revoke permissions at any time</span>
            </li>
          </ul>
        </Card>

        {/* Transparent Operations */}
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-center mb-4">
            <Eye className="w-5 h-5 text-cyan-500 mr-2" />
            <h3 className="text-lg">Transparent Operations</h3>
          </div>
          <ul className="space-y-3 text-sm text-slate-400">
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Complete audit log of all security events</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>No hidden background processes</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>All data access logged and visible to users</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Open source security modules for verification</span>
            </li>
          </ul>
        </Card>

        {/* Standard Web APIs */}
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-center mb-4">
            <Code className="w-5 h-5 text-cyan-500 mr-2" />
            <h3 className="text-lg">Standard Web APIs Only</h3>
          </div>
          <ul className="space-y-3 text-sm text-slate-400">
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Uses official WebRTC for peer-to-peer connections</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>MediaDevices API for camera and microphone</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Standard Clipboard API with fallbacks</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>No browser extensions or native modules required</span>
            </li>
          </ul>
        </Card>

        {/* Browser Update Resilience */}
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-center mb-4">
            <RefreshCw className="w-5 h-5 text-cyan-500 mr-2" />
            <h3 className="text-lg">Browser Update Resilience</h3>
          </div>
          <ul className="space-y-3 text-sm text-slate-400">
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Feature detection instead of browser sniffing</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Multiple fallback methods for each feature</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Graceful degradation when features unavailable</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Automatic compatibility checks on startup</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Technical Implementation */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center mb-4">
          <FileCheck className="w-5 h-5 text-cyan-500 mr-2" />
          <h2 className="text-xl">Technical Implementation</h2>
        </div>
        
        <div className="space-y-6">
          {/* Permission System */}
          <div>
            <h4 className="mb-3 flex items-center">
              <Lock className="w-4 h-4 text-cyan-500 mr-2" />
              Permission Management System
            </h4>
            <div className="pl-6 space-y-2 text-sm text-slate-400">
              <p>
                <strong className="text-slate-300">Secure Context Requirement:</strong> All sensitive APIs only work in HTTPS or localhost
              </p>
              <p>
                <strong className="text-slate-300">Permission Checking:</strong> Verifies permission status before attempting access
              </p>
              <p>
                <strong className="text-slate-300">User Prompts:</strong> Clear, contextual permission requests with explanations
              </p>
              <p>
                <strong className="text-slate-300">Fallback Methods:</strong> Alternative approaches when permissions denied
              </p>
            </div>
          </div>

          {/* Feature Detection */}
          <div>
            <h4 className="mb-3 flex items-center">
              <Activity className="w-4 h-4 text-cyan-500 mr-2" />
              Feature Detection Engine
            </h4>
            <div className="pl-6 space-y-2 text-sm text-slate-400">
              <p>
                <strong className="text-slate-300">Capability Detection:</strong> Checks for WebRTC, MediaDevices, Clipboard, etc.
              </p>
              <p>
                <strong className="text-slate-300">Browser Fingerprinting:</strong> Identifies browser and version for optimal compatibility
              </p>
              <p>
                <strong className="text-slate-300">Compatibility Scoring:</strong> Rates browser support from 0-100%
              </p>
              <p>
                <strong className="text-slate-300">Real-time Monitoring:</strong> Tracks API availability during runtime
              </p>
            </div>
          </div>

          {/* API Compatibility */}
          <div>
            <h4 className="mb-3 flex items-center">
              <Code className="w-4 h-4 text-cyan-500 mr-2" />
              API Compatibility Layer
            </h4>
            <div className="pl-6 space-y-2 text-sm text-slate-400">
              <p>
                <strong className="text-slate-300">WebRTC Abstraction:</strong> Handles different RTCPeerConnection implementations
              </p>
              <p>
                <strong className="text-slate-300">Clipboard Fallbacks:</strong> Modern Clipboard API → execCommand → manual copy
              </p>
              <p>
                <strong className="text-slate-300">Media Handling:</strong> Supports both modern and legacy getUserMedia APIs
              </p>
              <p>
                <strong className="text-slate-300">Codec Detection:</strong> Automatically selects best available video/audio codec
              </p>
            </div>
          </div>

          {/* Security Compliance */}
          <div>
            <h4 className="mb-3 flex items-center">
              <Shield className="w-4 h-4 text-cyan-500 mr-2" />
              Security Compliance Module
            </h4>
            <div className="pl-6 space-y-2 text-sm text-slate-400">
              <p>
                <strong className="text-slate-300">Audit Logging:</strong> Comprehensive logging of all security-sensitive operations
              </p>
              <p>
                <strong className="text-slate-300">Data Minimization:</strong> Only collects data absolutely necessary for functionality
              </p>
              <p>
                <strong className="text-slate-300">User Control:</strong> Complete data deletion and permission revocation available
              </p>
              <p>
                <strong className="text-slate-300">Compliance Checks:</strong> Automatic verification of security best practices
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Why Antiviruses Won't Flag This */}
      <Card className="p-6 bg-green-500/10 border border-green-500/20">
        <div className="flex items-start">
          <Shield className="w-6 h-6 text-green-500 mr-4 mt-1" />
          <div>
            <h3 className="text-lg text-green-500 mb-3">Why Antiviruses Won't Flag bixtx.com</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <p>
                <strong className="text-slate-300">1. Transparent Permissions:</strong> Every action requires explicit user consent, 
                preventing antivirus flags for unauthorized access.
              </p>
              <p>
                <strong className="text-slate-300">2. Standard Web Technologies:</strong> Uses only browser-native APIs, 
                not suspicious native code or system calls.
              </p>
              <p>
                <strong className="text-slate-300">3. No Obfuscation:</strong> Code is clean, readable, and follows best practices 
                without any code obfuscation that triggers heuristic detection.
              </p>
              <p>
                <strong className="text-slate-300">4. HTTPS Only:</strong> Runs in secure contexts, meeting modern security requirements 
                expected by both browsers and antiviruses.
              </p>
              <p>
                <strong className="text-slate-300">5. User-Initiated Actions:</strong> All remote access features are initiated by the user, 
                not automatically or in the background.
              </p>
              <p>
                <strong className="text-slate-300">6. Open Security Logging:</strong> Complete transparency in operations allows security 
                software to verify legitimate behavior.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Browser Update Protection */}
      <Card className="p-6 bg-cyan-500/10 border border-cyan-500/20">
        <div className="flex items-start">
          <RefreshCw className="w-6 h-6 text-cyan-500 mr-4 mt-1" />
          <div>
            <h3 className="text-lg text-cyan-500 mb-3">Protection Against Browser Updates</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <p>
                <strong className="text-slate-300">Future-Proof Architecture:</strong> Built on stable, standardized web APIs 
                that are unlikely to change.
              </p>
              <p>
                <strong className="text-slate-300">Progressive Enhancement:</strong> Core functionality works even if advanced 
                features become unavailable.
              </p>
              <p>
                <strong className="text-slate-300">Automatic Fallbacks:</strong> Multiple implementation methods ensure continuous 
                operation across browser versions.
              </p>
              <p>
                <strong className="text-slate-300">Runtime Detection:</strong> Checks feature availability at runtime, adapting 
                to new browser capabilities or restrictions.
              </p>
              <p>
                <strong className="text-slate-300">Compatibility Monitoring:</strong> System Health Monitor alerts users to 
                browser compatibility issues.
              </p>
              <p>
                <strong className="text-slate-300">Vendor Prefixes:</strong> Supports both standard and prefixed API versions 
                for maximum compatibility.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Best Practices */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center mb-4">
          <Globe className="w-5 h-5 text-cyan-500 mr-2" />
          <h2 className="text-xl">Recommended Deployment Practices</h2>
        </div>
        <div className="space-y-3 text-sm text-slate-400">
          <p>
            <strong className="text-slate-300">1. HTTPS Deployment:</strong> Always deploy over HTTPS to ensure secure context 
            and full API access.
          </p>
          <p>
            <strong className="text-slate-300">2. Content Security Policy:</strong> Implement CSP headers to prevent XSS and 
            demonstrate security to browsers.
          </p>
          <p>
            <strong className="text-slate-300">3. Regular Updates:</strong> Keep dependencies up to date to maintain compatibility 
            with latest browser versions.
          </p>
          <p>
            <strong className="text-slate-300">4. Browser Testing:</strong> Test regularly on Chrome, Firefox, Safari, and Edge 
            to ensure cross-browser compatibility.
          </p>
          <p>
            <strong className="text-slate-300">5. Error Monitoring:</strong> Implement error tracking to catch compatibility issues 
            early in production.
          </p>
          <p>
            <strong className="text-slate-300">6. User Education:</strong> Provide clear documentation on browser requirements 
            and permission needs.
          </p>
        </div>
      </Card>
    </div>
  );
}
