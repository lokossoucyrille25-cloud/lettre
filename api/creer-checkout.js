const axios = require('axios');

const CHARIOW_API_KEY = process.env.CHARIOW_API_KEY || "sk_9phghyy6_858a46d7cbc51ba7d0de8f68a781895e";
const PRODUCT_ID = process.env.PRODUCT_ID || "prd_zjdp8n4p";
const BASE_URL = process.env.BASE_URL || "https://lettre-tau.vercel.app";

module.exports = async (req, res) => {
  // Configurer CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { letterId, prenom, nom, email, country, phone, partner } = req.body;

  try {
    // Retirer le + de l'indicatif s'il y est, car certaines API le préfèrent sans.
    // Ou le laisser. Chariow API dit souvent : country_code: "229" ou "+229"
    // Faisons un nettoyage basique pour tester :
    const cleanCountry = country ? country.replace('+', '') : '229';

    const response = await axios.post(
      `https://api.chariow.com/v1/checkout`,
      {
        product_id: PRODUCT_ID,
        email: email || "client@lettre-amour.com",
        first_name: prenom || "Client",
        last_name: nom || "Lettre",
        phone: {
          number: phone || "97000000",
          country_code: `+${cleanCountry}` // S'assurer qu'il a le +
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
};
