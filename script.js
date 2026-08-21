import { lettresDeclaration } from './declaration.js';
import { lettresPardon } from './pardon.js';
import { lettresAnniversaire } from './anniversaire.js';
import { lettresDistance } from './distance.js';

// Configuration des catégories
const CATEGORIES = [
  { id: "amour", nom: "❤️ Déclarations" },
  { id: "pardon", nom: "🕊️ Pardons" },
  { id: "anniversaire", nom: "🎂 Anniversaires" },
  { id: "distance", nom: "✈️ Distance" }
];

// Agrégation de la banque de données
const MES_LETTRES_PERSONNALISEES = {
  amour: lettresDeclaration,
  pardon: lettresPardon,
  anniversaire: lettresAnniversaire,
  distance: lettresDistance
};

let databaseGlobal = {};
let categorieActive = "amour";
let lettreActive = null;
let estDebloque = false;

// --- HELPERS ET PROTECTION DE FORMAT ---

function getLineText(line) {
  if (typeof line === 'string') return line;
  if (line && typeof line === 'object') return line.text || '';
  return '';
}

function isLineHighlighted(line) {
  if (line && typeof line === 'object') return !!line.highlight;
  return false;
}

// --- GESTION DU STOCKAGE DEBLOCAGE ---

function estLettreAchetee(id) {
  if (!id) return false;
  try {
    const liste = JSON.parse(localStorage.getItem('lettres_debloquees') || '[]');
    return liste.some(item => String(item) === String(id));
  } catch (e) {
    return false;
  }
}

function ajouterLettreAchetee(id) {
  if (!id) return;
  try {
    let liste = JSON.parse(localStorage.getItem('lettres_debloquees') || '[]');
    if (!liste.some(item => String(item) === String(id))) {
      liste.push(String(id));
      localStorage.setItem('lettres_debloquees', JSON.stringify(liste));
    }
  } catch (e) {
    console.error("Erreur écriture localStorage", e);
  }
}

function initialiserBaseDeDonnees() {
  CATEGORIES.forEach(cat => {
    databaseGlobal[cat.id] = MES_LETTRES_PERSONNALISEES[cat.id] || [];
  });
}

function trouverLettreParId(id) {
  if (!id) return null;
  for (const catKey in databaseGlobal) {
    const trouvee = databaseGlobal[catKey].find(l => String(l.id) === String(id));
    if (trouvee) {
      categorieActive = catKey;
      return trouvee;
    }
  }
  return null;
}

/**
 * Détection et déblocage au retour de Chariow (Spécial GitHub Pages)
 */
function verifierRetourPaiement() {
  const urlParams = new URLSearchParams(window.location.search);

  // Détection si on revient de Chariow (via n'importe quel paramètre de succès)
  const hasPayeParam = urlParams.has('paye') || urlParams.has('succes') || urlParams.has('letterId') || urlParams.has('status');
  const letterIdFromUrl = urlParams.get('letterId');
  const pendingLetterId = localStorage.getItem('pending_letter_id');

  const targetLetterId = letterIdFromUrl || pendingLetterId;

  // Si le client revient du paiement Chariow
  if (hasPayeParam && targetLetterId) {
    // 1. Débloquer définitivement la lettre
    ajouterLettreAchetee(targetLetterId);

    // Supprimer la mémoire temporaire d'attente
    localStorage.removeItem('pending_letter_id');

    // Nettoyer l'URL proprement sans recharger
    if (window.history && window.history.replaceState) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // 2. Basculer directement sur le catalogue et ouvrir la modale
    setTimeout(() => {
      afficherPage('catalogue');
      ouvrirModaleAvecLettre(targetLetterId);
    }, 200);
  }
}

// --- NAVIGATION ---

function afficherPage(page) {
  const pAccueil = document.getElementById("page-accueil");
  const pCatalogue = document.getElementById("page-catalogue");

  if (!pAccueil || !pCatalogue) return;

  if (page === "accueil") {
    pAccueil.classList.remove("hidden");
    pCatalogue.classList.add("hidden");
  } else if (page === "catalogue") {
    pAccueil.classList.add("hidden");
    pCatalogue.classList.remove("hidden");
    renderOnglets();
    chargerGrille();
  }
}

function filtrerEtOuvrirCatalogue(catId) {
  categorieActive = catId;
  afficherPage('catalogue');
}

// --- RENDU UI ---

function renderOnglets() {
  const container = document.getElementById("categories-tabs");
  if (!container) return;
  container.innerHTML = "";

  CATEGORIES.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = `px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
      cat.id === categorieActive
        ? "bg-rose-600 text-white shadow-md"
        : "text-slate-400 hover:text-white hover:bg-slate-800"
    }`;
    btn.innerText = cat.nom;
    btn.onclick = () => {
      categorieActive = cat.id;
      renderOnglets();
      chargerGrille();
    };
    container.appendChild(btn);
  });
}

