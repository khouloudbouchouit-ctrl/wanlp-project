"""
DziriBERT Tourism Analysis - Flask Backend
Run: python app.py
"""

import hashlib
import json
import os
import re
import time
import urllib.parse

import requests
from flask import Flask, request, jsonify, render_template, send_from_directory
from transformers import pipeline

app = Flask(__name__, template_folder="templates", static_folder="static")


@app.after_request
def _cors_analyze(resp):
    """Allow Vite dev server (or other frontends) to POST /analyze during local development."""
    if request.path == "/analyze" or request.path == "/ner" or request.path == "/sentiment":
        resp.headers.setdefault("Access-Control-Allow-Origin", "*")
        resp.headers.setdefault("Access-Control-Allow-Methods", "POST, OPTIONS")
        resp.headers.setdefault("Access-Control-Allow-Headers", "Content-Type")
    return resp


# Wikimedia blocks unidentified clients; required for Action API + SPARQL.
HTTP_HEADERS = {
    "User-Agent": "DziriBERT-Tourism/1.0 (local Flask demo; https://wikidata.org)",
    "Accept": "application/json",
}

_last_nominatim_mono = 0.0


def _nominatim_throttle() -> None:
    global _last_nominatim_mono
    now = time.monotonic()
    gap = now - _last_nominatim_mono
    if gap < 1.05:
        time.sleep(1.05 - gap)


def nominatim_geocode(place_name: str) -> tuple[float | None, float | None]:
    """OpenStreetMap Nominatim fallback when Wikidata has no coordinates (max 1 req/s)."""
    q = (place_name or "").strip()
    if len(q) < 2 or len(q) > 240:
        return None, None
    if re.search(r"algérie|algeria", q, re.I):
        search_q = q
    else:
        search_q = f"{q}, Algeria"
    _nominatim_throttle()
    params = {"q": search_q, "format": "json", "limit": 1, "addressdetails": 0}
    headers = {"User-Agent": HTTP_HEADERS["User-Agent"]}
    try:
        r = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params=params,
            headers=headers,
            timeout=12,
        )
        r.raise_for_status()
        arr = r.json()
        if not arr:
            return None, None
        return float(arr[0]["lat"]), float(arr[0]["lon"])
    except Exception:
        return None, None
    finally:
        global _last_nominatim_mono
        _last_nominatim_mono = time.monotonic()


def _ner_entity_group_core(raw: str) -> str:
    """Map B-LOC / I-LOC style labels to LOC for `/analyze` (aggregation may already return LOC)."""
    u = (raw or "").strip().upper()
    for prefix in ("B-", "I-", "E-", "S-"):
        if u.startswith(prefix):
            return u[len(prefix) :]
    return u


# ── Model loading (once at startup) ─────────────────────────────────────────
# To use a different Hugging Face / local model folder, change only the paths below
# (or set env vars and read them here). Keep config.json + weights + tokenizer files inside each folder.
NER_MODEL_DIR = os.environ.get("NER_MODEL_DIR", "./dziribert_raw_tourism")
SENTIMENT_MODEL_DIR = os.environ.get("SENTIMENT_MODEL_DIR", "./dziribert_sentiment_model")

print("Loading NER model …")
try:
    ner_pipeline = pipeline(
        "ner",
        model=NER_MODEL_DIR,
        aggregation_strategy="simple",
    )
    print("[OK] NER model loaded")
except Exception as e:
    print(f"[FAIL] NER model failed: {e}")
    ner_pipeline = None

print("Loading Sentiment model …")
try:
    sentiment_pipeline = pipeline(
        "text-classification",
        model=SENTIMENT_MODEL_DIR,
    )
    print("[OK] Sentiment model loaded")
except Exception as e:
    print(f"[FAIL] Sentiment model failed: {e}")
    sentiment_pipeline = None

