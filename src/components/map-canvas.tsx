"use client";

import { useEffect, useRef, useState } from "react";
import type { Kind } from "@/lib/api/types";
import "leaflet/dist/leaflet.css";

export type MapMarker = {
  id: string;
  kind: Kind;
  latitude: number;
  longitude: number;
  title: string;
  subtitle: string;
  href: string;
};

type MapCanvasProps = {
  center: { latitude: number; longitude: number };
  radiusKm: number;
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const pinClass: Record<Kind, string> = {
  job: "pin-job",
  community_lead: "pin-lead",
  nearby_business: "pin-place",
};

function zoomForRadius(radiusKm: number) {
  if (radiusKm <= 1) return 15;
  if (radiusKm <= 2) return 14;
  if (radiusKm <= 5) return 13;
  return 12;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function MapCanvas({ center, radiusKm, markers, selectedId, onSelect }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;

    (async () => {
      const leaflet = await import("leaflet");
      if (disposed || !container || mapRef.current) return;
      const map = leaflet.map(container, { zoomControl: true });
      leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        })
        .addTo(map);
      map.setView([center.latitude, center.longitude], zoomForRadius(radiusKm));
      window.setTimeout(() => map.invalidateSize(), 0);
      layerRef.current = leaflet.layerGroup().addTo(map);
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
    if (!ready || !layerRef.current) return;
    let cancelled = false;

    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !layerRef.current) return;
      const layer = layerRef.current;
      layer.clearLayers();
      leaflet
        .circle([center.latitude, center.longitude], {
          radius: radiusKm * 1000,
          color: "#0f6b52",
          weight: 1,
          fillColor: "#0f6b52",
          fillOpacity: 0.05,
        })
        .addTo(layer);

      for (const item of markers) {
        const selected = item.id === selectedId;
        const marker = leaflet.marker([item.latitude, item.longitude], {
          keyboard: true,
          title: item.title,
          zIndexOffset: selected ? 600 : 0,
          icon: leaflet.divIcon({
            className: "pin-wrap",
            html: `<span class="pin ${pinClass[item.kind]}${selected ? " pin-selected" : ""}"></span>`,
            iconSize: selected ? [24, 24] : [16, 16],
            iconAnchor: selected ? [12, 12] : [8, 8],
          }),
        });
        marker.bindPopup(
          `<strong>${escapeHtml(item.title)}</strong><br/>${escapeHtml(item.subtitle)}<br/><a href="${escapeHtml(item.href)}">View</a>`,
        );
        marker.on("click", () => {
          onSelectRef.current(item.id);
          const card = document.getElementById(`card-${item.id}`);
          card?.scrollIntoView({ block: "nearest" });
        });
        marker.addTo(layer);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, markers, selectedId, center.latitude, center.longitude, radiusKm]);

  return <div ref={containerRef} className="map-root h-full w-full" role="application" aria-label="Map of student jobs" />;
}
