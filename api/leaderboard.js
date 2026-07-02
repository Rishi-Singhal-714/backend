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

    try {
        const pool = getPool();
        const [rows] = await pool.query(
            'SELECT username, score FROM users ORDER BY score DESC LIMIT 10'
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};