# ── Curated fallback attractions ─────────────────────────────────────────────
CURATED_ATTRACTIONS = [
    {
        "name": "Casbah d'Alger",
        "description": "Médina historique d'Alger, classée au patrimoine mondial de l'UNESCO.",
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Casbah_of_Algiers.jpg/320px-Casbah_of_Algiers.jpg",
        "coordinates": {"lat": 36.7833, "lon": 3.0596},
        "url": "https://www.wikidata.org/wiki/Q467178",
    },
    {
        "name": "Tassili n'Ajjer",
        "description": "Parc national du Sahara algérien, célèbre pour ses gravures rupestres.",
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Tassili_nAjjer.jpg/320px-Tassili_nAjjer.jpg",
        "coordinates": {"lat": 25.5000, "lon": 8.5000},
        "url": "https://www.wikidata.org/wiki/Q204453",
    },
    {
        "name": "Djémila",
        "description": "Ruines romaines remarquablement conservées dans les montagnes kabyles.",
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Djemila_-_Algeria.jpg/320px-Djemila_-_Algeria.jpg",
        "coordinates": {"lat": 36.3167, "lon": 5.7333},
        "url": "https://www.wikidata.org/wiki/Q273565",
    },
    {
        "name": "Timgad",
        "description": "Cité romaine fondée par Trajan, surnommée la Pompéi d'Afrique.",
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Timgad_Lambesis_Forum.jpg/320px-Timgad_Lambesis_Forum.jpg",
        "coordinates": {"lat": 35.4833, "lon": 6.4667},
        "url": "https://www.wikidata.org/wiki/Q165706",
    },
    {
        "name": "Ghardaïa",
        "description": "Vallée du M'Zab, architecture mozabite unique au cœur du Sahara.",
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Ghardaia-Algeria.jpg/320px-Ghardaia-Algeria.jpg",
        "coordinates": {"lat": 32.4903, "lon": 3.6736},
        "url": "https://www.wikidata.org/wiki/Q193384",
    },
    {
        "name": "Tipaza",
        "description": "Site archéologique côtier avec des ruines phéniciennes et romaines.",
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Tipaza_ruins_Algeria.jpg/320px-Tipaza_ruins_Algeria.jpg",
        "coordinates": {"lat": 36.5883, "lon": 2.4483},
        "url": "https://www.wikidata.org/wiki/Q215519",
    },
]

# ── Helpers ──────────────────────────────────────────────────────────────────

def wikidata_search_entity(name: str) -> dict | None:
    """Search Wikidata for an entity by name and return basic info."""
    clean = (name or "").strip()
    if not clean:
        return None
    url = "https://www.wikidata.org/w/api.php"
    for search in (clean, f"{clean} Algeria"):
        try:
            params = {
                "action": "wbsearchentities",
                "search": search,
                "language": "fr",
                "format": "json",
                "limit": 1,
            }
            r = requests.get(url, params=params, headers=HTTP_HEADERS, timeout=12)
            r.raise_for_status()
            results = r.json().get("search", [])
            if results:
                return results[0]
        except Exception:
            continue
    return None


def _commons_thumb_url(filename: str) -> str:
    fname = filename.replace(" ", "_")
    md5 = hashlib.md5(fname.encode()).hexdigest()
    enc = urllib.parse.quote(fname, safe="")
    return (
        f"https://upload.wikimedia.org/wikipedia/commons/thumb/"
        f"{md5[0]}/{md5[:2]}/{enc}/320px-{enc}"
    )


def _first_claim_globecoord(claims: dict, prop: str):
    for stmt in claims.get(prop, []) or []:
        snak = stmt.get("mainsnak") or {}
        if snak.get("snaktype") != "value":
            continue
        dv = snak.get("datavalue", {}).get("value")
        if isinstance(dv, dict) and "latitude" in dv and "longitude" in dv:
            return float(dv["latitude"]), float(dv["longitude"])
    return None, None


