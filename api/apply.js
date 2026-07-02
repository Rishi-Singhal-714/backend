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

        const { job_id, name, email } = req.body;
        const file = req.file;

        if (!job_id || !name || !email || !file) {
            return res.status(400).json({ error: 'Missing job_id, name, email, or file' });
        }

        try {
            // Upload to Supabase private bucket (use public URL for now)
            const ext = file.originalname.split('.').pop();
            const filename = `applications/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

            const { data, error } = await supabase.storage
                .from('resumes')
                .upload(filename, file.buffer, {
                    contentType: file.mimetype,
                    cacheControl: '3600',
                    upsert: false,
                });

            if (error) {
                console.error('Supabase upload error:', error);
                return res.status(500).json({ error: 'File upload failed' });
            }

            // Get public URL (or signed URL – we'll use public)
            const { data: urlData } = supabase.storage
                .from('resumes')
                .getPublicUrl(filename);

            const resumeUrl = urlData.publicUrl;

            // Insert application
            await query(
                `INSERT INTO applications (job_id, applicant_name, applicant_email, resume_url)
                 VALUES (?, ?, ?, ?)`,
                [job_id, name, email, resumeUrl]
            );

            res.json({ success: true, resumeUrl });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database or upload error' });
        }
    });
};
