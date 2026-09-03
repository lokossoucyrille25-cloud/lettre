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
const PRODUCT_ID = process.env.PRODUCT_ID || "prd_zjdp8n4p";
const BASE_URL = process.env.BASE_URL || "https://lettre-tau.vercel.app";

// --- ROUTES STATIQUES ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Capture également si Chariow redirige sur /succes.html
app.get('/succes.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- API CHECKOUT ---
app.post('/api/creer-checkout', async (req, res) => {
  const { letterId, prenom, nom, email, country, phone, partner } = req.body;

  try {
    const response = await axios.post(
      `https://api.chariow.com/v1/checkout`,
      {
        product_id: PRODUCT_ID,
        email: email || "client@lettre-amour.com",
        first_name: prenom || "Client",
        last_name: nom || "Lettre",
        phone: {
          number: phone || "97000000",
          country_code: country || "+229"
        },
        redirect_url: `${BASE_URL}/?paye=true&letterId=${encodeURIComponent(letterId || '')}`,
        metadata: {
          letterId: letterId || '',
          partner: partner || ''
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

    const checkoutUrl = response.data?.checkout_url || response.data?.url;
    if (checkoutUrl) {
      return res.json({ success: true, payment_url: checkoutUrl });
    } else {
      console.error("Réponse Chariow inattendue :", response.data);
      return res.status(500).json({ success: false, message: "URL de paiement non reçue de l'API." });
    }

  } catch (error) {
    console.error("❌ Erreur Checkout :", error.response?.data || error.message);
    const apiError = error.response?.data?.message || "Erreur lors de la création de la session Chariow.";
    return res.status(500).json({ success: false, message: apiError });
  }
});

// Webhook
app.post('/api/webhook/chariow', (req, res) => {
  res.status(200).json({ status: 'success' });
});

// Catch-all
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));
}

module.exports = app;