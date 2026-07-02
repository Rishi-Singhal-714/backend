const mysql = require('mysql2/promise');

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
if (DB_SSL_CA && DB_SSL_CA.length > 10) {
    ssl = { ca: DB_SSL_CA };
} else {
    ssl = { rejectUnauthorized: false };
}

let pool;

async function getPool() {
    if (!pool) {
        try {
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
            // Test connection
            const conn = await pool.getConnection();
            conn.release();
        } catch (err) {
            console.error('❌ DATABASE CONNECTION ERROR:', err.message);
            throw new Error('DB connection failed: ' + err.message);
        }
    }
    return pool;
}

async function query(sql, params) {
    const pool = await getPool();
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (err) {
        console.error('❌ QUERY ERROR:', err.message);
        throw err;
    }
}

// Helper to safely parse owned_skins
function parseOwnedSkins(value) {
    if (!value) return ["default"];
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
            // If it's a string like "default", wrap it
            return [value];
        } catch (e) {
            // Not valid JSON, treat as single skin
            return [value];
        }
    }
    // If it's already an array, return as is
    return value;
}

module.exports = { getPool, query, parseOwnedSkins };
