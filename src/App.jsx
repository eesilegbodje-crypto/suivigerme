import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  LogOut,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Users,
  GraduationCap,
  MoreVertical,
  UserPlus,
  Calendar,
  MapPin,
  Loader2,
  CheckCircle2,
  Circle,
  ClipboardList,
  StickyNote,
  Sparkles,
  BookOpen,
  Calculator,
  KeyRound,
  ListChecks,
  TrendingUp,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { appelApi, lireSession, ecrireSession } from "./lib/api";

// ============================================================================
// Petits composants réutilisables (boutons, champs, badges, fenêtres...)
// ============================================================================

function Bouton({ variante = "primaire", className = "", ...props }) {
  const styles = {
    primaire: "bg-slate-900 text-white hover:bg-slate-800",
    discret: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variante]} ${className}`}
      {...props}
    />
  );
}

function Champ({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
        {...props}
      />
    </label>
  );
}

function Zone({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <textarea
        rows={3}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
        {...props}
      />
    </label>
  );
}

function Selecteur({ label, children, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <select
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

function Badge({ children, couleur = "slate" }) {
  const styles = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[couleur]}`}>
      {children}
    </span>
  );
}

// Petite carte resume (icone + chiffre + libelle) utilisee en haut des pages de liste pour donner
// un vrai contenu a l'espace au-dessus du tableau, plutot que de laisser un grand vide.
function CarteStat({ icone, label, valeur, couleur = "slate" }) {
  const styles = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles[couleur]}`}>
        {icone}
      </div>
      <div>
        <p className="text-xl font-semibold text-slate-800">{valeur}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function couleurStatutParticipant(statut) {
  if (statut === "Actif") return "emerald";
  if (statut === "Abandon") return "rose";
  return "slate";
}

function couleurSante(badge) {
  if (badge === "rouge") return "rose";
  if (badge === "orange") return "amber";
  return "emerald";
}

function libelleSante(badge) {
  if (badge === "rouge") return "Vigilance";
  if (badge === "orange") return "À surveiller";
  return "RAS";
}

const STATUTS_ACTION = ["À faire", "En cours", "Réalisée", "Partiellement réalisée", "Abandonnée"];

function couleurStatutAction(statut) {
  if (statut === "Réalisée") return "emerald";
  if (statut === "Abandonnée") return "rose";
  if (statut === "En cours" || statut === "Partiellement réalisée") return "amber";
  return "slate";
}

function estActionEnRetard(action) {
  if (action.statut === "Réalisée" || action.statut === "Abandonnée") return false;
  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  return new Date(action.echeance) < aujourdHui;
}

// Alerte préventive : action pas encore en retard, mais dont l'échéance tombe dans les 7
// prochains jours (délai choisi par défaut, modifiable si besoin).
const DELAI_ALERTE_ECHEANCE_JOURS = 7;

function estActionBientotEnRetard(action) {
  if (action.statut === "Réalisée" || action.statut === "Abandonnée") return false;
  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  const dansXJours = new Date(aujourdHui);
  dansXJours.setDate(dansXJours.getDate() + DELAI_ALERTE_ECHEANCE_JOURS);
  const echeance = new Date(action.echeance);
  return echeance >= aujourdHui && echeance <= dansXJours;
}

function Modal({ titre, onFermer, children, large = false }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className={`max-h-[90vh] w-full ${large ? "max-w-2xl" : "max-w-md"} overflow-y-auto rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">{titre}</h2>
          <button onClick={onFermer} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function positionnerMenuActions(rectBouton) {
  const marge = 8;
  const espaceEnBas = window.innerHeight - rectBouton.bottom;
  const espaceEnHaut = rectBouton.top;
  const ouvrirVersLeHaut = espaceEnBas < 200 && espaceEnHaut > espaceEnBas;
  return {
    position: "fixed",
    right: window.innerWidth - rectBouton.right,
    maxHeight: 260,
    overflowY: "auto",
    ...(ouvrirVersLeHaut
      ? { bottom: window.innerHeight - rectBouton.top + marge }
      : { top: rectBouton.bottom + marge }),
  };
}

