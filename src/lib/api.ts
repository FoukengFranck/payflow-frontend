const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

// Types pour les réponses API
interface AuthResponse {
  user: {
    id: number;
    name: string;
    email: string;
  };
  token: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

// Fonction générique pour les appels API
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Erreur ${res.status}: ${res.statusText}`,
    );
  }

  return res.json();
}

// Inscription
export async function register(data: RegisterPayload): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Connexion
export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// Déconnexion
export async function logout(): Promise<void> {
  await apiRequest("/logout", { method: "POST" });
  localStorage.removeItem("token");
}

// Récupérer l'utilisateur connecté
export async function getCurrentUser() {
  return apiRequest("/user");
}
