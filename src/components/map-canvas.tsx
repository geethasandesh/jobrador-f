"use client";

import { useEffect, useRef, useState } from "react";
import Supercluster from "supercluster";
import type { Kind } from "@/lib/api/types";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapMarker = {
  id: string;
  kind: Kind;
  latitude: number;
  longitude: number;
  title: string;
  subtitle: string;
  label: string;
  href: string;
  tone?: "unknown";
};

type MapPoint = { latitude: number; longitude: number };

type MapCanvasProps = {
  center: MapPoint;
  radiusKm: number;
  markers: MapMarker[];
  selectedId: string | null;
  route?: MapPoint[] | null;
  onSelect: (id: string) => void;
  onPick?: (latitude: number, longitude: number) => void;
};

const icons: Record<Kind, string> = {
  job: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="5.2" width="12" height="8" rx="1.6" stroke="currentColor" stroke-width="1.4"/><path d="M6 5.2V4.1A1.1 1.1 0 0 1 7.1 3h1.8A1.1 1.1 0 0 1 10 4.1v1.1" stroke="currentColor" stroke-width="1.4"/></svg>`,
  community_lead: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 2.6v11M4 3.2h7.4L9.4 6.1l2 2.9H4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  nearby_business: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3.2" y="7" width="9.6" height="6" rx="1.4" stroke="currentColor" stroke-width="1.4"/><path d="M5.3 7V5.3a2.7 2.7 0 0 1 5.4 0V7" stroke="currentColor" stroke-width="1.4"/></svg>`,
};

function zoomForRadius(radiusKm: number) {
  if (radiusKm <= 1) return 15;
  if (radiusKm <= 2) return 14;
  if (radiusKm <= 5) return 13;
  return 12;
}

type Tone = "job" | "lead" | "place" | "unknown";
type ToneCounts = Record<Tone, number>;

const TONES: Tone[] = ["job", "lead", "place", "unknown"];
const TONE_COLORS: Record<Tone, string> = {
  job: "#22c55e",
  lead: "#3b82f6",
  place: "#f59e0b",
  unknown: "#9ca3af",
};
// Above this zoom every pin is drawn on its own.
const CLUSTER_MAX_ZOOM = 16;

function toneOf(item: MapMarker): Tone {
  if (item.tone === "unknown") return "unknown";
  if (item.kind === "community_lead") return "lead";
  if (item.kind === "nearby_business") return "place";
  return "job";
}

function pinHtml(item: MapMarker, selected: boolean) {
  return `<span class="dot-pin${selected ? " is-selected" : ""}"><span class="pin pin-${toneOf(item)}${selected ? " pin-selected" : ""}">${icons[item.kind]}</span><strong>${item.label}</strong></span>`;
}

function clusterSize(total: number) {
  if (total < 10) return 38;
  if (total < 50) return 44;
  if (total < 200) return 50;
  return 56;
}

function clusterHtml(counts: ToneCounts, total: number) {
  const size = clusterSize(total);
  const stops: string[] = [];
  let at = 0;
  for (const tone of TONES) {
    if (!counts[tone]) continue;
    const from = (at / total) * 360;
    at += counts[tone];
    stops.push(`${TONE_COLORS[tone]} ${from}deg ${(at / total) * 360}deg`);
  }
  const label = total >= 1000 ? `${(total / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(total);
  return `<span class="cluster-pin" style="width:${size}px;height:${size}px;background:conic-gradient(${stops.join(",")})"><span>${label}</span></span>`;
}

type PinIndex = Supercluster<{ id: string; tone: Tone }, ToneCounts>;

function buildIndex(items: MapMarker[], selectedId: string | null): PinIndex {
  const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const index: PinIndex = new Supercluster({
    radius: touch ? 72 : 60,
    extent: 256,
    maxZoom: CLUSTER_MAX_ZOOM,
    minPoints: 2,
    map: (props) => ({ job: 0, lead: 0, place: 0, unknown: 0, [props.tone]: 1 }),
    reduce: (into, props) => {
      for (const tone of TONES) into[tone] += props[tone];
    },
  });
  index.load(
    items
      .filter((item) => item.id !== selectedId)
      .map((item) => ({
        type: "Feature" as const,
        properties: { id: item.id, tone: toneOf(item) },
        geometry: { type: "Point" as const, coordinates: [item.longitude, item.latitude] },
      })),
  );
  return index;
}

// Pins that share an address are fanned out in a small ring so each one stays tappable.
function fanOffsets(points: Array<{ key: string; latitude: number; longitude: number }>) {
  const groups = new Map<string, string[]>();
  for (const point of points) {
    const spot = `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;
    groups.set(spot, [...(groups.get(spot) ?? []), point.key]);
  }
  const offsets = new Map<string, [number, number]>();
  for (const keys of groups.values()) {
    if (keys.length < 2) continue;
    keys.forEach((key, index) => {
      if (keys.length <= 8) {
        const angle = (index / keys.length) * Math.PI * 2 - Math.PI / 2;
        const ring = 24 + keys.length * 2;
        offsets.set(key, [Math.round(Math.cos(angle) * ring), Math.round(Math.sin(angle) * ring)]);
        return;
      }
      // Big stacks use a sunflower spiral so even 50 pins at one address stay compact.
      const angle = index * 2.39996;
      const ring = 20 * Math.sqrt(index + 0.5);
      offsets.set(key, [Math.round(Math.cos(angle) * ring), Math.round(Math.sin(angle) * ring)]);
    });
  }
  return offsets;
}

