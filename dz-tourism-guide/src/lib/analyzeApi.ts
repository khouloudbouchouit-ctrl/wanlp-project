import type { AnalyzeResponse, EntityGroup, MapMarker, NerEntity, SentimentLabel, Suggestion } from "./mockApi";

/** Raw JSON from Flask `POST /analyze` */
type FlaskRec = {
  name?: string;
  description?: string;
  image?: string;
  url?: string;
  coordinates?: { lat?: number; lon?: number };
};

type FlaskLocation = {
  word: string;
  entity_group?: string;
  score?: number;
  wikidata_id?: string;
  wikidata_label?: string;
  wikidata_url?: string;
  wikidata_description?: string;
  image?: string | null;
  lat?: number | null;
  lon?: number | null;
  geocode_source?: string;
  recommendations?: FlaskRec[];
};

type FlaskAnalyzePayload = {
  entities: { word: string; entity_group: string; score: number; wikidata_id?: string }[];
  sentiment?: { label: string; score: number; error?: string };
  locations?: FlaskLocation[];
  general_recommendations?: FlaskRec[];
  ner_error?: string;
  error?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function coerceEntityGroup(g: string): EntityGroup {
  const u = (g || "").toUpperCase();
  if (u === "LOC" || u === "DESCRIPTION" || u === "PERIOD" || u === "TYPE" || u === "OTHER") {
    return u;
  }
  return "OTHER";
}

/** Model may return French labels (positif / négatif / neutre). */
function normalizeSentimentLabel(label: string): SentimentLabel {
  const raw = (label || "").toLowerCase();
  const x = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (x.includes("neg") || raw.includes("nég")) return "negative";
  if (x.includes("pos")) return "positive";
  return "neutral";
}

export function extractQidFromUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const m = String(url).match(/(Q\d+)/i);
  return m ? m[1].toUpperCase() : undefined;
}

function buildSuggestions(data: FlaskAnalyzePayload): Suggestion[] {
  const seen = new Set<string>();
  const out: Suggestion[] = [];

  const push = (r: FlaskRec) => {
    const name = (r.name || "").trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    const qid = extractQidFromUrl(r.url);
    out.push({
      name,
      description: (r.description || "").trim() || "Attraction touristique en Algérie.",
      wikidataId: qid,
      url: r.url,
      lat: r.coordinates?.lat,
      lon: r.coordinates?.lon,
    });
  };

  for (const loc of data.locations || []) {
    for (const r of loc.recommendations || []) push(r);
  }
  for (const r of data.general_recommendations || []) push(r);

  return out;
}

function mapFlaskToUi(data: FlaskAnalyzePayload): AnalyzeResponse {
  const entities: NerEntity[] = (data.entities || []).map((e) => ({
    word: e.word || "",
    entity_group: coerceEntityGroup(e.entity_group || ""),
    score: typeof e.score === "number" ? e.score : 0,
    wikidataId: e.wikidata_id || undefined,
  }));

  const sentimentRaw = data.sentiment;
  const sentiment =
    sentimentRaw && !sentimentRaw.error
      ? {
          label: normalizeSentimentLabel(sentimentRaw.label || "neutral"),
          score: typeof sentimentRaw.score === "number" ? sentimentRaw.score : 0,
        }
      : { label: "neutral" as const, score: 0.5 };

  const locs = data.locations || [];
  const markers: MapMarker[] = locs
    .filter((l) => l.lat != null && l.lon != null && !Number.isNaN(Number(l.lat)) && !Number.isNaN(Number(l.lon)))
    .map((l) => {
      const detected = (l.word || "").trim();
      const resolved = (l.wikidata_label || l.word || "Lieu").trim();
      return {
        lat: Number(l.lat),
        lon: Number(l.lon),
        label: resolved,
        wikidataId: l.wikidata_id,
        detectedText: detected || undefined,
        wikidataUrl: l.wikidata_url || undefined,
        description: (l.wikidata_description || "").trim() || undefined,
        imageUrl: typeof l.image === "string" && l.image.startsWith("https://") ? l.image : undefined,
        nerScore: typeof l.score === "number" ? l.score : undefined,
        geocodeSource: l.geocode_source,
      };
    });

  const center: MapMarker =
    markers[0] ||
    ({
      lat: 28.0339,
      lon: 1.6596,
      label: "Algérie",
    } as MapMarker);

  const suggestions = buildSuggestions(data);

  return {
    entities,
    sentiment,
    map: { center, markers },
    suggestions,
  };
}

/**
 * Calls the real DziriBERT Flask backend (`ner_pipeline` + sentiment + Wikidata).
 * Dev: run `python app.py` in `wennew` and use Vite proxy (see `vite.config.ts`).
 */
export async function analyzeFromBackend(text: string): Promise<AnalyzeResponse> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Please enter some text to analyze.");
  }

  const url = `${API_BASE}/analyze`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: trimmed }),
  });

  const raw = (await res.json().catch(() => ({}))) as FlaskAnalyzePayload & { error?: string };

  if (!res.ok) {
    throw new Error(raw.error || `Server returned ${res.status}`);
  }
  if (raw.error) {
    throw new Error(raw.error);
  }
  if (raw.ner_error) {
    throw new Error(raw.ner_error);
  }

  return mapFlaskToUi(raw);
}
