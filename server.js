require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const DATA_FILE = path.join(__dirname, 'messages.json');

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

function loadMessages() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveMessage(entry) {
  const messages = loadMessages();
  messages.push(entry);
  fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
}

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

// Meta calls this ONE TIME when you connect your webhook, to prove you own this server.
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Meta sends every incoming WhatsApp message to this address.
app.post('/webhook', async (req, res) => {
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

      saveMessage({
        from,
        name: contactName,
        text,
        timestamp: new Date().toISOString(),
      });

      const reply = getReply(text);
      await sendWhatsAppMessage(from, reply);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error handling webhook:', err.message);
    res.sendStatus(200); // Always reply 200 so Meta doesn't keep retrying
  }
});

// Visit this address in your browser to see every customer message received so far.
app.get('/customers', (req, res) => {
  res.json(loadMessages());
});

app.get('/', (req, res) => {
  res.send('WhatsApp Business bot server is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
