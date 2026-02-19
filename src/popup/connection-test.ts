export interface ConnectionTestResult {
  tl: boolean;
  tlError?: string;
  platform?: boolean;
  platformError?: string;
}

export async function testTLConnection(apiKey: string): Promise<ConnectionTestResult> {
  if (!apiKey.trim()) {
    return { tl: false, tlError: 'API key is required' };
  }

  try {
    const form = new FormData();
    form.append('index_id', 'test');
    form.append('query_text', 'test');

    const response = await fetch('https://api.twelvelabs.io/v1.3/search', {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: form,
    });

    // 400 means valid key but bad index - still means auth works
    if (response.status === 400 || response.ok) {
      return { tl: true };
    }

    if (response.status === 401) {
      return { tl: false, tlError: 'Invalid API key' };
    }

    return { tl: false, tlError: `API error: ${response.status}` };
  } catch (err) {
    return { tl: false, tlError: err instanceof Error ? err.message : 'Network error' };
  }
}
