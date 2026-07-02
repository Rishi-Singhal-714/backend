const axios = require('axios');

const PROXY_URL = 'https://backendapi.freedev.app/api/db-proxy.php';

const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        setCorsHeaders(res);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const response = await axios.get(`${PROXY_URL}?action=leaderboard`);
        setCorsHeaders(res);
        res.json(response.data);
    } catch (error) {
        setCorsHeaders(res);
        res.status(500).json({ error: 'Proxy request failed' });
    }
};
