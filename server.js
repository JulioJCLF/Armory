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
  const ordensAbertas = db.prepare("SELECT COUNT(*) c FROM ordens WHERE status NOT IN ('entregue')").get().c;
  const estoqueBaixo = db.prepare('SELECT COUNT(*) c FROM pecas WHERE quantidade <= quantidade_minima').get().c;
  res.json({ clientes, equipamentos, ordensAbertas, estoqueBaixo });
});

app.listen(PORT, () => {
  console.log(`Armaria Airsoft rodando em http://localhost:${PORT}`);
});
