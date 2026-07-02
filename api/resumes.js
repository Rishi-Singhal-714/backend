const { query } = require('./_db');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    const { username } = req.query;
    if (!username) {
        setCorsHeaders(res);
        return res.status(400).json({ error: 'Missing username' });
    }

    try {
        const users = await query('SELECT id FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            setCorsHeaders(res);
            return res.status(404).json({ error: 'User not found' });
        }
        const userId = users[0].id;

        const rows = await query(
            'SELECT id, filename, file_path, file_size, mime_type, uploaded_at FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC',
            [userId]
        );

        // Add signed URLs to each resume
        const resumesWithUrls = await Promise.all(rows.map(async (row) => {
            const { data } = await supabase.storage
                .from('resumes')
                .createSignedUrl(row.file_path, 60 * 5); // 5 minutes expiry
            return {
                ...row,
                file_url: data.signedUrl,   // temporary URL for viewing
            };
        }));

        setCorsHeaders(res);
        res.json(resumesWithUrls);
    } catch (err) {
        console.error(err);
        setCorsHeaders(res);
        res.status(500).json({ error: 'Database error' });
    }
};
