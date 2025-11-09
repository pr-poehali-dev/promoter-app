import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface RoutePoint {
  id: number;
  address: string;
  completed: boolean;
  leaflets: number;
  photo?: string;
  lat: number;
  lng: number;
}

const Index = () => {
  const { toast } = useToast();
  const [selectedPoint, setSelectedPoint] = useState<RoutePoint | null>(null);
  const [leafletCount, setLeafletCount] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([
    { id: 1, address: 'ул. Ленина, д. 45', completed: false, leaflets: 0, lat: 55.7558, lng: 37.6173 },
    { id: 2, address: 'пр. Мира, д. 12', completed: true, leaflets: 25, lat: 55.7598, lng: 37.6273 },
    { id: 3, address: 'ул. Советская, д. 78', completed: true, leaflets: 30, lat: 55.7518, lng: 37.6373 },
    { id: 4, address: 'ул. Кирова, д. 23', completed: false, leaflets: 0, lat: 55.7578, lng: 37.6073 },
    { id: 5, address: 'пр. Победы, д. 56', completed: false, leaflets: 0, lat: 55.7538, lng: 37.6473 },
    { id: 6, address: 'ул. Гагарина, д. 34', completed: false, leaflets: 0, lat: 55.7618, lng: 37.6173 },
  ]);

  const completedCount = routePoints.filter(p => p.completed).length;
  const totalLeaflets = routePoints.reduce((sum, p) => sum + p.leaflets, 0);
  const progressPercent = (completedCount / routePoints.length) * 100;

  const handleCompletePoint = () => {
    if (!selectedPoint || !leafletCount) {
      toast({
        title: 'Ошибка',
        description: 'Укажите количество листовок',
        variant: 'destructive',
      });
      return;
    }

    setRoutePoints(points =>
      points.map(p =>
        p.id === selectedPoint.id
          ? { ...p, completed: true, leaflets: parseInt(leafletCount) }
          : p
      )
    );

    toast({
      title: 'Точка выполнена! 🎉',
      description: `Роздано ${leafletCount} листовок`,
    });

    setSelectedPoint(null);
    setLeafletCount('');
    setPhotoFile(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-primary-foreground/20 p-2 rounded-lg">
              <Icon name="Zap" size={24} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Электрик 24/7</h1>
              <p className="text-xs text-primary-foreground/80">Раздача листовок</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
            <Icon name="Settings" size={20} />
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <Card className="p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Прогресс за день</h2>
            <Badge variant="outline" className="text-sm">
              {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-accent/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="MapPin" size={18} className="text-accent" />
                <span className="text-sm text-muted-foreground">Точек выполнено</span>
              </div>
              <div className="text-3xl font-bold text-accent">
                {completedCount}/{routePoints.length}
              </div>
            </div>

            <div className="bg-primary/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="FileText" size={18} className="text-primary" />
                <span className="text-sm text-muted-foreground">Листовок роздано</span>
              </div>
              <div className="text-3xl font-bold text-primary">{totalLeaflets}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Общий прогресс</span>
              <span className="font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Маршрут на сегодня</h2>
          <Button size="sm" variant="outline" className="gap-2">
            <Icon name="Navigation" size={16} />
            Навигация
          </Button>
        </div>

        <div className="space-y-3">
          {routePoints.map((point, index) => (
            <Card
              key={point.id}
              className={`p-4 transition-all hover:shadow-md cursor-pointer ${
                point.completed ? 'bg-accent/5 border-accent/20' : ''
              }`}
              onClick={() => !point.completed && setSelectedPoint(point)}
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
        </div>

        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Icon name="Info" size={20} className="text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">Нажмите на точку для отметки</p>
              <p className="text-muted-foreground">Укажите количество листовок и добавьте фото</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Button className="flex-1 gap-2 h-12 text-base font-medium" size="lg">
            <Icon name="Send" size={20} />
            Отправить отчёт
          </Button>
          <Button variant="outline" size="lg" className="gap-2 h-12">
            <Icon name="MessageCircle" size={20} />
          </Button>
        </div>
      </div>

      <Dialog open={!!selectedPoint} onOpenChange={() => setSelectedPoint(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Отметить точку</DialogTitle>
          </DialogHeader>

          {selectedPoint && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Icon name="MapPin" size={18} className="text-primary mt-0.5" />
                  <span className="font-medium">{selectedPoint.address}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leaflets">Количество розданных листовок</Label>
                <Input
                  id="leaflets"
                  type="number"
                  placeholder="0"
                  value={leafletCount}
                  onChange={e => setLeafletCount(e.target.value)}
                  className="text-lg h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Фото отчёт (опционально)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="photo-upload"
                    onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    {photoFile ? (
                      <div className="space-y-2">
                        <Icon name="CheckCircle2" size={32} className="mx-auto text-accent" />
                        <p className="text-sm font-medium">{photoFile.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Icon name="Camera" size={32} className="mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Нажмите для загрузки</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <Button onClick={handleCompletePoint} className="w-full h-12 text-base font-medium gap-2">
                <Icon name="Check" size={20} />
                Отметить выполненной
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
