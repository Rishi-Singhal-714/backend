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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
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

        const { name, email } = req.body;
        const file = req.file;

        if (!name || !email || !file) {
            return res.status(400).json({ error: 'Missing name, email, or file' });
        }

        try {
            const ext = file.originalname.split('.').pop();
            const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

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

            const { data: urlData } = supabase.storage
                .from('resumes')
                .getPublicUrl(filename);
            const fileUrl = urlData.publicUrl;

            await query(
                `INSERT INTO resumes (name, email, resume_link) VALUES (?, ?, ?)`,
                [name, email, fileUrl]
            );

            res.json({ success: true, fileUrl });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database or upload error' });
        }
    });
};
