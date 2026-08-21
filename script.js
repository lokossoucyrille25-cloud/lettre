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

// Historique des achats stocké en local
const lettresAchetees = JSON.parse(localStorage.getItem('lettres_debloquees') || '[]');

// Initialisation des données
function initialiserBaseDeDonnees() {
  CATEGORIES.forEach(cat => {
    databaseGlobal[cat.id] = MES_LETTRES_PERSONNALISEES[cat.id] || [];
  });
}

// Navigation entre les pages
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

// Rendu Interface Utilisateur
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
  const query = searchInput ? searchInput.value.toLowerCase() : "";
  const grid = document.getElementById("letters-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const catalogueCurrent = databaseGlobal[categorieActive] || [];
  const liste = catalogueCurrent.filter(l =>
    l.titre.toLowerCase().includes(query) ||
    l.lignes.some(line => line.text.toLowerCase().includes(query))
  );

  liste.forEach(lettre => {
    const apercuTexte = lettre.lignes[1]?.text || lettre.lignes[0]?.text || "";
    const dejaPossede = lettresAchetees.includes(lettre.id);
    const card = document.createElement("div");
    card.className = "bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-rose-500/50 transition-all space-y-3 group shadow-lg";

    card.innerHTML = `
      <div class="space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Modèle #${lettre.id}</span>
          <span class="text-xs font-bold ${dejaPossede ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-800' : 'text-slate-300 bg-slate-800'} px-2 py-0.5 rounded">
            ${dejaPossede ? 'Débloqué' : '600 FCFA'}
          </span>
        </div>
        <h3 class="font-cursive text-2xl text-slate-100 group-hover:text-rose-300 transition-colors">${lettre.titre}</h3>
        <p class="text-xs text-slate-400 italic line-clamp-2">"${apercuTexte}"</p>
      </div>

      <div class="flex gap-2 pt-2">
        <button onclick='ouvrirModaleAvecLettre("${lettre.id}")' class="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors">
          👁️ ${dejaPossede ? 'Voir la lettre' : 'Aperçu & Déblocage'}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filtrerLettres() {
  chargerGrille();
}

// Modale & Enveloppe
function ouvrirModaleAvecLettre(id) {
  lettreActive = (databaseGlobal[categorieActive] || []).find(l => l.id === id);
  if (!lettreActive) return;

  // Vérification de l'état de déblocage
  estDebloque = lettresAchetees.includes(lettreActive.id);
  fermerEnveloppe();

  document.getElementById("modal-title").innerText = lettreActive.titre;
  document.getElementById("letter-dest").innerText = `À : ${lettreActive.destinataire || 'Mon Amour'}`;
  document.getElementById("letter-sender").innerText = `De : ${lettreActive.expediteur || 'Ton Âme Sœur'}`;

  const body = document.getElementById("letter-body");
  body.innerHTML = "";
  lettreActive.lignes.forEach(line => {
    const p = document.createElement("p");
    p.innerHTML = line.highlight ? `<span class="bg-rose-200 text-rose-900 px-1 py-0.5 rounded font-bold">${line.text}</span>` : line.text;
    body.appendChild(p);
  });

  mettreAJourUIModale();
  document.getElementById("letter-modal").classList.remove("hidden");
}

function fermerModale() {
  document.getElementById("letter-modal").classList.add("hidden");
}

function ouvrirEnveloppe() {
  if (estDebloque) document.getElementById("envelope").classList.add("open");
}

function fermerEnveloppe() {
  document.getElementById("envelope").classList.remove("open");
}

function acheterDirectement(url) {
  if (url) window.open(url, "_blank");
}

function payerAvecChariow() {
  if (lettreActive && lettreActive.lienChariow) {
    window.open(lettreActive.lienChariow, "_blank");
  } else {
    simulerDeblocage();
  }
}

function simulerDeblocage() {
  if (lettreActive && !lettresAchetees.includes(lettreActive.id)) {
    lettresAchetees.push(lettreActive.id);
    localStorage.setItem('lettres_debloquees', JSON.stringify(lettresAchetees));
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

// Export HTML autonome
function telechargerLettre() {
  if (!estDebloque || !lettreActive) return;

  const contenuHTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${lettreActive.titre}</title>
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
    <h1 class="font-cursive text-4xl text-rose-400 mb-1">${lettreActive.titre}</h1>
    <div class="scene-enveloppe">
      <div id="envelope" class="envelope">
        <div class="flap"></div>
        <div class="letter">
          <div class="text-left text-[9px] font-sans text-rose-800 font-bold uppercase">À : ${lettreActive.destinataire || 'Mon Amour'}</div>
          <div class="space-y-1 my-auto text-base">
            ${lettreActive.lignes.map(l => l.highlight ? `<p><span class="bg-rose-200 text-rose-900 px-1 py-0.5 rounded font-bold">${l.text}</span></p>` : `<p>${l.text}</p>`).join('')}
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

// Exposer les fonctions globales au window
window.afficherPage = afficherPage;
window.filtrerEtOuvrirCatalogue = filtrerEtOuvrirCatalogue;
window.renderOnglets = renderOnglets;
window.chargerGrille = chargerGrille;
window.filtrerLettres = filtrerLettres;
window.ouvrirModaleAvecLettre = ouvrirModaleAvecLettre;
window.fermerModale = fermerModale;
window.ouvrirEnveloppe = ouvrirEnveloppe;
window.fermerEnveloppe = fermerEnveloppe;
window.acheterDirectement = acheterDirectement;
window.payerAvecChariow = payerAvecChariow;
window.simulerDeblocage = simulerDeblocage;
window.telechargerLettre = telechargerLettre;
window.partagerSurWhatsApp = partagerSurWhatsApp;

// Initialisation au chargement du DOM
document.addEventListener("DOMContentLoaded", () => {
  initialiserBaseDeDonnees();

  const btnPayer = document.getElementById('btn-payer');
  if (btnPayer) {
    btnPayer.addEventListener('click', async () => {
      const letterId = lettreActive ? lettreActive.id : "123";
      const titre = lettreActive ? lettreActive.titre : "Lettre d'Amour";

      try {
        const response = await fetch('https://lettre-tau.vercel.app/api/creer-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            letterId: letterId,
            titre: titre,
            price: 600
          })
        });

        const data = await response.json();

        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          alert("Erreur lors de la préparation du paiement.");
        }
      } catch (error) {
        console.error("Erreur réseau :", error);
        alert("Impossible de contacter le serveur de paiement.");
      }
    });
  }
});