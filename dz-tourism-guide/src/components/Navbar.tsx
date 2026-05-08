import { MapPin, Plus, Sparkles, User } from "lucide-react";

const links = ["Home", "About", "Contact", "Agents", "Listings"] as const;

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-sand-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href="#" className="flex items-center gap-2 transition hover:opacity-90">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-700 to-ocean-800 shadow-card">
            <MapPin className="h-4 w-4 text-gold-400" strokeWidth={2.2} />
          </span>
          <span className="text-lg font-bold tracking-tight text-ocean-800">
            dz-tourism-guide
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="transition hover:text-ocean-700"
            >
              {l}
            </a>
          ))}
        </nav>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-gold-400/40 bg-gradient-to-r from-gold-400/15 to-sunset-500/10 px-3 py-1 text-xs font-semibold text-ocean-800 shadow-sm lg:inline-flex">
            <Sparkles className="h-3.5 w-3.5 text-gold-500" />
            Powered by AI NLP Pipelines
          </span>

          <div className="flex items-center gap-2 rounded-full border border-sand-200 bg-white/90 px-2 py-1 shadow-sm">
            <User className="h-4 w-4 text-ocean-600" />
            <span className="text-sm font-semibold text-slate-800">chaima</span>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-ocean-600/20 bg-white px-3 py-1.5 text-sm font-semibold text-ocean-800 shadow-sm transition hover:border-gold-400/60 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add post
          </button>

          <button
            type="button"
            className="rounded-full bg-gradient-to-r from-sunset-500 to-gold-500 px-4 py-1.5 text-sm font-bold text-white shadow-md transition hover:scale-[1.03] hover:shadow-lg active:scale-[0.98]"
          >
            Profile
          </button>
        </div>

        <div className="flex w-full justify-center md:hidden">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-gradient-to-r from-gold-400/15 to-sunset-500/10 px-3 py-1 text-xs font-semibold text-ocean-800">
            <Sparkles className="h-3.5 w-3.5 text-gold-500" />
            Powered by AI NLP Pipelines
          </span>
        </div>
      </div>
    </header>
  );
}
