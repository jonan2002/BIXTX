import { 
  Zap, 
  Monitor, 
  Shield, 
  Smartphone,
  Globe,
  Lock,
  Activity,
  Users,
  ArrowRight,
  CheckCircle,
  Star,
  TrendingUp
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface HomePageProps {
  onUserLogin: () => void;
  onAdminLogin: () => void;
}

export function HomePage({ onUserLogin, onAdminLogin }: HomePageProps) {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl text-white">bixtx.com</h1>
                <p className="text-xs text-slate-400">Super-AI Control System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={onUserLogin}
                variant="outline" 
                className="bg-transparent border-slate-700 text-white hover:bg-slate-800"
              >
                Sign In
              </Button>
              <Button 
                onClick={onAdminLogin}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
              >
                Admin Access
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <Badge className="mb-6 bg-cyan-500/20 text-cyan-400 border-cyan-500/30 px-4 py-1.5">
            <Zap className="w-4 h-4 mr-2" />
            AI-Powered Remote Access
          </Badge>
          
          <h2 className="text-6xl text-white mb-6 leading-tight">
            The Future of
            <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent"> Remote Control</span>
          </h2>
          
          <p className="text-xl text-slate-400 mb-8 leading-relaxed">
            Ultra-intelligent, self-optimizing remote access and device management powered by advanced AI.
            Surpassing all traditional systems with unmatched speed, security, and automation.
          </p>
          
          {/* Security Badge */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-4 py-2">
              <Shield className="w-4 h-4 mr-2" />
              Antivirus Safe
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-4 py-2">
              <CheckCircle className="w-4 h-4 mr-2" />
              Browser Compliant
            </Badge>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 px-4 py-2">
              <Lock className="w-4 h-4 mr-2" />
              E2E Encrypted
            </Badge>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <Button 
              onClick={onUserLogin}
              size="lg"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 text-lg px-8 py-6"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="bg-transparent border-slate-700 text-white hover:bg-slate-800 text-lg px-8 py-6"
            >
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Feature Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <Card className="bg-slate-900/50 border-slate-800 p-6 text-center">
            <div className="text-3xl text-cyan-400 mb-2">12ms</div>
            <div className="text-sm text-slate-400">Ultra-Low Latency</div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800 p-6 text-center">
            <div className="text-3xl text-green-400 mb-2">99.9%</div>
            <div className="text-sm text-slate-400">Uptime Guaranteed</div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800 p-6 text-center">
            <div className="text-3xl text-purple-400 mb-2">AES-256</div>
            <div className="text-sm text-slate-400">Military Encryption</div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800 p-6 text-center">
            <div className="text-3xl text-orange-400 mb-2">24/7</div>
            <div className="text-sm text-slate-400">AI Monitoring</div>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20 border-t border-slate-800">
        <div className="text-center mb-12">
          <h3 className="text-4xl text-white mb-4">Supreme AI Capabilities</h3>
          <p className="text-xl text-slate-400">Everything you need for seamless remote access</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="bg-slate-900 border-slate-800 p-8 hover:border-cyan-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <h4 className="text-xl text-white mb-3">AI-Accelerated Connection</h4>
            <p className="text-slate-400 mb-4">
              Instant connections via bixtx ID, QR scan, or smart-link prediction with adaptive latency reduction.
            </p>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Ultra Fast</Badge>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-8 hover:border-green-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <h4 className="text-xl text-white mb-3">Military-Grade Security</h4>
            <p className="text-slate-400 mb-4">
              End-to-end AES-256 encryption, adaptive 2FA, and real-time AI threat detection.
            </p>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Secure</Badge>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-8 hover:border-purple-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-lg flex items-center justify-center mb-4">
              <Monitor className="w-6 h-6 text-purple-400" />
            </div>
            <h4 className="text-xl text-white mb-3">Cross-Platform Control</h4>
            <p className="text-slate-400 mb-4">
              Control any device from anywhere. Mobile-to-PC, PC-to-mobile with AI optimization.
            </p>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Universal</Badge>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-8 hover:border-orange-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-lg flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6 text-orange-400" />
            </div>
            <h4 className="text-xl text-white mb-3">Mobile Intelligence</h4>
            <p className="text-slate-400 mb-4">
              Total PC control from mobile with touch gestures auto-translated by AI.
            </p>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Smart</Badge>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-8 hover:border-blue-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-lg flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <h4 className="text-xl text-white mb-3">Self-Healing Networks</h4>
            <p className="text-slate-400 mb-4">
              Auto-reconnects on unstable networks with AI-powered session recovery.
            </p>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Reliable</Badge>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-8 hover:border-pink-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500/20 to-rose-600/20 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-pink-400" />
            </div>
            <h4 className="text-xl text-white mb-3">Team Collaboration</h4>
            <p className="text-slate-400 mb-4">
              Multi-user sessions with AI co-pilot, smart chat, and intelligent whiteboard tools.
            </p>
            <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Collaborative</Badge>
          </Card>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="container mx-auto px-6 py-20 border-t border-slate-800">
        <div className="text-center mb-12">
          <h3 className="text-4xl text-white mb-4">Perfect For Every Need</h3>
          <p className="text-xl text-slate-400">Trusted by professionals worldwide</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/30 p-8">
            <Globe className="w-10 h-10 text-cyan-400 mb-4" />
            <h4 className="text-xl text-white mb-3">IT Support Teams</h4>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Remote troubleshooting and fixes</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Multi-session management</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Detailed session logs</span>
              </li>
            </ul>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border-purple-500/30 p-8">
            <Lock className="w-10 h-10 text-purple-400 mb-4" />
            <h4 className="text-xl text-white mb-3">Enterprise Security</h4>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <span>Role-based access control</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <span>Compliance-ready audit logs</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <span>AI threat detection</span>
              </li>
            </ul>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/30 p-8">
            <TrendingUp className="w-10 h-10 text-green-400 mb-4" />
            <h4 className="text-xl text-white mb-3">Remote Workers</h4>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Access work devices anywhere</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Seamless file synchronization</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Productivity analytics</span>
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-6 py-20 border-t border-slate-800">
        <div className="text-center mb-12">
          <h3 className="text-4xl text-white mb-4">Trusted by Industry Leaders</h3>
          <p className="text-xl text-slate-400">See what our users say</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <p className="text-slate-300 mb-4">
              "bixtx has completely transformed our remote support operations. The AI optimization is incredible!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full"></div>
              <div>
                <p className="text-white">Sarah Johnson</p>
                <p className="text-sm text-slate-400">IT Director</p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <p className="text-slate-300 mb-4">
              "The security features are unmatched. We feel confident managing sensitive devices remotely."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full"></div>
              <div>
                <p className="text-white">Michael Chen</p>
                <p className="text-sm text-slate-400">Security Manager</p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <p className="text-slate-300 mb-4">
              "Best remote access solution we've ever used. The mobile app is particularly impressive."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full"></div>
              <div>
                <p className="text-white">Emma Williams</p>
                <p className="text-sm text-slate-400">Product Manager</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 border-t border-slate-800">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-4xl text-white mb-4">Ready to Experience the Future?</h3>
          <p className="text-xl text-slate-400 mb-8">
            Join thousands of organizations using bixtx for seamless remote access
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button 
              onClick={onUserLogin}
              size="lg"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 text-lg px-8 py-6"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              onClick={onAdminLogin}
              size="lg"
              variant="outline"
              className="bg-transparent border-slate-700 text-white hover:bg-slate-800 text-lg px-8 py-6"
            >
              Enterprise Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-white">bixtx.com</span>
              </div>
              <p className="text-sm text-slate-400">
                The most advanced AI-powered remote access platform.
              </p>
            </div>
            
            <div>
              <h4 className="text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Enterprise</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex items-center justify-between">
            <p className="text-sm text-slate-400">© 2025 bixtx.com. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}