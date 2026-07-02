const { query, parseOwnedSkins } = require('./_db');

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

    const { username, password } = req.body;
    if (!username || !password) {
        setCorsHeaders(res);
        return res.status(400).json({ error: 'Missing credentials' });
    }

    try {
        const rows = await query(
            'SELECT id, username, score, current_skin, owned_skins, admin FROM users WHERE username = ? AND password = ?',
            [username, password]
        );
        if (rows.length === 0) {
            setCorsHeaders(res);
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const user = rows[0];
        user.owned_skins = parseOwnedSkins(user.owned_skins);
        setCorsHeaders(res);
        res.json(user);
    } catch (err) {
        setCorsHeaders(res);
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};
