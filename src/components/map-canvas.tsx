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
  tone?: "unknown";
};

type MapCanvasProps = {
  center: { latitude: number; longitude: number };
  radiusKm: number;
  markers: MapMarker[];
  selectedId: string | null;
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

function pinHtml(kind: Kind, label: string, selected: boolean, tone?: "unknown") {
  const pinTone = tone === "unknown" ? "unknown" : kind === "community_lead" ? "lead" : kind === "nearby_business" ? "place" : "job";
  return `<span class="dot-pin${selected ? " is-selected" : ""}"><span class="pin pin-${pinTone}${selected ? " pin-selected" : ""}">${icons[kind]}</span><strong>${label}</strong></span>`;
}

function paintMarkers(
  leaflet: typeof import("leaflet"),
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

  for (const item of items) {
    const selected = item.id === selectedId;
    const marker = leaflet.marker([item.latitude, item.longitude], {
      keyboard: true,
      title: item.label,
      zIndexOffset: selected ? 800 : 0,
      icon: leaflet.divIcon({
        className: "pin-wrap",
        html: pinHtml(item.kind, item.label, selected, item.tone),
        iconSize: [64, 46],
        iconAnchor: [32, 16],
      }),
    });
    marker.on("click", (event) => {
      leaflet.DomEvent.stopPropagation(event);
      onSelect(item.id);
      document.getElementById(`card-${item.id}`)?.scrollIntoView({ block: "nearest" });
    });
    marker.addTo(layer);
  }
}

export function MapCanvas({ center, radiusKm, markers, selectedId, onSelect, onPick }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markersRef = useRef(markers);
  const selectedRef = useRef(selectedId);
  const radiusRef = useRef(radiusKm);
  const centerRef = useRef(center);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);
  // Extra hook so a hot reload remounts the map and drops any old cluster markers.
  useEffect(() => {}, []);

  useEffect(() => {
    markersRef.current = markers;
    selectedRef.current = selectedId;
    radiusRef.current = radiusKm;
    centerRef.current = center;
    onSelectRef.current = onSelect;
    onPickRef.current = onPick;
  }, [markers, selectedId, radiusKm, center, onSelect, onPick]);

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
      map.on("click", (event) => {
        onPickRef.current?.(event.latlng.lat, event.latlng.lng);
      });
      map.on("zoomend moveend", () => {
        if (!mapRef.current || !layerRef.current) return;
        paintMarkers(
          leaflet,
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
    const layer = layerRef.current;

    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled) return;
      paintMarkers(leaflet, layer, markers, selectedId, radiusKm, centerRef.current, (id) => onSelectRef.current(id));
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, markers, selectedId, center.latitude, center.longitude, radiusKm]);

  return <div ref={containerRef} className="map-root h-full w-full" role="application" aria-label="Map of student jobs" />;
}
