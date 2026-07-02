const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  const rows = await db.query(
    `SELECT e.*, c.nome AS cliente_nome FROM equipamentos e
     JOIN clientes c ON c.id = e.cliente_id ORDER BY e.criado_em DESC`
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { cliente_id, tipo, marca, modelo, numero_serie, fps, observacoes } = req.body;
  if (!cliente_id) return res.status(400).json({ erro: 'Cliente é obrigatório' });
  const row = await db.run(
    `INSERT INTO equipamentos (cliente_id, tipo, marca, modelo, numero_serie, fps, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    [cliente_id, tipo, marca, modelo, numero_serie, fps || null, observacoes]
  );
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const { tipo, marca, modelo, numero_serie, fps, observacoes } = req.body;
  const row = await db.run(
    `UPDATE equipamentos SET tipo=?, marca=?, modelo=?, numero_serie=?, fps=?, observacoes=?
     WHERE id=? RETURNING *`,
    [tipo, marca, modelo, numero_serie, fps || null, observacoes, req.params.id]
  );
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  await db.run('DELETE FROM equipamentos WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
