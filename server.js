const path = require('path');
const express = require('express');
const { sessionMiddleware } = require('./lib/session');
const db = require('./db');
const ordensRouter = require('./routes/ordens');
const { gerarOrdemServicoPDF } = require('./pdf/ordemServico');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Parsers ────────────────────────────────────────────────
app.use(express.json());

// ── Static assets (CSS, JS — no DB needed) ────────────────
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ── Wait for DB schema before processing any dynamic request ──
// On serverless cold starts the first request can arrive before
// initSchema() resolves, so we block here until tables are ready.
app.use(async (req, res, next) => {
  try {
    await db.ready;
    next();
  } catch (err) {
    console.error('DB unavailable:', err.message);
    res.status(503).send('Service temporarily unavailable — database not ready');
  }
});

// ── Sessions ───────────────────────────────────────────────
// Custom HMAC-signed cookie session — no external library, works with Express 5.
app.use(sessionMiddleware(process.env.SESSION_SECRET || 'caliber-dev-secret-change-in-prod'));

// ── Auth routes (public) ──────────────────────────────────
app.use('/api/auth', require('./routes/auth'));

// ── Login / root pages ────────────────────────────────────
app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get(['/', '/index.html'], (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Auth middleware for all API routes below ──────────────
function requireAuth(req, res, next) {
  if (req.session.userId) return next();
  res.status(401).json({ erro: 'Não autenticado' });
}

// ── Protected API routes ──────────────────────────────────
app.use('/api/clientes',    requireAuth, require('./routes/clientes'));
app.use('/api/equipamentos',requireAuth, require('./routes/equipamentos'));
app.use('/api/pecas',       requireAuth, require('./routes/pecas'));
app.use('/api/ordens',      requireAuth, ordensRouter);
app.use('/api/remarketing', requireAuth, require('./routes/remarketing'));

app.get('/api/ordens/:id/pdf', requireAuth, async (req, res) => {
  const ordem = await ordensRouter.carregarOrdem(req.params.id);
  if (!ordem) return res.status(404).json({ erro: 'Ordem não encontrada' });
  gerarOrdemServicoPDF(ordem, res);
});

// ── Dashboard ─────────────────────────────────────────────
app.get('/api/dashboard', requireAuth, async (req, res) => {
  const mes  = new Date().toISOString().slice(0, 7);
  const hoje = new Date().toISOString().slice(0, 10);
  const em14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const [
    { c: clientes },
    { c: equipamentos },
    { c: ordensAbertas },
    { c: estoqueBaixo },
    { total: receitaTotal },
    { total: receitaMes },
    { c: osMes },
    { c: aEntregar },
    statusBreakdown,
    estoqueBaixoItens,
    proximasEntregas,
    recentesOrdens,
  ] = await Promise.all([
    db.one('SELECT COUNT(*)::int c FROM clientes'),
    db.one('SELECT COUNT(*)::int c FROM equipamentos'),
    db.one("SELECT COUNT(*)::int c FROM ordens WHERE status NOT IN ('entregue','concluida')"),
    db.one('SELECT COUNT(*)::int c FROM pecas WHERE quantidade <= quantidade_minima'),
    db.one(`
      SELECT COALESCE(SUM(o.valor_mao_obra) + SUM(COALESCE(op.t, 0)), 0) AS total
      FROM ordens o
      LEFT JOIN (SELECT ordem_id, SUM(quantidade * preco_unitario) AS t FROM ordem_pecas GROUP BY ordem_id) op ON op.ordem_id = o.id
      WHERE o.status IN ('concluida','entregue')
    `),
    db.one(`
      SELECT COALESCE(SUM(o.valor_mao_obra) + SUM(COALESCE(op.t, 0)), 0) AS total
      FROM ordens o
      LEFT JOIN (SELECT ordem_id, SUM(quantidade * preco_unitario) AS t FROM ordem_pecas GROUP BY ordem_id) op ON op.ordem_id = o.id
      WHERE o.status IN ('concluida','entregue') AND LEFT(o.data_entrada, 7) = ?
    `, [mes]),
    db.one('SELECT COUNT(*)::int c FROM ordens WHERE LEFT(data_entrada, 7) = ?', [mes]),
    db.one("SELECT COUNT(*)::int c FROM ordens WHERE status = 'concluida'"),
    db.query('SELECT status, COUNT(*)::int c FROM ordens GROUP BY status'),
    db.query(`
      SELECT nome, quantidade, quantidade_minima, categoria
      FROM pecas WHERE quantidade <= quantidade_minima
      ORDER BY (quantidade - quantidade_minima) ASC LIMIT 6
    `),
    db.query(`
      SELECT o.id, o.numero, o.data_previsao, o.status, c.nome AS cliente_nome
      FROM ordens o JOIN clientes c ON c.id = o.cliente_id
      WHERE o.data_previsao BETWEEN ? AND ? AND o.status NOT IN ('entregue')
      ORDER BY o.data_previsao ASC LIMIT 6
    `, [hoje, em14]),
    db.query(`
      SELECT o.id, o.numero, o.status, o.data_entrada, c.nome AS cliente_nome
      FROM ordens o JOIN clientes c ON c.id = o.cliente_id
      ORDER BY o.criado_em DESC LIMIT 6
    `),
  ]);

  res.json({
    clientes, equipamentos, ordensAbertas, estoqueBaixo,
    receitaTotal, receitaMes, osMes, aEntregar,
    statusBreakdown, estoqueBaixoItens, proximasEntregas, recentesOrdens,
  });
});

// Export for Vercel serverless
module.exports = app;

// Start server when run directly (local dev)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Caliber rodando em http://localhost:${PORT}`);
  });
}
