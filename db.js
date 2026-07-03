const { Pool } = require('pg');
const { hashPassword } = require('./lib/crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 5,
});

// Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ...
function toPostgres(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const db = {
  async query(sql, params = []) {
    const res = await pool.query(toPostgres(sql), params);
    return res.rows;
  },
  async one(sql, params = []) {
    const res = await pool.query(toPostgres(sql), params);
    return res.rows[0] || null;
  },
  async run(sql, params = []) {
    const res = await pool.query(toPostgres(sql), params);
    return res.rows[0];
  },
  async transaction(fn) {
    const client = await pool.connect();
    const q = (sql, params = []) => client.query(toPostgres(sql), params);
    try {
      await client.query('BEGIN');
      const result = await fn(q);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id               SERIAL PRIMARY KEY,
      nome             TEXT NOT NULL,
      cpf              TEXT,
      telefone         TEXT,
      email            TEXT,
      endereco         TEXT,
      data_nascimento  TEXT,
      aceita_marketing INTEGER DEFAULT 1,
      observacoes      TEXT,
      ultimo_contato   TEXT,
      criado_em        TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS equipamentos (
      id           SERIAL PRIMARY KEY,
      cliente_id   INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      tipo         TEXT,
      marca        TEXT,
      modelo       TEXT,
      numero_serie TEXT,
      fps          INTEGER,
      observacoes  TEXT,
      criado_em    TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS pecas (
      id                SERIAL PRIMARY KEY,
      nome              TEXT NOT NULL,
      codigo            TEXT,
      categoria         TEXT,
      quantidade        INTEGER DEFAULT 0,
      quantidade_minima INTEGER DEFAULT 0,
      preco_unitario    REAL DEFAULT 0,
      localizacao       TEXT,
      criado_em         TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS ordens (
      id                 SERIAL PRIMARY KEY,
      numero             TEXT,
      cliente_id         INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      equipamento_id     INTEGER REFERENCES equipamentos(id) ON DELETE SET NULL,
      descricao_problema TEXT,
      servico_realizado  TEXT,
      status             TEXT DEFAULT 'aberta',
      valor_mao_obra     REAL DEFAULT 0,
      data_entrada       TEXT DEFAULT to_char(CURRENT_DATE, 'YYYY-MM-DD'),
      data_previsao      TEXT,
      data_conclusao     TEXT,
      observacoes        TEXT,
      criado_em          TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS ordem_pecas (
      id             SERIAL PRIMARY KEY,
      ordem_id       INTEGER NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
      peca_id        INTEGER REFERENCES pecas(id) ON DELETE SET NULL,
      descricao      TEXT,
      quantidade     INTEGER DEFAULT 1,
      preco_unitario REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS remarketing_contatos (
      id           SERIAL PRIMARY KEY,
      cliente_id   INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      canal        TEXT,
      mensagem     TEXT,
      data_contato TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT DEFAULT 'admin',
      criado_em     TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    );
  `);

  // Admin user bootstrap:
  // - If no users exist → create from env vars (or defaults)
  // - If ADMIN_PASS is explicitly set → always sync it so changing the env takes effect
  const adminUsername = (process.env.ADMIN_USER || 'admin').toLowerCase();
  const adminPass     = process.env.ADMIN_PASS || 'caliber123';

  const existing = await pool.query(
    'SELECT id FROM users WHERE username = $1',
    [adminUsername]
  );

  if (existing.rows.length === 0) {
    await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
      [adminUsername, hashPassword(adminPass), 'admin']
    );
    if (!process.env.ADMIN_PASS) {
      console.warn('\n⚠️  Admin criado com senha padrão "caliber123". Defina ADMIN_PASS em produção.\n');
    }
  } else if (process.env.ADMIN_PASS) {
    // Env var is set → sync password so any change to ADMIN_PASS takes effect on redeploy
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [hashPassword(adminPass), adminUsername]
    );
  }
}

// Export a promise that resolves when tables are ready.
// server.js awaits this before handling requests (critical for serverless cold starts).
let resolveReady, rejectReady;
db.ready = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });

initSchema()
  .then(resolveReady)
  .catch(err => {
    console.error('Erro ao inicializar banco de dados:', err.message);
    rejectReady(err);
  });

db.pool = pool;
module.exports = db;
