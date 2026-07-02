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

    const { job_id, username } = req.query;
    if (!job_id || !username) {
        setCorsHeaders(res);
        return res.status(400).json({ error: 'Missing job_id or username' });
    }

    try {
        // Check admin
        const userRows = await query('SELECT admin FROM users WHERE username = ?', [username]);
        if (userRows.length === 0 || userRows[0].admin !== 1) {
            setCorsHeaders(res);
            return res.status(403).json({ error: 'Admin access required' });
        }

        const rows = await query(
            'SELECT * FROM applications WHERE job_id = ? ORDER BY applied_at DESC',
            [job_id]
        );
        setCorsHeaders(res);
        res.json(rows);
    } catch (err) {
        setCorsHeaders(res);
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};
