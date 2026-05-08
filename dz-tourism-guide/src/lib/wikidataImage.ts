/**
 * Resolve Wikidata Q-id → Commons image (P18) → thumbnail URL via Wikimedia APIs.
 * Uses origin=* for browser CORS. Results are cached per session.
 */

const thumbCache = new Map<string, string | null>();

/** Accepts "Q273565", "https://www.wikidata.org/wiki/Q273565", etc. */
export function normalizeWikidataQid(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  const direct = t.match(/^(Q\d+)$/i);
  if (direct) return direct[1].toUpperCase();
  const embedded = t.match(/(Q\d+)/i);
  return embedded ? embedded[1].toUpperCase() : null;
}

async function getP18Filename(qid: string): Promise<string | null> {
  const wdUrl = new URL("https://www.wikidata.org/w/api.php");
  wdUrl.searchParams.set("action", "wbgetentities");
  wdUrl.searchParams.set("ids", qid);
  wdUrl.searchParams.set("props", "claims");
  wdUrl.searchParams.set("format", "json");
  wdUrl.searchParams.set("origin", "*");

  const r = await fetch(wdUrl.toString());
  if (!r.ok) return null;
  const data: unknown = await r.json();
  const entity = (data as { entities?: Record<string, { claims?: { P18?: { mainsnak?: { datavalue?: { value?: unknown } } }[] } }> })
    .entities?.[qid];
  const val = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  return typeof val === "string" && val.length > 0 ? val : null;
}

/** Commons API: returns thumburl for File:… title */
async function commonsThumbForFilename(filename: string, width: number): Promise<string | null> {
  const title = filename.startsWith("File:") ? filename : `File:${filename}`;
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  u.searchParams.set("action", "query");
  u.searchParams.set("titles", title);
  u.searchParams.set("prop", "imageinfo");
  u.searchParams.set("iiprop", "url");
  u.searchParams.set("iiurlwidth", String(width));
  u.searchParams.set("format", "json");
  u.searchParams.set("origin", "*");

  const r = await fetch(u.toString());
  if (!r.ok) return null;
  const d: unknown = await r.json();
  const pages = (d as { query?: { pages?: Record<string, { imageinfo?: { thumburl?: string; url?: string }[] }> } })
    .query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const ii = page?.imageinfo?.[0];
  return ii?.thumburl || ii?.url || null;
}

/**
 * Thumbnail URL for a Wikidata item’s P18 (if present).
 * @param qidOrUrl Q-id or wiki URL containing Q…
 * @param thumbWidth requested width (Commons may round)
 */
export async function fetchCommonsThumbnailFromWikidata(
  qidOrUrl: string | null | undefined,
  thumbWidth = 320
): Promise<string | null> {
  const qid = normalizeWikidataQid(qidOrUrl);
  if (!qid) return null;
  if (thumbCache.has(qid)) return thumbCache.get(qid) ?? null;

  try {
    const filename = await getP18Filename(qid);
    if (!filename) {
      thumbCache.set(qid, null);
      return null;
    }
    const thumb = await commonsThumbForFilename(filename, thumbWidth);
    thumbCache.set(qid, thumb);
    return thumb;
  } catch {
    thumbCache.set(qid, null);
    return null;
  }
}

export function wikidataEntityUrl(qid: string | null | undefined): string | null {
  const q = normalizeWikidataQid(qid);
  return q ? `https://www.wikidata.org/wiki/${q}` : null;
}
