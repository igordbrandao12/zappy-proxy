const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const API_BASE   = 'https://api-brandao.zapcontabil.chat';
const ZAPPY_KEY  = 'e05609578b1dc72b3360f2154be225844f01c856129200d8418ecbcc7125c23d43b14c1674c7d30bbc5aee376c9ccb148857731f74cefd9fc1086877e5feea085de940e24f25b7426a62df5ab7a8df19a7ef5213b9b1286771820fdbaeffca80c0160e607715fe4ef840fb79c1b44a996097ecb22f3ed72ba8ff39d425';
const GEMINI_KEY = 'AIzaSyCmu9aBNY3q8cm01MczQYcW7mCMzuLucUU';

const HEADERS = { 'Authorization': `Bearer ${ZAPPY_KEY}`, 'Content-Type': 'application/json' };

app.use(cors());
app.use(express.json({ limit: '10mb' }));

async function zappyGet(path) {
  const r = await fetch(`${API_BASE}/api${path}`, { headers: HEADERS });
  return r.json();
}

// Proxy Zappy genérico
app.use('/zappy', async (req, res) => {
  const targetUrl = API_BASE + '/api' + req.url;
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: HEADERS,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });
    const text = await response.text();
    try { res.status(response.status).json(JSON.parse(text)); }
    catch { res.status(response.status).send(text); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tickets recentes com nomes resolvidos
app.get('/tickets-recentes', async (req, res) => {
  const { status, userId, pageSize = 30 } = req.query;
  try {
    // Descobre última página
    let url = `/tickets?limit=${pageSize}&page=1`;
    if (status) url += `&status=${status}`;
    if (userId) url += `&userId=${userId}`;
    const d1 = await zappyGet(url);
    const lastPage = d1.lastPage || 1;

    // Busca últimas 2 páginas (mais recentes)
    const pages = [lastPage, lastPage - 1].filter(p => p >= 1);
    const ticketArrays = await Promise.all(pages.map(async page => {
      let u = `/tickets?limit=${pageSize}&page=${page}`;
      if (status) u += `&status=${status}`;
      if (userId) u += `&userId=${userId}`;
      const d = await zappyGet(u);
      return Array.isArray(d) ? d : (d.tickets || d.data || []);
    }));
    let tickets = ticketArrays.flat().reverse();

    // Busca usuários e contatos para resolver nomes
    const [usersData, contactsData] = await Promise.all([
      zappyGet('/users'),
      zappyGet('/contacts?limit=500')
    ]);

    const users = Array.isArray(usersData) ? usersData : (usersData.data || usersData.users || []);
    const contacts = Array.isArray(contactsData) ? contactsData : (contactsData.data || contactsData.contacts || []);

    const userMap = {};
    users.forEach(u => { userMap[u.id || u._id] = u.name || u.nome || u.email || 'Atendente'; });

    const contactMap = {};
    contacts.forEach(c => { contactMap[c.id || c._id] = c.name || c.pushname || c.number || 'Cliente'; });

    // Enriquece tickets com nomes
    tickets = tickets.map(t => ({
      ...t,
      _nomeatendente: t.userId ? (userMap[t.userId] || 'Não atribuído') : 'Não atribuído',
      _nomecliente: t.contactId ? (contactMap[t.contactId] || `Contato #${t.contactId}`) : 'Cliente',
    }));

    res.json({ tickets, total: d1.count || tickets.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Proxy Gemini
app.post('/gemini', async (req, res) => {
  const { prompt } = req.body;
  console.log('Gemini: chamando IA...');
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1500 }
      })
    });
    const data = await response.json();
    console.log('Gemini response status:', response.status);
    if (data.error) { return res.status(500).json({ error: data.error.message }); }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text });
  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: true, message: 'Proxy Zappy Contábil v7 rodando!' });
});

app.listen(PORT, () => console.log(`Proxy rodando na porta ${PORT}`));
