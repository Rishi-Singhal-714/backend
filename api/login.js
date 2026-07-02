const axios = require('axios');

const PROXY_URL = 'https://backendapi.freedev.app/api/db-proxy.php';

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const response = await axios.post(`${PROXY_URL}?action=login`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        const data = error.response?.data || { error: 'Proxy request failed' };
        res.status(status).json(data);
    }
};
