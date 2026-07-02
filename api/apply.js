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

        // Extract all fields
        const {
            job_id,
            name,
            email,
            phone,
            linkedin,
            portfolio,
            cover_letter,
            years_experience
        } = req.body;

        const file = req.file;

        // Validation
        if (!job_id || !name || !email || !phone || !file) {
            return res.status(400).json({ error: 'Missing required fields: job_id, name, email, phone, and resume file' });
        }

        // Validate email format (basic)
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        try {
            // Upload to Supabase
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

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('resumes')
                .getPublicUrl(filename);

            const resumeUrl = urlData.publicUrl;

            // Insert into applications with all fields
            const insertResult = await query(
                `INSERT INTO applications 
                    (job_id, applicant_name, applicant_email, phone, linkedin, portfolio, cover_letter, years_experience, resume_url)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    job_id,
                    name,
                    email,
                    phone,
                    linkedin || null,
                    portfolio || null,
                    cover_letter || null,
                    years_experience ? parseInt(years_experience) : null,
                    resumeUrl
                ]
            );

            // Optionally, fetch the inserted application to return (optional)
            const newApp = await query('SELECT * FROM applications WHERE id = ?', [insertResult.insertId]);

            res.status(201).json({ success: true, application: newApp[0] });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database or upload error' });
        }
    });
};
