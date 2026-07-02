const { query } = require('./_db');

const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

// Helper: check if user is admin (requires username in body/query)
const isAdmin = async (username) => {
    if (!username) return false;
    const rows = await query('SELECT admin FROM users WHERE username = ?', [username]);
    return rows.length > 0 && rows[0].admin === 1;
};

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        return res.status(200).end();
    }

    setCorsHeaders(res);

    const { method } = req;
    const { username } = req.query; // for admin check

    // GET all jobs (public)
    if (method === 'GET') {
        try {
            const rows = await query('SELECT * FROM jobs ORDER BY created_at DESC');
            return res.json(rows);
        } catch (err) {
            return res.status(500).json({ error: 'Database error' });
        }
    }

    // For POST, PUT, DELETE – require admin
    if (!await isAdmin(username)) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    // POST – create job
    if (method === 'POST') {
        const { title, description, location, job_type, company } = req.body;
        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description required' });
        }
        try {
            const result = await query(
                `INSERT INTO jobs (title, description, location, job_type, company)
                 VALUES (?, ?, ?, ?, ?)`,
                [title, description, location, job_type, company]
            );
            const newJob = await query('SELECT * FROM jobs WHERE id = ?', [result.insertId]);
            return res.json(newJob[0]);
        } catch (err) {
            return res.status(500).json({ error: 'Database error' });
        }
    }

    // PUT – update job
    if (method === 'PUT') {
        const { id, title, description, location, job_type, company } = req.body;
        if (!id) return res.status(400).json({ error: 'Job ID required' });
        try {
            await query(
                `UPDATE jobs SET title = ?, description = ?, location = ?, job_type = ?, company = ?
                 WHERE id = ?`,
                [title, description, location, job_type, company, id]
            );
            const updated = await query('SELECT * FROM jobs WHERE id = ?', [id]);
            return res.json(updated[0]);
        } catch (err) {
            return res.status(500).json({ error: 'Database error' });
        }
    }

    // DELETE – delete job
    if (method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Job ID required' });
        try {
            await query('DELETE FROM jobs WHERE id = ?', [id]);
            return res.json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: 'Database error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
