/* ── DziriBERT Tourism — script.js ──────────────────────────────────────── */

const FALLBACK_IMG = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Casbah_of_Algiers.jpg/320px-Casbah_of_Algiers.jpg";
const DEFAULT_COORDS = { lat: 28.0339, lon: 1.6596 };

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

let leafletMap = null;
let mapResizeTimer = null;

window.addEventListener("resize", () => {
  if (!leafletMap) return;
  clearTimeout(mapResizeTimer);
  mapResizeTimer = setTimeout(() => leafletMap.invalidateSize(true), 120);
});

const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");
if (textInput && charCount) {
  textInput.addEventListener("input", () => {
    const len = textInput.value.length;
    charCount.textContent = `${len} caractère${len !== 1 ? "s" : ""}`;
  });
  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) analyze();
  });
}

async function analyze() {
  const text = textInput.value.trim();
  if (!text) {
    showError("Veuillez saisir un texte avant d'analyser.");
    return;
  }

  hideError();
  showLoading(true);
  hideResults();

  try {
    const res = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur serveur ${res.status}`);
    }

    const data = await res.json();
    renderResults(data);
  } catch (err) {
    if (String(err.message).includes("fetch") || String(err.message).includes("Failed")) {
      showError(
        "Impossible de contacter le serveur. Assurez-vous que <code>python app.py</code> tourne sur le port 5000."
      );
    } else {
      showError(err.message);
    }
  } finally {
    showLoading(false);
  }
}

function renderResults(data) {
  renderSentiment(data.sentiment);
  renderEntities(data.entities || []);

  const locations = data.locations || [];
  renderLocationGallery(locations);

  const allRecs = [];
  locations.forEach((loc) => {
    (loc.recommendations || []).forEach((r) => {
      if (!allRecs.find((x) => x.name === r.name)) allRecs.push(r);
    });
  });
  if (!allRecs.length && data.general_recommendations) {
    allRecs.push(...data.general_recommendations);
  }
  renderRecommendations(allRecs);

  showResults();

  const markers = locations
    .filter(
      (l) =>
        l.lat != null &&
        l.lon != null &&
        !Number.isNaN(+l.lat) &&
        !Number.isNaN(+l.lon)
    )
    .map((l) => ({
      name: l.wikidata_label || l.word,
      lat: Number(l.lat),
      lon: Number(l.lon),
      image: l.image,
    }));

  const center = markers.length
    ? { lat: markers[0].lat, lon: markers[0].lon }
    : DEFAULT_COORDS;

  scheduleMapInit(markers, center);
}

function scheduleMapInit(markers, center) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initMap(markers, center);
      if (leafletMap) {
        leafletMap.invalidateSize(true);
        setTimeout(() => leafletMap && leafletMap.invalidateSize(true), 160);
      }
    });
  });
}

function renderSentiment(sentiment) {
  const body = document.getElementById("sentimentBody");
  if (!sentiment || sentiment.error) {
    body.innerHTML = `<div class="empty-state">Sentiment non disponible${sentiment?.error ? ": " + escHtml(sentiment.error) : ""}.</div>`;
    return;
  }

  const raw = (sentiment.label || "").toLowerCase();
  const label = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const score = sentiment.score || 0;
  const pct = Math.round(score * 100);

  const emojiMap = {
    positif: "😊",
    negatif: "😞",
    neutre: "😐",
    positive: "😊",
    negative: "😞",
    neutral: "😐",
  };
  const labelDisplay = {
    positif: "Positif",
    negatif: "Négatif",
    neutre: "Neutre",
    positive: "Positif",
    negative: "Négatif",
    neutral: "Neutre",
  };
  const emoji = emojiMap[raw] || emojiMap[label] || "🤔";
  const displayLabel = labelDisplay[raw] || labelDisplay[label] || escHtml(sentiment.label);
  const cssClass = ["positif", "positive"].includes(label)
    ? "positif"
    : ["negatif", "negative"].includes(label)
      ? "negatif"
      : ["neutre", "neutral"].includes(label)
        ? "neutre"
        : "unknown";

  body.innerHTML = `
    <div class="sentiment-badge ${cssClass}">
      <span class="sentiment-emoji">${emoji}</span>
      ${displayLabel}
    </div>
    <div class="confidence-bar-wrap">
      <div class="confidence-label">Confiance : ${pct}%</div>
      <div class="confidence-track">
        <div class="confidence-fill" style="width: ${pct}%"></div>
      </div>
    </div>
  `;
}

function renderEntities(entities) {
  const list = document.getElementById("entitiesList");
  if (!entities.length) {
    list.innerHTML = `<div class="empty-state">Aucune entité détectée.</div>`;
    return;
  }

  list.innerHTML = entities
    .map((ent) => {
      const group = ent.entity_group || "OTHER";
      const pct = Math.round((ent.score || 0) * 100);
      return `
      <span class="entity-tag ${group}" title="${escHtml(group)}: ${pct}% confiance">
        ${escHtml(ent.word)}
        <span class="entity-score">${escHtml(group)} · ${pct}%</span>
      </span>
    `;
    })
    .join("");
}

function renderLocationGallery(locations) {
  const gallery = document.getElementById("locationGallery");

  if (!locations.length) {
    gallery.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Aucun lieu (LOC) détecté — la carte centre sur l'Algérie.</div>`;
    return;
  }

  gallery.innerHTML = locations
    .map((loc) => {
      const img = loc.image || FALLBACK_IMG;
      const pct = Math.round((loc.score || 0) * 100);
      const wd = loc.wikidata_url
        ? `<a class="loc-card-wd" href="${escHtml(loc.wikidata_url)}" target="_blank" rel="noopener">Wikidata</a>`
        : "";
      const hasCoords = loc.lat != null && loc.lon != null;
      const geoHint = hasCoords ? "" : '<span class="loc-card-hint">Géoloc. indisponible</span>';
      const desc = loc.wikidata_description
        ? `<p class="loc-card-desc">${escHtml(loc.wikidata_description)}</p>`
        : "";
      const osm =
        loc.geocode_source === "nominatim"
          ? '<span class="loc-src">OSM</span>'
          : "";
      return `
      <div class="loc-card">
        <img class="loc-card-img"
             src="${escHtml(img)}"
             alt="${escHtml(loc.word)}"
             onerror="this.src='${FALLBACK_IMG}'"
             loading="lazy" />
        <div class="loc-card-body">
          <div class="loc-card-row">
            <span class="loc-card-badge">LOC</span>
            <span style="display:flex;gap:0.35rem;align-items:center;flex-wrap:wrap">${wd}${osm}</span>
          </div>
          <div class="loc-card-name">${escHtml(loc.wikidata_label || loc.word)}</div>
          ${desc}
          <div class="loc-card-score">Confiance ${pct}% ${geoHint}</div>
        </div>
      </div>
    `;
    })
    .join("");
}

