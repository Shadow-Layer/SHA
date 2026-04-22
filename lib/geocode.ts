export async function geocode({
  area,
  landmark,
}: {
  area: string;
  landmark?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const query = [area, landmark].filter(Boolean).join(" ");
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "SHA/1.0 (student-housing-archive)",
        },
        signal: controller.signal,
      },
    );
    const results = (await response.json()) as Array<{ lat: string; lon: string }>;

    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    return {
      lat: Number(results[0].lat),
      lng: Number(results[0].lon),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
