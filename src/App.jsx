import { useState, useEffect, useCallback, useRef } from "react";
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

function couleurStatutParticipant(statut) {
  if (statut === "Actif") return "emerald";
  if (statut === "Abandon") return "rose";
  return "slate";
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
          <h1 className="text-lg font-semibold text-slate-800">SuiviGERME</h1>
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

// ============================================================================
// Mise en page générale (menu latéral)
// ============================================================================

function MisEnPage({ session, page, onChangerPage, onDeconnexion, children }) {
  const items = [
    { id: "participants", label: "Participants", icone: <Users size={18} /> },
    { id: "formations", label: "Formations", icone: <GraduationCap size={18} /> },
  ];
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-100 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900">
            <GraduationCap className="text-white" size={18} />
          </div>
          <span className="text-sm font-semibold text-slate-800">SuiviGERME</span>
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
            onClick={onDeconnexion}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
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
  const couleurs = { Bon: "emerald", Moyen: "amber", Faible: "rose" };
  return <Badge couleur={couleurs[niveau] || "slate"}>{niveau}</Badge>;
}

function libelleRubriqueAbf(rubriqueId) {
  return ABF_RUBRIQUES.find((r) => r.rubriqueId === rubriqueId)?.titre || rubriqueId;
}

function libelleDomaineBesoin(domaineId) {
  return ABF_DOMAINES.find((d) => d.id === domaineId)?.label || domaineId;
}

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

  const charger = useCallback(async () => {
    setChargement(true);
    const [reponseParticipant, reponseEvaluations, reponseNotes, reponseStructure] = await Promise.all([
      appelApi(`/participants/${participantId}`, { token }),
      appelApi(`/participants/${participantId}/evaluations-abf`, { token }),
      appelApi(`/participants/${participantId}/notes-suivi`, { token }),
      appelApi("/abf/structure", { token }),
    ]);
    if (reponseParticipant.ok) setParticipant(reponseParticipant.data);
    if (reponseEvaluations.ok) setEvaluations(reponseEvaluations.data);
    if (reponseNotes.ok) setNotes(reponseNotes.data);
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

  const ONGLETS = [
    { id: "formations", label: "Formations", icone: <GraduationCap size={14} /> },
    { id: "abf", label: "Évaluations ABF", icone: <ClipboardList size={14} /> },
    { id: "suivi", label: "Notes de suivi", icone: <StickyNote size={14} /> },
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Participants</h1>
          <p className="text-sm text-slate-500">Entrepreneurs et responsables de PME suivis par le programme.</p>
        </div>
        <Bouton onClick={() => setModalCreation(true)}>
          <Plus size={16} /> Nouveau participant
        </Bouton>
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
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {chargement ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  <Loader2 className="mx-auto animate-spin" />
                </td>
              </tr>
            ) : participants.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Formations</h1>
          <p className="text-sm text-slate-500">Sessions de formation GERME et participants inscrits.</p>
        </div>
        <Bouton onClick={() => setModalCreation(true)}>
          <Plus size={16} /> Nouvelle session
        </Bouton>
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

  return (
    <MisEnPage session={session} page={page} onChangerPage={setPage} onDeconnexion={deconnexion}>
      {page === "participants" && <PageParticipants token={session.token} />}
      {page === "formations" && <PageFormations token={session.token} />}
    </MisEnPage>
  );
}
