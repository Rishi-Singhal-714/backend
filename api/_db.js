const mysql = require('mysql2/promise');

// Environment variables (set in Vercel)
const {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    DB_SSL_CA
} = process.env;

// SSL configuration
let ssl = undefined;
if (DB_SSL_CA) {
    ssl = { ca: DB_SSL_CA };
} else {
    // Fallback: accept self-signed certificates (for development)
    ssl = { rejectUnauthorized: false };
}

let pool;

async function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: DB_HOST,
            port: parseInt(DB_PORT || '3306'),
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            ssl: ssl,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }
    return pool;
}

// Helper to execute queries with error handling
async function query(sql, params) {
    const pool = await getPool();
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (err) {
        console.error('Database query error:', err.message);
        throw err;
    }
}

module.exports = { getPool, query };
