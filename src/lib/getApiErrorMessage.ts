import type { AxiosError } from 'axios';

type ApiErrorBody = {
  message?: string;
  errors?: Array<{ path?: string; message?: string }>;
};

function formatValidationErrors(
  errors: NonNullable<ApiErrorBody['errors']>
): string | null {
  if (!errors.length) return null;
  const parts = errors
    .map((e) => {
      const raw = e.path ?? '';
      const field = raw.replace(/^(body|query|params)\./, '');
      const detail = e.message?.trim() || '';
      if (field && detail) return `${field} : ${detail}`;
      return detail || field || null;
    })
    .filter((x): x is string => Boolean(x));
  return parts.length ? parts.join(' · ') : null;
}

function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Réponses API trop génériques : on explique plutôt via le code HTTP + le contexte. */
function isVagueServerMessage(msg: string): boolean {
  const n = normalizeForCompare(msg);
  if (!n) return true;

  const exactVague = new Set([
    normalizeForCompare("Erreur lors de l'enregistrement"),
    normalizeForCompare("Erreur lors de l'enregistrement."),
    normalizeForCompare('Erreur lors de la création'),
    normalizeForCompare('Erreur lors de la mise à jour'),
    normalizeForCompare('Erreur lors de la mise a jour'),
    normalizeForCompare('Erreur lors de la suppression'),
    normalizeForCompare('Erreur lors de la récupération'),
    normalizeForCompare('Erreur lors de la recuperation'),
    normalizeForCompare('Erreur lors de la creation du membre'),
    normalizeForCompare('Erreur lors de la recuperation des transactions'),
    normalizeForCompare('Erreur stats'),
    normalizeForCompare('Erreur chargement salles'),
    normalizeForCompare('Erreur chargement admins'),
    normalizeForCompare('Erreur création salle'),
    normalizeForCompare('Erreur creation salle'),
    normalizeForCompare('Erreur mise à jour'),
    normalizeForCompare('Erreur mise a jour'),
    normalizeForCompare('Erreur suppression'),
    normalizeForCompare('Erreur création superadmin'),
    normalizeForCompare('Erreur création plan'),
    normalizeForCompare('Erreur plans'),
    normalizeForCompare('Non trouvé'),
    normalizeForCompare('Erreur interne de validation'),
    normalizeForCompare('Erreur'),
    normalizeForCompare('Erreur réseau'),
    normalizeForCompare('Erreur de chargement'),
    normalizeForCompare('Erreur de synchronisation'),
    normalizeForCompare('Erreur lors de la vérification'),
    normalizeForCompare('Erreur lors de la verification'),
    normalizeForCompare('Erreur lors de la récupération des logs'),
    normalizeForCompare('Erreur lors de la recuperation des logs'),
    normalizeForCompare('Erreur lors du calcul des statistiques'),
    normalizeForCompare(
      "Une erreur s'est produite. Veuillez reessayer dans quelques instants."
    ),
    normalizeForCompare(
      "Une erreur s'est produite. Veuillez réessayer dans quelques instants."
    ),
  ]);

  if (exactVague.has(n)) return true;

  if (
    n.startsWith('erreur lors de la recuperation') ||
    n.startsWith('erreur lors de la récupération')
  ) {
    return n.length < 100;
  }

  if (
    /^erreur lors de l'enregistrement\b/i.test(msg.trim()) &&
    msg.trim().length < 80
  ) {
    return true;
  }

  if (/^erreur inscription$/i.test(msg.trim())) return true;

  return false;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function guidanceForHttpStatus(status: number): string {
  switch (status) {
    case 400:
      return 'données refusées : vérifiez les champs du formulaire.';
    case 401:
      return 'session expirée ou identifiants invalides. Reconnectez-vous si besoin.';
    case 403:
      return "vous n'avez pas l'autorisation pour cette action.";
    case 404:
      return 'élément introuvable.';
    case 409:
      return "conflit : cet élément existe déjà ou est lié à d'autres données.";
    case 422:
      return 'données invalides.';
    case 429:
      return 'trop de tentatives. Patientez quelques instants.';
    default:
      if (status >= 500) {
        return 'problème temporaire côté serveur. Réessayez dans un instant.';
      }
      return `réponse HTTP ${status}. Réessayez ou contactez le support.`;
  }
}

function parseApiBody(data: unknown): ApiErrorBody | null {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return data as ApiErrorBody;
  }
  return null;
}

/**
 * Message lisible : détail de validation, message API utile, ou explication selon le code HTTP + contexte.
 *
 * @param actionHint — ex. « Enregistrement de l’adhérent » (affiché si le serveur ne donne pas un message exploitable)
 */
export function getApiErrorMessage(error: unknown, actionHint?: string): string {
  const ax = error as AxiosError<unknown>;
  const hint = actionHint?.trim();

  if (!ax.response) {
    if (ax.code === 'ERR_NETWORK' || ax.message === 'Network Error') {
      return hint
        ? `${hint} — impossible de joindre le serveur. Vérifiez votre connexion.`
        : 'Impossible de joindre le serveur. Vérifiez votre connexion.';
    }
    if (error instanceof Error && ax.message?.trim()) {
      const m = ax.message.trim();
      if (!/^Request failed with status code \d+$/i.test(m)) {
        return m;
      }
    }
    return hint
      ? `${hint} — impossible de contacter le serveur.`
      : 'Impossible de contacter le serveur.';
  }

  const status = ax.response.status;
  const data = parseApiBody(ax.response.data);
  const fromErrors = data?.errors ? formatValidationErrors(data.errors) : null;
  const rawMsg =
    typeof data?.message === 'string' ? data.message.trim() : '';

  // 400 : priorité au détail Zod (champ + message), plus lisible que le seul toast
  if (status === 400 && fromErrors) {
    return fromErrors;
  }

  if (rawMsg && rawMsg !== 'Validation échouée' && !isVagueServerMessage(rawMsg)) {
    return rawMsg;
  }
  if (fromErrors) return fromErrors;
  if (rawMsg && rawMsg !== 'Validation échouée' && !isVagueServerMessage(rawMsg)) {
    return rawMsg;
  }

  const guidance = capitalize(guidanceForHttpStatus(status));
  if (hint) {
    return `${hint} — ${guidance}`;
  }
  return guidance;
}
