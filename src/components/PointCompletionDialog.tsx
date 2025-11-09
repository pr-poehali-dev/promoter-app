import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

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

interface PointCompletionDialogProps {
  selectedPoint: RoutePoint | null;
  onClose: () => void;
  leafletCount: string;
  setLeafletCount: (count: string) => void;
  photoFile: File | null;
  setPhotoFile: (file: File | null) => void;
  onComplete: () => void;
}

const PointCompletionDialog = ({
  selectedPoint,
  onClose,
  leafletCount,
  setLeafletCount,
  photoFile,
  setPhotoFile,
  onComplete,
}: PointCompletionDialogProps) => {
  return (
    <Dialog open={!!selectedPoint} onOpenChange={onClose}>
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

            <Button onClick={onComplete} className="w-full h-12 text-base font-medium gap-2">
              <Icon name="Check" size={20} />
              Отметить выполненной
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PointCompletionDialog;
