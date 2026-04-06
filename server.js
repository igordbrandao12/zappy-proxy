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
  const targetUrl = API_BASE + req.url.replace('/zappy', '/api');
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: true, message: 'Proxy Zappy Contábil rodando!' });
});

app.listen(PORT, () => {
  console.log(`Proxy rodando na porta ${PORT}`);
});
