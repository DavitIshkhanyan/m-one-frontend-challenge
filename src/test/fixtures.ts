type RawUserOverrides = {
  id?: number;
  name?: string;
  email?: string;
  city?: string;
  company?: string;
};

/**
 * A record shaped like the real API response, nesting and all, so the parser
 * is exercised rather than bypassed.
 */
export function rawUser(overrides: RawUserOverrides = {}): unknown {
  const {
    id = 1,
    name = 'Leanne Graham',
    email = 'Sincere@april.biz',
    city = 'Gwenborough',
    company = 'Romaguera-Crona',
  } = overrides;

  return {
    id,
    name,
    username: 'Bret',
    email,
    address: {
      street: 'Kulas Light',
      suite: 'Apt. 556',
      city,
      zipcode: '92998-3874',
      geo: { lat: '-37.3159', lng: '81.1496' },
    },
    phone: '1-770-736-8031 x56442',
    website: 'hildegard.org',
    company: { name: company, catchPhrase: 'Multi-layered client-server', bs: 'harness real-time' },
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
