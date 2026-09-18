// Liste UNIQUE (partagée entre vite.config.js — qui configure la mise en file d'attente — et
// api.js — qui doit savoir quand afficher "sera envoyé plus tard" plutôt qu'une erreur) des
// sous-ressources d'une PME déjà existante qu'on autorise à saisir hors connexion.
//
// Volontairement PAS inclus (nécessitent toujours une connexion immédiate, chantier "visites de
// terrain hors-ligne", étape 3, v1) : créer une toute nouvelle PME, se connecter, générer un
// diagnostic IA (Gemini doit répondre tout de suite, ça n'a pas de sens de mettre ça en attente).
export const SEGMENTS_SYNCHRONISABLES = [
  "evaluations-abf",
  "notes-suivi",
  "releves-mensuels",
  "estimations-couts",
  "actions-accompagnement",
];

// Seuls l'ajout (POST) et la modification (PUT) sont mis en attente — pas la suppression
// (DELETE), pour rester prudent dans cette première version.
export const METHODES_SYNCHRONISABLES = ["POST", "PUT"];

// /participants/<id>/<sous-ressource>(/<id-de-la-sous-ressource>)? — un seul segment
// supplémentaire au maximum, pour exclure les routes plus profondes comme
// .../evaluations-abf/<id>/diagnostic-ia (génération IA, jamais mise en attente).
export const MOTIF_CHEMIN_SYNCHRONISABLE = new RegExp(
  `^/participants/[^/]+/(${SEGMENTS_SYNCHRONISABLES.join("|")})(/[^/]+)?$`
);

export function cheminEstSynchronisable(chemin, methode) {
  return METHODES_SYNCHRONISABLES.includes(methode) && MOTIF_CHEMIN_SYNCHRONISABLE.test(chemin);
}
