/**
 * Robust Clipboard Utility for bixtx.com
 * Handles clipboard operations with multiple fallbacks
 * Ensures compatibility across different browser versions and security contexts
 */

import { logDataAccess, logPermissionGranted, logPermissionDenied } from './securityCompliance';

/**
 * Copy text to clipboard with multiple fallback methods
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Log the action for transparency
  logDataAccess('Clipboard', 'Copy text to clipboard');

  // Method 1: Try modern Clipboard API (only in secure contexts)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      logPermissionGranted('Clipboard', 'Text copied using Clipboard API');
      return true;
    } catch (err: any) {
      // Silently fall through to fallback methods
      // This is expected in iframes or restricted contexts
    }
  }

  // Method 2: Try execCommand (deprecated but widely supported)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make the textarea invisible
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    
    // Select the text
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    
    // Try to copy
    const successful = document.execCommand('copy');
    
    // Clean up
    document.body.removeChild(textArea);
    
    if (successful) {
      logPermissionGranted('Clipboard', 'Text copied using execCommand');
      return true;
    }
  } catch (err: any) {
    // Silently continue to next fallback
  }

  // Method 3: Create a temporary input element (fallback for mobile)
  try {
    const input = document.createElement('input');
    input.value = text;
    input.style.position = 'fixed';
    input.style.left = '-999999px';
    input.style.top = '-999999px';
    
    document.body.appendChild(input);
    input.focus();
    input.select();
    
    const range = document.createRange();
    range.selectNodeContents(input);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    input.setSelectionRange(0, text.length);
    const successful = document.execCommand('copy');
    
    document.body.removeChild(input);
    
    if (successful) {
      logPermissionGranted('Clipboard', 'Text copied using input fallback');
      return true;
    }
  } catch (err: any) {
    // Final fallback failed
  }

  // All methods failed
  logPermissionDenied('Clipboard', 'All copy methods failed');
  return false;
}