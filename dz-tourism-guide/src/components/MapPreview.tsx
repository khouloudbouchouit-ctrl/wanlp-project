import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";
import type { AnalyzeResponse, MapMarker } from "../lib/mockApi";
import { openStreetMapAt, osmMapUrl } from "../lib/osm";
import { fetchCommonsThumbnailFromWikidata } from "../lib/wikidataImage";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

/** Wikidata / Commons URLs from our API — strip quotes for attribute safety */
function safeImgSrc(url: string): string {
  return url.replace(/"/g, "%22");
}

function imgTagFromUrl(url: string): string {
  if (!url.startsWith("https://")) return "";
  return `<img src="${safeImgSrc(url)}" alt="" style="max-width:220px;height:auto;border-radius:8px;margin:0 auto;display:block"/>`;
}

/**
 * Popup HTML for one LOC-derived marker: NER span, resolved label, Wikidata id/description/links, optional image.
 */
function buildMarkerPopup(m: MapMarker, osmHref: string, commonsImgHtml: string): string {
  const imgBlock = commonsImgHtml
    ? `<div style="margin:0 auto 10px;text-align:center">${commonsImgHtml}</div>`
    : "";

  const nerLine =
    m.detectedText && m.detectedText !== m.label
      ? `<span style="display:block;font-size:11px;color:#475569;margin-top:4px">Détecté (NER) : ${esc(m.detectedText)}</span>`
      : "";

  const qLine = m.wikidataId
    ? `<span style="display:block;font-size:11px;color:#64748b;margin-top:2px">${esc(m.wikidataId)}</span>`
    : "";

  const scoreLine =
    typeof m.nerScore === "number"
      ? `<span style="display:block;font-size:10px;color:#94a3b8;margin-top:2px">Confiance NER · ${(m.nerScore * 100).toFixed(0)}%</span>`
      : "";

  const geoLine = m.geocodeSource
    ? `<span style="display:block;font-size:10px;color:#94a3b8;margin-top:2px">Géoloc · ${esc(m.geocodeSource)}</span>`
    : "";

  const coordLine = `<span style="display:block;font-size:10px;color:#94a3b8;margin-top:2px">${esc(m.lat.toFixed(5))}, ${esc(m.lon.toFixed(5))}</span>`;

  const descBlock = m.description
    ? `<p style="margin:10px 0 0;text-align:left;font-size:12px;line-height:1.35;color:#334155">${esc(truncate(m.description, 260))}</p>`
    : "";

  const wd =
    m.wikidataUrl && m.wikidataUrl.startsWith("https://")
      ? `<a href="${esc(m.wikidataUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#1a5fb4;font-weight:600">Wikidata</a>`
      : "";

  const osm = `<a href="${esc(osmHref)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#1a5fb4;font-weight:600">OpenStreetMap ↗</a>`;

  const links = wd ? `${wd}<span style="color:#cbd5e1"> · </span>${osm}` : osm;

  return `${imgBlock}<div style="text-align:center;line-height:1.4;max-width:260px">
    <strong style="font-size:14px">${esc(m.label)}</strong>
    ${nerLine}${qLine}${scoreLine}${geoLine}${coordLine}
    ${descBlock}
    <div style="margin-top:10px">${links}</div>
  </div>`;
}

type Props = {
  data: AnalyzeResponse["map"];
};

export function MapPreview({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const map = L.map(ref.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView([data.center.lat, data.center.lon], 6);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const bounds: L.LatLngTuple[] = [];
    let cancelled = false;

    data.markers.forEach((m) => {
      const href = osmMapUrl(m.lat, m.lon, 14);
      const marker = L.marker([m.lat, m.lon]).addTo(map);

      const apiImg = m.imageUrl ? imgTagFromUrl(m.imageUrl) : "";
      marker.bindPopup(buildMarkerPopup(m, href, apiImg));
      marker.on("click", () => {
        openStreetMapAt(m.lat, m.lon, 14);
      });
      bounds.push([m.lat, m.lon]);

      const qid = m.wikidataId;
      const needCommonsFetch = Boolean(qid) && !m.imageUrl;
      if (needCommonsFetch && qid) {
        fetchCommonsThumbnailFromWikidata(qid, 240).then((imgUrl) => {
          if (cancelled) return;
          if (!map.getContainer()?.isConnected) return;
          const fetched =
            imgUrl && imgUrl.startsWith("https://") ? imgTagFromUrl(imgUrl) : "";
          marker.setPopupContent(buildMarkerPopup(m, href, fetched || apiImg));
        });
      }
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds as [L.LatLngTuple, L.LatLngTuple, ...L.LatLngTuple[]], {
        padding: [28, 28],
        maxZoom: 8,
      });
    }

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      cancelled = true;
      map.remove();
    };
  }, [data]);

  return (
    <div className="overflow-hidden rounded-2xl border border-sand-200 shadow-card">
      <div ref={ref} className="h-[280px] w-full min-h-[220px] cursor-crosshair sm:h-[320px]" />
      <div className="flex flex-col gap-2 border-t border-sand-200 bg-sand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-xs text-slate-600 sm:text-left">
          <span className="font-semibold text-ocean-800">Carte :</span> chaque repère correspond à un lieu{" "}
          <span className="font-medium">détecté comme LOC</span> par le modèle, enrichi (coordonnées, Wikidata,
          image) puis affiché ici.
        </p>
        <button
          type="button"
          onClick={() => openStreetMapAt(data.center.lat, data.center.lon, 14)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-ocean-700 px-3 py-2 text-xs font-bold text-white shadow transition hover:bg-ocean-800"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open “{data.center.label}” on OSM
        </button>
      </div>
    </div>
  );
}
