const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const API_BASE = 'https://api-brandao.zapcontabil.chat';
const API_KEY  = 'e05609578b1dc72b3360f2154be225844f01c856129200d8418ecbcc7125c23d43b14c1674c7d30bbc5aee376c9ccb148857731f74cefd9fc1086877e5feea085de940e24f25b7426a62df5ab7a8df19a7ef5213b9b1286771820fdbaeffca80c0160e607715fe4ef840fb79c1b44a996097ecb22f3ed72ba8ff39d425';

app.use(cors());
app.use(express.json());

app.use('/zappy', async (req, res) => {
  const path = req.url.replace(/^\/?/, '/api/');
  const targetUrl = API_BASE + path;

  console.log('Proxying:', req.method, targetUrl);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'token': API_KEY,
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', text.slice(0, 200));

    try {
      res.status(response.status).json(JSON.parse(text));
    } catch {
      res.status(response.status).send(text);
    }
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Rota de diagnóstico
app.get('/test', async (req, res) => {
  const results = {};
  const headersToTest = [
    { name: 'token', headers: { 'token': API_KEY } },
    { name: 'apikey', headers: { 'apikey': API_KEY } },
    { name: 'Authorization Bearer', headers: { 'Authorization': `Bearer ${API_KEY}` } },
    { name: 'Authorization Token', headers: { 'Authorization': `Token ${API_KEY}` } },
  ];

  for (const h of headersToTest) {
    try {
      const r = await fetch(`${API_BASE}/api/tickets?limit=1`, {
        headers: { ...h.headers, 'Content-Type': 'application/json' }
      });
      const body = await r.text();
      results[h.name] = { status: r.status, body: body.slice(0, 150) };
    } catch (e) {
      results[h.name] = { error: e.message };
    }
  }

  res.json(results);
});

app.get('/', (req, res) => {
  res.json({ status: true, message: 'Proxy Zappy Contábil v2 rodando!' });
});

app.listen(PORT, () => {
  console.log(`Proxy rodando na porta ${PORT}`);
});
