const { query } = require('./_db');

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

    const { username } = req.body;
    if (!username) {
        setCorsHeaders(res);
        return res.status(400).json({ error: 'Missing username' });
    }

    try {
        const rows = await query(
            'SELECT id, username, score, current_skin, owned_skins FROM users WHERE username = ?',
            [username]
        );
        if (rows.length === 0) {
            setCorsHeaders(res);
            return res.status(404).json({ error: 'User not found' });
        }
        const user = rows[0];
        user.owned_skins = JSON.parse(user.owned_skins || '["default"]');
        setCorsHeaders(res);
        res.json(user);
    } catch (err) {
        setCorsHeaders(res);
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};
