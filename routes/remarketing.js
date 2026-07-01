const express = require('express');
const db = require('../db');
const router = express.Router();

// Clientes elegíveis para remarketing: aceitam marketing e estão sem contato/serviço há mais tempo
router.get('/sugestoes', (req, res) => {
  const dias = Number(req.query.dias || 90);
  const rows = db.prepare(
    `SELECT c.*,
       (SELECT MAX(data_entrada) FROM ordens o WHERE o.cliente_id = c.id) AS ultima_ordem,
       (SELECT MAX(data_contato) FROM remarketing_contatos r WHERE r.cliente_id = c.id) AS ultimo_remarketing
     FROM clientes c
     WHERE c.aceita_marketing = 1
     ORDER BY c.nome`
  ).all();

  const hoje = new Date();
  const enriquecidos = rows.map(c => {
    const refData = c.ultimo_remarketing || c.ultima_ordem || c.criado_em || c.ultimo_contato;
    let diasSem = null;
    if (refData) {
      const d = new Date(refData.replace(' ', 'T'));
      diasSem = Math.floor((hoje - d) / 86400000);
    }
    return { ...c, dias_sem_contato: diasSem, elegivel: diasSem === null || diasSem >= dias };
  }).filter(c => c.elegivel);

  res.json(enriquecidos);
});

// Aniversariantes do mês
router.get('/aniversariantes', (req, res) => {
  const mes = String(req.query.mes || (new Date().getMonth() + 1)).padStart(2, '0');
  const rows = db.prepare(
    `SELECT * FROM clientes WHERE data_nascimento IS NOT NULL AND data_nascimento != ''
     AND strftime('%m', data_nascimento) = ? ORDER BY strftime('%d', data_nascimento)`
  ).all(mes);
  res.json(rows);
});

// Registrar um contato de remarketing
router.post('/contato', (req, res) => {
  const { cliente_id, canal, mensagem } = req.body;
  if (!cliente_id) return res.status(400).json({ erro: 'Cliente é obrigatório' });
  db.prepare('INSERT INTO remarketing_contatos (cliente_id, canal, mensagem) VALUES (?, ?, ?)')
    .run(cliente_id, canal, mensagem);
  db.prepare("UPDATE clientes SET ultimo_contato = datetime('now','localtime') WHERE id = ?")
    .run(cliente_id);
  res.status(201).json({ ok: true });
});

router.get('/historico/:clienteId', (req, res) => {
  const rows = db.prepare('SELECT * FROM remarketing_contatos WHERE cliente_id = ? ORDER BY data_contato DESC')
    .all(req.params.clienteId);
  res.json(rows);
});

module.exports = router;
