import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface RouteHeaderProps {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
}

const RouteHeader = ({ online, pendingCount, syncing }: RouteHeaderProps) => {
  return (
    <div className="bg-primary text-primary-foreground p-4 shadow-md">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="bg-primary-foreground/20 p-2 rounded-lg">
            <Icon name="Zap" size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Электрик 24/7</h1>
            <p className="text-xs text-primary-foreground/80">Калининград</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!online && (
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-100 border-orange-500/30">
              <Icon name="WifiOff" size={14} className="mr-1" />
              Офлайн
            </Badge>
          )}
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
              {pendingCount}
            </Badge>
          )}
          {syncing && (
            <Icon name="RefreshCw" size={20} className="animate-spin text-primary-foreground" />
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteHeader;
