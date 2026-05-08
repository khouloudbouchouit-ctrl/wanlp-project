import { ExternalLink, Frown, MapPin, Meh, Smile } from "lucide-react";
import type { AnalyzeResponse, EntityGroup, NerEntity, SentimentLabel } from "../lib/mockApi";
import { openStreetMapAt } from "../lib/osm";
import { wikidataEntityUrl } from "../lib/wikidataImage";
import { MapPreview } from "./MapPreview";
import { WikidataImage } from "./WikidataImage";

type Props = {
  result: AnalyzeResponse;
};

function sentimentUI(label: SentimentLabel) {
  switch (label) {
    case "positive":
      return {
        text: "Positive",
        emoji: "😊",
        Icon: Smile,
        bar: "from-emerald-400 to-emerald-600",
        ring: "ring-emerald-200",
        badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "negative":
      return {
        text: "Negative",
        emoji: "😞",
        Icon: Frown,
        bar: "from-rose-400 to-rose-600",
        ring: "ring-rose-200",
        badge: "bg-rose-50 text-rose-900 border-rose-200",
      };
    default:
      return {
        text: "Neutral",
        emoji: "😐",
        Icon: Meh,
        bar: "from-slate-300 to-slate-500",
        ring: "ring-slate-200",
        badge: "bg-slate-50 text-slate-800 border-slate-200",
      };
  }
}

function entityGroupStyles(g: EntityGroup): string {
  switch (g) {
    case "LOC":
      return "bg-sky-100 text-sky-900 border-sky-300";
    case "DESCRIPTION":
      return "bg-amber-50 text-amber-900 border-amber-300";
    case "PERIOD":
      return "bg-violet-100 text-violet-900 border-violet-300";
    case "TYPE":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    default:
      return "bg-slate-100 text-slate-800 border-slate-300";
  }
}

function EntityRow({ ent }: { ent: NerEntity }) {
  const pct = Math.round(ent.score * 100);
  const wiki = wikidataEntityUrl(ent.wikidataId);
  return (
    <div className="flex items-start gap-3 rounded-xl border border-sand-200/90 bg-white/90 px-4 py-3 shadow-sm transition hover:border-gold-300/60 hover:shadow-md">
      {ent.wikidataId ? (
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-sand-200 shadow-sm">
          <WikidataImage qid={ent.wikidataId} alt="" className="h-full w-full object-cover" thumbWidth={200} />
        </div>
      ) : null}
      <span
        className={`mt-0.5 shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${entityGroupStyles(ent.entity_group)}`}
      >
        {ent.entity_group}
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words font-semibold text-ocean-900">{ent.word}</p>
        <p className="mt-0.5 text-xs text-slate-500">Confiance · {pct}%</p>
        {wiki && (
          <a
            href={wiki}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-ocean-600 hover:underline"
          >
            {ent.wikidataId} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export function ResultsSection({ result }: Props) {
  const s = sentimentUI(result.sentiment.label);
  const pct = Math.round(result.sentiment.score * 100);

  return (
    <section
      id="results"
      className="animate-fade-up border-t border-sand-200/80 bg-gradient-to-b from-white to-sand-50 px-4 py-14 sm:px-6"
    >
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="text-center">
          <h2 className="text-2xl font-bold text-ocean-800 sm:text-3xl">Analysis results</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            Entités (LOC, DESCRIPTION, PERIOD, TYPE), sentiment, carte OpenStreetMap et idées de
            visites.
          </p>
        </header>

        {/* Entities — scrollable list (not a table) */}
        <div className="rounded-2xl border border-sand-200 bg-white/95 p-5 shadow-card backdrop-blur-sm">
          <h3 className="text-lg font-bold text-ocean-800">Entités détectées</h3>
          <p className="mt-1 text-xs text-slate-500">
            Liste défilante — même logique que l’ancienne vue par type d’entité.
          </p>
          <div className="scroll-list mt-4 max-h-[min(28rem,55vh)] space-y-2.5 overflow-y-auto pr-1">
            {result.entities.map((ent, i) => (
              <EntityRow key={`${ent.word}-${ent.entity_group}-${i}`} ent={ent} />
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-card">
            <h3 className="text-lg font-bold text-ocean-800">Sentiment</h3>
            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div
                className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${s.badge} ${s.ring} ring-4`}
              >
                <s.Icon className="h-10 w-10" strokeWidth={2} />
                <div>
                  <p className="text-2xl font-extrabold">{s.text}</p>
                  <p className="text-sm text-slate-600">
                    {s.emoji} Model confidence
                  </p>
                </div>
              </div>
              <div className="w-full max-w-xs flex-1">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>Score</span>
                  <span>{pct}%</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-sand-200">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${s.bar} transition-all duration-700 ease-out`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                Smart mapping
              </h4>
              <MapPreview
                key={result.map.markers.map((m) => `${m.lat},${m.lon},${m.wikidataId ?? ""}`).join("|")}
                data={result.map}
              />
            </div>
          </div>

          {/* Suggested places — scrollable list with images */}
          <div className="flex min-h-0 flex-col rounded-2xl border border-sand-200 bg-white p-5 shadow-card">
            <h3 className="text-lg font-bold text-ocean-800">Autres lieux suggérés</h3>
            <p className="mt-1 text-xs text-slate-500">Défilez la liste · images touristiques</p>
            <ul className="scroll-list mt-4 max-h-[min(36rem,60vh)] flex-1 space-y-4 overflow-y-auto pr-1">
              {result.suggestions.map((place, idx) => {
                const wikiHref = place.url ?? wikidataEntityUrl(place.wikidataId) ?? "#";
                const showWikiLink = Boolean(place.wikidataId || place.url);
                return (
                <li
                  key={`${place.name}-${idx}`}
                  className="overflow-hidden rounded-2xl border border-sand-200 bg-gradient-to-br from-white to-sand-50 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-0 sm:flex-row">
                    <div className="relative h-36 shrink-0 sm:h-auto sm:w-40">
                      <WikidataImage
                        qid={place.wikidataId}
                        alt={place.name}
                        className="h-full w-full object-cover"
                        thumbWidth={400}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 to-transparent sm:bg-gradient-to-r" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4">
                      <p className="font-bold text-ocean-900">{place.name}</p>
                      <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                        {place.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {showWikiLink && (
                        <a
                          href={wikiHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-ocean-700 underline-offset-2 hover:underline"
                        >
                          {place.wikidataId ? `Wikidata (${place.wikidataId})` : "Lien"}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        )}
                        {place.lat != null && place.lon != null && (
                          <button
                            type="button"
                            onClick={() => openStreetMapAt(place.lat!, place.lon!, 13)}
                            className="inline-flex items-center gap-1 rounded-lg bg-ocean-700 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-ocean-800"
                          >
                            <MapPin className="h-3 w-3" />
                            Carte OSM
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
