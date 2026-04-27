require('dotenv').config();

const express = require('express');
const os = require('os');

const app = express();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.get('/', (req, res) => {
    res.json({ hostname: os.hostname() });
});


app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

if (require.main === module) {
    app.listen(PORT, HOST, () => {
        console.log(`Serveur démarré sur http://${HOST}:${PORT}`);
    });
}

module.exports = app;
