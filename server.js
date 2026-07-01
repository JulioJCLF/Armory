const path = require('path');
const express = require('express');
const db = require('./db');
const ordensRouter = require('./routes/ordens');
const { gerarOrdemServicoPDF } = require('./pdf/ordemServico');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/equipamentos', require('./routes/equipamentos'));
app.use('/api/pecas', require('./routes/pecas'));
app.use('/api/ordens', ordensRouter);
app.use('/api/remarketing', require('./routes/remarketing'));

// PDF da ordem de serviço
app.get('/api/ordens/:id/pdf', (req, res) => {
  const ordem = ordensRouter.carregarOrdem(req.params.id);
  if (!ordem) return res.status(404).json({ erro: 'Ordem não encontrada' });
  gerarOrdemServicoPDF(ordem, res);
});

// Painel / resumo
app.get('/api/dashboard', (req, res) => {
  const clientes = db.prepare('SELECT COUNT(*) c FROM clientes').get().c;
  const equipamentos = db.prepare('SELECT COUNT(*) c FROM equipamentos').get().c;
  const ordensAbertas = db.prepare("SELECT COUNT(*) c FROM ordens WHERE status NOT IN ('entregue','concluida')").get().c;
  const estoqueBaixo = db.prepare('SELECT COUNT(*) c FROM pecas WHERE quantidade <= quantidade_minima').get().c;

  const receitaTotal = db.prepare(`
    SELECT COALESCE(SUM(o.valor_mao_obra) + SUM(COALESCE(op.t, 0)), 0) AS total
    FROM ordens o
    LEFT JOIN (SELECT ordem_id, SUM(quantidade * preco_unitario) AS t FROM ordem_pecas GROUP BY ordem_id) op ON op.ordem_id = o.id
    WHERE o.status IN ('concluida','entregue')
  `).get().total;

  const mes = new Date().toISOString().slice(0, 7);
  const receitaMes = db.prepare(`
    SELECT COALESCE(SUM(o.valor_mao_obra) + SUM(COALESCE(op.t, 0)), 0) AS total
    FROM ordens o
    LEFT JOIN (SELECT ordem_id, SUM(quantidade * preco_unitario) AS t FROM ordem_pecas GROUP BY ordem_id) op ON op.ordem_id = o.id
    WHERE o.status IN ('concluida','entregue') AND strftime('%Y-%m', o.data_entrada) = ?
  `).get(mes).total;

  const osMes = db.prepare("SELECT COUNT(*) c FROM ordens WHERE strftime('%Y-%m', data_entrada) = ?").get(mes).c;
  const aEntregar = db.prepare("SELECT COUNT(*) c FROM ordens WHERE status = 'concluida'").get().c;

  const statusBreakdown = db.prepare('SELECT status, COUNT(*) c FROM ordens GROUP BY status').all();

  const estoqueBaixoItens = db.prepare(`
    SELECT nome, quantidade, quantidade_minima, categoria
    FROM pecas WHERE quantidade <= quantidade_minima
    ORDER BY (quantidade - quantidade_minima) ASC LIMIT 6
  `).all();

  const hoje = new Date().toISOString().slice(0, 10);
  const em14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const proximasEntregas = db.prepare(`
    SELECT o.id, o.numero, o.data_previsao, o.status, c.nome AS cliente_nome
    FROM ordens o JOIN clientes c ON c.id = o.cliente_id
    WHERE o.data_previsao BETWEEN ? AND ? AND o.status NOT IN ('entregue')
    ORDER BY o.data_previsao ASC LIMIT 6
  `).all(hoje, em14);

  const recentesOrdens = db.prepare(`
    SELECT o.id, o.numero, o.status, o.data_entrada, c.nome AS cliente_nome
    FROM ordens o JOIN clientes c ON c.id = o.cliente_id
    ORDER BY o.criado_em DESC LIMIT 6
  `).all();

  res.json({
    clientes, equipamentos, ordensAbertas, estoqueBaixo,
    receitaTotal, receitaMes, osMes, aEntregar,
    statusBreakdown, estoqueBaixoItens, proximasEntregas, recentesOrdens
  });
});

app.listen(PORT, () => {
  console.log(`Armaria Airsoft rodando em http://localhost:${PORT}`);
});
