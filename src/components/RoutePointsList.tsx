import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import YandexMap from '@/components/YandexMap';

interface RoutePoint {
  id: number;
  address: string;
  completed: boolean;
  leaflets_distributed?: number;
  leaflets?: number;
  photo_url?: string;
  photo?: string;
  lat: number;
  lng: number;
}

interface RoutePointsListProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  routePoints: RoutePoint[];
  onPointClick: (point: RoutePoint) => void;
}

const RoutePointsList = ({ activeTab, setActiveTab, routePoints, onPointClick }: RoutePointsListProps) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="list" className="gap-2">
          <Icon name="List" size={16} />
          Список
        </TabsTrigger>
        <TabsTrigger value="map" className="gap-2">
          <Icon name="Map" size={16} />
          Карта
        </TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="space-y-3 mt-0">
        {routePoints.map((point, index) => (
          <Card
            key={point.id}
            className={`p-4 transition-all hover:shadow-md cursor-pointer ${
              point.completed ? 'bg-accent/5 border-accent/20' : ''
            }`}
            onClick={() => !point.completed && onPointClick(point)}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  point.completed
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {point.completed ? <Icon name="Check" size={20} /> : index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{point.address}</h3>
                  {point.completed && (
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                      Выполнено
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Icon name="FileText" size={14} />
                    <span>{point.leaflets > 0 ? `${point.leaflets} шт` : '—'}</span>
                  </div>
                  {point.photo && (
                    <div className="flex items-center gap-1 text-primary">
                      <Icon name="Camera" size={14} />
                      <span>Фото</span>
                    </div>
                  )}
                </div>
              </div>

              <Icon
                name={point.completed ? 'CheckCircle2' : 'Circle'}
                size={24}
                className={point.completed ? 'text-accent' : 'text-muted-foreground'}
              />
            </div>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="map" className="mt-0">
        <Card className="overflow-hidden">
          <YandexMap
            points={routePoints}
            onPointClick={(pointId) => {
              const point = routePoints.find(p => p.id === pointId);
              if (point && !point.completed) {
                onPointClick(point);
              }
            }}
          />
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default RoutePointsList;
