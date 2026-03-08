export const serverTimestamp = () => new Date().toISOString();

export const collection = (db: any, path: string) => path;
export const doc = (db: any, path: string, id: string) => `${path}/${id}`;
export const query = (col: string, ...args: any[]) => ({ col, args });
export const where = (field: string, op: string, value: any) => ({ type: 'where', field, op, value });
export const orderBy = (field: string, dir: string) => ({ type: 'orderBy', field, dir });

const API_BASE = '/api';

const getToken = () => localStorage.getItem('token');

const request = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  
  const contentType = res.headers.get('content-type');
  if (!res.ok) {
    let errorMessage = 'API Error';
    if (contentType && contentType.includes('application/json')) {
      const error = await res.json().catch(() => ({}));
      errorMessage = error.error || errorMessage;
    } else {
      const text = await res.text().catch(() => '');
      errorMessage = text || `Error ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }

  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
};

export const getDoc = async (path: string) => {
  try {
    const data = await request(`/${path}`);
    return { exists: () => true, data: () => data, id: path.split('/').pop() };
  } catch (e) {
    return { exists: () => false, data: () => null, id: path.split('/').pop() };
  }
};

export const getDocs = async (q: any) => {
  let url = `/${q.col || q}`;
  // Simple query string builder could be added here if needed
  const data = await request(url);
  return {
    docs: data.map((d: any) => ({ id: d.id || d.uid, data: () => d }))
  };
};

export const setDoc = async (path: string, data: any) => {
  await request(`/${path}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const addDoc = async (col: string, data: any) => {
  const res = await request(`/${col}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return { id: res.id };
};

export const updateDoc = async (path: string, data: any) => {
  await request(`/${path}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
};

export const deleteDoc = async (path: string) => {
  await request(`/${path}`, {
    method: 'DELETE'
  });
};

export const onSnapshot = (q: any, callback: (snapshot: any) => void, errorCallback?: (error: any) => void) => {
  let isCancelled = false;
  
  const fetchSnapshot = async () => {
    if (isCancelled) return;
    try {
      const snapshot = await getDocs(q);
      if (!isCancelled) callback(snapshot);
    } catch (e) {
      if (!isCancelled && errorCallback) errorCallback(e);
    }
  };

  fetchSnapshot();
  const interval = setInterval(fetchSnapshot, 5000); // Poll every 5 seconds

  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
};

export const db = {};
export const auth = {
  signOut: () => {
    localStorage.removeItem('token');
    window.location.reload();
  }
};

export const onAuthStateChanged = (authObj: any, callback: (user: any) => void) => {
  const token = getToken();
  if (token) {
    request('/auth/me')
      .then(user => callback({ uid: user.uid, email: user.email }))
      .catch(() => {
        localStorage.removeItem('token');
        callback(null);
      });
  } else {
    callback(null);
  }
  return () => {};
};
