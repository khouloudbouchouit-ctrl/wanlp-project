import { useCallback, useState } from "react";
import { Footer } from "./components/Footer";
import { HeroSection } from "./components/HeroSection";
import { Navbar } from "./components/Navbar";
import { ResultsSection } from "./components/ResultsSection";
import { analyzeFromBackend } from "./lib/analyzeApi";
import type { AnalyzeResponse } from "./lib/mockApi";

export default function App() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalyze = useCallback(async () => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const data = await analyzeFromBackend(text);
      setResult(data);
      requestAnimationFrame(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed.";
      setError(
        `${msg} Start the API: python app.py (port 5000), then npm run dev so /analyze is proxied to Flask.`
      );
    } finally {
      setLoading(false);
    }
  }, [text]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-sand-50 to-sand-100 text-slate-900">
      <Navbar />

      <main id="home">
        <HeroSection text={text} onTextChange={setText} onAnalyze={runAnalyze} loading={loading} />

        {error && (
          <div className="mx-auto max-w-2xl px-4 pb-6 sm:px-6">
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-800">
              {error}
            </p>
          </div>
        )}

        {result && <ResultsSection result={result} />}
      </main>

      <Footer />

      {/* anchor targets for nav */}
      <div id="about" className="sr-only" aria-hidden />
      <div id="contact" className="sr-only" aria-hidden />
      <div id="agents" className="sr-only" aria-hidden />
      <div id="listings" className="sr-only" aria-hidden />
    </div>
  );
}
