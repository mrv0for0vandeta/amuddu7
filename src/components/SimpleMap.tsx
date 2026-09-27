import { useEffect, useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';

export interface MapPoint {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  category?: string;
}

interface SimpleMapProps {
  points: MapPoint[];
  height?: string;
  showDirections?: boolean;
}

// Lightweight map using OpenStreetMap tiles via Leaflet — loaded dynamically
// to avoid adding a heavy dependency to the main bundle.

export function SimpleMap({ points, height = '400px', showDirections = false }: SimpleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Dynamic import of Leaflet
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');

        if (cancelled || !containerRef.current) return;

        // Default center: Marrakech
        const center: [number, number] = points[0]?.lat && points[0]?.lng
          ? [points[0].lat, points[0].lng]
          : [31.6295, -7.9811];

        const map = L.map(containerRef.current).setView(center, 13);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Add markers
        const markers: unknown[] = [];
        for (const point of points) {
          if (point.lat && point.lng) {
            const marker = L.marker([point.lat, point.lng]).addTo(map)
              .bindPopup(`<strong>${point.name}</strong>${point.category ? `<br/>${point.category}` : ''}`);
            markers.push(marker);
          }
        }

        // Draw route between points if directions requested
        if (showDirections && markers.length > 1) {
          const latlngs = points
            .filter((p) => p.lat && p.lng)
            .map((p) => [p.lat!, p.lng!]) as [number, number][];
          L.polyline(latlngs, { color: '#c75d3c', weight: 3, dashArray: '8, 8' }).addTo(map);
        }

        // Fit bounds to show all markers
        if (markers.length > 0) {
          const group = L.featureGroup(markers as never[]);
          map.fitBounds(group.getBounds().pad(0.1));
        }

        setLoaded(true);
      } catch {
        setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-sand-200 bg-sand-50 dark:border-ink-700 dark:bg-ink-800" style={{ height }}>
        <div className="text-center">
          <MapPin className="mx-auto h-8 w-8 text-ink-300" />
          <p className="mt-2 text-sm text-ink-400">Map unavailable</p>
          <div className="mt-3 space-y-1">
            {points.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 text-xs text-ink-500">
                <MapPin className="h-3 w-3 text-terracotta-500" /> {p.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-sand-200 dark:border-ink-700" style={{ height }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-sand-50 dark:bg-ink-800">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-terracotta-200" />
            <p className="mt-2 text-sm text-ink-400">Loading map...</p>
          </div>
        </div>
      )}
      {showDirections && loaded && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs text-ink-600 shadow-sm dark:bg-ink-900/90 dark:text-sand-300">
          <Navigation className="h-3 w-3 text-terracotta-500" /> Route shown
        </div>
      )}
    </div>
  );
}

// Need useState import
import { useState } from 'react';
