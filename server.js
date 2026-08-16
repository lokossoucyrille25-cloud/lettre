const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const CHARIOW_API_KEY = "sk_9phghyy6_858a46d7cbc51ba7d0de8f68a781895e";
const CHARIOW_API_URL = "prd_5ecz9fc9"; // Endpoint officiel de Chariow

// Route appelée par le frontend pour initier l'achat
app.post('/api/creer-checkout', async (req, res) => {
  const { letterId, titre, price } = req.body;

  try {
    const response = await axios.post(`${CHARIOW_API_URL}/checkout/sessions`, {
      amount: 600, // Prix fixé à 600 FCFA
      currency: "XOF",
      name: `Lettre d'amour : ${titre}`,
      redirect_url: `https://lokossoucyrille25-cloud.github.io/lettre//succes.html?letterId=${letterId}`,
      cancel_url: "https://lokossoucyrille25-cloud.github.io/lettre//catalogue.html",
      metadata: {
        letterId: letterId // Permet de savoir quelle lettre a été achetée dans le webhook
      }
    }, {
      headers: {
        'Authorization': `Bearer ${CHARIOW_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Retourne l'URL du checkout Chariow au frontend
    res.json({ checkoutUrl: response.data.checkout_url });

  } catch (error) {
    console.error("Erreur lors de la création du checkout :", error);
    res.status(600).json({ error: "Impossible de générer le paiement" });
  }
});
// Endpoint écouté par Chariow après un paiement réussi
app.post('/api/webhook/chariow', (req, res) => {
  const event = req.body;

  // 1. Vérification du type d'événement
  if (event.type === 'payment.success' || event.status === 'completed') {
    const data = event.data;
    const letterId = data.metadata ? data.metadata.letterId : null;
    const clientEmail = data.customer_email;
    const clientPhone = data.customer_phone;

    console.log(`✅ Paiement validé pour la lettre : ${letterId}`);
    console.log(`Client : ${clientEmail} / ${clientPhone}`);

    // 2. Action suite au paiement :
    // - Enregistrer l'achat dans votre base de données
    // - Générer la lettre et l'envoyer automatiquement par Email ou SMS/WhatsApp au client
    // - Débloquer l'accès sur le frontend si nécessaire

    // Réponse rapide à Chariow (HTTP 200) pour confirmer la réception
    return res.status(200).send('Webhook reçu avec succès');
  }

  res.status(400).send('Événement non géré');
});

app.listen(3000, () => console.log('Serveur en écoute sur le port 3000'));