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

    const { username, skin } = req.body;
    if (!username || !skin) {
        setCorsHeaders(res);
        return res.status(400).json({ error: 'Missing data' });
    }

    try {
        const rows = await query('SELECT owned_skins FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            setCorsHeaders(res);
            return res.status(404).json({ error: 'User not found' });
        }
        const owned = parseOwnedSkins(rows[0].owned_skins);
        if (!owned.includes(skin)) {
            setCorsHeaders(res);
            return res.status(403).json({ error: 'Skin not owned' });
        }
        await query('UPDATE users SET current_skin = ? WHERE username = ?', [skin, username]);
        setCorsHeaders(res);
        res.json({ success: true, current_skin: skin });
    } catch (err) {
        setCorsHeaders(res);
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};