def _first_claim_commons(claims: dict, prop: str) -> str | None:
    for stmt in claims.get(prop, []) or []:
        snak = stmt.get("mainsnak") or {}
        if snak.get("snaktype") != "value":
            continue
        val = snak.get("datavalue", {}).get("value")
        if isinstance(val, str) and val:
            return _commons_thumb_url(val)
    return None


def wikidata_get_image_and_coords(entity_id: str) -> dict:
    """Fetch P18, P625, and short description via wbgetentities."""
    result = {"image": None, "lat": None, "lon": None, "description": None}
    eid = entity_id if str(entity_id).startswith("Q") else f"Q{entity_id}"
    try:
        url = "https://www.wikidata.org/w/api.php"
        params = {
            "action": "wbgetentities",
            "ids": eid,
            "props": "claims|descriptions",
            "languages": "fr|en|ar",
            "format": "json",
        }
        r = requests.get(url, params=params, headers=HTTP_HEADERS, timeout=12)
        r.raise_for_status()
        data = r.json()
        ent = data.get("entities", {}).get(eid)
        if not ent or ent.get("missing"):
            return result
        claims = ent.get("claims") or {}
        result["image"] = _first_claim_commons(claims, "P18")
        lat, lon = _first_claim_globecoord(claims, "P625")
        result["lat"], result["lon"] = lat, lon
        descs = ent.get("descriptions") or {}
        for lang in ("fr", "en", "ar"):
            if lang in descs and descs[lang].get("value"):
                result["description"] = descs[lang]["value"]
                break
    except Exception:
        pass
    return result


def _wikidata_uri_to_wiki_page(uri: str) -> str:
    if not uri:
        return ""
    m = re.search(r"(Q\d+)", uri)
    if m:
        return f"https://www.wikidata.org/wiki/{m.group(1)}"
    return uri


