import { useState } from 'react';
import { 
  QrCode, 
  Link2, 
  Smartphone,
  Monitor,
  Copy,
  Check,
  Zap,
  Shield,
  Clock,
  Download,
  Mail,
  MessageSquare,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { copyToClipboard } from '../utils/clipboard';
import { toast } from 'sonner@2.0.3';

interface ConnectionSetupProps {
  onBack: () => void;
}

export function ConnectionSetup({ onBack }: ConnectionSetupProps) {
  const [copied, setCopied] = useState(false);
  const [bixtxId, setbixtx.comId] = useState('BIXTX-8X9K-M4P2');
  const [installLink, setInstallLink] = useState('https://bixtx.com/install/auto-8x9k');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkType, setLinkType] = useState<'universal' | 'platform'>('universal');
  const [androidInstallType, setAndroidInstallType] = useState<'playstore' | 'apk'>('apk');
  const [showExpirationDialog, setShowExpirationDialog] = useState(false);
  const [expirationHours, setExpirationHours] = useState(24); // Default 24 hours
  const [customDays, setCustomDays] = useState('');
  const [customHours, setCustomHours] = useState('');
  const [platformLinks, setPlatformLinks] = useState({
    windows: 'https://bixtx.com/install/win-8x9k',
    macos: 'https://bixtx.com/install/mac-8x9k',
    linux: 'https://bixtx.com/install/linux-8x9k',
    android: 'https://bixtx.com/install/android-8x9k',
    androidApk: 'https://bixtx.com/download/android/bixtx.comAI-v2.4.1.apk',
    ios: 'https://bixtx.com/install/ios-8x9k'
  });
  
  // OS-specific download links for manual installation
  const downloadLinks = {
    windows: 'https://bixtx.com/download/windows/bixtx.comAI-Setup-v2.4.1.exe',
    macos: 'https://bixtx.com/download/macos/bixtx.comAI-v2.4.1.dmg',
    linux: 'https://bixtx.com/download/linux/bixtx.comAI-v2.4.1.AppImage',
    android: 'https://play.google.com/store/apps/details?id=ai.bixtx.remote',
    androidApk: 'https://bixtx.com/download/android/bixtx.comAI-v2.4.1.apk',
    ios: 'https://apps.apple.com/app/bixtx-ai-remote-access/id123456789'
  };

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (os: string, link: string) => {
    window.open(link, '_blank');
    console.log(`Downloading ${os} installer...`);
  };

  const handleGenerateNewId = () => {
    // Generate random bixtx ID
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const parts = [];
    for (let i = 0; i < 3; i++) {
      let part = '';
      for (let j = 0; j < 4; j++) {
        part += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      parts.push(part);
    }
    const newId = `BIXTX-${parts.join('-')}`;
    setbixtx.comId(newId);
    toast.success('New bixtx ID generated successfully!');
  };

  const handleGenerateNewLink = () => {
    setIsGeneratingLink(true);
    // Generate random link suffix
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let suffix = '';
    for (let i = 0; i < 8; i++) {
      suffix += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Generate universal smart link and platform-specific links
    const newUniversalLink = `https://bixtx.com/install/auto-${suffix}`;
    const newPlatformLinks = {
      windows: `https://bixtx.com/install/win-${suffix}`,
      macos: `https://bixtx.com/install/mac-${suffix}`,
      linux: `https://bixtx.com/install/linux-${suffix}`,
      android: `https://bixtx.com/install/android-${suffix}`,
      androidApk: `https://bixtx.com/download/android/bixtx.comAI-v2.4.1.apk`,
      ios: `https://bixtx.com/install/ios-${suffix}`
    };
    
    // Simulate generation delay
    setTimeout(() => {
      setInstallLink(newUniversalLink);
      setPlatformLinks(newPlatformLinks);
      setIsGeneratingLink(false);
      toast.success('New installation links generated!', {
        description: 'Universal and platform-specific links are ready.',
      });
    }, 800);
  };

  const handleSendEmail = () => {
    const linkToSend = linkType === 'universal' ? installLink : Object.entries(platformLinks).map(([platform, link]) => `${platform.toUpperCase()}: ${link}`).join('\n');
    const subject = encodeURIComponent('bixtx.com - Remote Access Installation');
    const body = encodeURIComponent(
      linkType === 'universal' 
        ? `Hello,\n\nI'd like to share remote access with you using bixtx.com.\n\nPlease click the link below to install bixtx.com and establish a secure connection:\n\n${installLink}\n\nThis universal link automatically detects your device and installs the correct version.\n\nBest regards`
        : `Hello,\n\nI'd like to share remote access with you using bixtx.com.\n\nPlease click the link for your platform:\n\n${linkToSend}\n\nThese links provide direct installation for your specific device.\n\nBest regards`
    );
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    
    try {
      window.location.href = mailtoLink;
      toast.success('Email client opened!', {
        description: 'Please complete sending the email.',
      });
    } catch (error) {
      toast.error('Could not open email client', {
        description: 'Please copy the link manually.',
      });
    }
  };

  const handleSendSMS = () => {
    const message = encodeURIComponent(
      linkType === 'universal'
        ? `Install bixtx for remote access: ${installLink}`
        : `Install bixtx.com: ${installLink} (Auto-detects your device)`
    );
    const smsLink = `sms:?body=${message}`;
    
    try {
      window.location.href = smsLink;
      toast.success('SMS app opened!', {
        description: 'Please select a contact and send.',
      });
    } catch (error) {
      toast.error('Could not open SMS app', {
        description: 'Please copy the link manually.',
      });
    }
  };

  const handleSetExpiration = () => {
    setShowExpirationDialog(true);
  };

  const handleSaveExpiration = () => {
    let totalHours = 0;
    
    // Calculate total hours from custom inputs
    if (customDays) {
      const days = parseInt(customDays);
      if (days > 30) {
        toast.error('Maximum expiration is 30 days');
        return;
      }
      totalHours += days * 24;
    }
    if (customHours) {
      totalHours += parseInt(customHours);
    }
    
    // Validate total hours doesn't exceed 30 days (720 hours)
    if (totalHours > 720) {
      toast.error('Maximum expiration is 30 days (720 hours)');
      return;
    }
    
    if (totalHours === 0) {
      toast.error('Please set a valid expiration time');
      return;
    }
    
    setExpirationHours(totalHours);
    
    // Format display message
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    let timeDisplay = '';
    if (days > 0) {
      timeDisplay = `${days} day${days > 1 ? 's' : ''}`;
      if (hours > 0) {
        timeDisplay += ` and ${hours} hour${hours > 1 ? 's' : ''}`;
      }
    } else {
      timeDisplay = `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    
    toast.success('Expiration time set!', {
      description: `Session will expire in ${timeDisplay}.`,
    });
    setShowExpirationDialog(false);
    setCustomDays('');
    setCustomHours('');
  };

  const handleQuickExpiration = (hours: number) => {
    setExpirationHours(hours);
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    let timeDisplay = '';
    if (days > 0) {
      timeDisplay = `${days} day${days > 1 ? 's' : ''}`;
      if (remainingHours > 0) {
        timeDisplay += ` and ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
      }
    } else {
      timeDisplay = `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    
    toast.success('Expiration time set!', {
      description: `Session will expire in ${timeDisplay}.`,
    });
    setShowExpirationDialog(false);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-white mb-2">Connect New Device</h1>
        <p className="text-slate-400">Multiple ways to establish AI-powered remote access</p>
      </div>

      {/* Connection Methods */}
      <Tabs defaultValue="qr" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="qr" className="data-[state=active]:bg-slate-800">
            <QrCode className="w-4 h-4 mr-2" />
            QR Code
          </TabsTrigger>
          <TabsTrigger value="id" className="data-[state=active]:bg-slate-800">
            <Zap className="w-4 h-4 mr-2" />
            bixtx ID
          </TabsTrigger>
          <TabsTrigger value="auto" className="data-[state=active]:bg-slate-800">
            <Link2 className="w-4 h-4 mr-2" />
            Auto Install
          </TabsTrigger>
          <TabsTrigger value="manual" className="data-[state=active]:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Manual Setup
          </TabsTrigger>
        </TabsList>

        {/* QR Code Method */}
        <TabsContent value="qr" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-800 p-8">
              <div className="text-center">
                <h2 className="text-xl text-white mb-4">Scan QR Code</h2>
                <p className="text-slate-400 mb-6">Scan with your mobile device to connect instantly</p>
                
                {/* QR Code Placeholder */}
                <div className="bg-white p-8 rounded-xl inline-block mb-6">
                  <div className="w-64 h-64 bg-slate-900 rounded-lg flex items-center justify-center">
                    <QrCode className="w-32 h-32 text-cyan-400" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
                    Active • Expires in 5:00
                  </Badge>
                  <p className="text-sm text-slate-400">Session ID: {bixtxId}</p>
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/30 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-cyan-500/20 rounded-lg">
                    <Smartphone className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-white mb-2">For Mobile Devices</h3>
                    <ol className="space-y-2 text-sm text-slate-300">
                      <li>1. Open bixtx.com mobile app</li>
                      <li>2. Tap "Scan QR Code"</li>
                      <li>3. Point camera at QR code</li>
                      <li>4. Connection established automatically</li>
                    </ol>
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900 border-slate-800 p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white mb-2">Security Features</h3>
                    <ul className="space-y-2 text-sm text-slate-400">
                      <li>• End-to-end AES-256 encryption</li>
                      <li>• Auto-expiring session (5 minutes)</li>
                      <li>• One-time use QR code</li>
                      <li>• AI-based threat detection</li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Button 
                onClick={onBack}
                variant="outline" 
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* bixtx ID Method */}
        <TabsContent value="id" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-800 p-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl text-white mb-2">Your bixtx ID</h2>
                <p className="text-slate-400">Share this ID to allow remote connections</p>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">bixtx ID</span>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Active</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Input 
                    value={bixtxId} 
                    readOnly 
                    className="bg-slate-900 border-slate-700 text-white text-xl text-center tracking-wider"
                  />
                  <Button 
                    onClick={() => handleCopy(bixtxId)}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleGenerateNewId}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
                >
                  Generate New ID
                </Button>
                <Button 
                  onClick={handleSetExpiration}
                  variant="outline" 
                  className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Set Expiration Time
                </Button>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="bg-slate-900 border-slate-800 p-6">
                <h3 className="text-white mb-4">How to Connect</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-cyan-400">1</span>
                    </div>
                    <div>
                      <p className="text-white mb-1">Share Your bixtx ID</p>
                      <p className="text-sm text-slate-400">Send your ID to the person you want to connect with</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-cyan-400">2</span>
                    </div>
                    <div>
                      <p className="text-white mb-1">They Enter Your ID</p>
                      <p className="text-sm text-slate-400">They input your ID in their bixtx.com app</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-cyan-400">3</span>
                    </div>
                    <div>
                      <p className="text-white mb-1">Approve Connection</p>
                      <p className="text-sm text-slate-400">Accept the connection request when prompted</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-cyan-400">4</span>
                    </div>
                    <div>
                      <p className="text-white mb-1">AI Auto-Optimization</p>
                      <p className="text-sm text-slate-400">Connection automatically optimizes for best performance</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border-purple-500/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-purple-400" />
                  <h3 className="text-white">Privacy & Security</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>• Unique ID regenerated on demand</li>
                  <li>• Temporary session keys</li>
                  <li>• 2FA authentication support</li>
                  <li>• Session auto-timeout protection</li>
                </ul>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Auto Install Method */}
        <TabsContent value="auto" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-800 p-8">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Link2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl text-white text-center mb-2">Auto-Install Link</h2>
                <p className="text-slate-400 text-center">One-click installation for remote devices</p>
              </div>

              {/* Link Type Toggle */}
              <div className="flex gap-2 mb-6">
                <Button
                  onClick={() => setLinkType('universal')}
                  variant={linkType === 'universal' ? 'default' : 'outline'}
                  className={linkType === 'universal' 
                    ? 'flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                    : 'flex-1 bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                  }
                >
                  Universal Link
                </Button>
                <Button
                  onClick={() => setLinkType('platform')}
                  variant={linkType === 'platform' ? 'default' : 'outline'}
                  className={linkType === 'platform' 
                    ? 'flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                    : 'flex-1 bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                  }
                >
                  Platform-Specific
                </Button>
              </div>

              {/* Universal Link Display */}
              {linkType === 'universal' && (
                <div className="bg-slate-800 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Smart Link (Auto-detects OS)</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Universal</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input 
                      value={installLink} 
                      readOnly 
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <Button 
                      onClick={() => handleCopy(installLink)}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">This link automatically detects the device OS and installs the correct version</p>
                </div>
              )}

              {/* Platform-Specific Links Display */}
              {linkType === 'platform' && (
                <div className="space-y-3 mb-6">
                  <div className="text-sm text-slate-400 mb-3">Platform-Specific Installation Links</div>
                  
                  {/* Desktop Platforms */}
                  {['windows', 'macos', 'linux'].map((platform) => (
                    <div key={platform} className="bg-slate-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-cyan-400" />
                          <span className="text-white text-sm capitalize">{platform}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(platformLinks[platform as keyof typeof platformLinks])}
                          className="h-8 px-2 bg-slate-700 hover:bg-slate-600 text-white"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500 font-mono break-all">{platformLinks[platform as keyof typeof platformLinks]}</p>
                    </div>
                  ))}
                  
                  {/* Android - Direct APK */}
                  <div className="bg-slate-800 rounded-lg p-3 border-2 border-orange-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-orange-400" />
                        <span className="text-white text-sm">Android (Direct APK)</span>
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">No Play Store</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(platformLinks.androidApk)}
                        className="h-8 px-2 bg-slate-700 hover:bg-slate-600 text-white"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 font-mono break-all mb-2">{platformLinks.androidApk}</p>
                    <p className="text-xs text-orange-400/80">⚠️ Requires "read only Sources" permission</p>
                  </div>
                  
                  {/* Android - Play Store */}
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-purple-400" />
                        <span className="text-white text-sm">Android (Play Store)</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(platformLinks.android)}
                        className="h-8 px-2 bg-slate-700 hover:bg-slate-600 text-white"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 font-mono break-all">{platformLinks.android}</p>
                  </div>
                  
                  {/* iOS - App Store Only */}
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-purple-400" />
                        <span className="text-white text-sm">iOS (App Store Only)</span>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Required</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(platformLinks.ios)}
                        className="h-8 px-2 bg-slate-700 hover:bg-slate-600 text-white"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 font-mono break-all mb-2">{platformLinks.ios}</p>
                    <p className="text-xs text-slate-500">ℹ️ iOS requires App Store for security compliance</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button 
                  onClick={handleGenerateNewLink}
                  disabled={isGeneratingLink}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                >
                  {isGeneratingLink ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Generate New Links
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleSendEmail}
                  variant="outline" 
                  className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Send via Email
                </Button>
                <Button 
                  onClick={handleSendSMS}
                  variant="outline" 
                  className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Send via SMS
                </Button>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/30 p-6">
                <h3 className="text-white mb-4">How Auto-Install Works</h3>
                <ol className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 text-green-400">1</span>
                    <span>Copy the installation link above</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 text-green-400">2</span>
                    <span>Share link via email, SMS, or messaging app</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 text-green-400">3</span>
                    <span>Recipient opens link on their device</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 text-green-400">4</span>
                    <span>Link detects OS and downloads correct installer</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 text-green-400">5</span>
                    <span>Device appears in your dashboard within 30-60 seconds</span>
                  </li>
                </ol>
              </Card>

              <Card className="bg-slate-900 border-slate-800 p-6">
                <h3 className="text-white mb-4">Smart Link Detection</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Automatically detects Windows, macOS, Linux</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Android: Direct APK or Play Store option</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>iOS: App Store only (Apple requirement)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Silent installation on desktop platforms</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Bypass app stores with direct APK</span>
                  </li>
                </ul>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/30 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-white">Security Features</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>• One-time use installation links</li>
                  <li>• Links expire after first use or 24 hours</li>
                  <li>• Encrypted connection during installation</li>
                  <li>• Device verification before activation</li>
                </ul>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Manual Setup Method */}
        <TabsContent value="manual" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 p-8">
            <h2 className="text-2xl text-white mb-6">Manual Installation</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Button 
                className="h-auto flex-col items-start gap-3 p-6 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-cyan-500 transition-all"
                onClick={() => handleDownload('windows', downloadLinks.windows)}
              >
                <Monitor className="w-8 h-8 text-cyan-400" />
                <div className="text-left">
                  <p className="text-white mb-1">Windows</p>
                  <p className="text-sm text-slate-400">bixtx.comAI-Setup.exe</p>
                  <p className="text-xs text-slate-500 mt-2 break-all">v2.4.1</p>
                </div>
                <Download className="w-5 h-5 text-slate-400 ml-auto" />
              </Button>

              <Button 
                className="h-auto flex-col items-start gap-3 p-6 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-cyan-500 transition-all"
                onClick={() => handleDownload('macos', downloadLinks.macos)}
              >
                <Monitor className="w-8 h-8 text-cyan-400" />
                <div className="text-left">
                  <p className="text-white mb-1">macOS</p>
                  <p className="text-sm text-slate-400">bixtx.comAI.dmg</p>
                  <p className="text-xs text-slate-500 mt-2 break-all">v2.4.1</p>
                </div>
                <Download className="w-5 h-5 text-slate-400 ml-auto" />
              </Button>

              <Button 
                className="h-auto flex-col items-start gap-3 p-6 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-cyan-500 transition-all"
                onClick={() => handleDownload('linux', downloadLinks.linux)}
              >
                <Monitor className="w-8 h-8 text-cyan-400" />
                <div className="text-left">
                  <p className="text-white mb-1">Linux</p>
                  <p className="text-sm text-slate-400">bixtx.comAI.AppImage</p>
                  <p className="text-xs text-slate-500 mt-2 break-all">v2.4.1</p>
                </div>
                <Download className="w-5 h-5 text-slate-400 ml-auto" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Button 
                className="h-auto flex-col items-start gap-3 p-6 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-purple-500 transition-all"
                onClick={() => handleDownload('android', downloadLinks.android)}
              >
                <Smartphone className="w-8 h-8 text-purple-400" />
                <div className="text-left">
                  <p className="text-white mb-1">Android</p>
                  <p className="text-sm text-slate-400">Download from Play Store</p>
                </div>
                <Download className="w-5 h-5 text-slate-400 ml-auto" />
              </Button>

              <Button 
                className="h-auto flex-col items-start gap-3 p-6 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-purple-500 transition-all"
                onClick={() => handleDownload('ios', downloadLinks.ios)}
              >
                <Smartphone className="w-8 h-8 text-purple-400" />
                <div className="text-left">
                  <p className="text-white mb-1">iOS</p>
                  <p className="text-sm text-slate-400">Download from App Store</p>
                </div>
                <Download className="w-5 h-5 text-slate-400 ml-auto" />
              </Button>
            </div>

            {/* Download Links Section */}
            <div className="border-t border-slate-800 pt-6">
              <h3 className="text-white mb-4">Direct Download Links</h3>
              <div className="space-y-3">
                {Object.entries(downloadLinks).map(([platform, link]) => (
                  <div key={platform} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
                    <div className="flex-1">
                      <p className="text-white text-sm capitalize mb-1">{platform}</p>
                      <p className="text-slate-400 text-xs font-mono break-all">{link}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(link)}
                      className="bg-slate-700 hover:bg-slate-600 text-white"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Expiration Dialog */}
      <Dialog open={showExpirationDialog} onOpenChange={setShowExpirationDialog}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Set Expiration Time</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure expiration time for the bixtx ID session (Maximum: 30 days)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Quick Presets */}
            <div>
              <Label className="text-white mb-3 block">Quick Presets</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickExpiration(1)}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-cyan-600 hover:border-cyan-600"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  1 Hour
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickExpiration(6)}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-cyan-600 hover:border-cyan-600"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  6 Hours
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickExpiration(24)}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-cyan-600 hover:border-cyan-600"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  1 Day
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickExpiration(72)}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-cyan-600 hover:border-cyan-600"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  3 Days
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickExpiration(168)}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-cyan-600 hover:border-cyan-600"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  7 Days
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickExpiration(720)}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-cyan-600 hover:border-cyan-600"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  30 Days
                </Button>
              </div>
            </div>

            {/* Custom Time */}
            <div className="border-t border-slate-800 pt-4">
              <Label className="text-white mb-3 block">Custom Time</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customDays" className="text-slate-400 text-sm mb-2 block">Days (0-30)</Label>
                  <Input
                    id="customDays"
                    type="number"
                    min="0"
                    max="30"
                    placeholder="0"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="customHours" className="text-slate-400 text-sm mb-2 block">Hours (0-23)</Label>
                  <Input
                    id="customHours"
                    type="number"
                    min="0"
                    max="23"
                    placeholder="0"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">⚠️ Maximum combined time: 30 days (720 hours)</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowExpirationDialog(false)}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveExpiration}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply Custom Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}