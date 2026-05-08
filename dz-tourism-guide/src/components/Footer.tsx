import { Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-sand-200 bg-ocean-800 px-4 py-10 text-sand-100 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="font-semibold text-white">dz-tourism-guide</p>
          <p className="mt-1 text-sm text-sand-200">
            © {new Date().getFullYear()} Algerian tourism · AI-assisted discovery
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://twitter.com"
            className="rounded-full border border-white/20 p-2 transition hover:bg-white/10"
            aria-label="Twitter"
          >
            <Twitter className="h-5 w-5" />
          </a>
          <a
            href="https://github.com"
            className="rounded-full border border-white/20 p-2 transition hover:bg-white/10"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
