// Authorized GET that surfaces Google's actual error message (the API returns a JSON body with
// error.message explaining *why*, e.g. "Drive API has not been used in project N ... or is disabled"
// vs. "Request had insufficient authentication scopes"). Without this we'd only see the status code.
export async function googleGet(url: string, token: string, label = 'request'): Promise<Response> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.ok) return res;
  let detail = res.statusText;
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    if (body.error?.message) detail = body.error.message;
  } catch {
    // non-JSON error body — keep statusText
  }
  throw new Error(`${label} failed: ${res.status} ${detail}`);
}
