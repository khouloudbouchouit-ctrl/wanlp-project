/** OpenStreetMap — same URL pattern as the main site (#map=zoom/lat/lon). */
export function openStreetMapAt(lat: number, lon: number, zoom = 14) {
  const url = `https://www.openstreetmap.org/#map=${zoom}/${lat}/${lon}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function osmMapUrl(lat: number, lon: number, zoom = 14) {
  return `https://www.openstreetmap.org/#map=${zoom}/${lat}/${lon}`;
}
