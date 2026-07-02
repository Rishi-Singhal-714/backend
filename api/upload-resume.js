const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { query } = require('./_db');

const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, DOCX allowed'), false);
        }
    }
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        return res.status(200).end();
    }

    upload.single('resume')(req, res, async (err) => {
        setCorsHeaders(res);
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { username } = req.body;
        const file = req.file;

        if (!username || !file) {
            return res.status(400).json({ error: 'Missing username or file' });
        }

        try {
            // Get user_id
            const users = await query('SELECT id FROM users WHERE username = ?', [username]);
            if (users.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            const userId = users[0].id;

            // Generate unique filename
            const ext = file.originalname.split('.').pop();
            const filename = `resumes/${Date.now()}-${userId}.${ext}`;

            // Upload to Supabase Storage (private bucket)
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(filename, file.buffer, {
                    contentType: file.mimetype,
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                console.error('Supabase upload error:', uploadError);
                return res.status(500).json({ error: 'File upload failed' });
            }

            // Store file path (not public URL)
            await query(
                `INSERT INTO resumes (user_id, filename, file_path, file_size, mime_type)
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, file.originalname, filename, file.size, file.mimetype]
            );

            // Generate a signed URL for immediate preview (optional)
            const { data: signedUrlData } = await supabase.storage
                .from('resumes')
                .createSignedUrl(filename, 60 * 5); // 5 minutes expiry

            res.json({ success: true, fileUrl: signedUrlData.signedUrl });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database or upload error' });
        }
    });
};
