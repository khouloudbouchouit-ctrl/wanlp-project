import { Loader2, Map, ScanSearch, Smile } from "lucide-react";

type Props = {
  text: string;
  onTextChange: (v: string) => void;
  onAnalyze: () => void;
  loading: boolean;
};

const features = [
  {
    title: "Entity Extraction",
    desc: "Places, types & periods from your text.",
    icon: ScanSearch,
    accent: "from-ocean-600 to-ocean-800",
  },
  {
    title: "Sentiment Analysis",
    desc: "Tone of your travel comments.",
    icon: Smile,
    accent: "from-gold-500 to-sunset-500",
  },
  {
    title: "Smart Mapping",
    desc: "Locations & nearby destinations.",
    icon: Map,
    accent: "from-sunset-500 to-ocean-700",
  },
] as const;

export function HeroSection({ text, onTextChange, onAnalyze, loading }: Props) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <div
        className="pointer-events-none absolute inset-0 bg-[url('/hero-tourism-bg.png')] bg-cover bg-center"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/88 via-white/78 to-sand-50/95"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-ocean-600/15 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-ocean-800 sm:text-4xl md:text-5xl">
          Discover Algerian Tourism{" "}
          <span className="bg-gradient-to-r from-sunset-500 to-gold-500 bg-clip-text text-transparent">
            with AI
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
          Enter any comment or description about a local tourist site. Our smart AI analyzes the
          sentiment, extracts entities (places, types, periods), and finds the exact location and
          related destinations for your next trip.
        </p>

        <div className="mx-auto mt-10 max-w-2xl text-left">
          <label htmlFor="tour-comment" className="sr-only">
            Tourist site comment
          </label>
          <textarea
            id="tour-comment"
            rows={5}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (!loading) onAnalyze();
              }
            }}
            placeholder="Enter a comment about a tourist site…"
            disabled={loading}
            className="w-full resize-y rounded-2xl border-2 border-sand-200 bg-white/90 px-4 py-3.5 text-base text-slate-800 shadow-soft outline-none ring-ocean-600/20 transition placeholder:text-slate-400 focus:border-gold-400 focus:ring-4 disabled:opacity-60"
          />

          <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              {text.trim().length} characters · Ctrl+Enter to analyze
            </p>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={loading}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sunset-500 via-gold-500 to-gold-400 px-8 py-3 text-base font-bold text-white shadow-lg transition hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing…
                </>
              ) : (
                "Analyze"
              )}
            </button>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
          {features.map(({ title, desc, icon: Icon, accent }, i) => (
            <div
              key={title}
              style={{ animationDelay: `${i * 80}ms` }}
              className="animate-fade-up rounded-2xl border border-sand-200/90 bg-white/80 p-5 text-left shadow-card backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-soft"
            >
              <div
                className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md`}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="font-bold text-ocean-800">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
