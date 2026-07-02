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

    const { username, points } = req.body;
    if (!username || typeof points !== 'number' || points <= 0) {
        setCorsHeaders(res);
        return res.status(400).json({ error: 'Invalid data' });
    }

    try {
        await query('UPDATE users SET score = score + ? WHERE username = ?', [points, username]);
        const rows = await query(
            'SELECT score, current_skin, owned_skins FROM users WHERE username = ?',
            [username]
        );
        if (rows.length === 0) {
            setCorsHeaders(res);
            return res.status(404).json({ error: 'User not found' });
        }
        const user = rows[0];
        user.owned_skins = parseOwnedSkins(user.owned_skins);
        setCorsHeaders(res);
        res.json({
            newScore: user.score,
            current_skin: user.current_skin,
            owned_skins: user.owned_skins
        });
    } catch (err) {
        setCorsHeaders(res);
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};
