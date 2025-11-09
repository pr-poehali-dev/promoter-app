import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';

interface ProgressCardProps {
  completedCount: number;
  totalPoints: number;
  totalLeaflets: number;
  progressPercent: number;
}

const ProgressCard = ({ completedCount, totalPoints, totalLeaflets, progressPercent }: ProgressCardProps) => {
  return (
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
            {completedCount}/{totalPoints}
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
  );
};

export default ProgressCard;
