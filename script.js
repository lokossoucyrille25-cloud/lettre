import { lettresDeclaration } from './declaration.js';
import { lettresPardon } from './pardon.js';
import { lettresAnniversaire } from './anniversaire.js';
import { lettresDistance } from './distance.js';
import { startAnimation1, startAnimation2, startAnimation3 } from './animations.js?v=3';

// Configuration des catégories
const CATEGORIES = [
  { id: "amour", nom: "❤️ Déclarations" },
  { id: "pardon", nom: "🕊️ Pardons" },
  { id: "anniversaire", nom: "🎂 Anniversaires" },
  { id: "distance", nom: "✈️ Relations à distance" }
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
    const liste = JSON.parse(localStorage.getItem('lettres_debloquees_v2') || '[]');
    return liste.some(item => String(item) === String(id));
  } catch (e) {
    return false;
  }
}

function ajouterLettreAchetee(id) {
  if (!id) return;
  try {
    let liste = JSON.parse(localStorage.getItem('lettres_debloquees_v2') || '[]');
    if (!liste.some(item => String(item) === String(id))) {
      liste.push(String(id));
      localStorage.setItem('lettres_debloquees_v2', JSON.stringify(liste));
    }
  } catch (e) {
    console.error("Erreur écriture localStorage", e);
  }
}

