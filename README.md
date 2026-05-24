# DziriBERT Tourism Guide

Full-stack web app for Algerian tourism text analysis:
- Detects named entities from user text using a custom NER model
- with algerian darija,arabizi,french,and arabic(fosha).
- Runs sentiment analysis on the same text.
- Enriches detected `LOC` entities with Wikidata + OpenStreetMap coordinates.
- Displays detected locations on an interactive map with place details.

## Main Functionality

- **Text analysis (`/analyze`)**
  - Input: free text from the user.
  - Output includes:
    - `entities`: NER entities extracted from the provided text.
    - `sentiment`: label + confidence score.
    - `locations`: only `LOC` entities enriched with:
      - Wikidata id/label/url
      - optional image (Commons thumbnail)
      - coordinates (`lat`, `lon`)
      - nearby attractions when coordinates are available.
- **Interactive map**
  - Pins are created from detected `LOC` values only (after enrichment).
  - Popups show detected text, resolved place label, confidence, coordinates, and external links.
- **Tourism suggestions**
  - Derived from nearby Wikidata attractions for resolved location coordinates.

## Tech Stack

- **Backend:** Flask, Hugging Face Transformers, Requests
- **Frontend:** React + TypeScript + Vite + TailwindCSS + Leaflet
- **External services:** Wikidata APIs, Wikimedia Commons, OpenStreetMap/Nominatim

## Project Structure

```text
wennew/
  app.py                      # Flask backend (NER, sentiment, enrichment APIs)
  requirements.txt            # Python dependencies
  dz-tourism-guide/           # React frontend
    src/
    package.json
    vite.config.ts
```

## Prerequisites

- **Python** 3.10+ recommended
- **Node.js** 18+ recommended
- **npm** 9+ recommended
- Internet access (for Wikidata / OSM enrichment)

## Model Requirements

`app.py` expects model directories:
- `./dziribert_raw_tourism` (NER model)
- `./dziribert_sentiment_model` (sentiment model)

You can override with environment variables:
- `NER_MODEL_DIR`
- `SENTIMENT_MODEL_DIR`

Example (PowerShell):
```powershell
$env:NER_MODEL_DIR="C:\path\to\your\ner_model"
$env:SENTIMENT_MODEL_DIR="C:\path\to\your\sentiment_model"
```

## Installation

### 1) Backend setup

```powershell
cd wennew
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2) Frontend setup

```powershell
cd wennew\dz-tourism-guide
npm install
```

## Run the Website (Development)

Use **two terminals**.

Backend URL: `http://localhost:5000`

### Terminal B: Run React UI

```powershell
cd wennew\dz-tourism-guide
npm run dev
```

Frontend URL (usually): `http://localhost:5173`

Vite proxy forwards `/analyze`, `/ner`, and `/sentiment` to Flask on port `5000`.

## Build for Production

```powershell
cd wennew\dz-tourism-guide
npm run build
npm run preview
```

If not using Vite dev proxy, set:
- `VITE_API_BASE=http://127.0.0.1:5000`

## API Endpoints (Backend)

- `POST /analyze` - all-in-one endpoint (NER + sentiment + location enrichment)
- `POST /ner` - NER only
- `POST /sentiment` - sentiment only
- `POST /recommendations` - recommendations by coordinates/location

Example request:
```json
{
  "text": "J'ai visité Constantine et j'ai adoré la vue."
}
```

## Important Notes

- The entity list is based on model output for the submitted text.
- Map pins come from detected `LOC` entities enriched with coordinates.
- If no coordinates can be resolved for a detected location, it will not appear on the map.
- First model load may take time depending on model size and machine resources.

## Troubleshooting

- **`python` command not found**
  - Install Python and restart terminal.
- **PowerShell script execution blocked**
  - Run: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
- **Backend starts but analysis fails**
  - Verify model directories and files (`config.json`, tokenizer, weights).
- **Frontend opens but no data**
  - Confirm Flask is running on `localhost:5000`.
  - Check browser devtools/network for `/analyze` errors.
- **Nominatim/Wikidata delays**
  - External APIs may be slow; retry after a few seconds.

## License

Add your preferred project license here.