function initMap(markers, center) {
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  leafletMap = L.map("map", {
    scrollWheelZoom: true,
    attributionControl: true,
  }).setView([center.lat, center.lon], markers.length ? 9 : 5);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(leafletMap);

  const bounds = [];

  markers.forEach((m) => {
    const imgTag = m.image
      ? `<img class="map-popup-img" src="${escHtml(m.image)}" alt="" onerror="this.style.display='none'" loading="lazy" />`
      : "";
    const popup = L.popup({ maxWidth: 200 }).setContent(`
      <div style="text-align:center;padding:.3rem">
        ${imgTag}
        <div class="map-popup-name">${escHtml(m.name)}</div>
      </div>
    `);

    const marker = L.marker([m.lat, m.lon]).bindPopup(popup).addTo(leafletMap);
    bounds.push([m.lat, m.lon]);

    marker.setIcon(
      L.divIcon({
        className: "map-pin-wrap",
        html: `<div style="
        background:#C0522A;
        color:#fff;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        width:32px;height:32px;
        display:flex;align-items:center;justify-content:center;
        font-size:14px;
        box-shadow:0 3px 10px rgba(0,0,0,.3);
        border:2px solid #fff;
      ">
        <span style="transform:rotate(45deg)">📍</span>
      </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -34],
      })
    );
  });

  if (bounds.length > 1) {
    leafletMap.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
  } else if (bounds.length === 1) {
    leafletMap.setView(bounds[0], 11);
  }
}

function renderRecommendations(recs) {
  const grid = document.getElementById("recoGrid");
  if (!recs.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Aucune recommandation trouvée.</div>`;
    return;
  }

  grid.innerHTML = recs
    .map((r) => {
      const img = r.image || FALLBACK_IMG;
      const desc = r.description || "Attraction touristique en Algérie.";
      const link = r.url
        ? `<a class="reco-card-link" href="${escHtml(normalizeRecoUrl(r.url))}" target="_blank" rel="noopener">En savoir plus →</a>`
        : "";
      return `
      <div class="reco-card">
        <img class="reco-card-img"
             src="${escHtml(img)}"
             alt="${escHtml(r.name)}"
             onerror="this.src='${FALLBACK_IMG}'"
             loading="lazy" />
        <div class="reco-card-body">
          <div class="reco-card-name">${escHtml(r.name)}</div>
          <div class="reco-card-desc">${escHtml(desc)}</div>
          ${link}
        </div>
      </div>
    `;
    })
    .join("");
}

function normalizeRecoUrl(url) {
  const u = String(url);
  if (u.startsWith("http://www.wikidata.org/entity/") || u.startsWith("https://www.wikidata.org/entity/")) {
    const m = u.match(/(Q\d+)/);
    if (m) return `https://www.wikidata.org/wiki/${m[1]}`;
  }
  return u;
}

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showError(msg) {
  document.getElementById("errorMsg").innerHTML = msg;
  document.getElementById("errorBanner").classList.remove("hidden");
}

function hideError() {
  document.getElementById("errorBanner").classList.add("hidden");
}

function showLoading(on) {
  document.getElementById("loading").classList.toggle("hidden", !on);
  document.getElementById("analyzeBtn").disabled = on;
}

function showResults() {
  document.getElementById("results").classList.remove("hidden");
  document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideResults() {
  document.getElementById("results").classList.add("hidden");
}
