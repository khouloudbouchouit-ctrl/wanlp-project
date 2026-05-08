import { useEffect, useState } from "react";
import { FALLBACK_IMG } from "../lib/mockApi";
import { fetchCommonsThumbnailFromWikidata, normalizeWikidataQid } from "../lib/wikidataImage";

type Props = {
  /** Wikidata Q-id or URL containing Q… */
  qid?: string | null;
  alt: string;
  className?: string;
  legacyImageUrl?: string | null;
  thumbWidth?: number;
};

export function WikidataImage({ qid, alt, className, legacyImageUrl, thumbWidth = 400 }: Props) {
  const normalized = normalizeWikidataQid(qid);
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!normalized);

  useEffect(() => {
    let cancelled = false;
    const n = normalizeWikidataQid(qid);

    if (!n) {
      setSrc(legacyImageUrl || FALLBACK_IMG);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSrc(null);

    fetchCommonsThumbnailFromWikidata(n, thumbWidth).then((url) => {
      if (cancelled) return;
      setSrc(url || legacyImageUrl || FALLBACK_IMG);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [qid, legacyImageUrl, thumbWidth]);

  if (normalized && loading) {
    return (
      <div
        className={`animate-pulse bg-gradient-to-br from-sand-200 to-sand-100 ${className ?? ""}`}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src || legacyImageUrl || FALLBACK_IMG}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(e) => {
        const el = e.target as HTMLImageElement;
        if (el.src !== FALLBACK_IMG) el.src = FALLBACK_IMG;
      }}
    />
  );
}
