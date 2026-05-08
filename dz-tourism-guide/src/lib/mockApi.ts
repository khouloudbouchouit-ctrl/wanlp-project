/**
 * Shared UI types + static fallback image only.
 * Entity extraction always comes from the Flask model via `analyzeFromBackend` (see `analyzeApi.ts`).
 */
export type EntityGroup = "LOC" | "DESCRIPTION" | "PERIOD" | "TYPE" | "OTHER";

export type NerEntity = {
  word: string;
  entity_group: EntityGroup;
  score: number;
  wikidataId?: string;
};

export type SentimentLabel = "positive" | "negative" | "neutral";

export type MapMarker = {
  lat: number;
  lon: number;
  /** Resolved place title (Wikidata label when linked, else NER span). */
  label: string;
  wikidataId?: string;
  /** Text span detected as LOC by the NER model. */
  detectedText?: string;
  wikidataUrl?: string;
  description?: string;
  /** Commons / Wikidata-derived thumbnail from the API (when available). */
  imageUrl?: string;
  nerScore?: number;
  geocodeSource?: string;
};

export type Suggestion = {
  name: string;
  description: string;
  wikidataId?: string;
  url?: string;
  lat?: number;
  lon?: number;
};

export type AnalyzeResponse = {
  entities: NerEntity[];
  sentiment: { label: SentimentLabel; score: number };
  map: {
    center: MapMarker;
    markers: MapMarker[];
  };
  suggestions: Suggestion[];
};

export const FALLBACK_IMG =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Casbah_of_Algiers.jpg/320px-Casbah_of_Algiers.jpg";
