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

    const { username, skin, cost } = req.body;
    if (!username || !skin || typeof cost !== 'number' || cost <= 0) {
        setCorsHeaders(res);
        return res.status(400).json({ error: 'Invalid data' });
    }

    try {
        // ✅ IMPORTANT: await the pool and then get a connection
        const pool = await require('./_db').getPool();
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [rows] = await connection.query(
                'SELECT score, owned_skins FROM users WHERE username = ? FOR UPDATE',
                [username]
            );
            if (rows.length === 0) throw new Error('User not found');

            const user = rows[0];
            let owned = parseOwnedSkins(user.owned_skins);
            if (owned.includes(skin)) throw new Error('Skin already owned');
            if (user.score < cost) throw new Error('Not enough coins');

            const newScore = user.score - cost;
            owned.push(skin);
            await connection.query(
                'UPDATE users SET score = ?, owned_skins = ? WHERE username = ?',
                [newScore, JSON.stringify(owned), username]
            );

            await connection.commit();
            connection.release();

            setCorsHeaders(res);
            res.json({
                success: true,
                newScore,
                owned_skins: owned,
                current_skin: user.current_skin || 'default'
            });
        } catch (err) {
            await connection.rollback();
            connection.release();
            throw err;
        }
    } catch (err) {
        setCorsHeaders(res);
        console.error(err);
        res.status(500).json({ error: err.message || 'Database error' });
    }
};
