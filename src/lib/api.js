// Petit module central pour tous les appels au serveur (API).
// Objectif : un seul endroit à modifier si l'adresse du serveur change, et un seul endroit
// qui sait comment ajouter le jeton de connexion (token) aux requêtes.

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4100";

const CLE_SESSION = "suivigerme_session";

export function lireSession() {
  try {
    const brut = localStorage.getItem(CLE_SESSION);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}

export function ecrireSession(session) {
  try {
    if (session) {
      localStorage.setItem(CLE_SESSION, JSON.stringify(session));
    } else {
      localStorage.removeItem(CLE_SESSION);
    }
  } catch {
    // Le stockage local n'est pas disponible : la session ne survivra pas à un rafraîchissement,
    // mais l'application continue de fonctionner pendant la visite en cours.
  }
}

// Appelle l'API et renvoie toujours un objet { ok, status, data }, jamais une exception —
// pour que les pages n'aient qu'à vérifier `.ok` sans se soucier des erreurs réseau.
export async function appelApi(chemin, { method = "GET", body, token } = {}) {
  try {
    const reponse = await fetch(`${API_URL}${chemin}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try {
      data = await reponse.json();
    } catch {
      data = null;
    }

    return { ok: reponse.ok, status: reponse.status, data };
  } catch (erreur) {
    // Erreur réseau (serveur injoignable, pas de connexion internet...).
    console.error("Erreur d'appel API :", chemin, erreur);
    return { ok: false, status: 0, data: null, erreurReseau: true };
  }
}
