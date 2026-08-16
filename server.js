const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');

app.use(cors());

app.use(express.json());

// === 1. ROUTE RACINE (À PLACER ICI) ===
app.get('/', (req, res) => {
  res.send('Le serveur fonctionne correctement !');
});

// Clés d'API
const CHARIOW_API_KEY = process.env.CHARIOW_API_KEY || "sk_9phghyy6_858a46d7cbc51ba7d0de8f68a781895e";
const CHARIOW_API_URL = "https://api.chariow.com"; // Endpoint officiel de Chariow

// Route appelée par le frontend pour initier l'achat
app.post('/api/creer-checkout', async (req, res) => {
  const { letterId, titre, price } = req.body;

  try {
    const response = await axios.post(`${CHARIOW_API_URL}/checkout/sessions`, {
      amount: 600, // Prix fixé à 600 FCFA
      currency: "XOF",
      name: `Lettre d'amour : ${titre}`,
      redirect_url: `https://lettre-tau.vercel.app/lettre/succes.html?letterId=${letterId}`,
      cancel_url: "https://lettre-tau.vercel.app/lettre/catalogue.html",
      metadata: {
        letterId: letterId
      }
    }, {
      headers: {
        'Authorization': `Bearer ${CHARIOW_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ checkoutUrl: response.data.checkout_url });

  } catch (error) {
    console.error("Erreur lors de la création du checkout :", error);
    res.status(500).json({ error: "Impossible de générer le paiement" }); 
  }
});

// Endpoint écouté par Chariow après un paiement réussi
app.post('/api/webhook/chariow', (req, res) => {
  const event = req.body;

  if (event.type === 'payment.success' || event.status === 'completed') {
    const data = event.data;
    const letterId = data.metadata ? data.metadata.letterId : null;
    const clientEmail = data.customer_email;
    const clientPhone = data.customer_phone;

    console.log(`✅ Paiement validé pour la lettre : ${letterId}`);
    console.log(`Client : ${clientEmail} / ${clientPhone}`);

    return res.status(200).send('Webhook reçu avec succès');
  }

  res.status(400).send('Événement non géré');
});

// Écoute locale
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur en écoute sur le port ${PORT}`));

// === 2. REQUIS POUR LE DÉPLOIEMENT VERCEL ===
module.exports = app;