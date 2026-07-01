const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'armory.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  data_nascimento TEXT,
  aceita_marketing INTEGER DEFAULT 1,
  observacoes TEXT,
  ultimo_contato TEXT,
  criado_em TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS equipamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  tipo TEXT,
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  fps INTEGER,
  observacoes TEXT,
  criado_em TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pecas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  codigo TEXT,
  categoria TEXT,
  quantidade INTEGER DEFAULT 0,
  quantidade_minima INTEGER DEFAULT 0,
  preco_unitario REAL DEFAULT 0,
  localizacao TEXT,
  criado_em TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS ordens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT,
  cliente_id INTEGER NOT NULL,
  equipamento_id INTEGER,
  descricao_problema TEXT,
  servico_realizado TEXT,
  status TEXT DEFAULT 'aberta',
  valor_mao_obra REAL DEFAULT 0,
  data_entrada TEXT DEFAULT (date('now','localtime')),
  data_previsao TEXT,
  data_conclusao TEXT,
  observacoes TEXT,
  criado_em TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ordem_pecas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ordem_id INTEGER NOT NULL,
  peca_id INTEGER,
  descricao TEXT,
  quantidade INTEGER DEFAULT 1,
  preco_unitario REAL DEFAULT 0,
  FOREIGN KEY (ordem_id) REFERENCES ordens(id) ON DELETE CASCADE,
  FOREIGN KEY (peca_id) REFERENCES pecas(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS remarketing_contatos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  canal TEXT,
  mensagem TEXT,
  data_contato TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);
`);

module.exports = db;
