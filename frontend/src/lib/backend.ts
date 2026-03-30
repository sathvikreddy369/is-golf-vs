export async function postInternal(path: string, payload: unknown) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const internalSecret = process.env.BACKEND_INTERNAL_API_SECRET;

  if (!internalSecret) {
    throw new Error("Missing BACKEND_INTERNAL_API_SECRET");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": internalSecret,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response;
}