type Painted = { marker: import("leaflet").Marker; html: string };

type PinState = {
  leaflet: typeof import("leaflet");
  map: import("leaflet").Map;
  layer: import("leaflet").LayerGroup;
  painted: Map<string, Painted>;
  index: PinIndex;
  byId: Map<string, MapMarker>;
  selected: MapMarker | null;
  onSelect: (id: string) => void;
};

function paintPins(state: PinState) {
  const { leaflet, map, layer, painted, index, byId, selected } = state;
  const zoom = Math.max(0, Math.min(22, Math.round(map.getZoom())));
  const bounds = map.getBounds().pad(0.3);
  const found = index.getClusters([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()], zoom);

  type Wanted = {
    key: string;
    latitude: number;
    longitude: number;
    html: string;
    size: [number, number];
    anchor: [number, number];
    title: string;
    zIndex: number;
    onTap: () => void;
  };
  const wanted: Wanted[] = [];

  const pinFor = (item: MapMarker, isSelected: boolean): Wanted => ({
    key: `p:${item.id}`,
    latitude: item.latitude,
    longitude: item.longitude,
    html: pinHtml(item, isSelected),
    size: [64, 46],
    anchor: [32, 16],
    title: item.label,
    zIndex: isSelected ? 900 : 0,
    onTap: () => {
      state.onSelect(item.id);
      document.getElementById(`card-${item.id}`)?.scrollIntoView({ block: "nearest" });
    },
  });

  for (const feature of found) {
    const [longitude, latitude] = feature.geometry.coordinates as [number, number];
    const props = feature.properties as Partial<Supercluster.ClusterProperties> & Partial<ToneCounts> & { id?: string };
    if (props.cluster && props.cluster_id != null) {
      const total = props.point_count ?? 0;
      const size = clusterSize(total);
      const clusterId = props.cluster_id;
      wanted.push({
        key: `c:${clusterId}`,
        latitude,
        longitude,
        html: clusterHtml(props as ToneCounts, total),
        size: [size, size],
        anchor: [size / 2, size / 2],
        title: `${total} places here. Tap to zoom in.`,
        zIndex: 400 + Math.min(total, 400),
        onTap: () => {
          const next = Math.min(index.getClusterExpansionZoom(clusterId), CLUSTER_MAX_ZOOM + 1);
          map.flyTo([latitude, longitude], Math.max(next, map.getZoom() + 1), { duration: 0.35 });
        },
      });
      continue;
    }
    const item = props.id ? byId.get(props.id) : undefined;
    if (item) wanted.push(pinFor(item, false));
  }
  if (selected) wanted.push(pinFor(selected, true));

  if (zoom > CLUSTER_MAX_ZOOM) {
    const offsets = fanOffsets(wanted.filter((entry) => entry.key.startsWith("p:")));
    for (const entry of wanted) {
      const offset = offsets.get(entry.key);
      if (!offset) continue;
      entry.anchor = [entry.anchor[0] - offset[0], entry.anchor[1] - offset[1]];
      entry.html = entry.html.replace('class="dot-pin', 'class="dot-pin is-fanned');
    }
  }

  const keep = new Set<string>();
  for (const entry of wanted) {
    const html = `${entry.html}|${entry.anchor.join(",")}`;
    keep.add(entry.key);
    const existing = painted.get(entry.key);
    const icon = () =>
      leaflet.divIcon({ className: "pin-wrap", html: entry.html, iconSize: entry.size, iconAnchor: entry.anchor });
    if (existing) {
      if (existing.html !== html) {
        existing.marker.setIcon(icon());
        existing.marker.setZIndexOffset(entry.zIndex);
        existing.html = html;
      }
      existing.marker.off("click").on("click", (event) => {
        leaflet.DomEvent.stopPropagation(event);
        entry.onTap();
      });
      continue;
    }
    const marker = leaflet.marker([entry.latitude, entry.longitude], {
      keyboard: true,
      title: entry.title,
      zIndexOffset: entry.zIndex,
      icon: icon(),
    });
    marker.on("click", (event) => {
      leaflet.DomEvent.stopPropagation(event);
      entry.onTap();
    });
    marker.addTo(layer);
    painted.set(entry.key, { marker, html });
  }
  for (const [key, entry] of painted) {
    if (keep.has(key)) continue;
    layer.removeLayer(entry.marker);
    painted.delete(key);
  }
}

