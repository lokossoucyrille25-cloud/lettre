const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// --- CONFIGURATION ---
const CHARIOW_API_KEY = process.env.CHARIOW_API_KEY || "sk_9phghyy6_858a46d7cbc51ba7d0de8f68a781895e";
const CHARIOW_API_URL = process.env.CHARIOW_API_URL || "https://api.chariow.com";
const PRODUCT_ID = process.env.PRODUCT_ID || "prd_5ecz9fc9";
const BASE_URL = process.env.BASE_URL || "https://lettre-tau.vercel.app";

// --- ROUTES STATIQUES ---

// Page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- ROUTES API & PAIEMENT ---

// 1. Création d'une session de paiement pour Chariow
app.post('/api/creer-checkout', async (req, res) => {
  const { letterId, titre, price } = req.body;

  try {
    const response = await axios.post(
      `${CHARIOW_API_URL}/checkout/sessions`,
      {
        product_id: PRODUCT_ID,
        amount: price || 600,
        redirect_url: `${BASE_URL}/?succes=true&letterId=${encodeURIComponent(letterId || '')}`,
        cancel_url: `${BASE_URL}/`,
        metadata: {
          letterId: letterId || '',
          titre: titre || "Lettre d'amour"
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${CHARIOW_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      }
    );

    // Renvoie l'URL de paiement générée par Chariow
    const checkoutUrl = response.data?.checkout_url || response.data?.url || `https://chariow.com/p/${PRODUCT_ID}`;
    return res.json({ checkoutUrl });

  } catch (error) {
    console.error("❌ Erreur lors de la création du checkout Chariow :", error.response?.data || error.message);

    // Fallback : Redirection directe vers la page produit Chariow
    return res.json({ checkoutUrl: `https://chariow.com/p/${PRODUCT_ID}` });
  }
});

// 2. Webhook Chariow (Confirmation de paiement)
app.post('/api/webhook/chariow', (req, res) => {
  const event = req.body;

  if (!event) {
    return res.status(400).send('Payload invalide');
  }

  // Traitement des évènements de succès de paiement
  if (
    event.type === 'payment.success' ||
    event.type === 'order.completed' ||
    event.status === 'completed' ||
    event.status === 'success'
  ) {
    const data = event.data || event;
    const letterId = data.metadata?.letterId || null;
    const clientEmail = data.customer_email || data.customer?.email || 'N/A';
    const clientPhone = data.customer_phone || data.customer?.phone || 'N/A';

    console.log(`✅ Paiement validé pour le produit ${PRODUCT_ID} (Lettre ID: ${letterId})`);
    console.log(`👤 Client : Email [${clientEmail}] | Tél [${clientPhone}]`);

    return res.status(200).json({ status: 'success', message: 'Webhook reçu avec succès' });
  }

  return res.status(200).json({ status: 'ignored', message: 'Événement ignoré' });
});

// Fallback pour les routes côté client (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- DÉMARRAGE ET EXPORT (VERCEL / LOCAL) ---
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));
}

module.exports = app;