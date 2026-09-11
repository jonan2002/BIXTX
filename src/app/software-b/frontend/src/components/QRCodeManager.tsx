/**
 * QR Code Manager — fully client-side, no backend required.
 * Uses the `qrcode` canvas API to generate codes in-browser.
 * Software A QR codes have no expiry — they are controlled by admin on/off.
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

const INSTALL_BASE = 'https://get.bixtx.com/install/software-a';

interface QREntry {
  id: string;
  label: string;
  url: string;
  dataUrl: string;
  maxScans: number;
  scannedCount: number;
  createdAt: string;
  adminEnabled: boolean;
  status: 'active' | 'revoked';
}

function genId() { return Math.random().toString(36).slice(2, 10).toUpperCase(); }

async function makeQR(url: string): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    QRCode.toCanvas(canvas, url, { width: 220, margin: 2,
      color: { dark: '#2563eb', light: '#ffffff' }, errorCorrectionLevel: 'H' },
      (err) => {
        if (err) {
          QRCode.toCanvas(canvas, url, { width: 220, margin: 2 }, (err2) => {
            resolve(err2 ? '' : canvas.toDataURL('image/png'));
          });
        } else {
          resolve(canvas.toDataURL('image/png'));
        }
      });
  });
}

interface QRCodeManagerProps {
  organizationId: string;
  adminEmail: string;
  softwareAEnabled?: boolean;
}

export const QRCodeManager: React.FC<QRCodeManagerProps> = ({ organizationId, adminEmail, softwareAEnabled = true }) => {
  const [codes, setCodes] = useState<QREntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [maxScans, setMaxScans] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [previewCode, setPreviewCode] = useState<QREntry | null>(null);

  useEffect(() => {
    (async () => {
      const id1 = genId();
      const id2 = genId();
      const url1 = `${INSTALL_BASE}?org=${organizationId}&token=${id1}`;
      const url2 = `${INSTALL_BASE}?org=${organizationId}&token=${id2}`;
      const [d1, d2] = await Promise.all([makeQR(url1), makeQR(url2)]);
      setCodes([
        { id: id1, label: 'Office — Main Entry', url: url1, dataUrl: d1,
          maxScans: 5, scannedCount: 2,
          createdAt: new Date(Date.now() - 3_600_000).toLocaleString(),
          adminEnabled: true, status: 'active' },
        { id: id2, label: 'Remote Team Link', url: url2, dataUrl: d2,
          maxScans: 50, scannedCount: 11,
          createdAt: new Date(Date.now() - 86_400_000).toLocaleString(),
          adminEnabled: true, status: 'active' },
      ]);
    })();
  }, [organizationId]);

  const handleGenerate = async () => {
    setGenerating(true);
    const id = genId();
    const url = `${INSTALL_BASE}?org=${organizationId}&token=${id}&admin=${encodeURIComponent(adminEmail)}`;
    const dataUrl = await makeQR(url);
    setCodes(prev => [{
      id, label: label || `QR Code ${prev.length + 1}`, url, dataUrl,
      maxScans, scannedCount: 0,
      createdAt: new Date().toLocaleString(),
      adminEnabled: true, status: 'active',
    }, ...prev]);
    setLabel(''); setMaxScans(1);
    setShowForm(false); setGenerating(false);
  };

  const handleRevoke = (id: string) => {
    if (!window.confirm('Revoke this QR code? It will stop working immediately.')) return;
    setCodes(prev => prev.map(c => c.id === id ? { ...c, status: 'revoked' as const } : c));
  };

  const handleToggle = (id: string) => {
    setCodes(prev => prev.map(c => c.id === id ? { ...c, adminEnabled: !c.adminEnabled } : c));
  };

  const handleDownload = (c: QREntry) => {
    const a = document.createElement('a');
    a.href = c.dataUrl; a.download = `bixtx-qr-${c.id}.png`; a.click();
  };

  const handlePrint = (c: QREntry) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>QR: ${c.label}</title>
      <style>body{font-family:Arial,sans-serif;text-align:center;padding:40px}
      img{width:350px;height:350px;margin:20px 0;border:2px solid #ddd}
      @media print{body{padding:0}}</style></head><body>
      <h2>🛡️ bixtx.com — Software A Installation</h2>
      <img src="${c.dataUrl}" alt="QR Code">
      <p><strong>${c.label}</strong></p>
      <p>Status: Admin-Controlled (No Expiry) · Max scans: ${c.maxScans}</p>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`);
    w.document.close();
  };

  const getStatusStyle = (c: QREntry) => {
    if (c.status === 'revoked') return 'bg-red-100 text-red-800';
    if (!softwareAEnabled || !c.adminEnabled) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusLabel = (c: QREntry) => {
    if (c.status === 'revoked') return 'Revoked';
    if (!softwareAEnabled) return 'Software A Disabled';
    if (!c.adminEnabled) return 'Disabled by Admin';
    return 'Active';
  };

  const active = codes.filter(c => c.status === 'active' && c.adminEnabled && softwareAEnabled).length;

  return (
    <div className="space-y-6">
      {/* Global Software A status banner */}
      {!softwareAEnabled && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-red-800">Software A is globally disabled by administrator</p>
            <p className="text-sm text-red-600">All QR codes are inactive until Software A is re-enabled in Software A Control.</p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Codes', value: codes.length, color: 'text-purple-600' },
          { label: 'Active', value: active, color: 'text-green-600' },
          { label: 'Total Scans', value: codes.reduce((s, c) => s + c.scannedCount, 0), color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Admin control note */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">🔒</span>
        <div className="text-sm">
          <p className="font-semibold text-purple-900">Admin-Controlled Access (No Expiry)</p>
          <p className="text-purple-700 mt-0.5">QR codes do not expire automatically. They remain valid until revoked or disabled by an administrator. Use the toggle on each code to enable/disable individually.</p>
        </div>
      </div>

      {/* Header + generate button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">QR Codes ({codes.length})</h3>
        <button onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors text-sm">
          {showForm ? '✕ Cancel' : '+ Generate New QR Code'}
        </button>
      </div>

      {/* Generator form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200 space-y-4">
          <h4 className="font-bold text-gray-900 text-base">New QR Code</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label (optional)</label>
              <input value={label} onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Office — Room 3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Scans</label>
              <select value={maxScans} onChange={e => setMaxScans(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value={1}>1 (single use)</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={999}>Unlimited</option>
              </select>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            ℹ️ This QR code will have <strong>no expiry</strong>. Access is controlled by admin on/off toggle at any time.
          </div>
          <button onClick={handleGenerate} disabled={generating}
            className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-60 transition-colors">
            {generating ? '⏳ Generating…' : '📱 Generate QR Code'}
          </button>
        </div>
      )}

      {/* Code list */}
      <div className="space-y-4">
        {codes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No QR codes yet. Generate one above.</div>
        ) : codes.map(c => (
          <div key={c.id} className="bg-white rounded-xl shadow p-5 flex gap-5 items-start">
            {/* QR thumbnail */}
            <div className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border cursor-pointer transition-all ${
              c.status === 'revoked' || !c.adminEnabled || !softwareAEnabled
                ? 'opacity-40 border-gray-200 bg-gray-50 grayscale'
                : 'border-purple-200 bg-purple-50'
            }`} onClick={() => setPreviewCode(c)}>
              {c.dataUrl
                ? <img src={c.dataUrl} alt="QR" className="w-full h-full object-contain"/>
                : <div className="w-full h-full flex items-center justify-center text-2xl">📷</div>}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-bold text-gray-900 text-sm">{c.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusStyle(c)}`}>
                  {getStatusLabel(c)}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono truncate mb-2">{c.url}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
                <span>Scans: <strong>{c.scannedCount}/{c.maxScans === 999 ? '∞' : c.maxScans}</strong></span>
                <span>Created: <strong>{c.createdAt}</strong></span>
                <span>ID: <strong className="font-mono">{c.id}</strong></span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button onClick={() => setPreviewCode(c)}
                className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-200 transition-colors">
                👁 View
              </button>
              <button onClick={() => handleDownload(c)} disabled={!c.dataUrl}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 disabled:opacity-50 transition-colors">
                ⬇ Download
              </button>
              <button onClick={() => handlePrint(c)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors">
                🖨 Print
              </button>
              {c.status === 'active' && (
                <button
                  onClick={() => handleToggle(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    c.adminEnabled
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}>
                  {c.adminEnabled ? '⏸ Disable' : '▶ Enable'}
                </button>
              )}
              {c.status === 'active' && (
                <button onClick={() => handleRevoke(c.id)}
                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors">
                  ✕ Revoke
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {previewCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPreviewCode(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{previewCode.label}</h3>
            <p className="text-xs text-gray-500 mb-4 font-mono break-all">{previewCode.url}</p>
            {previewCode.dataUrl ? (
              <img src={previewCode.dataUrl} alt="QR"
                className="w-56 h-56 mx-auto border-2 border-purple-200 rounded-xl mb-4"/>
            ) : (
              <div className="w-56 h-56 mx-auto bg-gray-100 rounded-xl flex items-center justify-center text-4xl mb-4">📷</div>
            )}
            <div className="text-sm text-gray-600 mb-2 space-y-1">
              <p>Scans: <strong>{previewCode.scannedCount} / {previewCode.maxScans === 999 ? '∞' : previewCode.maxScans}</strong></p>
              <p className="text-xs text-purple-700 font-medium">No Expiry — Admin Controlled</p>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => handleDownload(previewCode)} disabled={!previewCode.dataUrl}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 disabled:opacity-50">
                ⬇ Download PNG
              </button>
              <button onClick={() => setPreviewCode(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