export function MapCanvas({ center, radiusKm, markers, selectedId, route = null, onSelect, onPick }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const pinsRef = useRef<PinState | null>(null);
  const circleRef = useRef<import("leaflet").Circle | null>(null);
  const routeRef = useRef<import("leaflet").LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);
  // Extra hook so a hot reload remounts the map and drops any old cluster markers.
  useEffect(() => {}, []);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onPickRef.current = onPick;
  }, [onSelect, onPick]);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    const container = containerRef.current;
    const onResize = () => mapRef.current?.invalidateSize();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    (async () => {
      const leaflet = await import("leaflet");
      const maplibre = await import("maplibre-gl");
      maplibre.setWorkerUrl("/maplibre-gl-worker.mjs");
      const { default: maplibreGL } = await import("@maplibre/maplibre-gl-leaflet");
      if (disposed || !container || mapRef.current) return;
      const map = leaflet.map(container, {
        zoomControl: false,
        attributionControl: false,
        bounceAtZoomLimits: false,
        maxZoom: 19,
      });
      leaflet.control.zoom({ position: "bottomright" }).addTo(map);
      maplibreGL({
        style: "https://tiles.openfreemap.org/styles/positron",
      }).addTo(map);
      map.setView([center.latitude, center.longitude], zoomForRadius(radiusKm));
      window.setTimeout(() => map.invalidateSize(), 0);
      const layer = leaflet.layerGroup().addTo(map);
      map.on("click", (event) => {
        onPickRef.current?.(event.latlng.lat, event.latlng.lng);
      });
      map.on("moveend", () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          if (pinsRef.current) paintPins(pinsRef.current);
        });
      });
      pinsRef.current = {
        leaflet,
        map,
        layer,
        painted: new Map(),
        index: buildIndex([], null),
        byId: new Map(),
        selected: null,
        onSelect: (id) => onSelectRef.current(id),
      };
      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      mapRef.current?.remove();
      mapRef.current = null;
      pinsRef.current = null;
      circleRef.current = null;
      routeRef.current = null;
      setReady(false);
    };
    // The map instance is created once. Later effects move it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    mapRef.current?.flyTo([center.latitude, center.longitude], zoomForRadius(radiusKm), {
      duration: 0.45,
    });
  }, [ready, center.latitude, center.longitude, radiusKm]);

  useEffect(() => {
    const pins = pinsRef.current;
    if (!ready || !pins) return;
    circleRef.current?.remove();
    circleRef.current = pins.leaflet
      .circle([center.latitude, center.longitude], {
        radius: radiusKm * 1000,
        color: "#d0d0d0",
        weight: 1,
        fillOpacity: 0,
        interactive: false,
      })
      .addTo(pins.map);
  }, [ready, center.latitude, center.longitude, radiusKm]);

  useEffect(() => {
    const pins = pinsRef.current;
    if (!ready || !pins) return;
    routeRef.current?.remove();
    routeRef.current = null;
    if (!route || route.length < 2) return;
    const group = pins.leaflet.layerGroup().addTo(pins.map);
    const line = pins.leaflet
      .polyline(
        route.map((point) => [point.latitude, point.longitude]),
        { color: "#111", weight: 4, opacity: 0.8, interactive: false },
      )
      .addTo(group);
    const start = route[0]!;
    const closed =
      route.length > 2 &&
      Math.abs(start.latitude - route[route.length - 1]!.latitude) < 1e-4 &&
      Math.abs(start.longitude - route[route.length - 1]!.longitude) < 1e-4;
    const numbered = closed ? route.slice(1, -1) : route;
    if (closed) {
      pins.leaflet
        .marker([start.latitude, start.longitude], {
          interactive: false,
          keyboard: false,
          zIndexOffset: 1000,
          icon: pins.leaflet.divIcon({
            className: "pin-wrap",
            html: `<span class="route-start"></span>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        })
        .addTo(group);
    }
    numbered.forEach((point, index) => {
      pins.leaflet
        .marker([point.latitude, point.longitude], {
          interactive: false,
          keyboard: false,
          zIndexOffset: 1000,
          icon: pins.leaflet.divIcon({
            className: "pin-wrap",
            html: `<span class="route-stop">${index + 1}</span>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        })
        .addTo(group);
    });
    routeRef.current = group;
    pins.map.fitBounds(line.getBounds().pad(0.3), { animate: true, maxZoom: 15, padding: [48, 48] });
  }, [ready, route]);

  useEffect(() => {
    const pins = pinsRef.current;
    if (!ready || !pins) return;
    pins.byId = new Map(markers.map((item) => [item.id, item]));
    pins.selected = selectedId ? (pins.byId.get(selectedId) ?? null) : null;
    pins.index = buildIndex(markers, pins.selected?.id ?? null);
    paintPins(pins);
  }, [ready, markers, selectedId]);

  return <div ref={containerRef} className="map-root h-full w-full" role="application" aria-label="Map of student jobs" />;
}
