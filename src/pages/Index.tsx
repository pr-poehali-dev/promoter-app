import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import YandexMap from '@/components/YandexMap';
import { offlineStorage, isOnline, syncPendingActions } from '@/utils/offlineStorage';

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

const API_ROUTES = 'https://functions.poehali.dev/04d34c4c-21ba-43a0-b033-623e734f9454';
const API_REPORTS = 'https://functions.poehali.dev/1e1c9585-5a59-40e8-9464-9e1f9c99a21b';
const API_INIT = 'https://functions.poehali.dev/47050e92-e795-45d0-b1a3-a767f59d06be';

const Index = () => {
  const { toast } = useToast();
  const [selectedPoint, setSelectedPoint] = useState<RoutePoint | null>(null);
  const [leafletCount, setLeafletCount] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<string>('list');
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [routeId, setRouteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadRouteData();
    updatePendingCount();

    const handleOnline = () => {
      setOnline(true);
      performSync();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = () => {
    setPendingCount(offlineStorage.getPendingActions().length);
  };

  const performSync = async () => {
    if (!isOnline() || syncing) return;

    setSyncing(true);
    try {
      const result = await syncPendingActions(API_ROUTES, API_REPORTS);
      
      if (result.synced > 0) {
        toast({
          title: 'Синхронизация завершена! ✅',
          description: `Отправлено ${result.synced} действий на сервер`,
        });
        updatePendingCount();
        await loadRouteData();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const loadRouteData = async () => {
    const cached = offlineStorage.getRouteData();
    
    if (cached && !isOnline()) {
      setRouteId(cached.id);
      setRoutePoints(cached.points);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_ROUTES}?promoter_id=1&date=${new Date().toISOString().split('T')[0]}`);
      const data = await response.json();
      
      if (data && data.id) {
        const routeData = {
          id: data.id,
          points: data.points.map((p: any) => ({
            ...p,
            leaflets: p.leaflets_distributed || 0
          }))
        };
        
        setRouteId(routeData.id);
        setRoutePoints(routeData.points);
        offlineStorage.saveRouteData(routeData);
      } else {
        await fetch(API_INIT, { method: 'POST' });
        await loadRouteData();
      }
    } catch (error) {
      if (cached) {
        setRouteId(cached.id);
        setRoutePoints(cached.points);
        toast({
          title: 'Офлайн-режим',
          description: 'Работаем с сохранёнными данными',
        });
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить маршрут',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const completedCount = routePoints.filter(p => p.completed).length;
  const totalLeaflets = routePoints.reduce((sum, p) => sum + p.leaflets, 0);
  const progressPercent = (completedCount / routePoints.length) * 100;

  const handleCompletePoint = async () => {
    if (!selectedPoint || !leafletCount) {
      toast({
        title: 'Ошибка',
        description: 'Укажите количество листовок',
        variant: 'destructive',
      });
      return;
    }

    const updatedPoints = routePoints.map(p =>
      p.id === selectedPoint.id
        ? { ...p, completed: true, leaflets: parseInt(leafletCount), leaflets_distributed: parseInt(leafletCount) }
        : p
    );
    
    setRoutePoints(updatedPoints);
    offlineStorage.saveRouteData({ id: routeId, points: updatedPoints });

    const actionData = {
      action: 'complete_point',
      point_id: selectedPoint.id,
      leaflets: parseInt(leafletCount),
      photo_url: photoFile ? 'uploaded' : null
    };

    if (isOnline()) {
      try {
        await fetch(API_ROUTES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(actionData)
        });

        toast({
          title: 'Точка выполнена! 🎉',
          description: `Роздано ${leafletCount} листовок`,
        });
      } catch (error) {
        offlineStorage.addPendingAction('complete_point', actionData);
        updatePendingCount();
        toast({
          title: 'Сохранено офлайн 💾',
          description: 'Отправим на сервер при подключении',
        });
      }
    } else {
      offlineStorage.addPendingAction('complete_point', actionData);
      updatePendingCount();
      toast({
        title: 'Сохранено офлайн 💾',
        description: 'Отправим на сервер при подключении',
      });
    }

    setSelectedPoint(null);
    setLeafletCount('');
    setPhotoFile(null);
  };

  const handleSendReport = async () => {
    if (!routeId) return;

    const actionData = { route_id: routeId };

    if (isOnline()) {
      try {
        const response = await fetch(API_REPORTS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(actionData)
        });
        
        const result = await response.json();

        if (result.status === 'sent') {
          toast({
            title: 'Отчёт отправлен! 📊',
            description: `Выполнено ${result.summary.completed} из ${result.summary.total} точек`,
          });
        }
      } catch (error) {
        offlineStorage.addPendingAction('send_report', actionData);
        updatePendingCount();
        toast({
          title: 'Сохранено офлайн 💾',
          description: 'Отчёт отправится при подключении',
        });
      }
    } else {
      offlineStorage.addPendingAction('send_report', actionData);
      updatePendingCount();
      toast({
        title: 'Сохранено офлайн 💾',
        description: 'Отчёт отправится при подключении',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка маршрута...</p>
        </div>
      </div>
    );
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
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <Card className="overflow-hidden">
              <YandexMap
                points={routePoints}
                onPointClick={(pointId) => {
                  const point = routePoints.find(p => p.id === pointId);
                  if (point && !point.completed) {
                    setSelectedPoint(point);
                  }
                }}
              />
            </Card>
          </TabsContent>
        </Tabs>

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
          <Button onClick={handleSendReport} className="flex-1 gap-2 h-12 text-base font-medium" size="lg">
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