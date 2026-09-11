import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Shield, 
  Camera, 
  Mic, 
  Monitor,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { 
  requestCameraPermission,
  requestMicrophonePermission,
  requestScreenSharePermission,
  type PermissionStatus
} from '../utils/permissions';
import { toast } from 'sonner@2.0.3';

interface PermissionGuardProps {
  requiredPermissions: Array<'camera' | 'microphone' | 'screen-share'>;
  onPermissionsGranted: () => void;
  children?: React.ReactNode;
}

export function PermissionGuard({ 
  requiredPermissions, 
  onPermissionsGranted,
  children 
}: PermissionGuardProps) {
  const [permissions, setPermissions] = useState<Record<string, PermissionStatus>>({});
  const [loading, setLoading] = useState(false);
  const [allGranted, setAllGranted] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    const granted = requiredPermissions.every(
      perm => permissions[perm]?.granted
    );
    setAllGranted(granted);
    if (granted && Object.keys(permissions).length > 0) {
      onPermissionsGranted();
    }
  }, [permissions, requiredPermissions]);

  const checkPermissions = async () => {
    const results: Record<string, PermissionStatus> = {};
    
    // Note: We can't check without requesting for most permissions
    // So we'll mark them as not granted initially
    requiredPermissions.forEach(perm => {
      results[perm] = {
        granted: false,
        available: true,
        message: 'Permission not yet requested'
      };
    });

    setPermissions(results);
  };

  const requestPermission = async (type: 'camera' | 'microphone' | 'screen-share') => {
    setLoading(true);
    
    try {
      let result: PermissionStatus;
      
      switch (type) {
        case 'camera':
          result = await requestCameraPermission();
          break;
        case 'microphone':
          result = await requestMicrophonePermission();
          break;
        case 'screen-share':
          result = await requestScreenSharePermission();
          break;
        default:
          return;
      }

      setPermissions(prev => ({
        ...prev,
        [type]: result
      }));

      if (result.granted) {
        toast.success(`${type} access granted`);
      } else if (!result.available) {
        toast.error(`${type} is not available in your browser`);
      } else {
        toast.error(`${type} access denied. Please check your browser settings.`);
      }
    } catch (error: any) {
      toast.error(`Failed to request ${type} permission: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionIcon = (type: string) => {
    switch (type) {
      case 'camera':
        return Camera;
      case 'microphone':
        return Mic;
      case 'screen-share':
        return Monitor;
      default:
        return Shield;
    }
  };

  const getPermissionLabel = (type: string) => {
    switch (type) {
      case 'camera':
        return 'Camera Access';
      case 'microphone':
        return 'Microphone Access';
      case 'screen-share':
        return 'Screen Sharing';
      default:
        return type;
    }
  };

  const getPermissionDescription = (type: string) => {
    switch (type) {
      case 'camera':
        return 'Required to view and capture video from the remote device';
      case 'microphone':
        return 'Required for audio communication and monitoring';
      case 'screen-share':
        return 'Required to share your screen with the remote device';
      default:
        return 'Required for remote access functionality';
    }
  };

  if (allGranted && children) {
    return <>{children}</>;
  }

  return (
    <div className="p-8">
      <Card className="max-w-2xl mx-auto p-8 bg-slate-900 border-slate-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-cyan-500" />
          </div>
          <h2 className="text-2xl mb-2">Permissions Required</h2>
          <p className="text-slate-400">
            bixtx.com needs your permission to access the following features for remote device management.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {requiredPermissions.map(permission => {
            const Icon = getPermissionIcon(permission);
            const status = permissions[permission];
            
            return (
              <div
                key={permission}
                className="p-6 bg-slate-800/50 rounded-lg border border-slate-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start flex-1">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center mr-4">
                      <Icon className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1">{getPermissionLabel(permission)}</h3>
                      <p className="text-sm text-slate-400">
                        {getPermissionDescription(permission)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    {status?.granted ? (
                      <Badge className="bg-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Granted
                      </Badge>
                    ) : status?.available === false ? (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Unavailable
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Required
                      </Badge>
                    )}
                  </div>
                </div>

                {!status?.granted && status?.available !== false && (
                  <Button
                    onClick={() => requestPermission(permission)}
                    disabled={loading}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    Grant {getPermissionLabel(permission)}
                  </Button>
                )}

                {status?.message && !status.granted && (
                  <div className="mt-3 text-sm text-slate-400 flex items-start">
                    <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{status.message}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-cyan-500 mr-3 mt-0.5" />
            <div className="text-sm">
              <p className="text-cyan-500 font-medium mb-2">Your Privacy is Protected</p>
              <ul className="text-slate-400 space-y-1">
                <li>• All permissions are requested with your explicit consent</li>
                <li>• You can revoke permissions at any time through browser settings</li>
                <li>• All activities are logged transparently</li>
                <li>• Connections are encrypted end-to-end</li>
              </ul>
            </div>
          </div>
        </div>

        {!allGranted && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Go Back
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
