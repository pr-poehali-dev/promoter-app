import { useEffect, useRef } from 'react';

interface MapPoint {
  id: number;
  address: string;
  lat: number;
  lng: number;
  completed: boolean;
}

interface YandexMapProps {
  points: MapPoint[];
  onPointClick?: (pointId: number) => void;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

const YandexMap = ({ points, onPointClick }: YandexMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      if (!window.ymaps) {
        setTimeout(initMap, 100);
        return;
      }

      window.ymaps.ready(() => {
        if (mapInstance.current) {
          mapInstance.current.destroy();
        }

        const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
        const centerLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;

        mapInstance.current = new window.ymaps.Map(mapRef.current, {
          center: [centerLat, centerLng],
          zoom: 13,
          controls: ['zoomControl', 'geolocationControl'],
        });

        points.forEach((point, index) => {
          const placemark = new window.ymaps.Placemark(
            [point.lat, point.lng],
            {
              balloonContent: `<strong>${point.address}</strong><br/>${
                point.completed ? '✅ Выполнено' : `📍 Точка ${index + 1}`
              }`,
              iconContent: point.completed ? '✓' : String(index + 1),
            },
            {
              preset: point.completed
                ? 'islands#greenStretchyIcon'
                : 'islands#blueStretchyIcon',
            }
          );

          if (onPointClick) {
            placemark.events.add('click', () => {
              if (!point.completed) {
                onPointClick(point.id);
              }
            });
          }

          mapInstance.current.geoObjects.add(placemark);
        });

        if (points.length > 1) {
          const routePoints = points.map(p => [p.lat, p.lng]);
          const multiRoute = new window.ymaps.multiRouter.MultiRoute(
            {
              referencePoints: routePoints,
              params: {
                routingMode: 'pedestrian',
              },
            },
            {
              boundsAutoApply: true,
              wayPointStartIconColor: '#0EA5E9',
              wayPointFinishIconColor: '#10B981',
              routeStrokeWidth: 4,
              routeStrokeColor: '#0EA5E9',
              opacity: 0.7,
            }
          );

          mapInstance.current.geoObjects.add(multiRoute);
        }
      });
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
    };
  }, [points, onPointClick]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-lg overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  );
};

export default YandexMap;
