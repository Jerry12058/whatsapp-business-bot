const axios = require('axios');

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Customers';

// ------------------------------------------------------------------
// EDIT THIS SECTION to change what your bot automatically replies.
// Each rule: if the customer's message contains any of the "keywords",
// the bot sends back the matching "reply".
// ------------------------------------------------------------------
const AUTO_REPLIES = [
  { keywords: ['hi', 'hello', 'salam', 'assalam'], reply: 'Hello! Thanks for messaging us. How can we help you today?' },
  { keywords: ['price', 'cost', 'how much'], reply: 'Thanks for asking! Our team will send you pricing details shortly.' },
  { keywords: ['hours', 'timing', 'open'], reply: 'We are available Monday to Saturday, 9 AM to 6 PM.' },
];
const DEFAULT_REPLY = "Thanks for your message! A team member will get back to you shortly.";
// ------------------------------------------------------------------

function getReply(text) {
  const lower = text.toLowerCase();
  for (const rule of AUTO_REPLIES) {
    if (rule.keywords.some((k) => lower.includes(k))) return rule.reply;
  }
  return DEFAULT_REPLY;
}

async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;
  await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to,
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

// Saves the customer's message as a new row in your Airtable base (your CRM).
async function saveToAirtable(entry) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
  await axios.post(
    url,
    {
      fields: {
        Name: entry.name,
        Phone: entry.from,
        Message: entry.text,
        Timestamp: entry.timestamp,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

module.exports = async (req, res) => {
  // Meta calls this ONE TIME (a GET request) when you connect your webhook,
  // to prove you own this server.
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      res.status(403).end();
    }
    return;
  }

  // Meta sends every incoming WhatsApp message here as a POST request.
  if (req.method === 'POST') {
    try {
      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (message && message.type === 'text') {
        const from = message.from;
        const text = message.text.body;
        const contactName = value.contacts?.[0]?.profile?.name || 'Unknown';

        console.log(`Message from ${contactName} (${from}): ${text}`);

        await saveToAirtable({
          from,
          name: contactName,
          text,
          timestamp: new Date().toISOString(),
        });

        const reply = getReply(text);
        await sendWhatsAppMessage(from, reply);
      }

      res.status(200).end();
    } catch (err) {
      console.error('Error handling webhook:', err.message);
      res.status(200).end(); // Always reply 200 so Meta doesn't keep retrying
    }
    return;
  }

  res.status(405).end();
};
