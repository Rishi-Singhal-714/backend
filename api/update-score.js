const axios = require('axios');
const PROXY_URL = 'https://backendapi.freedev.app/api/db-proxy.php';

const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        setCorsHeaders(res);
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const response = await axios.post(`${PROXY_URL}?action=update-score`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        setCorsHeaders(res);
        res.json(response.data);
    } catch (error) {
        setCorsHeaders(res);
        const status = error.response?.status || 500;
        const data = error.response?.data || { error: 'Proxy request failed' };
        res.status(status).json(data);
    }
};
