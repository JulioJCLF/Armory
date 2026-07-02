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
  // Returns all matching rows
  async query(sql, params = []) {
    const res = await pool.query(toPostgres(sql), params);
    return res.rows;
  },
  // Returns first row or null
  async one(sql, params = []) {
    const res = await pool.query(toPostgres(sql), params);
    return res.rows[0] || null;
  },
  // Executes and returns first row (useful with RETURNING)
  async run(sql, params = []) {
    const res = await pool.query(toPostgres(sql), params);
    return res.rows[0];
  },
  // Runs multiple statements in a transaction
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
      id               SERIAL PRIMARY KEY,
      nome             TEXT NOT NULL,
      codigo           TEXT,
      categoria        TEXT,
      quantidade       INTEGER DEFAULT 0,
      quantidade_minima INTEGER DEFAULT 0,
      preco_unitario   REAL DEFAULT 0,
      localizacao      TEXT,
      criado_em        TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS ordens (
      id                  SERIAL PRIMARY KEY,
      numero              TEXT,
      cliente_id          INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      equipamento_id      INTEGER REFERENCES equipamentos(id) ON DELETE SET NULL,
      descricao_problema  TEXT,
      servico_realizado   TEXT,
      status              TEXT DEFAULT 'aberta',
      valor_mao_obra      REAL DEFAULT 0,
      data_entrada        TEXT DEFAULT to_char(CURRENT_DATE, 'YYYY-MM-DD'),
      data_previsao       TEXT,
      data_conclusao      TEXT,
      observacoes         TEXT,
      criado_em           TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
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

  // Seed default admin on first run
  const { count } = await pool.query('SELECT COUNT(*)::int AS count FROM users').then(r => r.rows[0]);
  if (count === 0) {
    const user = (process.env.ADMIN_USER || 'admin').toLowerCase();
    const pass = process.env.ADMIN_PASS || 'caliber123';
    await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
      [user, hashPassword(pass), 'admin']
    );
    if (!process.env.ADMIN_PASS) {
      console.warn('\n⚠️  Usuário admin criado com senha padrão "caliber123".');
      console.warn('   Defina ADMIN_USER e ADMIN_PASS como variáveis de ambiente em produção.\n');
    }
  }
}

initSchema().catch(err => {
  console.error('Erro ao inicializar banco de dados:', err.message);
  process.exit(1);
});

db.pool = pool;
module.exports = db;