function chargerGrille() {
  const searchInput = document.getElementById("search-input");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const grid = document.getElementById("letters-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const catalogueCurrent = databaseGlobal[categorieActive] || [];
  const liste = catalogueCurrent.filter(l => {
    const titreMatch = (l.titre || "").toLowerCase().includes(query);
    const lignesMatch = Array.isArray(l.lignes) && l.lignes.some(line => getLineText(line).toLowerCase().includes(query));
    return titreMatch || lignesMatch;
  });

  liste.forEach(lettre => {
    const lignes = Array.isArray(lettre.lignes) ? lettre.lignes : [];
    const premLigne = lignes[1] || lignes[0] || "";
    const apercuTexte = getLineText(premLigne);
    const dejaPossede = estLettreAchetee(lettre.id);

    const card = document.createElement("div");
    card.className = "bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-rose-500/50 transition-all space-y-3 group shadow-lg";

    card.innerHTML = `
      <div class="space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Modèle #${lettre.id}</span>
          <span class="text-xs font-bold ${dejaPossede ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-800' : 'text-slate-300 bg-slate-800'} px-2 py-0.5 rounded">
            ${dejaPossede ? '🔓 Débloqué' : '600 FCFA'}
          </span>
        </div>
        <h3 class="font-cursive text-2xl text-slate-100 group-hover:text-rose-300 transition-colors">${lettre.titre || 'Lettre d\'amour'}</h3>
        <p class="text-xs text-slate-400 italic line-clamp-2">"${apercuTexte}"</p>
      </div>

      <div class="flex gap-2 pt-2">
        <button onclick='ouvrirModaleAvecLettre("${lettre.id}")' class="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors">
          👁️ ${dejaPossede ? 'Lire la lettre' : 'Aperçu & Déblocage'}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filtrerLettres() {
  chargerGrille();
}

// --- MODALE ET ENVELOPPE ---

function ouvrirModaleAvecLettre(id) {
  lettreActive = trouverLettreParId(id);
  if (!lettreActive) return;

  estDebloque = estLettreAchetee(lettreActive.id);
  fermerEnveloppe();

  const titleEl = document.getElementById("modal-title");
  if (titleEl) titleEl.innerText = lettreActive.titre || "Lettre d'amour";

  const destEl = document.getElementById("letter-dest");
  if (destEl) destEl.innerText = `À : ${lettreActive.destinataire || 'Mon Amour'}`;

  const senderEl = document.getElementById("letter-sender");
  if (senderEl) senderEl.innerText = `De : ${lettreActive.expediteur || 'Ton Âme Sœur'}`;

  const body = document.getElementById("letter-body");
  if (body) {
    body.innerHTML = "";
    const lignes = Array.isArray(lettreActive.lignes) ? lettreActive.lignes : [];
    lignes.forEach(line => {
      const p = document.createElement("p");
      const txt = getLineText(line);
      if (isLineHighlighted(line)) {
        p.innerHTML = `<span class="bg-rose-200 text-rose-900 px-1 py-0.5 rounded font-bold">${txt}</span>`;
      } else {
        p.innerText = txt;
      }
      body.appendChild(p);
    });
  }

  mettreAJourUIModale();

  const modalEl = document.getElementById("letter-modal");
  if (modalEl) modalEl.classList.remove("hidden");

  // Dépliage automatique si la lettre est débloquée
  if (estDebloque) {
    setTimeout(ouvrirEnveloppe, 300);
  }
}

function fermerModale() {
  const modalEl = document.getElementById("letter-modal");
  if (modalEl) modalEl.classList.add("hidden");
}

function ouvrirEnveloppe() {
  if (estDebloque) {
    const env = document.getElementById("envelope");
    if (env) env.classList.add("open");
  }
}

function fermerEnveloppe() {
  const env = document.getElementById("envelope");
  if (env) env.classList.remove("open");
}

function simulerDeblocage() {
  if (lettreActive) {
    ajouterLettreAchetee(lettreActive.id);
  }
  estDebloque = true;
  mettreAJourUIModale();
  chargerGrille();
  ouvrirEnveloppe();
}

function mettreAJourUIModale() {
  const locked = document.getElementById("block-locked");
  const unlocked = document.getElementById("block-unlocked");

  if (estDebloque) {
    locked?.classList.add("hidden");
    unlocked?.classList.remove("hidden");
  } else {
    locked?.classList.remove("hidden");
    unlocked?.classList.add("hidden");
  }
}

// --- EXPORT HTML & PARTAGE ---

function telechargerLettre() {
  if (!estDebloque || !lettreActive) return;

  const lignes = Array.isArray(lettreActive.lignes) ? lettreActive.lignes : [];

  const contenuHTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${lettreActive.titre || 'Lettre d\'amour'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Montserrat:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { background-color: #020617; font-family: 'Montserrat', sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0; padding: 20px; color: #f8fafc; }
    .font-cursive { font-family: 'Caveat', cursive; }
    .scene-enveloppe { position: relative; width: 280px; height: 190px; margin: 30px auto; }
    .envelope { position: relative; width: 100%; height: 100%; background-color: #be123c; border-radius: 8px; box-shadow: 0 15px 35px rgba(225,29,72,0.3); }
    .flap { position: absolute; top: 0; left: 0; width: 0; height: 0; border-left: 140px solid transparent; border-right: 140px solid transparent; border-top: 105px solid #9f1239; transform-origin: top; transition: transform 0.5s ease-in-out, z-index 0.5s ease-in-out; z-index: 4; }
    .pocket { position: absolute; bottom: 0; left: 0; width: 0; height: 0; border-left: 140px solid #e11d48; border-right: 140px solid #e11d48; border-bottom: 95px solid #f43f5e; border-top: 95px solid transparent; border-radius: 0 0 8px 8px; z-index: 3; }
    .letter { position: absolute; bottom: 8px; left: 10px; width: 260px; height: 170px; background: #fff1f2; color: #1e293b; border-radius: 6px; padding: 14px; font-family: 'Caveat', cursive; font-size: 1.15rem; transition: transform 0.6s ease-in-out 0.2s, z-index 0.6s ease-in-out 0.2s; z-index: 2; display: flex; flex-direction: column; justify-content: space-between; text-align: center; overflow-y: auto; }
    .envelope.open .flap { transform: rotateX(180deg); z-index: 1; }
    .envelope.open .letter { transform: translateY(-115px); z-index: 3; }
  </style>
</head>
<body>
  <div class="text-center max-w-sm">
    <h1 class="font-cursive text-4xl text-rose-400 mb-1">${lettreActive.titre || 'Lettre d\'amour'}</h1>
    <div class="scene-enveloppe">
      <div id="envelope" class="envelope">
        <div class="flap"></div>
        <div class="letter">
          <div class="text-left text-[9px] font-sans text-rose-800 font-bold uppercase">À : ${lettreActive.destinataire || 'Mon Amour'}</div>
          <div class="space-y-1 my-auto text-base">
            ${lignes.map(l => isLineHighlighted(l) ? `<p><span class="bg-rose-200 text-rose-900 px-1 py-0.5 rounded font-bold">${getLineText(l)}</span></p>` : `<p>${getLineText(l)}</p>`).join('')}
          </div>
          <div class="text-right text-[9px] font-sans text-rose-800 font-bold uppercase">De : ${lettreActive.expediteur || 'Ton Âme Sœur'}</div>
        </div>
        <div class="pocket"></div>
      </div>
    </div>
    <div class="flex gap-3 justify-center">
      <button onclick="document.getElementById('envelope').classList.add('open')" class="py-2 px-6 bg-rose-600 text-white font-semibold rounded-xl text-xs">💌 Ouvrir</button>
      <button onclick="document.getElementById('envelope').classList.remove('open')" class="py-2 px-6 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs">🔒 Fermer</button>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([contenuHTML], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lettre-amour-${lettreActive.id}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function partagerSurWhatsApp() {
  const msg = `J'ai créé une lettre d'amour animée pour toi ! 💌 Ouvre-la ici : ${window.location.href}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
}

// Export global vers window
window.afficherPage = afficherPage;
window.filtrerEtOuvrirCatalogue = filtrerEtOuvrirCatalogue;
window.renderOnglets = renderOnglets;
window.chargerGrille = chargerGrille;
window.filtrerLettres = filtrerLettres;
window.ouvrirModaleAvecLettre = ouvrirModaleAvecLettre;
window.fermerModale = fermerModale;
window.ouvrirEnveloppe = ouvrirEnveloppe;
window.fermerEnveloppe = fermerEnveloppe;
window.simulerDeblocage = simulerDeblocage;
window.telechargerLettre = telechargerLettre;
window.partagerSurWhatsApp = partagerSurWhatsApp;

// --- INITIALISATION AU CHARGEMENT ---

document.addEventListener("DOMContentLoaded", () => {
  initialiserBaseDeDonnees();
  verifierRetourPaiement();

  const btnPayer = document.getElementById('btn-payer');
  if (btnPayer) {
    btnPayer.addEventListener('click', () => {
      const targetId = lettreActive ? String(lettreActive.id) : "1";

      // 1. Sauvegarder l'ID de la lettre dans localStorage
      localStorage.setItem('pending_letter_id', targetId);

      // 2. Redirection directe vers la page Chariow (sur GitHub Pages, pas besoin d'API backend)
      window.location.href = "https://chariow.com/p/prd_5ecz9fc9";
    });
  }
});