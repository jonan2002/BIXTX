import fs from 'fs/promises';
import path from 'path';
import { ConnectionManager } from '../core/ConnectionManager';
import { Logger } from '../utils/Logger';

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  created: string;
  permissions: string;
}

export class FileSystemService {
  private logger: Logger;
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.logger = new Logger('FileSystemService');
    this.connectionManager = connectionManager;
  }

  async initialize(): Promise<void> {
    this.logger.info('FileSystemService initialized');
  }

  async listFiles(dirPath: string): Promise<FileInfo[]> {
    try {
      this.logger.info('Listing files in:', dirPath);

      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files: FileInfo[] = [];

      for (const entry of entries) {
        try {
          const fullPath = path.join(dirPath, entry.name);
          const stats = await fs.stat(fullPath);

          files.push({
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime.toISOString(),
            created: stats.birthtime.toISOString(),
            permissions: stats.mode.toString(8),
          });
        } catch (error) {
          // Skip files that can't be accessed
          this.logger.warn(`Failed to get stats for ${entry.name}:`, error);
        }
      }

      return files;
    } catch (error) {
      this.logger.error('Failed to list files:', error);
      throw error;
    }
  }

  async readFile(filePath: string): Promise<any> {
    try {
      this.logger.info('Reading file:', filePath);

      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        throw new Error('Path is a directory, not a file');
      }

      // Check file size (max 10MB for reading)
      if (stats.size > 10 * 1024 * 1024) {
        throw new Error('File too large to read (max 10MB)');
      }

      const content = await fs.readFile(filePath);
      const base64Content = content.toString('base64');

      return {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        content: base64Content,
        encoding: 'base64',
      };
    } catch (error) {
      this.logger.error('Failed to read file:', error);
      throw error;
    }
  }

  async writeFile(filePath: string, content: string): Promise<any> {
    try {
      this.logger.info('Writing file:', filePath);

      // Decode base64 content
      const buffer = Buffer.from(content, 'base64');

      await fs.writeFile(filePath, buffer);

      return {
        success: true,
        message: 'File written successfully',
        path: filePath,
      };
    } catch (error) {
      this.logger.error('Failed to write file:', error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<any> {
    try {
      this.logger.info('Deleting file:', filePath);

      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        await fs.rmdir(filePath, { recursive: true });
      } else {
        await fs.unlink(filePath);
      }

      return {
        success: true,
        message: 'File deleted successfully',
        path: filePath,
      };
    } catch (error) {
      this.logger.error('Failed to delete file:', error);
      throw error;
    }
  }

  async createDirectory(dirPath: string): Promise<any> {
    try {
      this.logger.info('Creating directory:', dirPath);

      await fs.mkdir(dirPath, { recursive: true });

      return {
        success: true,
        message: 'Directory created successfully',
        path: dirPath,
      };
    } catch (error) {
      this.logger.error('Failed to create directory:', error);
      throw error;
    }
  }
}
