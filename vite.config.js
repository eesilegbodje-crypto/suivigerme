import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { MOTIF_CHEMIN_SYNCHRONISABLE } from "./src/lib/syncHorsLigne.js";

export default defineConfig(({ mode }) => {
  // Adresse du serveur (backend) : en local http://localhost:4100 par défaut, en ligne
  // l'adresse Render (ex. https://suivigerme-api.onrender.com) — définie via la variable
  // d'environnement VITE_API_URL, comme dans src/lib/api.js.
  const env = loadEnv(mode, process.cwd(), "");
  const adresseServeur = env.VITE_API_URL || "http://localhost:4100";
  const origineServeur = new URL(adresseServeur).origin;
  // On fabrique des expressions régulières littérales (et pas des fonctions qui référencent des
  // variables extérieures) : une fonction perdrait ces variables au moment où vite-plugin-pwa la
  // transforme en vrai fichier JavaScript indépendant, alors qu'une expression régulière, elle,
  // reste autonome une fois écrite (son contenu est figé dès sa création ici).
  const caracteresSpeciaux = /[.*+?^${}()|[\]\\]/g;
  const origineEchappee = origineServeur.replace(caracteresSpeciaux, "\\$&");
  const motifServeur = new RegExp("^" + origineEchappee + "/");
  // Combine l'origine du serveur avec le motif des sous-ressources d'une PME qu'on autorise à
  // saisir hors connexion (liste unique définie dans syncHorsLigne.js, réutilisée par api.js).
  const motifMutationsSynchronisables = new RegExp(
    "^" + origineEchappee + MOTIF_CHEMIN_SYNCHRONISABLE.source.slice(1)
  );

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Chantier "visites de terrain hors-ligne" :
      // - Étape 1 : met en cache l'interface (HTML/CSS/JS) pour qu'elle puisse s'ouvrir
      //   même sans connexion (globPatterns ci-dessous).
      // - Étape 2 : met aussi en cache les réponses du serveur déjà reçues avec succès
      //   (liste des PME, détail d'une fiche, historiques...) pour pouvoir les consulter
      //   sans connexion — en LECTURE seulement (1ère règle de runtimeCaching ci-dessous).
      // - Étape 3 : pour un ensemble précis de sous-ressources d'une PME déjà existante
      //   (évaluations ABF, notes de suivi, relevés mensuels, estimations de coûts, actions
      //   du plan d'accompagnement — voir src/lib/syncHorsLigne.js), les ajouts/modifications
      //   faits hors connexion sont mis en file d'attente et renvoyés automatiquement au
      //   serveur dès que la connexion revient (2e et 3e règles de runtimeCaching, une par
      //   méthode HTTP car chaque règle ne peut cibler qu'une seule méthode à la fois).
      VitePWA({
        registerType: "autoUpdate",
        // Active le service worker aussi en mode développement (npm run dev). Attention :
        // en dev, seule l'interface (étape 1) peut être testée ainsi — pour tester la mise
        // en cache des données et la file d'attente (étapes 2 et 3), il faut faire un vrai
        // build (npm run build puis npm run preview), le mode développement ne les applique
        // pas correctement.
        devOptions: {
          enabled: true,
          type: "module",
        },
        includeAssets: ["favicon-32x32.png", "apple-touch-icon.png"],
        manifest: {
          name: "SuiviPME",
          short_name: "SuiviPME",
          description: "Suivi de l'accompagnement des PME (formations, ABF, plan d'accompagnement).",
          theme_color: "#1e293b",
          background_color: "#1e293b",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "maskable-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // Met en cache tout ce qui compose l'interface (le "coffre" de l'application).
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          runtimeCaching: [
            {
              // Étape 2 : lecture des données déjà vues, en priorité fraîches (NetworkFirst),
              // avec repli sur la dernière version connue si le serveur ne répond pas dans
              // les 5 secondes (donc probablement pas de connexion).
              urlPattern: motifServeur,
              method: "GET",
              handler: "NetworkFirst",
              options: {
                cacheName: "suivigerme-donnees",
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 jours
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Étape 3 : ajout de données (POST) sur les sous-ressources autorisées — mis en
              // file d'attente automatiquement par l'outil si la requête échoue faute de
              // connexion, puis renvoyé tout seul dès que la connexion revient.
              urlPattern: motifMutationsSynchronisables,
              method: "POST",
              handler: "NetworkOnly",
              options: {
                backgroundSync: {
                  name: "suivigerme-file-attente",
                  options: {
                    maxRetentionTime: 60 * 24 * 7, // en minutes : 7 jours
                  },
                },
              },
            },
            {
              // Étape 3 (suite) : même principe pour la modification (PUT) de ces sous-ressources.
              urlPattern: motifMutationsSynchronisables,
              method: "PUT",
              handler: "NetworkOnly",
              options: {
                backgroundSync: {
                  name: "suivigerme-file-attente",
                  options: {
                    maxRetentionTime: 60 * 24 * 7,
                  },
                },
              },
            },
          ],
        },
      }),
    ],
  };
});
