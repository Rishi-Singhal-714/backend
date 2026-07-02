const mysql = require('mysql2/promise');
const cors = require('cors');

const corsMiddleware = cors({ origin: true });

function runMiddleware(req, res, fn) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) return reject(result);
            return resolve(result);
        });
    });
}

let pool;
function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
    }
    return pool;
}

module.exports = async (req, res) => {
    await runMiddleware(req, res, corsMiddleware);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, points } = req.body;
    if (!username || typeof points !== 'number') {
        return res.status(400).json({ error: 'Invalid data' });
    }

    try {
        const pool = getPool();
        const [result] = await pool.query(
            'UPDATE users SET score = score + ? WHERE username = ?',
            [points, username]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const [rows] = await pool.query('SELECT score FROM users WHERE username = ?', [username]);
        res.json({ newScore: rows[0].score });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};
