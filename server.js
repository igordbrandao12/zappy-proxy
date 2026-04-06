const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const API_BASE    = 'https://api-brandao.zapcontabil.chat';
const ZAPPY_KEY   = 'e05609578b1dc72b3360f2154be225844f01c856129200d8418ecbcc7125c23d43b14c1674c7d30bbc5aee376c9ccb148857731f74cefd9fc1086877e5feea085de940e24f25b7426a62df5ab7a8df19a7ef5213b9b1286771820fdbaeffca80c0160e607715fe4ef840fb79c1b44a996097ecb22f3ed72ba8ff39d425';
const GEMINI_KEY  = 'AIzaSyDRY1m_NtQthZFdcsBsa3i0KeGWmbpdV3Q';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Proxy Zappy
app.use('/zappy', async (req, res) => {
  const path = req.url.replace(/^\/?/, '/api/');
  const targetUrl = API_BASE + path;
  console.log('Zappy:', req.method, targetUrl);
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: { 'Authorization': `Bearer ${ZAPPY_KEY}`, 'Content-Type': 'application/json' },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });
    const text = await response.text();
    try { res.status(response.status).json(JSON.parse(text)); }
    catch { res.status(response.status).send(text); }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy Gemini
app.post('/gemini', async (req, res) => {
  const { prompt } = req.body;
  console.log('Gemini: avaliando...');
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
      })
    });
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: true, message: 'Proxy Zappy Contábil v5 rodando!' });
});

app.listen(PORT, () => console.log(`Proxy rodando na porta ${PORT}`));
