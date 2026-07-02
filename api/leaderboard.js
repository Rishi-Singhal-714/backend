const axios = require('axios');

const PROXY_URL = 'https://backendapi.freedev.app/api/db-proxy.php';

module.exports = async (req, res) => {
    try {
        const response = await axios.get(`${PROXY_URL}?action=leaderboard`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Proxy request failed' });
    }
};
