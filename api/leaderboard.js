const { query } = require('./_db');

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
        const rows = await query(
            'SELECT username, score FROM users ORDER BY score DESC LIMIT 10'
        );
        setCorsHeaders(res);
        res.json(rows);
    } catch (err) {
        setCorsHeaders(res);
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};
