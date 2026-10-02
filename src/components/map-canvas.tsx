"use client";

import { useEffect, useRef, useState } from "react";
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
};

type MapCanvasProps = {
  center: { latitude: number; longitude: number };
  radiusKm: number;
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
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

function pinHtml(kind: Kind, label: string, selected: boolean) {
  return `<span class="place-pin${selected ? " is-selected" : ""}">${icons[kind]}<strong>${label}</strong></span>`;
}

function clusterMarkers(items: MapMarker[], map: import("leaflet").Map) {
  const radius = 48;
  const points = items.map((item) => ({
    item,
    point: map.latLngToLayerPoint([item.latitude, item.longitude]),
  }));
  const used = new Set<string>();
  const groups: Array<{ items: MapMarker[]; latitude: number; longitude: number }> = [];

  for (const entry of points) {
    if (used.has(entry.item.id)) continue;
    const members = [entry];
    used.add(entry.item.id);
    for (const other of points) {
      if (used.has(other.item.id)) continue;
      const dx = entry.point.x - other.point.x;
      const dy = entry.point.y - other.point.y;
      if (dx * dx + dy * dy <= radius * radius) {
        members.push(other);
        used.add(other.item.id);
      }
    }
    groups.push({
      items: members.map((member) => member.item),
      latitude: members.reduce((sum, member) => sum + member.item.latitude, 0) / members.length,
      longitude: members.reduce((sum, member) => sum + member.item.longitude, 0) / members.length,
    });
  }

  return groups;
}

function paintMarkers(
  leaflet: typeof import("leaflet"),
  map: import("leaflet").Map,
  layer: import("leaflet").LayerGroup,
  items: MapMarker[],
  selectedId: string | null,
  radiusKm: number,
  center: { latitude: number; longitude: number },
  onSelect: (id: string) => void,
) {
  layer.clearLayers();
  leaflet
    .circle([center.latitude, center.longitude], {
      radius: radiusKm * 1000,
      color: "#d0d0d0",
      weight: 1,
      fillOpacity: 0,
    })
    .addTo(layer);

  for (const group of clusterMarkers(items, map)) {
    if (group.items.length === 1) {
      const item = group.items[0];
      const selected = item.id === selectedId;
      const marker = leaflet.marker([item.latitude, item.longitude], {
        keyboard: true,
        title: item.title,
        zIndexOffset: selected ? 800 : 0,
        icon: leaflet.divIcon({
          className: "pin-wrap",
          html: pinHtml(item.kind, item.label, selected),
          iconSize: [46, 54],
          iconAnchor: [23, 27],
        }),
      });
      marker.on("click", () => {
        onSelect(item.id);
        document.getElementById(`card-${item.id}`)?.scrollIntoView({ block: "nearest" });
      });
      marker.addTo(layer);
      continue;
    }

    const count = group.items.length;
    const marker = leaflet.marker([group.latitude, group.longitude], {
      keyboard: true,
      title: `${count} places`,
      icon: leaflet.divIcon({
        className: "pin-wrap",
        html: `<span class="map-cluster">${count} places</span>`,
        iconSize: [96, 34],
        iconAnchor: [48, 17],
      }),
    });
    marker.on("click", () => {
      map.flyTo([group.latitude, group.longitude], Math.min(map.getZoom() + 2, 17));
    });
    marker.addTo(layer);
  }
}

export function MapCanvas({ center, radiusKm, markers, selectedId, onSelect }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markersRef = useRef(markers);
  const selectedRef = useRef(selectedId);
  const radiusRef = useRef(radiusKm);
  const centerRef = useRef(center);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    markersRef.current = markers;
    selectedRef.current = selectedId;
    radiusRef.current = radiusKm;
    centerRef.current = center;
    onSelectRef.current = onSelect;
  }, [markers, selectedId, radiusKm, center, onSelect]);

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;

    (async () => {
      const leaflet = await import("leaflet");
      const maplibre = await import("maplibre-gl");
      maplibre.setWorkerUrl("/maplibre-gl-worker.mjs");
      const { default: maplibreGL } = await import("@maplibre/maplibre-gl-leaflet");
      if (disposed || !container || mapRef.current) return;
      const map = leaflet.map(container, { zoomControl: false });
      leaflet.control.zoom({ position: "bottomright" }).addTo(map);
      maplibreGL({
        style: "https://tiles.openfreemap.org/styles/positron",
      }).addTo(map);
      map.attributionControl.addAttribution(
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://openfreemap.org">OpenFreeMap</a>',
      );
      map.setView([center.latitude, center.longitude], zoomForRadius(radiusKm));
      window.setTimeout(() => map.invalidateSize(), 0);
      const layer = leaflet.layerGroup().addTo(map);
      map.on("zoomend moveend", () => {
        if (!mapRef.current || !layerRef.current) return;
        paintMarkers(
          leaflet,
          mapRef.current,
          layerRef.current,
          markersRef.current,
          selectedRef.current,
          radiusRef.current,
          centerRef.current,
          (id) => onSelectRef.current(id),
        );
      });
      layerRef.current = layer;
      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
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
    if (!ready || !mapRef.current || !layerRef.current) return;
    let cancelled = false;
    const map = mapRef.current;
    const layer = layerRef.current;

    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled) return;
      paintMarkers(leaflet, map, layer, markers, selectedId, radiusKm, centerRef.current, (id) => onSelectRef.current(id));
      const hidden = clusterMarkers(markers, map).find(
        (group) => group.items.length > 1 && group.items.some((item) => item.id === selectedId),
      );
      const selected = hidden?.items.find((item) => item.id === selectedId);
      if (selected) map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 16));
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, markers, selectedId, center.latitude, center.longitude, radiusKm]);

  return <div ref={containerRef} className="map-root h-full w-full" role="application" aria-label="Map of student jobs" />;
}
