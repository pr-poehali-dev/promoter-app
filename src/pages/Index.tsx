import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { offlineStorage, isOnline, syncPendingActions } from '@/utils/offlineStorage';
import RouteHeader from '@/components/RouteHeader';
import ProgressCard from '@/components/ProgressCard';
import RoutePointsList from '@/components/RoutePointsList';
import PointCompletionDialog from '@/components/PointCompletionDialog';

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

  const optimizeRoute = () => {
    const priorityDistricts = ['Московский', 'Ленинградский'];
    const uncompletedPoints = routePoints.filter(p => !p.completed);
    
    const priorityPoints = uncompletedPoints.filter(p => 
      priorityDistricts.some(district => p.address.includes(district))
    );
    const otherPoints = uncompletedPoints.filter(p => 
      !priorityDistricts.some(district => p.address.includes(district))
    );
    
    const sortByProximity = (points: RoutePoint[]) => {
      if (points.length === 0) return [];
      const sorted = [points[0]];
      const remaining = [...points.slice(1)];
      
      while (remaining.length > 0) {
        const last = sorted[sorted.length - 1];
        let closestIndex = 0;
        let minDistance = Infinity;
        
        remaining.forEach((point, idx) => {
          const distance = Math.sqrt(
            Math.pow(point.lat - last.lat, 2) + Math.pow(point.lng - last.lng, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = idx;
          }
        });
        
        sorted.push(remaining[closestIndex]);
        remaining.splice(closestIndex, 1);
      }
      
      return sorted;
    };
    
    const optimizedPriority = sortByProximity(priorityPoints);
    const optimizedOther = sortByProximity(otherPoints);
    const completedPoints = routePoints.filter(p => p.completed);
    
    const optimizedRoute = [...completedPoints, ...optimizedPriority, ...optimizedOther];
    setRoutePoints(optimizedRoute);
    offlineStorage.saveRouteData({ id: routeId, points: optimizedRoute });
    
    toast({
      title: 'Маршрут оптимизирован! 🎯',
      description: `Приоритет: ${priorityPoints.length} точек в Московском/Ленинградском районе`,
    });
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
      <RouteHeader online={online} pendingCount={pendingCount} syncing={syncing} />

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <ProgressCard 
          completedCount={completedCount}
          totalPoints={routePoints.length}
          totalLeaflets={totalLeaflets}
          progressPercent={progressPercent}
        />

        <RoutePointsList
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          routePoints={routePoints}
          onPointClick={setSelectedPoint}
        />

        <div className="flex gap-3">
          <Button 
            onClick={optimizeRoute} 
            variant="outline" 
            className="flex-1 gap-2 h-12"
            disabled={routePoints.filter(p => !p.completed).length === 0}
          >
            <Icon name="Route" size={18} />
            Оптимизировать маршрут
          </Button>
        </div>

        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Icon name="Info" size={20} className="text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">Оптимизация учитывает Московский и Ленинградский районы</p>
              <p className="text-muted-foreground">Нажмите на точку для отметки выполнения</p>
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

      <PointCompletionDialog
        selectedPoint={selectedPoint}
        onClose={() => setSelectedPoint(null)}
        leafletCount={leafletCount}
        setLeafletCount={setLeafletCount}
        photoFile={photoFile}
        setPhotoFile={setPhotoFile}
        onComplete={handleCompletePoint}
      />
    </div>
  );
};

export default Index;
