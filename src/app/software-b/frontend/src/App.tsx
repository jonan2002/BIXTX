/**
 * Main Application Entry Point
 * Routes to Improved Admin Dashboard with Prominent QR Code Manager
 */

import React from 'react';
import { ImprovedAdminDashboard } from './pages/ImprovedAdminDashboard';

function App() {
  // In production, these would come from authentication
  const organizationId = 'org-12345';
  const adminEmail = 'admin@bixtx.com';

  return (
    <ImprovedAdminDashboard 
      organizationId={organizationId}
      adminEmail={adminEmail}
    />
  );
}

export default App;
