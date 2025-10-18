import { Badge } from '@/components/ui/badge';
import { Camera, Monitor } from 'lucide-react';

interface Device {
  id: string;
  device_name: string;
  role: string;
  angle_name?: string;
  status: string;
}

interface DeviceListProps {
  devices: Device[];
  currentDeviceId: string;
}

const DeviceList = ({ devices, currentDeviceId }: DeviceListProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'recording':
        return 'default';
      case 'connected':
        return 'secondary';
      case 'disconnected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {devices.map((device) => (
        <div
          key={device.id}
          className={`p-4 rounded-lg border-2 transition-colors ${
            device.id === currentDeviceId
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {device.role === 'master' ? (
                <Monitor className="h-5 w-5 text-primary" />
              ) : (
                <Camera className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">{device.device_name}</p>
                {device.angle_name && (
                  <p className="text-xs text-muted-foreground">{device.angle_name}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            <Badge variant={getStatusColor(device.status)} className="text-xs">
              {device.status}
            </Badge>
            {device.role === 'master' && (
              <Badge variant="outline" className="text-xs">
                Master
              </Badge>
            )}
            {device.id === currentDeviceId && (
              <Badge variant="outline" className="text-xs">
                You
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DeviceList;