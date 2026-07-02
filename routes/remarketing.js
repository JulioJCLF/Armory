const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/sugestoes', async (req, res) => {
  const dias = Number(req.query.dias || 90);
  const rows = await db.query(
    `SELECT c.*,
       (SELECT MAX(data_entrada) FROM ordens o WHERE o.cliente_id = c.id) AS ultima_ordem,
       (SELECT MAX(data_contato) FROM remarketing_contatos r WHERE r.cliente_id = c.id) AS ultimo_remarketing
     FROM clientes c
     WHERE c.aceita_marketing = 1
     ORDER BY c.nome`
  );

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

router.get('/aniversariantes', async (req, res) => {
  const mes = String(req.query.mes || (new Date().getMonth() + 1)).padStart(2, '0');
  // data_nascimento stored as TEXT 'YYYY-MM-DD'
  const rows = await db.query(
    `SELECT * FROM clientes WHERE data_nascimento IS NOT NULL AND data_nascimento != ''
     AND SUBSTRING(data_nascimento, 6, 2) = ? ORDER BY SUBSTRING(data_nascimento, 9, 2)`,
    [mes]
  );
  res.json(rows);
});

router.post('/contato', async (req, res) => {
  const { cliente_id, canal, mensagem } = req.body;
  if (!cliente_id) return res.status(400).json({ erro: 'Cliente é obrigatório' });
  await db.run(
    'INSERT INTO remarketing_contatos (cliente_id, canal, mensagem) VALUES (?, ?, ?)',
    [cliente_id, canal, mensagem]
  );
  await db.run(
    "UPDATE clientes SET ultimo_contato = to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS') WHERE id = ?",
    [cliente_id]
  );
  res.status(201).json({ ok: true });
});

router.get('/historico/:clienteId', async (req, res) => {
  const rows = await db.query(
    'SELECT * FROM remarketing_contatos WHERE cliente_id = ? ORDER BY data_contato DESC',
    [req.params.clienteId]
  );
  res.json(rows);
});

module.exports = router;
