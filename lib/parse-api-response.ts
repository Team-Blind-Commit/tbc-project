export async function parseApiJson<T extends { error?: string }>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? "Invalid response from server"
        : `Server error (${res.status}). Restart npm run dev and check .env.local.`,
    );
  }
}
