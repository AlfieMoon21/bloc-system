export const API_URL = 'https://alannah-irredeemable-vivien.ngrok-free.dev';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
}

export const api = {
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  register: async (email: string, password: string, username: string) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username }),
    });
    return res.json();
  },

  getFeed: async () => {
    const res = await fetch(`${API_URL}/api/feed`);
    return res.json();
  },

  getSessions: async () => {
    const res = await fetch(`${API_URL}/api/sessions`, { headers: authHeaders() });
    return res.json();
  },

  startSession: async (gym_name: string) => {
    const res = await fetch(`${API_URL}/api/sessions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ gym_name }),
    });
    return res.json();
  },

  getSession: async (id: string | number) => {
    const res = await fetch(`${API_URL}/api/sessions/${id}`, { headers: authHeaders() });
    return res.json();
  },

  endSession: async (id: string | number, notes?: string) => {
    const res = await fetch(`${API_URL}/api/sessions/${id}/end`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ notes: notes ?? null }),
    });
    return res.json();
  },

  addClimb: async (
    sessionId: string | number,
    climb: { grade: string; attempts: number; topped: boolean; zones?: number; description?: string },
    imageUri?: string
  ) => {
    const formData = new FormData();
    formData.append('grade', climb.grade);
    formData.append('attempts', String(climb.attempts));
    formData.append('topped', climb.topped ? '1' : '0');
    formData.append('zones', String(climb.zones ?? 0));
    if (climb.description) formData.append('description', climb.description);

    if (imageUri) {
      if (imageUri.startsWith('blob:') || imageUri.startsWith('data:')) {
        // Web/browser: fetch the blob then append it
        const blob = await fetch(imageUri).then((r) => r.blob());
        formData.append('image', blob, 'photo.jpg');
      } else {
        // Native: React Native fetch handles { uri, name, type } objects.
        // Always send as jpeg — iOS returns HEIC URIs but the data is JPEG-compatible.
        formData.append('image', { uri: imageUri, name: 'photo.jpg', type: 'image/jpeg' } as any);
      }
    }

    // Do not set Content-Type — fetch sets it automatically with the multipart boundary
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${API_URL}/api/sessions/${sessionId}/climbs`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return res.json();
  },
};