def wikidata_nearby_attractions(lat: float, lon: float, radius_km: int = 80) -> list:
    """SPARQL query for nearby tourist attractions (Q570116 = tourist attraction)."""
    sparql_url = "https://query.wikidata.org/sparql"
    query = f"""
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
SELECT ?item ?itemLabel ?image ?coord WHERE {{
  SERVICE wikibase:around {{
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point({lon} {lat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "{radius_km}" .
  }}
  ?item wdt:P31/wdt:P279* wd:Q570116 .
  OPTIONAL {{ ?item wdt:P18 ?image }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "fr,en,ar" . }}
}}
LIMIT 8
"""
    headers = dict(HTTP_HEADERS)
    headers["Accept"] = "application/sparql-results+json"
    try:
        r = requests.get(
            sparql_url,
            params={"query": query, "format": "json"},
            headers=headers,
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
        items = []
        for b in data.get("results", {}).get("bindings", []):
            coord_str = b.get("coord", {}).get("value", "")
            lat2, lon2 = None, None
            if "Point(" in coord_str:
                parts = coord_str.replace("Point(", "").replace(")", "").strip().split()
                if len(parts) >= 2:
                    lon2, lat2 = float(parts[0]), float(parts[1])
            raw_uri = b.get("item", {}).get("value", "")
            img = b.get("image", {}).get("value")
            items.append({
                "name": b.get("itemLabel", {}).get("value", ""),
                "image": img,
                "coordinates": {"lat": lat2, "lon": lon2} if lat2 is not None and lon2 is not None else None,
                "description": "",
                "url": _wikidata_uri_to_wiki_page(raw_uri),
            })
        return items
    except Exception:
        return []


# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory("static", filename)


@app.route("/ner", methods=["POST"])
def ner():
    data = request.get_json(force=True)
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    if ner_pipeline is None:
        return jsonify({"error": "NER model not loaded"}), 503
    try:
        entities = ner_pipeline(text)
        result = []
        for ent in entities:
            result.append({
                "word": ent.get("word", ""),
                "entity_group": ent.get("entity_group", ""),
                "score": round(float(ent.get("score", 0)), 4),
                "start": ent.get("start"),
                "end": ent.get("end"),
            })
        return jsonify({"entities": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/sentiment", methods=["POST"])
def sentiment():
    data = request.get_json(force=True)
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    if sentiment_pipeline is None:
        return jsonify({"error": "Sentiment model not loaded"}), 503
    try:
        result = sentiment_pipeline(text)[0]
        return jsonify({
            "label": result["label"],
            "score": round(float(result["score"]), 4),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/recommendations", methods=["POST"])
def recommendations():
    data = request.get_json(force=True)
    location = data.get("location", "")
    lat = data.get("lat")
    lon = data.get("lon")

    attractions = []

    # If we have coordinates, try SPARQL nearby search
    if lat is not None and lon is not None:
        attractions = wikidata_nearby_attractions(lat, lon)

    # Fallback to curated list
    if not attractions:
        # Pick 3 curated items semi-randomly based on location name
        import random
        random.seed(location)
        attractions = random.sample(CURATED_ATTRACTIONS, min(3, len(CURATED_ATTRACTIONS)))

    return jsonify({"recommendations": attractions[:3]})


@app.route("/analyze", methods=["POST"])
def analyze():
    """All-in-one endpoint: NER + Sentiment + Wikidata enrichment + Recommendations."""
    data = request.get_json(force=True)
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400

    response = {}

    # 1. Sentiment
    if sentiment_pipeline:
        try:
            s = sentiment_pipeline(text)[0]
            response["sentiment"] = {
                "label": s["label"],
                "score": round(float(s["score"]), 4),
            }
        except Exception as e:
            response["sentiment"] = {"error": str(e)}
    else:
        response["sentiment"] = {"error": "Model not loaded"}

    # 2. NER
    entities = []
    if ner_pipeline:
        try:
            raw = ner_pipeline(text)
            for ent in raw:
                entities.append({
                    "word": ent.get("word", ""),
                    "entity_group": _ner_entity_group_core(ent.get("entity_group", "")),
                    "score": round(float(ent.get("score", 0)), 4),
                })
        except Exception as e:
            response["ner_error"] = str(e)
    else:
        response["ner_error"] = "Model not loaded"

    # 3. Enrich LOC entities with Wikidata + Nominatim fallback for coordinates
    locations = []
    for ent in entities:
        if ent["entity_group"] != "LOC":
            continue
        loc = dict(ent)
        wd_entity = wikidata_search_entity(ent["word"])
        if wd_entity:
            loc["wikidata_id"] = wd_entity.get("id")
            loc["wikidata_label"] = wd_entity.get("label")
            loc["wikidata_url"] = f"https://www.wikidata.org/wiki/{wd_entity.get('id')}"
            details = wikidata_get_image_and_coords(wd_entity["id"])
            loc["image"] = details["image"]
            loc["lat"] = details["lat"]
            loc["lon"] = details["lon"]
            if details.get("description"):
                loc["wikidata_description"] = details["description"]
        else:
            loc["image"] = None
            loc["lat"] = None
            loc["lon"] = None

        if loc.get("lat") is None or loc.get("lon") is None:
            geo_q = (loc.get("wikidata_label") or ent["word"] or "").strip()
            la, lo = nominatim_geocode(geo_q)
            if la is not None and lo is not None:
                loc["lat"], loc["lon"] = la, lo
                loc["geocode_source"] = "nominatim"

        if loc.get("lat") is not None and loc.get("lon") is not None:
            recs = wikidata_nearby_attractions(loc["lat"], loc["lon"])
        else:
            recs = []
        loc["recommendations"] = recs[:3]
        locations.append(loc)
        if loc.get("wikidata_id"):
            ent["wikidata_id"] = loc["wikidata_id"]

    response["entities"] = entities
    response["locations"] = locations

    return jsonify(response)


if __name__ == "__main__":
    print("\nDziriBERT Tourism App running at http://localhost:5000\n")
    app.run(debug=False, port=5000)