// Menu d'actions générique (⋮) qui s'ouvre dans un portail pour ne jamais être coupé par le
// tableau qui le contient, même sur la dernière ligne.
function MenuActions({ actions }) {
  const [ouvert, setOuvert] = useState(false);
  const [styleMenu, setStyleMenu] = useState(null);
  const boutonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!ouvert) return;
    const gererClicExterieur = (e) => {
      if (
        boutonRef.current && !boutonRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOuvert(false);
      }
    };
    const fermerMenu = () => setOuvert(false);
    document.addEventListener("mousedown", gererClicExterieur);
    window.addEventListener("scroll", fermerMenu, true);
    window.addEventListener("resize", fermerMenu);
    return () => {
      document.removeEventListener("mousedown", gererClicExterieur);
      window.removeEventListener("scroll", fermerMenu, true);
      window.removeEventListener("resize", fermerMenu);
    };
  }, [ouvert]);

  const basculerMenu = () => {
    if (!ouvert && boutonRef.current) {
      setStyleMenu(positionnerMenuActions(boutonRef.current.getBoundingClientRect()));
    }
    setOuvert((v) => !v);
  };

  return (
    <>
      <button
        ref={boutonRef}
        onClick={basculerMenu}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreVertical size={16} />
      </button>
      {ouvert &&
        styleMenu &&
        createPortal(
          <div
            ref={menuRef}
            style={styleMenu}
            className="w-44 z-50 rounded-lg border border-slate-100 bg-white py-1 text-sm shadow-lg"
          >
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  setOuvert(false);
                  action.onClick();
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 ${
                  action.danger ? "text-rose-600" : "text-slate-700"
                }`}
              >
                {action.icone}
                {action.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

function FormatDate(dateIso) {
  if (!dateIso) return "—";
  try {
    return new Date(dateIso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function FormatMontant(valeur) {
  if (valeur === null || valeur === undefined || Number.isNaN(valeur)) return "—";
  return `${Math.round(valeur).toLocaleString("fr-FR")} FCFA`;
}

function FormatMois(dateIso) {
  if (!dateIso) return "—";
  try {
    const libelle = new Date(dateIso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return libelle.charAt(0).toUpperCase() + libelle.slice(1);
  } catch {
    return "—";
  }
}

// Petit graphique en courbe (SVG fait main, pas de librairie externe) pour visualiser l'évolution
// du bénéfice net d'une PME dans le temps. Une seule série : le titre au-dessus du graphique la
// nomme, donc pas de légende séparée. Les points sont colorés selon le signe (vert = positif,
// rose = négatif) pour renforcer visuellement la position par rapport à la ligne zéro, et seuls
// le premier, le dernier, le minimum et le maximum sont étiquetés (jamais un chiffre par point).
function GraphiqueBeneficeNet({ donnees }) {
  const largeur = 640;
  const hauteur = 200;
  const marge = { haut: 24, bas: 24, gauche: 12, droite: 12 };
  const largeurTrace = largeur - marge.gauche - marge.droite;
  const hauteurTrace = hauteur - marge.haut - marge.bas;

  const valeurs = donnees.map((d) => d.beneficeNet);
  const minVal = Math.min(0, ...valeurs);
  const maxVal = Math.max(0, ...valeurs);
  const etendue = maxVal - minVal || 1;
  const paddingY = etendue * 0.15;
  const minAffiche = minVal - paddingY;
  const maxAffiche = maxVal + paddingY;
  const etendueAffichee = maxAffiche - minAffiche || 1;

  const x = (i) =>
    marge.gauche + (donnees.length > 1 ? (i / (donnees.length - 1)) * largeurTrace : largeurTrace / 2);
  const y = (v) => marge.haut + hauteurTrace - ((v - minAffiche) / etendueAffichee) * hauteurTrace;
  const yZero = y(0);

  const points = donnees.map((d, i) => ({ ...d, x: x(i), y: y(d.beneficeNet) }));
  const chemin = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const indexMin = valeurs.indexOf(Math.min(...valeurs));
  const indexMax = valeurs.indexOf(Math.max(...valeurs));
  const indicesEtiquetes = new Set([0, donnees.length - 1, indexMin, indexMax]);
  const pasEtiquetteMois = Math.max(1, Math.ceil(donnees.length / 8));

  const formatCourt = (v) => Math.round(v).toLocaleString("fr-FR");

  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <svg viewBox={`0 0 ${largeur} ${hauteur}`} className="w-full" style={{ height: 180 }}>
        <line
          x1={marge.gauche}
          y1={yZero}
          x2={largeur - marge.droite}
          y2={yZero}
          stroke="#e2e8f0"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <path d={chemin} fill="none" stroke="#475569" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill={p.beneficeNet >= 0 ? "#10b981" : "#f43f5e"}
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            {indicesEtiquetes.has(i) && (
              <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#475569">
                {formatCourt(p.beneficeNet)}
              </text>
            )}
            {i % pasEtiquetteMois === 0 && (
              <text x={p.x} y={hauteur - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">
                {new Date(p.mois).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="mt-2 max-h-24 overflow-y-auto rounded border border-slate-100">
        <table className="w-full text-left text-xs">
          <tbody className="divide-y divide-slate-50">
            {donnees.map((d, i) => (
              <tr key={i}>
                <td className="px-2 py-1 text-slate-500">{FormatMois(d.mois)}</td>
                <td
                  className={`px-2 py-1 text-right font-medium ${
                    d.beneficeNet >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {FormatMontant(d.beneficeNet)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Connexion
// ============================================================================

function PageConnexion({ onConnecte }) {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    if (!email || !motDePasse) {
      setErreur("Merci de renseigner l'email et le mot de passe.");
      return;
    }
    setChargement(true);
    const reponse = await appelApi("/auth/login", { method: "POST", body: { email, motDePasse } });
    setChargement(false);
    if (reponse.ok) {
      const session = { token: reponse.data.token, user: reponse.data.user };
      ecrireSession(session);
      onConnecte(session);
    } else if (reponse.erreurReseau) {
      setErreur("Impossible de contacter le serveur. Vérifiez votre connexion internet.");
    } else {
      setErreur(reponse.data?.error || "Email ou mot de passe incorrect.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900">
            <GraduationCap className="text-white" size={24} />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">SuiviPME</h1>
          <p className="mt-1 text-sm text-slate-500">Suivi des activités de formation GERME</p>
        </div>
        <form onSubmit={soumettre} className="space-y-4">
          <Champ label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          <Champ
            label="Mot de passe"
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
          {erreur && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</p>}
          <Bouton type="submit" disabled={chargement} className="w-full">
            {chargement ? <Loader2 size={16} className="animate-spin" /> : "Se connecter"}
          </Bouton>
        </form>
      </div>
    </div>
  );
}

// Formulaire reutilisable de changement de mot de passe (exige de connaitre le mot de passe
// actuel) : utilise a la fois pour le changement obligatoire a la premiere connexion et pour un
// changement volontaire depuis le menu de gauche.
function FormulaireChangementMotDePasse({ token, onSuccess, texteBouton = "Mettre à jour le mot de passe" }) {
  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    if (!motDePasseActuel || !nouveauMotDePasse || !confirmation) {
      setErreur("Tous les champs sont obligatoires.");
      return;
    }
    if (nouveauMotDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setEnregistrement(true);
    const reponse = await appelApi("/auth/changer-mot-de-passe", {
      method: "PATCH",
      body: { motDePasseActuel, nouveauMotDePasse },
      token,
    });
    setEnregistrement(false);
    if (reponse.ok) {
      onSuccess();
    } else if (reponse.erreurReseau) {
      setErreur("Impossible de contacter le serveur.");
    } else {
      setErreur(reponse.data?.error || "Une erreur est survenue.");
    }
  };

  return (
    <form onSubmit={soumettre} className="space-y-4">
      <Champ
        label="Mot de passe actuel"
        type="password"
        value={motDePasseActuel}
        onChange={(e) => setMotDePasseActuel(e.target.value)}
        autoFocus
      />
      <Champ
        label="Nouveau mot de passe"
        type="password"
        value={nouveauMotDePasse}
        onChange={(e) => setNouveauMotDePasse(e.target.value)}
      />
      <div>
        <Champ
          label="Confirmer le nouveau mot de passe"
          type="password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">Au moins 8 caractères, avec une lettre et un chiffre.</p>
      </div>
      {erreur && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</p>}
      <Bouton type="submit" disabled={enregistrement} className="w-full">
        {enregistrement ? <Loader2 size={16} className="animate-spin" /> : texteBouton}
      </Bouton>
    </form>
  );
}

// Écran plein bloquant, affiché tant que `doitChangerMotDePasse` est vrai (compte créé par le
// coordonnateur, ou mot de passe réinitialisé pour oubli) — impossible d'accéder au reste de
// l'application avant d'avoir défini un nouveau mot de passe.
function PageChangementMotDePasseObligatoire({ token, onSuccess, onDeconnexion }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900">
            <KeyRound className="text-white" size={24} />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Changement de mot de passe requis</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pour des raisons de sécurité, définissez un nouveau mot de passe avant de continuer.
          </p>
        </div>
        <FormulaireChangementMotDePasse token={token} onSuccess={onSuccess} texteBouton="Continuer" />
        <button
          onClick={onDeconnexion}
          className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

// Fenêtre de changement de mot de passe volontaire (accessible à tout moment depuis le menu de
// gauche), reprend le même formulaire que le changement obligatoire.
function ModalChangerMotDePasse({ onFermer, token }) {
  const [succes, setSucces] = useState(false);
  return (
    <Modal titre="Changer mon mot de passe" onFermer={onFermer}>
      {succes ? (
        <div className="space-y-4 text-center">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Votre mot de passe a été mis à jour.
          </p>
          <Bouton onClick={onFermer} className="w-full">
            Fermer
          </Bouton>
        </div>
      ) : (
        <FormulaireChangementMotDePasse token={token} onSuccess={() => setSucces(true)} />
      )}
    </Modal>
  );
}

// ============================================================================
// Mise en page générale (menu latéral)
// ============================================================================

function MisEnPage({ session, page, onChangerPage, onDeconnexion, children }) {
  const [modalMotDePasse, setModalMotDePasse] = useState(false);
  const items = [
    { id: "participants", label: "Participants", icone: <Users size={18} /> },
    { id: "formations", label: "Formations", icone: <GraduationCap size={18} /> },
  ];
  if (session.user.role === "coordonnateur") {
    items.push({ id: "comptes", label: "Comptes", icone: <KeyRound size={18} /> });
  }
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-100 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900">
            <GraduationCap className="text-white" size={18} />
          </div>
          <span className="text-sm font-semibold text-slate-800">SuiviPME</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangerPage(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                page === item.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.icone}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium text-slate-700">{session.user.nom}</p>
            <p className="text-xs text-slate-400">
              {session.user.role === "coordonnateur" ? "Coordonnateur" : "Conseiller"}
            </p>
          </div>
          <button
            onClick={() => setModalMotDePasse(true)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            <KeyRound size={16} />
            Changer mon mot de passe
          </button>
          <button
            onClick={onDeconnexion}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
      {modalMotDePasse && (
        <ModalChangerMotDePasse onFermer={() => setModalMotDePasse(false)} token={session.token} />
      )}
    </div>
  );
}

// ============================================================================
// Participants
// ============================================================================

const PARTICIPANT_VIDE = {
  nom: "",
  telephone: "",
  email: "",
  localite: "",
  nomEntreprise: "",
  secteurActivite: "",
  statut: "Actif",
  notes: "",
};

function ModalParticipant({ participant, onFermer, onEnregistre, token }) {
  const [form, setForm] = useState(participant || PARTICIPANT_VIDE);
  const [erreur, setErreur] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  const changer = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    if (!form.nom.trim()) {
      setErreur("Le nom est obligatoire.");
      return;
    }
    setEnregistrement(true);
    const reponse = participant
      ? await appelApi(`/participants/${participant.id}`, { method: "PUT", body: form, token })
      : await appelApi("/participants", { method: "POST", body: form, token });
    setEnregistrement(false);
    if (reponse.ok) {
      onEnregistre();
    } else if (reponse.erreurReseau) {
      setErreur("Impossible de contacter le serveur.");
    } else {
      setErreur(reponse.data?.error || "Une erreur est survenue.");
    }
  };

  return (
    <Modal titre={participant ? "Modifier le participant" : "Nouveau participant"} onFermer={onFermer}>
      <form onSubmit={soumettre} className="space-y-4">
        <Champ label="Nom complet" value={form.nom} onChange={changer("nom")} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Téléphone" value={form.telephone || ""} onChange={changer("telephone")} />
          <Champ label="Email" type="email" value={form.email || ""} onChange={changer("email")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Localité" value={form.localite || ""} onChange={changer("localite")} />
          <Selecteur label="Statut" value={form.statut} onChange={changer("statut")}>
            <option value="Actif">Actif</option>
            <option value="Sorti">Sorti</option>
            <option value="Abandon">Abandon</option>
          </Selecteur>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Nom de l'entreprise" value={form.nomEntreprise || ""} onChange={changer("nomEntreprise")} />
          <Champ label="Secteur d'activité" value={form.secteurActivite || ""} onChange={changer("secteurActivite")} />
        </div>
        <Zone label="Notes" value={form.notes || ""} onChange={changer("notes")} />
        {erreur && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Bouton type="button" variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={enregistrement}>
            {enregistrement ? <Loader2 size={16} className="animate-spin" /> : "Enregistrer"}
          </Bouton>
        </div>
      </form>
    </Modal>
  );
}

function NiveauBadge({ niveau }) {
  const couleurs = {
    Prioritaire: "rose",
    "À renforcer": "amber",
    "À consolider": "amber",
    Solide: "emerald",
    Structuré: "emerald",
  };
  if (!niveau || niveau.niveau === null || niveau.niveau === undefined) {
    return <Badge couleur="slate">Non renseigné</Badge>;
  }
  return (
    <Badge couleur={couleurs[niveau.libelle] || "slate"}>
      {niveau.niveau}/5 · {niveau.libelle}
    </Badge>
  );
}

function libelleRubriqueAbf(rubriqueId) {
  return ABF_RUBRIQUES.find((r) => r.rubriqueId === rubriqueId)?.titre || rubriqueId;
}

function libelleDomaineBesoin(domaineId) {
  return ABF_DOMAINES.find((d) => d.id === domaineId)?.label || domaineId;
}

const REGISTRES_SUIVIS = [
  { champ: "registreVentes", label: "Ventes" },
  { champ: "registreAchats", label: "Achats" },
  { champ: "registreCaisse", label: "Caisse" },
  { champ: "registreCreances", label: "Créances" },
  { champ: "registreActifs", label: "Actifs" },
];

function ModalDetailParticipant({ participantId, onFermer, token }) {
  const [participant, setParticipant] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [notes, setNotes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [onglet, setOnglet] = useState("formations");
  const [evaluationEnEdition, setEvaluationEnEdition] = useState(null);
  const [modalNouvelleEvaluation, setModalNouvelleEvaluation] = useState(false);
  const [nouvelleNote, setNouvelleNote] = useState({ dateNote: new Date().toISOString().slice(0, 10), contenu: "" });
  const [ajoutNoteEnCours, setAjoutNoteEnCours] = useState(false);
  const [diagnosticsEnCours, setDiagnosticsEnCours] = useState({});
  const [releves, setReleves] = useState([]);
  const [estimations, setEstimations] = useState([]);
  const [releveEnEdition, setReleveEnEdition] = useState(null);
  const [modalNouveauReleve, setModalNouveauReleve] = useState(false);
  const [estimationEnEdition, setEstimationEnEdition] = useState(null);
  const [modalNouvelleEstimation, setModalNouvelleEstimation] = useState(false);
  const [actions, setActions] = useState([]);
  const [actionEnEdition, setActionEnEdition] = useState(null);
  const [modalNouvelleAction, setModalNouvelleAction] = useState(false);
  const [diagnosticGlobalEnCours, setDiagnosticGlobalEnCours] = useState(false);
  const [performance, setPerformance] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    const [
      reponseParticipant,
      reponseEvaluations,
      reponseNotes,
      reponseStructure,
      reponseReleves,
      reponseEstimations,
      reponseActions,
      reponsePerformance,
    ] = await Promise.all([
        appelApi(`/participants/${participantId}`, { token }),
        appelApi(`/participants/${participantId}/evaluations-abf`, { token }),
        appelApi(`/participants/${participantId}/notes-suivi`, { token }),
        appelApi("/abf/structure", { token }),
        appelApi(`/participants/${participantId}/releves-mensuels`, { token }),
        appelApi(`/participants/${participantId}/estimations-couts`, { token }),
        appelApi(`/participants/${participantId}/actions-accompagnement`, { token }),
        appelApi(`/participants/${participantId}/performance`, { token }),
      ]);
    if (reponseParticipant.ok) setParticipant(reponseParticipant.data);
    if (reponseEvaluations.ok) setEvaluations(reponseEvaluations.data);
    if (reponseNotes.ok) setNotes(reponseNotes.data);
    if (reponseReleves.ok) setReleves(reponseReleves.data);
    if (reponseEstimations.ok) setEstimations(reponseEstimations.data);
    if (reponseActions.ok) setActions(reponseActions.data);
    if (reponsePerformance.ok) setPerformance(reponsePerformance.data);
    if (reponseStructure.ok) {
      ABF_RUBRIQUES = reponseStructure.data.rubriques;
      ABF_DOMAINES = reponseStructure.data.domainesBesoinFormation;
      ABF_MOMENTS = reponseStructure.data.moments;
    }
    setChargement(false);
  }, [participantId, token]);

  useEffect(() => {
    charger();
  }, [charger]);

  const supprimerEvaluation = async (evaluation) => {
    if (!confirm("Supprimer cette évaluation ABF ?")) return;
    const reponse = await appelApi(`/participants/${participantId}/evaluations-abf/${evaluation.id}`, {
      method: "DELETE",
      token,
    });
    if (reponse.ok) charger();
    else alert(reponse.data?.error || "Impossible de supprimer cette évaluation.");
  };

  const ajouterNote = async () => {
    if (!nouvelleNote.contenu.trim()) return;
    setAjoutNoteEnCours(true);
    const reponse = await appelApi(`/participants/${participantId}/notes-suivi`, {
      method: "POST",
      body: nouvelleNote,
      token,
    });
    setAjoutNoteEnCours(false);
    if (reponse.ok) {
      setNouvelleNote({ dateNote: new Date().toISOString().slice(0, 10), contenu: "" });
      charger();
    } else {
      alert(reponse.data?.error || "Impossible d'ajouter cette note.");
    }
  };

  const supprimerNote = async (note) => {
    if (!confirm("Supprimer cette note de suivi ?")) return;
    const reponse = await appelApi(`/participants/${participantId}/notes-suivi/${note.id}`, {
      method: "DELETE",
      token,
    });
    if (reponse.ok) charger();
    else alert(reponse.data?.error || "Impossible de supprimer cette note.");
  };

  const genererDiagnostic = async (evaluation) => {
    setDiagnosticsEnCours((d) => ({ ...d, [evaluation.id]: true }));
    const reponse = await appelApi(`/participants/${participantId}/evaluations-abf/${evaluation.id}/diagnostic-ia`, {
      method: "POST",
      token,
    });
    setDiagnosticsEnCours((d) => ({ ...d, [evaluation.id]: false }));
    if (reponse.ok) charger();
    else alert(reponse.data?.error || "Le diagnostic IA est momentanément indisponible.");
  };

  const genererDiagnosticGlobal = async () => {
    setDiagnosticGlobalEnCours(true);
    const reponse = await appelApi(`/participants/${participantId}/diagnostic-global-ia`, {
      method: "POST",
      token,
    });
    setDiagnosticGlobalEnCours(false);
    if (reponse.ok) charger();
    else alert(reponse.data?.error || "Le diagnostic IA global est momentanément indisponible.");
  };

  const supprimerReleve = async (releve) => {
    if (!confirm("Supprimer ce relevé mensuel ?")) return;
    const reponse = await appelApi(`/participants/${participantId}/releves-mensuels/${releve.id}`, {
      method: "DELETE",
      token,
    });
    if (reponse.ok) charger();
    else alert(reponse.data?.error || "Impossible de supprimer ce relevé.");
  };

  const supprimerEstimation = async (estimation) => {
    if (!confirm("Supprimer cette estimation de coût ?")) return;
    const reponse = await appelApi(`/participants/${participantId}/estimations-couts/${estimation.id}`, {
      method: "DELETE",
      token,
    });
    if (reponse.ok) charger();
    else alert(reponse.data?.error || "Impossible de supprimer cette estimation.");
  };

  const supprimerAction = async (action) => {
    if (!confirm("Supprimer cette action du plan d'accompagnement ?")) return;
    const reponse = await appelApi(`/participants/${participantId}/actions-accompagnement/${action.id}`, {
      method: "DELETE",
      token,
    });
    if (reponse.ok) charger();
    else alert(reponse.data?.error || "Impossible de supprimer cette action.");
  };

  const ONGLETS = [
    { id: "formations", label: "Formations", icone: <GraduationCap size={14} /> },
    { id: "abf", label: "Évaluations ABF", icone: <ClipboardList size={14} /> },
    { id: "suivi", label: "Notes de suivi", icone: <StickyNote size={14} /> },
    { id: "registres", label: "Registres", icone: <BookOpen size={14} /> },
    { id: "couts", label: "Coût de revient", icone: <Calculator size={14} /> },
    { id: "accompagnement", label: "Plan d'accompagnement", icone: <ListChecks size={14} /> },
    { id: "performance", label: "Performance", icone: <TrendingUp size={14} /> },
  ];

  return (
    <Modal titre={participant ? participant.nom : "Fiche participant"} onFermer={onFermer} large>
      {chargement ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-slate-400" />
        </div>
      ) : !participant ? (
        <p className="text-sm text-slate-500">Participant introuvable.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {[participant.nomEntreprise, participant.localite].filter(Boolean).join(" · ") || "—"}
          </p>

          {participant.sante && (
            <div
              className={`rounded-lg border p-3 ${
                participant.sante.badge === "rouge"
                  ? "border-rose-200 bg-rose-50"
                  : participant.sante.badge === "orange"
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-slate-600">Santé de la PME</p>
                <Badge couleur={couleurSante(participant.sante.badge)}>{libelleSante(participant.sante.badge)}</Badge>
              </div>
              {participant.sante.alertes.length > 0 ? (
                <ul className="mt-1.5 ml-4 list-disc text-xs text-slate-600">
                  {participant.sante.alertes.map((a, i) => (
                    <li key={i}>{a.message}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Aucune alerte active pour le moment.</p>
              )}

              <div className="mt-3 border-t border-slate-200/70 pt-3">
                {participant.diagnosticGlobalIa ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-600">
                        Diagnostic IA global{" "}
                        <span className="font-normal text-slate-400">
                          · {FormatDate(participant.diagnosticGlobalGenereLe)}
                        </span>
                      </p>
                      <button
                        onClick={genererDiagnosticGlobal}
                        disabled={diagnosticGlobalEnCours}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50"
                      >
                        {diagnosticGlobalEnCours ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        Régénérer
                      </button>
                    </div>
                    <p className="text-sm text-slate-600">{participant.diagnosticGlobalIa.diagnostic}</p>
                    {participant.diagnosticGlobalIa.causesProfondes?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500">Causes profondes probables</p>
                        <ul className="ml-4 list-disc text-sm text-slate-600">
                          {participant.diagnosticGlobalIa.causesProfondes.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {participant.diagnosticGlobalIa.actionsSuggerees?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500">Actions suggérées</p>
                        <ul className="ml-4 list-disc text-sm text-slate-600">
                          {participant.diagnosticGlobalIa.actionsSuggerees.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Ces suggestions sont importables en un clic depuis la fiche "Nouvelle action" du plan
                          d'accompagnement.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <Bouton variante="discret" onClick={genererDiagnosticGlobal} disabled={diagnosticGlobalEnCours}>
                    {diagnosticGlobalEnCours ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    Générer le diagnostic IA global
                  </Bouton>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-1 border-b border-slate-100">
            {ONGLETS.map((o) => (
              <button
                key={o.id}
                onClick={() => setOnglet(o.id)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
                  onglet === o.id
                    ? "border-slate-800 text-slate-800"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {o.icone} {o.label}
              </button>
            ))}
          </div>

          {onglet === "formations" &&
            (participant.participations.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
                Aucune formation suivie pour le moment.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                {participant.participations.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {MODULES_GERME_LABEL[p.formation.module] || p.formation.module}
                      </p>
                      <p className="text-xs text-slate-400">
                        {FormatDate(p.formation.date)} {p.formation.lieu ? `· ${p.formation.lieu}` : ""}
                      </p>
                      {p.appreciation && <p className="mt-1 text-xs text-slate-500">« {p.appreciation} »</p>}
                    </div>
                    {p.present ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 size={14} /> Présent
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Circle size={14} /> Absent
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ))}

          {onglet === "abf" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Bouton onClick={() => setModalNouvelleEvaluation(true)}>
                  <Plus size={16} /> Nouvelle évaluation
                </Bouton>
              </div>
              {evaluations.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
                  Aucune évaluation ABF enregistrée pour le moment.
                </p>
              ) : (
                evaluations.map((e) => (
                  <div key={e.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{e.moment}</p>
                        <p className="text-xs text-slate-400">{FormatDate(e.dateEvaluation)}</p>
                      </div>
                      <MenuActions
                        actions={[
                          { label: "Modifier", icone: <Pencil size={14} />, onClick: () => setEvaluationEnEdition(e) },
                          {
                            label: "Supprimer",
                            icone: <Trash2 size={14} />,
                            danger: true,
                            onClick: () => supprimerEvaluation(e),
                          },
                        ]}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(e.niveaux).map(([rubriqueId, niveau]) => (
                        <span key={rubriqueId} className="flex items-center gap-1 text-xs text-slate-500">
                          {libelleRubriqueAbf(rubriqueId)} <NiveauBadge niveau={niveau} />
                        </span>
                      ))}
                    </div>
                    {(e.besoinsDomaines.length > 0 || e.besoinsAutre) && (
                      <p className="mt-2 text-xs text-slate-500">
                        Besoins identifiés :{" "}
                        {[...e.besoinsDomaines.map(libelleDomaineBesoin), e.besoinsAutre].filter(Boolean).join(", ")}
                      </p>
                    )}

                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {e.diagnosticIa ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-600">
                              Diagnostic IA <span className="font-normal text-slate-400">· {FormatDate(e.diagnosticGenereLe)}</span>
                            </p>
                            <button
                              onClick={() => genererDiagnostic(e)}
                              disabled={diagnosticsEnCours[e.id]}
                              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50"
                            >
                              {diagnosticsEnCours[e.id] ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Sparkles size={12} />
                              )}
                              Régénérer
                            </button>
                          </div>
                          <p className="text-sm text-slate-600">{e.diagnosticIa.diagnostic}</p>
                          {e.diagnosticIa.problemesIdentifies?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-slate-500">Problèmes identifiés</p>
                              <ul className="ml-4 list-disc text-sm text-slate-600">
                                {e.diagnosticIa.problemesIdentifies.map((p, i) => (
                                  <li key={i}>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {e.diagnosticIa.formationsRecommandees?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-slate-500">Formations à prioriser</p>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {e.diagnosticIa.formationsRecommandees.map((id) => (
                                  <Badge key={id} couleur="slate">
                                    {libelleRubriqueAbf(id)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {e.diagnosticIa.actionsCorrectives?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-slate-500">Actions correctives</p>
                              <ul className="ml-4 list-disc text-sm text-slate-600">
                                {e.diagnosticIa.actionsCorrectives.map((a, i) => (
                                  <li key={i}>{a}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Bouton variante="discret" onClick={() => genererDiagnostic(e)} disabled={diagnosticsEnCours[e.id]}>
                          {diagnosticsEnCours[e.id] ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} />
                          )}
                          Générer le diagnostic IA
                        </Bouton>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {onglet === "suivi" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-100 p-4">
                <Zone
                  label="Nouvelle note"
                  placeholder="Ce qui a été observé lors de la visite de suivi..."
                  value={nouvelleNote.contenu}
                  onChange={(e) => setNouvelleNote((n) => ({ ...n, contenu: e.target.value }))}
                />
                <div className="mt-2 flex items-center justify-between">
                  <input
                    type="date"
                    value={nouvelleNote.dateNote}
                    onChange={(e) => setNouvelleNote((n) => ({ ...n, dateNote: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-400"
                  />
                  <Bouton onClick={ajouterNote} disabled={ajoutNoteEnCours}>
                    {ajoutNoteEnCours ? <Loader2 size={16} className="animate-spin" /> : "Ajouter"}
                  </Bouton>
                </div>
              </div>
              {notes.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
                  Aucune note de suivi pour le moment.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {notes.map((n) => (
                    <li key={n.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-xs text-slate-400">{FormatDate(n.dateNote)}</p>
                        <p className="text-sm text-slate-600">{n.contenu}</p>
                      </div>
                      <button
                        onClick={() => supprimerNote(n)}
                        className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {onglet === "registres" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Bouton onClick={() => setModalNouveauReleve(true)}>
                  <Plus size={16} /> Nouveau relevé
                </Bouton>
              </div>
              {releves.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
                  Aucun relevé mensuel enregistré pour le moment.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {releves.map((r) => (
                    <li key={r.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700">{FormatMois(r.mois)}</p>
                        <MenuActions
                          actions={[
                            { label: "Modifier", icone: <Pencil size={14} />, onClick: () => setReleveEnEdition(r) },
                            {
                              label: "Supprimer",
                              icone: <Trash2 size={14} />,
                              danger: true,
                              onClick: () => supprimerReleve(r),
                            },
                          ]}
                        />
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-500 sm:grid-cols-4">
                        <p>Ventes : <span className="text-slate-700">{FormatMontant(r.ventesTotales)}</span></p>
                        <p>Achats : <span className="text-slate-700">{FormatMontant(r.achatsTotaux)}</span></p>
                        <p>Dépenses : <span className="text-slate-700">{FormatMontant(r.depenses)}</span></p>
                        <p>
                          Bénéfice net :{" "}
                          <span className={r.beneficeNet >= 0 ? "font-medium text-emerald-600" : "font-medium text-rose-600"}>
                            {FormatMontant(r.beneficeNet)}
                          </span>
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {REGISTRES_SUIVIS.map((reg) => (
                          <span
                            key={reg.champ}
                            className={`flex items-center gap-1 text-xs ${
                              r[reg.champ] ? "text-emerald-600" : "text-slate-300"
                            }`}
                          >
                            {r[reg.champ] ? <CheckCircle2 size={12} /> : <Circle size={12} />} {reg.label}
                          </span>
                        ))}
                      </div>
                      {r.notes && <p className="mt-2 text-xs text-slate-500">{r.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {onglet === "couts" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Bouton onClick={() => setModalNouvelleEstimation(true)}>
                  <Plus size={16} /> Nouvelle estimation
                </Bouton>
              </div>
              {estimations.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
                  Aucune estimation de coût enregistrée pour le moment.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {estimations.map((est) => (
                    <li key={est.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{est.nomProduit}</p>
                          <p className="text-xs text-slate-400">{FormatDate(est.dateEstimation)}</p>
                        </div>
                        <MenuActions
                          actions={[
                            { label: "Modifier", icone: <Pencil size={14} />, onClick: () => setEstimationEnEdition(est) },
                            {
                              label: "Supprimer",
                              icone: <Trash2 size={14} />,
                              danger: true,
                              onClick: () => supprimerEstimation(est),
                            },
                          ]}
                        />
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-500 sm:grid-cols-3">
                        <p>Coût total : <span className="text-slate-700">{FormatMontant(est.coutTotal)}</span></p>
                        <p>Coût unitaire : <span className="text-slate-700">{FormatMontant(est.coutUnitaire)}</span></p>
                        <p>
                          Prix de vente conseillé :{" "}
                          <span className="font-medium text-emerald-600">{FormatMontant(est.prixVenteConseille)}</span>
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Quantité produite : {est.quantiteProduite} · Marge souhaitée : {est.margeSouhaitee}%
                      </p>
                      {est.notes && <p className="mt-2 text-xs text-slate-500">{est.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {onglet === "accompagnement" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {actions.filter(estActionEnRetard).length > 0 && (
                    <Badge couleur="rose">
                      {actions.filter(estActionEnRetard).length} action
                      {actions.filter(estActionEnRetard).length > 1 ? "s" : ""} en retard
                    </Badge>
                  )}
                  {actions.filter(estActionBientotEnRetard).length > 0 && (
                    <Badge couleur="amber">
                      {actions.filter(estActionBientotEnRetard).length} action
                      {actions.filter(estActionBientotEnRetard).length > 1 ? "s" : ""} à échéance proche (
                      {DELAI_ALERTE_ECHEANCE_JOURS} j)
                    </Badge>
                  )}
                </div>
                <Bouton onClick={() => setModalNouvelleAction(true)}>
                  <Plus size={16} /> Nouvelle action
                </Bouton>
              </div>
              {actions.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
                  Aucune action de plan d'accompagnement enregistrée pour le moment.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {actions.map((act) => (
                    <li
                      key={act.id}
                      className={`px-4 py-3 ${
                        estActionEnRetard(act)
                          ? "bg-rose-50"
                          : estActionBientotEnRetard(act)
                          ? "bg-amber-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{act.probleme}</p>
                          <p className="text-xs text-slate-400">
                            Échéance : {FormatDate(act.echeance)}
                            {estActionEnRetard(act) && (
                              <span className="ml-1.5 font-medium text-rose-600">(en retard)</span>
                            )}
                            {!estActionEnRetard(act) && estActionBientotEnRetard(act) && (
                              <span className="ml-1.5 font-medium text-amber-600">(échéance proche)</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {act.origine === "ABF" && <Badge couleur="slate">Diagnostic ABF</Badge>}
                          {act.origine === "IA_globale" && <Badge couleur="slate">Diagnostic IA global</Badge>}
                          <Badge couleur={couleurStatutAction(act.statut)}>{act.statut}</Badge>
                          <MenuActions
                            actions={[
                              { label: "Modifier", icone: <Pencil size={14} />, onClick: () => setActionEnEdition(act) },
                              {
                                label: "Supprimer",
                                icone: <Trash2 size={14} />,
                                danger: true,
                                onClick: () => supprimerAction(act),
                              },
                            ]}
                          />
                        </div>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        Action : <span className="text-slate-700">{act.action}</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-400">Responsable : {act.responsable}</p>
                      {act.formationLiee && (
                        <p className="mt-1 text-xs text-slate-400">
                          Formation liée : <span className="text-slate-600">{libelleRubriqueAbf(act.formationLiee)}</span>
                        </p>
                      )}
                      {act.noteVerification && (
                        <p className="mt-2 text-xs text-slate-500">Vérification : {act.noteVerification}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {onglet === "performance" && (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Progression ABF (Avant → Après formation)</p>
                {!performance?.progressionAbf ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
                    Pas encore assez de données pour mesurer la progression : il faut au moins une évaluation ABF
                    "Avant formation" et une "Après formation" pour cette PME.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-slate-100">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Rubrique</th>
                          <th className="px-3 py-2">Avant</th>
                          <th className="px-3 py-2">Après</th>
                          <th className="px-3 py-2">Évolution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {performance.progressionAbf.rubriques.map((r) => (
                          <tr key={r.rubriqueId}>
                            <td className="px-3 py-2 text-slate-600">{r.titre}</td>
                            <td className="px-3 py-2 text-slate-500">
                              {r.niveauAvant !== null ? `${r.niveauAvant}/5` : "—"}
                            </td>
                            <td className="px-3 py-2 text-slate-500">
                              {r.niveauApres !== null ? `${r.niveauApres}/5` : "—"}
                            </td>
                            <td className="px-3 py-2">
                              {r.delta === null ? (
                                <span className="text-slate-300">—</span>
                              ) : r.delta > 0 ? (
                                <span className="flex items-center gap-1 font-medium text-emerald-600">
                                  <ArrowUp size={14} /> +{r.delta}
                                </span>
                              ) : r.delta < 0 ? (
                                <span className="flex items-center gap-1 font-medium text-rose-600">
                                  <ArrowDown size={14} /> {r.delta}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Minus size={14} /> 0
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      Évaluation "Avant" du {FormatDate(performance.progressionAbf.dateEvaluationAvant)} · Évaluation
                      "Après" du {FormatDate(performance.progressionAbf.dateEvaluationApres)} · Progression moyenne :{" "}
                      <span className="font-medium text-slate-700">
                        {performance.progressionAbf.moyenneDelta === null
                          ? "—"
                          : `${performance.progressionAbf.moyenneDelta > 0 ? "+" : ""}${performance.progressionAbf.moyenneDelta.toFixed(1)}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Évolution du bénéfice net</p>
                {!performance?.evolutionFinanciere || performance.evolutionFinanciere.length < 2 ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
                    Pas encore assez de relevés mensuels pour visualiser une tendance (au moins 2 mois nécessaires).
                  </p>
                ) : (
                  <GraphiqueBeneficeNet donnees={performance.evolutionFinanciere} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {(modalNouvelleEvaluation || evaluationEnEdition) && (
        <ModalEvaluationAbf
          participantId={participantId}
          evaluation={evaluationEnEdition}
          onFermer={() => {
            setModalNouvelleEvaluation(false);
            setEvaluationEnEdition(null);
          }}
          onEnregistre={() => {
            setModalNouvelleEvaluation(false);
            setEvaluationEnEdition(null);
            charger();
          }}
          token={token}
        />
      )}

      {(modalNouveauReleve || releveEnEdition) && (
        <ModalReleveMensuel
          participantId={participantId}
          releve={releveEnEdition}
          onFermer={() => {
            setModalNouveauReleve(false);
            setReleveEnEdition(null);
          }}
          onEnregistre={() => {
            setModalNouveauReleve(false);
            setReleveEnEdition(null);
            charger();
          }}
          token={token}
        />
      )}

      {(modalNouvelleEstimation || estimationEnEdition) && (
        <ModalEstimationCout
          participantId={participantId}
          estimation={estimationEnEdition}
          onFermer={() => {
            setModalNouvelleEstimation(false);
            setEstimationEnEdition(null);
          }}
          onEnregistre={() => {
            setModalNouvelleEstimation(false);
            setEstimationEnEdition(null);
            charger();
          }}
          token={token}
        />
      )}

      {(modalNouvelleAction || actionEnEdition) && (
        <ModalActionAccompagnement
          participantId={participantId}
          action={actionEnEdition}
          evaluations={evaluations}
          diagnosticGlobal={participant?.diagnosticGlobalIa}
          onFermer={() => {
            setModalNouvelleAction(false);
            setActionEnEdition(null);
          }}
          onEnregistre={() => {
            setModalNouvelleAction(false);
            setActionEnEdition(null);
            charger();
          }}
          token={token}
        />
      )}
    </Modal>
  );
}

// Rempli dynamiquement dès qu'une fiche participant est ouverte, pour que la structure du
// questionnaire ABF reste définie à un seul endroit : le serveur (src/lib/questionnaireAbf.js).
let ABF_RUBRIQUES = [];
let ABF_DOMAINES = [];
let ABF_MOMENTS = ["Avant formation", "Après formation"];

function ModalEvaluationAbf({ participantId, evaluation, onFermer, onEnregistre, token }) {
  const [valeurs, setValeurs] = useState(() =>
    evaluation
      ? {
          moment: evaluation.moment,
          dateEvaluation: evaluation.dateEvaluation.slice(0, 10),
          reponses: evaluation.reponses || {},
          besoinsDomaines: evaluation.besoinsDomaines || [],
          besoinsAutre: evaluation.besoinsAutre || "",
        }
      : {
          moment: ABF_MOMENTS[0],
          dateEvaluation: new Date().toISOString().slice(0, 10),
          reponses: {},
          besoinsDomaines: [],
          besoinsAutre: "",
        }
  );
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState("");

  const choisirReponse = (idQuestion, index) => {
    setValeurs((v) => ({ ...v, reponses: { ...v.reponses, [idQuestion]: index } }));
  };

  const basculerDomaine = (idDomaine) => {
    setValeurs((v) => ({
      ...v,
      besoinsDomaines: v.besoinsDomaines.includes(idDomaine)
        ? v.besoinsDomaines.filter((d) => d !== idDomaine)
        : [...v.besoinsDomaines, idDomaine],
    }));
  };

  const enregistrer = async () => {
    setEnregistrement(true);
    setErreur("");
    const corps = {
      moment: valeurs.moment,
      dateEvaluation: valeurs.dateEvaluation,
      reponses: valeurs.reponses,
      besoinsDomaines: valeurs.besoinsDomaines,
      besoinsAutre: valeurs.besoinsAutre.trim() || null,
    };
    const reponse = evaluation
      ? await appelApi(`/participants/${participantId}/evaluations-abf/${evaluation.id}`, {
          method: "PUT",
          body: corps,
          token,
        })
      : await appelApi(`/participants/${participantId}/evaluations-abf`, { method: "POST", body: corps, token });
    setEnregistrement(false);
    if (reponse.ok) onEnregistre();
    else setErreur(reponse.data?.error || "Impossible d'enregistrer cette évaluation.");
  };

  const nombreQuestions = ABF_RUBRIQUES.reduce((n, r) => n + r.questions.length, 0);
  const nombreRepondues = Object.keys(valeurs.reponses).length;

  return (
    <Modal titre={evaluation ? "Modifier l'évaluation ABF" : "Nouvelle évaluation ABF"} onFermer={onFermer} large>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Selecteur
            label="Moment"
            value={valeurs.moment}
            onChange={(e) => setValeurs((v) => ({ ...v, moment: e.target.value }))}
          >
            {ABF_MOMENTS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Selecteur>
          <Champ
            label="Date"
            type="date"
            value={valeurs.dateEvaluation}
            onChange={(e) => setValeurs((v) => ({ ...v, dateEvaluation: e.target.value }))}
          />
        </div>

        <p className="text-xs text-slate-400">
          {nombreRepondues} / {nombreQuestions} questions répondues.
        </p>

        {ABF_RUBRIQUES.map((rubrique) => (
          <div key={rubrique.rubriqueId} className="rounded-xl border border-slate-100 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">{rubrique.titre}</h4>
            <div className="space-y-4">
              {rubrique.questions.map((question) => (
                <div key={question.id}>
                  <p className="mb-1.5 text-sm text-slate-600">{question.texte}</p>
                  <div className="space-y-1">
                    {question.options.map((option, index) => (
                      <label key={index} className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
                        <input
                          type="radio"
                          name={question.id}
                          checked={valeurs.reponses[question.id] === index}
                          onChange={() => choisirReponse(question.id, index)}
                          className="mt-0.5"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-slate-100 p-4">
          <h4 className="mb-1 text-sm font-semibold text-slate-700">Analyse des besoins en formation</h4>
          <p className="mb-2 text-sm text-slate-500">
            Quels domaines nécessitent une amélioration ou des formations ?
          </p>
          <div className="space-y-1">
            {ABF_DOMAINES.map((domaine) => (
              <label key={domaine.id} className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={valeurs.besoinsDomaines.includes(domaine.id)}
                  onChange={() => basculerDomaine(domaine.id)}
                />
                {domaine.label}
              </label>
            ))}
          </div>
          <div className="mt-3">
            <Champ
              label="Autre (précisez)"
              value={valeurs.besoinsAutre}
              onChange={(e) => setValeurs((v) => ({ ...v, besoinsAutre: e.target.value }))}
            />
          </div>
        </div>

        {erreur && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</p>}

        <div className="flex justify-end gap-2">
          <Bouton variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton onClick={enregistrer} disabled={enregistrement}>
            {enregistrement ? <Loader2 size={16} className="animate-spin" /> : "Enregistrer"}
          </Bouton>
        </div>
      </div>
    </Modal>
  );
}

function ModalReleveMensuel({ participantId, releve, onFermer, onEnregistre, token }) {
  const [form, setForm] = useState(
    releve
      ? {
          mois: releve.mois.slice(0, 7),
          ventesTotales: String(releve.ventesTotales),
          achatsTotaux: String(releve.achatsTotaux),
          depenses: String(releve.depenses),
          registreVentes: releve.registreVentes,
          registreAchats: releve.registreAchats,
          registreCaisse: releve.registreCaisse,
          registreCreances: releve.registreCreances,
          registreActifs: releve.registreActifs,
          notes: releve.notes || "",
        }
      : {
          mois: new Date().toISOString().slice(0, 7),
          ventesTotales: "",
          achatsTotaux: "",
          depenses: "",
          registreVentes: false,
          registreAchats: false,
          registreCaisse: false,
          registreCreances: false,
          registreActifs: false,
          notes: "",
        }
  );
  const [erreur, setErreur] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  const changer = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));
  const basculerRegistre = (champ) => setForm((f) => ({ ...f, [champ]: !f[champ] }));

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    if (!form.mois || form.ventesTotales === "" || form.achatsTotaux === "" || form.depenses === "") {
      setErreur("Le mois, les ventes, les achats et les dépenses sont obligatoires.");
      return;
    }
    setEnregistrement(true);
    const corps = { ...form, mois: `${form.mois}-01` };
    const reponse = releve
      ? await appelApi(`/participants/${participantId}/releves-mensuels/${releve.id}`, { method: "PUT", body: corps, token })
      : await appelApi(`/participants/${participantId}/releves-mensuels`, { method: "POST", body: corps, token });
    setEnregistrement(false);
    if (reponse.ok) {
      onEnregistre();
    } else if (reponse.erreurReseau) {
      setErreur("Impossible de contacter le serveur.");
    } else {
      setErreur(reponse.data?.error || "Une erreur est survenue.");
    }
  };

  return (
    <Modal titre={releve ? "Modifier le relevé mensuel" : "Nouveau relevé mensuel"} onFermer={onFermer}>
      <form onSubmit={soumettre} className="space-y-4">
        <Champ label="Mois concerné" type="month" value={form.mois} onChange={changer("mois")} />
        <div className="grid grid-cols-3 gap-3">
          <Champ label="Ventes totales (FCFA)" type="number" min="0" value={form.ventesTotales} onChange={changer("ventesTotales")} />
          <Champ label="Achats totaux (FCFA)" type="number" min="0" value={form.achatsTotaux} onChange={changer("achatsTotaux")} />
          <Champ label="Dépenses (FCFA)" type="number" min="0" value={form.depenses} onChange={changer("depenses")} />
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Registres tenus ce mois-ci</span>
          <div className="flex flex-wrap gap-3">
            {REGISTRES_SUIVIS.map((reg) => (
              <label key={reg.champ} className="flex items-center gap-1.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form[reg.champ]}
                  onChange={() => basculerRegistre(reg.champ)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {reg.label}
              </label>
            ))}
          </div>
        </div>
        <Zone label="Notes (optionnel)" value={form.notes} onChange={changer("notes")} />
        {erreur && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Bouton type="button" variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={enregistrement}>
            {enregistrement ? <Loader2 size={16} className="animate-spin" /> : "Enregistrer"}
          </Bouton>
        </div>
      </form>
    </Modal>
  );
}

function ModalEstimationCout({ participantId, estimation, onFermer, onEnregistre, token }) {
  const [form, setForm] = useState(
    estimation
      ? {
          nomProduit: estimation.nomProduit,
          dateEstimation: estimation.dateEstimation.slice(0, 10),
          coutMatieres: String(estimation.coutMatieres),
          coutMainOeuvre: String(estimation.coutMainOeuvre),
          fraisGeneraux: String(estimation.fraisGeneraux),
          quantiteProduite: String(estimation.quantiteProduite),
          margeSouhaitee: String(estimation.margeSouhaitee),
          notes: estimation.notes || "",
        }
      : {
          nomProduit: "",
          dateEstimation: new Date().toISOString().slice(0, 10),
          coutMatieres: "",
          coutMainOeuvre: "",
          fraisGeneraux: "",
          quantiteProduite: "",
          margeSouhaitee: "30",
          notes: "",
        }
  );
  const [erreur, setErreur] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  const changer = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  const apercu = useMemo(() => {
    const matieres = parseFloat(form.coutMatieres) || 0;
    const mainOeuvre = parseFloat(form.coutMainOeuvre) || 0;
    const frais = parseFloat(form.fraisGeneraux) || 0;
    const quantite = parseFloat(form.quantiteProduite);
    const marge = parseFloat(form.margeSouhaitee);
    const coutTotal = matieres + mainOeuvre + frais;
    const coutUnitaire = quantite > 0 ? coutTotal / quantite : null;
    const prixVenteConseille =
      coutUnitaire !== null && !Number.isNaN(marge) ? coutUnitaire * (1 + marge / 100) : null;
    return { coutTotal, coutUnitaire, prixVenteConseille };
  }, [form.coutMatieres, form.coutMainOeuvre, form.fraisGeneraux, form.quantiteProduite, form.margeSouhaitee]);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    if (!form.nomProduit.trim() || !form.dateEstimation || form.quantiteProduite === "") {
      setErreur("Le produit, la date et la quantité produite sont obligatoires.");
      return;
    }
    setEnregistrement(true);
    const reponse = estimation
      ? await appelApi(`/participants/${participantId}/estimations-couts/${estimation.id}`, { method: "PUT", body: form, token })
      : await appelApi(`/participants/${participantId}/estimations-couts`, { method: "POST", body: form, token });
    setEnregistrement(false);
    if (reponse.ok) {
      onEnregistre();
    } else if (reponse.erreurReseau) {
      setErreur("Impossible de contacter le serveur.");
    } else {
      setErreur(reponse.data?.error || "Une erreur est survenue.");
    }
  };

  return (
    <Modal titre={estimation ? "Modifier l'estimation de coût" : "Nouvelle estimation de coût"} onFermer={onFermer}>
      <form onSubmit={soumettre} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Produit ou service" value={form.nomProduit} onChange={changer("nomProduit")} />
          <Champ label="Date" type="date" value={form.dateEstimation} onChange={changer("dateEstimation")} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Champ label="Coût matières (FCFA)" type="number" min="0" value={form.coutMatieres} onChange={changer("coutMatieres")} />
          <Champ label="Coût main-d'œuvre (FCFA)" type="number" min="0" value={form.coutMainOeuvre} onChange={changer("coutMainOeuvre")} />
          <Champ label="Frais généraux (FCFA)" type="number" min="0" value={form.fraisGeneraux} onChange={changer("fraisGeneraux")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Champ
            label="Quantité produite"
            type="number"
            min="0"
            value={form.quantiteProduite}
            onChange={changer("quantiteProduite")}
          />
          <Champ
            label="Marge souhaitée (%)"
            type="number"
            min="0"
            value={form.margeSouhaitee}
            onChange={changer("margeSouhaitee")}
          />
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="mb-1.5 text-xs font-medium text-slate-500">Aperçu du calcul</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <p className="text-slate-600">
              Coût total<br />
              <span className="font-semibold text-slate-800">{FormatMontant(apercu.coutTotal)}</span>
            </p>
            <p className="text-slate-600">
              Coût unitaire<br />
              <span className="font-semibold text-slate-800">{FormatMontant(apercu.coutUnitaire)}</span>
            </p>
            <p className="text-slate-600">
              Prix conseillé<br />
              <span className="font-semibold text-emerald-600">{FormatMontant(apercu.prixVenteConseille)}</span>
            </p>
          </div>
        </div>
        <Zone label="Notes (optionnel)" value={form.notes} onChange={changer("notes")} />
        {erreur && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Bouton type="button" variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={enregistrement}>
            {enregistrement ? <Loader2 size={16} className="animate-spin" /> : "Enregistrer"}
          </Bouton>
        </div>
      </form>
    </Modal>
  );
}

function ModalActionAccompagnement({ participantId, action, evaluations, diagnosticGlobal, onFermer, onEnregistre, token }) {
  const [form, setForm] = useState(
    action
      ? {
          probleme: action.probleme,
          action: action.action,
          formationLiee: action.formationLiee || "",
          responsable: action.responsable,
          echeance: action.echeance.slice(0, 10),
          statut: action.statut,
          noteVerification: action.noteVerification || "",
          origine: action.origine || "Observation",
          evaluationAbfId: action.evaluationAbfId || "",
        }
      : {
          probleme: "",
          action: "",
          formationLiee: "",
          responsable: "",
          echeance: new Date().toISOString().slice(0, 10),
          statut: "À faire",
          noteVerification: "",
          origine: "Observation",
          evaluationAbfId: "",
        }
  );
  const [erreur, setErreur] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  // Évaluations ABF de cette PME pour lesquelles un diagnostic IA a déjà été généré : ce sont
  // elles qu'on peut proposer en import rapide dans la fiche.
  const evaluationsAvecDiagnostic = (evaluations || []).filter((e) => e.diagnosticIa);
  const [evaluationChoisieId, setEvaluationChoisieId] = useState(
    form.evaluationAbfId || evaluationsAvecDiagnostic[0]?.id || ""
  );
  const evaluationChoisie = evaluationsAvecDiagnostic.find((e) => e.id === evaluationChoisieId);

  const changer = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  const importerDepuisAbf = (champs) =>
    setForm((f) => ({ ...f, ...champs, origine: "ABF", evaluationAbfId: evaluationChoisieId }));

  const importerDepuisDiagnosticGlobal = (champs) =>
    setForm((f) => ({ ...f, ...champs, origine: "IA_globale", evaluationAbfId: "" }));

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    if (!form.probleme.trim() || !form.action.trim() || !form.responsable.trim() || !form.echeance) {
      setErreur("Le problème, l'action, le responsable et l'échéance sont obligatoires.");
      return;
    }
    setEnregistrement(true);
    const reponse = action
      ? await appelApi(`/participants/${participantId}/actions-accompagnement/${action.id}`, {
          method: "PUT",
          body: form,
          token,
        })
      : await appelApi(`/participants/${participantId}/actions-accompagnement`, {
          method: "POST",
          body: form,
          token,
        });
    setEnregistrement(false);
    if (reponse.ok) {
      onEnregistre();
    } else if (reponse.erreurReseau) {
      setErreur("Impossible de contacter le serveur.");
    } else {
      setErreur(reponse.data?.error || "Une erreur est survenue.");
    }
  };

  return (
    <Modal titre={action ? "Modifier l'action" : "Nouvelle action d'accompagnement"} onFermer={onFermer}>
      <form onSubmit={soumettre} className="space-y-4">
        {evaluationsAvecDiagnostic.length > 0 && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-600">Importer depuis le diagnostic ABF</p>
              {evaluationsAvecDiagnostic.length > 1 && (
                <select
                  value={evaluationChoisieId}
                  onChange={(e) => setEvaluationChoisieId(e.target.value)}
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                >
                  {evaluationsAvecDiagnostic.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.moment} · {FormatDate(e.dateEvaluation)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {evaluationChoisie && (
              <>
                {evaluationChoisie.diagnosticIa.problemesIdentifies?.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Problèmes identifiés</p>
                    <div className="flex flex-wrap gap-1.5">
                      {evaluationChoisie.diagnosticIa.problemesIdentifies.map((texte, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => importerDepuisAbf({ probleme: texte })}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400"
                        >
                          {texte}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {evaluationChoisie.diagnosticIa.actionsCorrectives?.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Actions correctives</p>
                    <div className="flex flex-wrap gap-1.5">
                      {evaluationChoisie.diagnosticIa.actionsCorrectives.map((texte, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => importerDepuisAbf({ action: texte })}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400"
                        >
                          {texte}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {evaluationChoisie.diagnosticIa.formationsRecommandees?.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs text-slate-500">
                      Formations à prioriser <span className="font-normal text-slate-400">(indépendant du problème et de l'action ci-dessous : un même problème peut avoir les deux)</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {evaluationChoisie.diagnosticIa.formationsRecommandees.map((idModule) => (
                        <button
                          type="button"
                          key={idModule}
                          onClick={() => importerDepuisAbf({ formationLiee: idModule })}
                          className={`rounded-full border px-2.5 py-1 text-xs ${
                            form.formationLiee === idModule
                              ? "border-slate-800 bg-slate-800 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                          }`}
                        >
                          {libelleRubriqueAbf(idModule)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <p className="text-[11px] text-slate-400">
              Clique sur un élément pour préremplir les champs ci-dessous ; tu peux ensuite les modifier librement.
            </p>
          </div>
        )}

        {diagnosticGlobal && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-600">Importer depuis le diagnostic IA global</p>
            {diagnosticGlobal.causesProfondes?.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-slate-500">Causes profondes probables</p>
                <div className="flex flex-wrap gap-1.5">
                  {diagnosticGlobal.causesProfondes.map((texte, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => importerDepuisDiagnosticGlobal({ probleme: texte })}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400"
                    >
                      {texte}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {diagnosticGlobal.actionsSuggerees?.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-slate-500">Actions suggérées</p>
                <div className="flex flex-wrap gap-1.5">
                  {diagnosticGlobal.actionsSuggerees.map((texte, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => importerDepuisDiagnosticGlobal({ action: texte })}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400"
                    >
                      {texte}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              Clique sur un élément pour préremplir les champs ci-dessous ; tu peux ensuite les modifier librement.
            </p>
          </div>
        )}

        <Zone label="Problème identifié" value={form.probleme} onChange={changer("probleme")} />
        <Zone label="Action à mener" value={form.action} onChange={changer("action")} />
        <Selecteur label="Formation liée (optionnel)" value={form.formationLiee} onChange={changer("formationLiee")}>
          <option value="">Aucune formation liée</option>
          {ABF_DOMAINES.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </Selecteur>
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Responsable" value={form.responsable} onChange={changer("responsable")} />
          <Champ label="Échéance" type="date" value={form.echeance} onChange={changer("echeance")} />
        </div>
        <Selecteur label="Statut" value={form.statut} onChange={changer("statut")}>
          {STATUTS_ACTION.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Selecteur>
        <Zone
          label="Note de vérification (optionnel)"
          value={form.noteVerification}
          onChange={changer("noteVerification")}
        />
        {erreur && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Bouton type="button" variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={enregistrement}>
            {enregistrement ? <Loader2 size={16} className="animate-spin" /> : "Enregistrer"}
          </Bouton>
        </div>
      </form>
    </Modal>
  );
}

// Rempli dynamiquement au chargement de l'app (voir App -> chargerModules) pour que la liste des
// modules GERME reste définie à un seul endroit : le serveur (src/lib/modulesGerme.js).
let MODULES_GERME_LABEL = {};

function PageParticipants({ token }) {
  const [participants, setParticipants] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState("");
  const [modalCreation, setModalCreation] = useState(false);
  const [participantEnEdition, setParticipantEnEdition] = useState(null);
  const [participantEnDetail, setParticipantEnDetail] = useState(null);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur("");
    const params = new URLSearchParams();
    if (recherche) params.set("recherche", recherche);
    if (statut) params.set("statut", statut);
    const reponse = await appelApi(`/participants?${params.toString()}`, { token });
    if (reponse.ok) {
      setParticipants(reponse.data);
    } else if (reponse.erreurReseau) {
      setErreur("Impossible de contacter le serveur.");
    }
    setChargement(false);
  }, [recherche, statut, token]);

  useEffect(() => {
    const idTimer = setTimeout(charger, 250);
    return () => clearTimeout(idTimer);
  }, [charger]);

  const supprimer = async (participant) => {
    if (!confirm(`Supprimer ${participant.nom} ? Cette action est irréversible.`)) return;
    const reponse = await appelApi(`/participants/${participant.id}`, { method: "DELETE", token });
    if (reponse.ok) charger();
    else alert(reponse.data?.error || "Impossible de supprimer ce participant.");
  };

  const stats = useMemo(() => {
    const actifs = participants.filter((p) => p.statut === "Actif").length;
    const vigilance = participants.filter((p) => p.sante?.badge === "rouge").length;
    const aSurveiller = participants.filter((p) => p.sante?.badge === "orange").length;
    return { total: participants.length, actifs, vigilance, aSurveiller };
  }, [participants]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Participants</h1>
          <p className="text-sm text-slate-500">Entrepreneurs et responsables de PME suivis par le programme.</p>
        </div>
        <Bouton onClick={() => setModalCreation(true)}>
          <Plus size={16} /> Nouveau participant
        </Bouton>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CarteStat icone={<Users size={18} />} label="PME suivies" valeur={stats.total} couleur="slate" />
        <CarteStat icone={<CheckCircle2 size={18} />} label="Actives" valeur={stats.actifs} couleur="emerald" />
        <CarteStat icone={<TrendingUp size={18} />} label="À surveiller" valeur={stats.aSurveiller} couleur="amber" />
        <CarteStat icone={<AlertTriangle size={18} />} label="En vigilance" valeur={stats.vigilance} couleur="rose" />
      </div>

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un nom, une entreprise, une localité..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
        >
          <option value="">Tous les statuts</option>
          <option value="Actif">Actif</option>
          <option value="Sorti">Sorti</option>
          <option value="Abandon">Abandon</option>
        </select>
      </div>

      {erreur && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Entreprise</th>
              <th className="px-4 py-3">Localité</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Formations</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Santé</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {chargement ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  <Loader2 className="mx-auto animate-spin" />
                </td>
              </tr>
            ) : participants.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Aucun participant trouvé.
                </td>
              </tr>
            ) : (
              participants.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setParticipantEnDetail(p.id)}
                >
                  <td className="px-4 py-3 font-medium text-slate-700">{p.nom}</td>
                  <td className="px-4 py-3 text-slate-500">{p.nomEntreprise || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{p.localite || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{p.telephone || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{p._count.participations}</td>
                  <td className="px-4 py-3">
                    <Badge couleur={couleurStatutParticipant(p.statut)}>{p.statut}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {p.sante && <Badge couleur={couleurSante(p.sante.badge)}>{libelleSante(p.sante.badge)}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <MenuActions
                      actions={[
                        {
                          label: "Modifier",
                          icone: <Pencil size={14} />,
                          onClick: () => setParticipantEnEdition(p),
                        },
                        {
                          label: "Supprimer",
                          icone: <Trash2 size={14} />,
                          danger: true,
                          onClick: () => supprimer(p),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalCreation && (
        <ModalParticipant
          onFermer={() => setModalCreation(false)}
          onEnregistre={() => {
            setModalCreation(false);
            charger();
          }}
          token={token}
        />
      )}
      {participantEnEdition && (
        <ModalParticipant
          participant={participantEnEdition}
          onFermer={() => setParticipantEnEdition(null)}
          onEnregistre={() => {
            setParticipantEnEdition(null);
            charger();
          }}
          token={token}
        />
      )}
      {participantEnDetail && (
        <ModalDetailParticipant
          participantId={participantEnDetail}
          onFermer={() => setParticipantEnDetail(null)}
          token={token}
        />
      )}
    </div>
  );
}

// ============================================================================
// Formations
// ============================================================================

function ModalFormation({ formation, modules, onFermer, onEnregistre, token }) {
  const [form, setForm] = useState(
    formation
      ? { ...formation, date: formation.date ? formation.date.slice(0, 10) : "" }
      : { module: modules[0]?.id || "", date: "", lieu: "", formateur: "", notes: "" }
  );
  const [erreur, setErreur] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  const changer = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    if (!form.module || !form.date) {
      setErreur("Le module et la date sont obligatoires.");
      return;
    }
    setEnregistrement(true);
    const reponse = formation
      ? await appelApi(`/formations/${formation.id}`, { method: "PUT", body: form, token })
      : await appelApi("/formations", { method: "POST", body: form, token });
    setEnregistrement(false);
    if (reponse.ok) {
      onEnregistre();
    } else if (reponse.erreurReseau) {
      setErreur("Impossible de contacter le serveur.");
    } else {
      setErreur(reponse.data?.error || "Une erreur est survenue.");
    }
  };

  return (
    <Modal titre={formation ? "Modifier la formation" : "Nouvelle session de formation"} onFermer={onFermer}>
      <form onSubmit={soumettre} className="space-y-4">
        <Selecteur label="Module GERME" value={form.module} onChange={changer("module")}>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Selecteur>
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Date" type="date" value={form.date} onChange={changer("date")} />
          <Champ label="Lieu" value={form.lieu || ""} onChange={changer("lieu")} />
        </div>
        <Champ label="Formateur / animateur" value={form.formateur || ""} onChange={changer("formateur")} />
        <Zone label="Notes" value={form.notes || ""} onChange={changer("notes")} />
        {erreur && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Bouton type="button" variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={enregistrement}>
            {enregistrement ? <Loader2 size={16} className="animate-spin" /> : "Enregistrer"}
          </Bouton>
        </div>
      </form>
    </Modal>
  );
}

function ModalDetailFormation({ formationId, modules, onFermer, token }) {
  const [formation, setFormation] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [tousParticipants, setTousParticipants] = useState([]);
  const [participantChoisi, setParticipantChoisi] = useState("");
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    setChargement(true);
    const [reponseFormation, reponseParticipants] = await Promise.all([
      appelApi(`/formations/${formationId}`, { token }),
      appelApi("/participants", { token }),
    ]);
    if (reponseFormation.ok) setFormation(reponseFormation.data);
    if (reponseParticipants.ok) setTousParticipants(reponseParticipants.data);
    setChargement(false);
  }, [formationId, token]);

  useEffect(() => {
    charger();
  }, [charger]);

  const inscrire = async () => {
    if (!participantChoisi) return;
    setErreur("");
    setAjoutEnCours(true);
    const reponse = await appelApi(`/formations/${formationId}/participants`, {
      method: "POST",
      body: { participantId: participantChoisi },
      token,
    });
    setAjoutEnCours(false);
    if (reponse.ok) {
      setParticipantChoisi("");
      charger();
    } else {
      setErreur(reponse.data?.error || "Impossible d'inscrire ce participant.");
    }
  };

  const basculerPresence = async (inscription) => {
    await appelApi(`/formations/${formationId}/participants/${inscription.id}`, {
      method: "PUT",
      body: { present: !inscription.present },
      token,
    });
    charger();
  };

  const retirer = async (inscription) => {
    if (!confirm(`Retirer ${inscription.participant.nom} de cette formation ?`)) return;
    await appelApi(`/formations/${formationId}/participants/${inscription.id}`, { method: "DELETE", token });
    charger();
  };

  const idsDejaInscrits = new Set((formation?.participations || []).map((p) => p.participantId));
  const participantsDisponibles = tousParticipants.filter((p) => !idsDejaInscrits.has(p.id));

  return (
    <Modal titre="Détail de la session" onFermer={onFermer} large>
      {chargement || !formation ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              {modules.find((m) => m.id === formation.module)?.label || formation.module}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar size={14} /> {FormatDate(formation.date)}
              </span>
              {formation.lieu && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {formation.lieu}
                </span>
              )}
              {formation.formateur && <span>Animé par {formation.formateur}</span>}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Participants inscrits ({formation.participations.length})
            </p>
            {formation.participations.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
                Aucun participant inscrit pour le moment.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                {formation.participations.map((insc) => (
                  <li key={insc.id} className="flex items-center justify-between px-4 py-2.5">
                    <button
                      onClick={() => basculerPresence(insc)}
                      className={`flex items-center gap-2 text-sm ${
                        insc.present ? "text-emerald-600" : "text-slate-400"
                      }`}
                      title="Cliquer pour marquer présent / absent"
                    >
                      {insc.present ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      <span className="font-medium text-slate-700">{insc.participant.nom}</span>
                    </button>
                    <button
                      onClick={() => retirer(insc)}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Inscrire un participant</p>
            <div className="flex gap-2">
              <select
                value={participantChoisi}
                onChange={(e) => setParticipantChoisi(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              >
                <option value="">Choisir un participant...</option>
                {participantsDisponibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </select>
              <Bouton onClick={inscrire} disabled={!participantChoisi || ajoutEnCours}>
                {ajoutEnCours ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              </Bouton>
            </div>
            {erreur && <p className="mt-2 text-sm text-rose-600">{erreur}</p>}
          </div>
        </div>
      )}
    </Modal>
  );
}

function PageFormations({ token }) {
  const [formations, setFormations] = useState([]);
  const [modules, setModules] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtreModule, setFiltreModule] = useState("");
  const [modalCreation, setModalCreation] = useState(false);
  const [formationEnEdition, setFormationEnEdition] = useState(null);
  const [formationEnDetail, setFormationEnDetail] = useState(null);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur("");
    const params = new URLSearchParams();
    if (filtreModule) params.set("module", filtreModule);
    const [reponseFormations, reponseModules] = await Promise.all([
      appelApi(`/formations?${params.toString()}`, { token }),
      appelApi("/formations/modules", { token }),
    ]);
    if (reponseFormations.ok) setFormations(reponseFormations.data);
    if (reponseModules.ok) {
      setModules(reponseModules.data);
      MODULES_GERME_LABEL = Object.fromEntries(reponseModules.data.map((m) => [m.id, m.label]));
    }
    if (reponseFormations.erreurReseau) setErreur("Impossible de contacter le serveur.");
    setChargement(false);
  }, [filtreModule, token]);

  useEffect(() => {
    charger();
  }, [charger]);

  const supprimer = async (formation) => {
    if (!confirm("Supprimer cette session de formation ? Les inscriptions liées seront aussi supprimées.")) return;
    const reponse = await appelApi(`/formations/${formation.id}`, { method: "DELETE", token });
    if (reponse.ok) charger();
    else alert(reponse.data?.error || "Impossible de supprimer cette formation.");
  };

  const libelleModule = (id) => modules.find((m) => m.id === id)?.label || id;

  const stats = useMemo(() => {
    const maintenant = new Date();
    const ceMoisCi = formations.filter((f) => {
      const d = new Date(f.date);
      return d.getMonth() === maintenant.getMonth() && d.getFullYear() === maintenant.getFullYear();
    }).length;
    const totalInscriptions = formations.reduce((somme, f) => somme + f._count.participations, 0);
    return { total: formations.length, ceMoisCi, totalInscriptions };
  }, [formations]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Formations</h1>
          <p className="text-sm text-slate-500">Sessions de formation GERME et participants inscrits.</p>
        </div>
        <Bouton onClick={() => setModalCreation(true)}>
          <Plus size={16} /> Nouvelle session
        </Bouton>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CarteStat icone={<GraduationCap size={18} />} label="Sessions organisées" valeur={stats.total} couleur="slate" />
        <CarteStat icone={<Calendar size={18} />} label="Sessions ce mois-ci" valeur={stats.ceMoisCi} couleur="emerald" />
        <CarteStat icone={<Users size={18} />} label="Inscriptions au total" valeur={stats.totalInscriptions} couleur="amber" />
      </div>

      <div className="mb-4">
        <select
          value={filtreModule}
          onChange={(e) => setFiltreModule(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
        >
          <option value="">Tous les modules</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {erreur && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Lieu</th>
              <th className="px-4 py-3">Formateur</th>
              <th className="px-4 py-3">Participants</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {chargement ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  <Loader2 className="mx-auto animate-spin" />
                </td>
              </tr>
            ) : formations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Aucune session de formation trouvée.
                </td>
              </tr>
            ) : (
              formations.map((f) => (
                <tr key={f.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setFormationEnDetail(f.id)}>
                  <td className="px-4 py-3 font-medium text-slate-700">{libelleModule(f.module)}</td>
                  <td className="px-4 py-3 text-slate-500">{FormatDate(f.date)}</td>
                  <td className="px-4 py-3 text-slate-500">{f.lieu || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{f.formateur || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{f._count.participations}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <MenuActions
                      actions={[
                        {
                          label: "Modifier",
                          icone: <Pencil size={14} />,
                          onClick: () => setFormationEnEdition(f),
                        },
                        {
                          label: "Supprimer",
                          icone: <Trash2 size={14} />,
                          danger: true,
                          onClick: () => supprimer(f),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalCreation && (
        <ModalFormation
          modules={modules}
          onFermer={() => setModalCreation(false)}
          onEnregistre={() => {
            setModalCreation(false);
            charger();
          }}
          token={token}
        />
      )}
      {formationEnEdition && (
        <ModalFormation
          formation={formationEnEdition}
          modules={modules}
          onFermer={() => setFormationEnEdition(null)}
          onEnregistre={() => {
            setFormationEnEdition(null);
            charger();
          }}
          token={token}
        />
      )}
      {formationEnDetail && (
        <ModalDetailFormation
          formationId={formationEnDetail}
          modules={modules}
          onFermer={() => {
            setFormationEnDetail(null);
            charger();
          }}
          token={token}
        />
      )}
    </div>
  );
}

// ============================================================================
// Comptes (creation d'acces conseiller par le coordonnateur)
// ============================================================================

const COMPTE_VIDE = { nom: "", email: "", motDePasse: "", role: "conseiller" };

function ModalCompte({ onFermer, onEnregistre, token }) {
  const [form, setForm] = useState(COMPTE_VIDE);
  const [erreur, setErreur] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  const changer = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    if (!form.nom.trim() || !form.email.trim() || !form.motDePasse) {
      setErreur("Le nom, l'email et le mot de passe sont obligatoires.");
      return;
    }
    setEnregistrement(true);
    const reponse = await appelApi("/auth/utilisateurs", { method: "POST", body: form, token });
    setEnregistrement(false);
    if (reponse.ok) {
      onEnregistre();
    } else if (reponse.erreurReseau) {
      setErreur("Impossible de contacter le serveur.");
    } else {
      setErreur(reponse.data?.error || "Une erreur est survenue.");
    }
  };

  return (
    <Modal titre="Nouveau compte d'accès" onFermer={onFermer}>
      <form onSubmit={soumettre} className="space-y-4">
        <Champ label="Nom" value={form.nom} onChange={changer("nom")} autoFocus />
        <Champ label="Email" type="email" value={form.email} onChange={changer("email")} />
        <div>
          <Champ
            label="Mot de passe temporaire"
            type="text"
            value={form.motDePasse}
            onChange={changer("motDePasse")}
          />
          <p className="mt-1 text-xs text-slate-400">
            Au moins 8 caractères, avec une lettre et un chiffre. Transmets-le toi-même à la personne
            concernée (il n'est jamais réaffiché ensuite).
          </p>
        </div>
        <Selecteur label="Rôle" value={form.role} onChange={changer("role")}>
          <option value="conseiller">Conseiller (accès à ses propres PME uniquement)</option>
          <option value="coordonnateur">Coordonnateur (peut aussi créer des comptes)</option>
        </Selecteur>
        {erreur && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Bouton type="button" variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={enregistrement}>
            {enregistrement ? <Loader2 size={16} className="animate-spin" /> : "Créer le compte"}
          </Bouton>
        </div>
      </form>
    </Modal>
  );
}

// Reinitialisation du mot de passe d'un compte par le coordonnateur (cas d'un mot de passe
// oublie) : lui-meme choisit un nouveau mot de passe provisoire, exactement comme a la creation
// du compte, et le transmet a la main a la personne concernee.
function ModalReinitialiserMotDePasse({ compte, onFermer, token }) {
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [succes, setSucces] = useState(false);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    if (!nouveauMotDePasse) {
      setErreur("Le nouveau mot de passe est obligatoire.");
      return;
    }
    setEnregistrement(true);
    const reponse = await appelApi(`/auth/utilisateurs/${compte.id}/reinitialiser-mot-de-passe`, {
      method: "PATCH",
      body: { nouveauMotDePasse },
      token,
    });
    setEnregistrement(false);
    if (reponse.ok) {
      setSucces(true);
    } else if (reponse.erreurReseau) {
      setErreur("Impossible de contacter le serveur.");
    } else {
      setErreur(reponse.data?.error || "Une erreur est survenue.");
    }
  };

  return (
    <Modal titre={`Réinitialiser le mot de passe de ${compte.nom}`} onFermer={onFermer}>
      {succes ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Nouveau mot de passe provisoire défini. Transmettez-le vous-même à {compte.nom} (il n'est jamais
            réaffiché ensuite) — la personne devra le changer dès sa prochaine connexion.
          </p>
          <Bouton onClick={onFermer} className="w-full">
            Fermer
          </Bouton>
        </div>
      ) : (
        <form onSubmit={soumettre} className="space-y-4">
          <div>
            <Champ
              label="Nouveau mot de passe temporaire"
              type="text"
              value={nouveauMotDePasse}
              onChange={(e) => setNouveauMotDePasse(e.target.value)}
              autoFocus
            />
            <p className="mt-1 text-xs text-slate-400">
              Au moins 8 caractères, avec une lettre et un chiffre.
            </p>
          </div>
          {erreur && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Bouton type="button" variante="discret" onClick={onFermer}>
              Annuler
            </Bouton>
            <Bouton type="submit" disabled={enregistrement}>
              {enregistrement ? <Loader2 size={16} className="animate-spin" /> : "Réinitialiser"}
            </Bouton>
          </div>
        </form>
      )}
    </Modal>
  );
}

function PageComptes({ token }) {
  const [comptes, setComptes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [modalCreation, setModalCreation] = useState(false);
  const [compteReinitialisation, setCompteReinitialisation] = useState(null);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur("");
    const reponse = await appelApi("/auth/utilisateurs", { token });
    if (reponse.ok) setComptes(reponse.data);
    else if (reponse.erreurReseau) setErreur("Impossible de contacter le serveur.");
    setChargement(false);
  }, [token]);

  useEffect(() => {
    charger();
  }, [charger]);

  const stats = useMemo(() => {
    const coordonnateurs = comptes.filter((c) => c.role === "coordonnateur").length;
    return {
      total: comptes.length,
      coordonnateurs,
      conseillers: comptes.length - coordonnateurs,
    };
  }, [comptes]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Comptes</h1>
          <p className="text-sm text-slate-500">
            Accès à SuiviPME. Chaque compte est indépendant : il ne voit et ne modifie que les PME et
            formations qu'il a lui-même créées.
          </p>
        </div>
        <Bouton onClick={() => setModalCreation(true)}>
          <UserPlus size={16} /> Nouveau compte
        </Bouton>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CarteStat icone={<KeyRound size={18} />} label="Comptes au total" valeur={stats.total} couleur="slate" />
        <CarteStat icone={<Users size={18} />} label="Coordonnateurs" valeur={stats.coordonnateurs} couleur="emerald" />
        <CarteStat icone={<UserPlus size={18} />} label="Conseillers" valeur={stats.conseillers} couleur="amber" />
      </div>

      {erreur && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{erreur}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Créé le</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {chargement ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  <Loader2 className="mx-auto animate-spin" />
                </td>
              </tr>
            ) : comptes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Aucun compte trouvé.
                </td>
              </tr>
            ) : (
              comptes.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">{c.nom}</td>
                  <td className="px-4 py-3 text-slate-500">{c.email}</td>
                  <td className="px-4 py-3">
                    <Badge couleur={c.role === "coordonnateur" ? "slate" : "emerald"}>
                      {c.role === "coordonnateur" ? "Coordonnateur" : "Conseiller"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{FormatDate(c.creeLe)}</td>
                  <td className="px-4 py-3 text-right">
                    <MenuActions
                      actions={[
                        {
                          label: "Réinitialiser le mot de passe",
                          icone: <KeyRound size={14} />,
                          onClick: () => setCompteReinitialisation(c),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalCreation && (
        <ModalCompte
          onFermer={() => setModalCreation(false)}
          onEnregistre={() => {
            setModalCreation(false);
            charger();
          }}
          token={token}
        />
      )}
      {compteReinitialisation && (
        <ModalReinitialiserMotDePasse
          compte={compteReinitialisation}
          onFermer={() => setCompteReinitialisation(null)}
          token={token}
        />
      )}
    </div>
  );
}

// ============================================================================
// Application
// ============================================================================

export default function App() {
  const [session, setSession] = useState(() => lireSession());
  const [page, setPage] = useState("participants");

  const deconnexion = () => {
    ecrireSession(null);
    setSession(null);
  };

  if (!session) {
    return <PageConnexion onConnecte={setSession} />;
  }

  if (session.user.doitChangerMotDePasse) {
    return (
      <PageChangementMotDePasseObligatoire
        token={session.token}
        onSuccess={() => {
          const nouvelleSession = { ...session, user: { ...session.user, doitChangerMotDePasse: false } };
          ecrireSession(nouvelleSession);
          setSession(nouvelleSession);
        }}
        onDeconnexion={deconnexion}
      />
    );
  }

  return (
    <MisEnPage session={session} page={page} onChangerPage={setPage} onDeconnexion={deconnexion}>
      {page === "participants" && <PageParticipants token={session.token} />}
      {page === "formations" && <PageFormations token={session.token} />}
      {page === "comptes" && session.user.role === "coordonnateur" && <PageComptes token={session.token} />}
    </MisEnPage>
  );
}
