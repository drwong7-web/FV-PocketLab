export interface CurrentWeather {
  temperatureC: number;
  pressureHpa: number;
  windSpeedMs: number;
  locationName: string;
  observedAt: string;
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000);
  try {
    const bust = Date.now();
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,surface_pressure,wind_speed_10m&wind_speed_unit=ms&_=${bust}`;

    const geoUrl =
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&language=fr&format=json&_=${bust}`;

    const [weather, geo] = await Promise.all([
      fetchJson<{
        current: {
          time: string;
          temperature_2m: number;
          surface_pressure: number;
          wind_speed_10m: number;
        };
      }>(weatherUrl, ctrl.signal),
      fetchJson<{ results?: Array<{ name: string; country_code?: string }> }>(geoUrl, ctrl.signal).catch(
        () => ({ results: [] }),
      ),
    ]);

    const place = geo.results?.[0];
    const locationName = place
      ? `${place.name}${place.country_code ? `, ${place.country_code}` : ""}`
      : `${lat.toFixed(2)}, ${lon.toFixed(2)}`;

    return {
      temperatureC: weather.current.temperature_2m,
      pressureHpa: weather.current.surface_pressure,
      windSpeedMs: weather.current.wind_speed_10m,
      locationName,
      observedAt: weather.current.time,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function getBrowserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Géolocalisation non supportée par ce navigateur."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      enableHighAccuracy: false,
      maximumAge: 0,
    });
  });
}