function retirerLettreAchetee(id) {
  if (!id) return;
  try {
    let liste = JSON.parse(localStorage.getItem('lettres_debloquees_v2') || '[]');
    liste = liste.filter(item => String(item) !== String(id));
    localStorage.setItem('lettres_debloquees_v2', JSON.stringify(liste));
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
  // Recherche exacte par ID
  for (const catKey in databaseGlobal) {
    const trouvee = databaseGlobal[catKey].find(l => String(l.id) === String(id));
    if (trouvee) {
      categorieActive = catKey;
      return trouvee;
    }
  }
  // Fallback de sécurité : renvoie la première lettre disponible
  for (const catKey in databaseGlobal) {
    if (databaseGlobal[catKey] && databaseGlobal[catKey].length > 0) {
      categorieActive = catKey;
      return databaseGlobal[catKey][0];
    }
  }
  return null;
}

/**
 * Détection et déblocage au retour de Chariow (Spécial GitHub Pages)
 */
function verifierRetourPaiement() {
  const urlParams = new URLSearchParams(window.location.search);

  // Si le site est chargé dans un iframe (ex: redirection à l'intérieur du widget Chariow)
  if (window !== window.top) {
    window.parent.postMessage('payment_success', '*');
    document.body.innerHTML = '<div style="color:white; text-align:center; padding:20px; font-family:sans-serif;">Paiement validé ! Déblocage...</div>';
    return;
  }

  const cameFromChariow = document.referrer && document.referrer.includes('chariow.com');
  const paymentStarted = localStorage.getItem('payment_started') === 'true';

  // Détection souple du paramètre de retour dans l'URL pour la fenêtre principale
  const hasPayeParam = urlParams.has('paye') || 
                       urlParams.has('succes') || 
                       urlParams.has('status') || 
                       urlParams.has('transaction_id') ||
                       window.location.search.includes('paye') ||
                       localStorage.getItem('just_paid') === 'true' ||
                       cameFromChariow ||
                       paymentStarted;

  if (hasPayeParam) {
    const letterIdFromUrl = urlParams.get('letterId');
    const pendingLetterId = localStorage.getItem('pending_letter_id') || sessionStorage.getItem('pending_letter_id');

    // Nettoyage immédiat du flag pour éviter un déblocage en boucle à chaque visite
    localStorage.removeItem('payment_started');

    // 1. Récupération de l'ID avec résolution du fallback exact
    let targetLetterId = letterIdFromUrl || pendingLetterId || "1";
    const lettreFinale = trouverLettreParId(targetLetterId);
    if (lettreFinale) {
      targetLetterId = lettreFinale.id;
    }

    // 2. Déblocage effectif
    ajouterLettreAchetee(targetLetterId);

    // Nettoyage de la mémoire temporaire
    localStorage.removeItem('pending_letter_id');
    sessionStorage.removeItem('pending_letter_id');
    localStorage.removeItem('just_paid');

    // Nettoyage propre de l'URL sans rafraîchir
    if (window.history && window.history.replaceState) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // 3. Basculement immédiat vers le catalogue et ouverture de la modale
    afficherPage('catalogue');
    ouvrirModaleAvecLettre(targetLetterId);
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
        <button onclick='ouvrirModaleAvecLettre("${lettre.id}")' class="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md">
          ${dejaPossede ? '📖 Lire la lettre' : '👁️ Aperçu & Déblocage'}
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

  // Sauvegarde préventive au cas où le widget forcerait un rechargement
  localStorage.setItem('pending_letter_id', lettreActive.id);
  sessionStorage.setItem('pending_letter_id', lettreActive.id);

  estDebloque = estLettreAchetee(lettreActive.id);
  fermerEnveloppe();

  const titleEl = document.getElementById("modal-title");
  if (titleEl) titleEl.innerText = lettreActive.titre || "Lettre d'amour";

  const partnerName = localStorage.getItem('partnerName');
  const destinataire = partnerName ? partnerName : (lettreActive.destinataire || 'Mon Amour');


  mettreAJourUIModale();

  const modalEl = document.getElementById("letter-modal");
  if (modalEl) modalEl.classList.remove("hidden");
}

function fermerModale() {
  const modalEl = document.getElementById("letter-modal");
  if (modalEl) {
    modalEl.classList.add("hidden");
    modalEl.classList.remove("bg-slate-950");
    modalEl.classList.add("bg-slate-950/90");
  }
  document.querySelector("nav")?.classList.remove("hidden");
  document.getElementById("page-catalogue")?.classList.remove("hidden");
}

let currentAnimationCleanup = null;

function ouvrirEnveloppe() {
  if (estDebloque && lettreActive) {
    const modalEl = document.getElementById("letter-modal");
    if (modalEl) modalEl.classList.add("hidden");

    const reader = document.getElementById("fullscreen-reader");
    const readerContent = document.getElementById("fullscreen-letter-content");
    const canvas = document.getElementById("animation-canvas");
    
    if (reader && readerContent && canvas) {
      readerContent.innerHTML = "";
      const lignes = Array.isArray(lettreActive.lignes) ? lettreActive.lignes : [];
      
      const animations = [startAnimation1, startAnimation2, startAnimation3];
      let currentAnimIndex = parseInt(localStorage.getItem('anim_index') || '0', 10);
      const animAleatoire = animations[currentAnimIndex % animations.length];
      localStorage.setItem('anim_index', (currentAnimIndex + 1).toString());
      
      reader.classList.remove("hidden");
      reader.classList.add("flex");
      
      const textRenderer = new CanvasTextRenderer(lignes);
      currentAnimationCleanup = animAleatoire(canvas, (ctx, W, H) => {
        textRenderer.draw(ctx, W, H);
      });
      textRenderer.start(2000);

      const dureeTotale = (lignes.length * 2000) + 8000;
      
      setTimeout(() => {
        if (currentAnimationCleanup) currentAnimationCleanup();
        textRenderer.stop();
        currentAnimationCleanup = null;
        
        reader.classList.add("hidden");
        reader.classList.remove("flex");
        
        if (modalEl) modalEl.classList.remove("hidden");
      }, dureeTotale);
    }
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
}

function reverrouillerLettre() {
  if (lettreActive) {
    retirerLettreAchetee(lettreActive.id);
  }
  estDebloque = false;
  mettreAJourUIModale();
  chargerGrille();
  fermerEnveloppe();
}

function mettreAJourUIModale() {
  const locked = document.getElementById("block-locked");
  const unlocked = document.getElementById("block-unlocked");
  const modalEl = document.getElementById("letter-modal");

  if (estDebloque) {
    locked?.classList.add("hidden");
    unlocked?.classList.remove("hidden");
    
    // Après paiement, seul la lettre payée s'affiche (on cache l'arrière-plan)
    document.getElementById("page-accueil")?.classList.add("hidden");
    document.getElementById("page-catalogue")?.classList.add("hidden");
    document.querySelector("nav")?.classList.add("hidden");
    modalEl?.classList.remove("bg-slate-950/90");
    modalEl?.classList.add("bg-slate-950");
  } else {
    locked?.classList.remove("hidden");
    unlocked?.classList.add("hidden");
    modalEl?.classList.add("bg-slate-950/90");
    modalEl?.classList.remove("bg-slate-950");
  }
}

class CanvasTextRenderer {
  constructor(lignes) {
    this.lignes = lignes;
    this.activeLines = [];
    this.index = 0;
  }
  start(intervalMs = 2000) {
    this.intervalId = setInterval(() => this.showNext(), intervalMs);
    this.showNext();
  }
  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
  showNext() {
    if (this.index >= this.lignes.length) return;
    const lineData = this.lignes[this.index];
    this.activeLines.push({
      text: getLineText(lineData),
      isHighlight: isLineHighlighted(lineData),
      opacity: 0,
      yOffset: 10,
      state: 'fading_in',
      time: Date.now()
    });
    this.index++;
  }
  draw(ctx, W, H) {
    let currentFontSize = Math.min(W * 0.06, 40);
    currentFontSize = Math.max(currentFontSize, 18);
    
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,1)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    const lineHeight = currentFontSize * 1.5;
    const now = Date.now();
    
    this.activeLines = this.activeLines.filter(l => l.state !== 'dead');
    
    const maxWidth = W * 0.9;
    let wrappedLines = [];
    
    this.activeLines.forEach(line => {
      ctx.font = line.isHighlight ? `bold ${currentFontSize}px 'Caveat', cursive` : `${currentFontSize}px 'Caveat', cursive`;
      const words = line.text.split(' ');
      let currentString = '';
      const localLines = [];
      
      words.forEach(word => {
        const testLine = currentString + word + ' ';
        if (ctx.measureText(testLine).width > maxWidth && currentString !== '') {
          localLines.push(currentString.trim());
          currentString = word + ' ';
        } else {
          currentString = testLine;
        }
      });
      localLines.push(currentString.trim());
      
      line.renderLines = localLines;
      wrappedLines.push(...localLines.map(() => line));
    });
    
    const maxVisibleLines = Math.floor((H * 0.8) / lineHeight);
    if (wrappedLines.length > maxVisibleLines) {
      const linesToRemove = wrappedLines.length - maxVisibleLines;
      let removedCount = 0;
      for (let i = 0; i < this.activeLines.length; i++) {
        if (removedCount >= linesToRemove) break;
        if (this.activeLines[i].state === 'visible' || this.activeLines[i].state === 'fading_in') {
          this.activeLines[i].state = 'fading_out';
          this.activeLines[i].time = now;
        }
        removedCount += this.activeLines[i].renderLines.length;
      }
    }
    
    let totalActiveRenderLines = 0;
    this.activeLines.forEach(line => {
      const elapsed = now - line.time;
      if (line.state === 'fading_in') {
        line.opacity = Math.min(elapsed / 600, 1);
        line.yOffset = 10 * (1 - line.opacity);
        if (elapsed > 600) line.state = 'visible';
      } else if (line.state === 'fading_out') {
        line.opacity = Math.max(1 - (elapsed / 600), 0);
        line.yOffset = -10 * (elapsed / 600);
        if (elapsed > 600) line.state = 'dead';
      }
      if (line.state !== 'dead') {
        totalActiveRenderLines += line.renderLines.length;
      }
    });
    
    let startY = (H - (totalActiveRenderLines * lineHeight)) / 2 + lineHeight / 2;
    
    this.activeLines.forEach(line => {
      if (line.state === 'dead') return;
      ctx.globalAlpha = line.opacity;
      if (line.isHighlight) {
        ctx.fillStyle = "#fb7185";
        ctx.font = `bold ${currentFontSize}px 'Caveat', cursive`;
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.font = `${currentFontSize}px 'Caveat', cursive`;
      }
      
      line.renderLines.forEach(rLine => {
        ctx.fillText(rLine, W / 2, startY + line.yOffset);
        startY += lineHeight;
      });
    });
    
    ctx.restore();
  }
}

async function telechargerLettre() {
  if (!estDebloque || !lettreActive) {
    alert("Vous devez débloquer la lettre avant de pouvoir effectuer cette action.");
    return;
  }

  const btn = document.querySelector(`button[onclick="telechargerLettre()"]`);
  const originalText = btn ? btn.innerHTML : "Télécharger la lettre";
  if (btn) {
    btn.innerHTML = `⏳ Préparation de la vidéo...`;
    btn.disabled = true;
  }

  const lignes = Array.isArray(lettreActive.lignes) ? lettreActive.lignes : [];
  const dureeTotale = (lignes.length * 2000) + 8000;

  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.position = 'fixed';
  canvas.style.opacity = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '-9999';
  document.body.appendChild(canvas);

  const textRenderer = new CanvasTextRenderer(lignes);
  
  const animations = [startAnimation1, startAnimation2, startAnimation3];
  let currentAnimIndex = parseInt(localStorage.getItem('anim_index') || '0', 10);
  const animAleatoire = animations[currentAnimIndex % animations.length];
  localStorage.setItem('anim_index', (currentAnimIndex + 1).toString());
  
  const cleanupAnim = animAleatoire(canvas, (ctx, W, H) => {
    textRenderer.draw(ctx, W, H);
  });
  textRenderer.start(2000);

  const stream = canvas.captureStream(30);
  let options = { mimeType: 'video/webm; codecs=vp9' };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = { mimeType: 'video/webm' };
  }
  
  const recorder = new MediaRecorder(stream, options);
  const chunks = [];
  recorder.ondataavailable = e => { if(e.data && e.data.size > 0) chunks.push(e.data); };
  
  recorder.onstop = () => {
    cleanupAnim();
    textRenderer.stop();
    document.body.removeChild(canvas);

    const blob = new Blob(chunks, { type: options.mimeType || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Download as .webm
    a.download = `lettre-amour-${lettreActive.id}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
    setTimeout(reverrouillerLettre, 1500);
  };

  recorder.start();

  let elapsed = 0;
  const progressInt = setInterval(() => {
    elapsed += 1000;
    const percent = Math.min(Math.round((elapsed / dureeTotale) * 100), 100);
    if (btn) btn.innerHTML = `🎥 Enregistrement... ${percent}%`;
    if (elapsed >= dureeTotale) {
      clearInterval(progressInt);
      recorder.stop();
    }
  }, 1000);
}

function partagerSurWhatsApp() {
  if (!estDebloque || !lettreActive) {
    alert("Vous devez débloquer la lettre avant de pouvoir effectuer cette action.");
    return;
  }
  const shareUrl = window.location.origin + window.location.pathname + '?lettre=' + (lettreActive ? lettreActive.id : '');
  const msg = `J'ai créé une lettre d'amour animée pour toi ! 💌 Ouvre-la ici : ${shareUrl}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  
  // Rebloquer la lettre après partage
  setTimeout(reverrouillerLettre, 1500);
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
window.payerAvecChariow = payerAvecChariow;

function payerAvecChariow() {
  const btn = document.getElementById("btn-payer");
  const originalText = btn ? btn.innerHTML : "Débloquer avec Chariow";
  
  const partner = document.getElementById('input-partner')?.value.trim();

  if (btn) {
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 mx-auto text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    btn.disabled = true;
  }

  const targetId = lettreActive ? String(lettreActive.id) : "1";

  // Sauvegarde systématique dans localStorage
  localStorage.setItem('pending_letter_id', targetId);
  sessionStorage.setItem('pending_letter_id', targetId);
  localStorage.setItem('payment_started', 'true');
  if (partner) {
    localStorage.setItem('partnerName', partner);
  }

  // Redirection directe vers le lien de paiement statique
  window.location.href = "https://mkiewzpt.mychariow.market/prd_zjdp8n4p/checkout";
}

function initApp() {
  initialiserBaseDeDonnees();
  verifierRetourPaiement();
  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('lettre')) {
    const lettreId = urlParams.get('lettre');
    setTimeout(() => {
      afficherPage('catalogue');
      ouvrirModaleAvecLettre(lettreId);
    }, 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}