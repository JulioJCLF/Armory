const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare(
    `SELECT e.*, c.nome AS cliente_nome FROM equipamentos e
     JOIN clientes c ON c.id = e.cliente_id ORDER BY e.criado_em DESC`
  ).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { cliente_id, tipo, marca, modelo, numero_serie, fps, observacoes } = req.body;
  if (!cliente_id) return res.status(400).json({ erro: 'Cliente é obrigatório' });
  const info = db.prepare(
    `INSERT INTO equipamentos (cliente_id, tipo, marca, modelo, numero_serie, fps, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(cliente_id, tipo, marca, modelo, numero_serie, fps || null, observacoes);
  res.status(201).json(db.prepare('SELECT * FROM equipamentos WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { tipo, marca, modelo, numero_serie, fps, observacoes } = req.body;
  db.prepare(
    `UPDATE equipamentos SET tipo=?, marca=?, modelo=?, numero_serie=?, fps=?, observacoes=? WHERE id=?`
  ).run(tipo, marca, modelo, numero_serie, fps || null, observacoes, req.params.id);
  res.json(db.prepare('SELECT * FROM equipamentos WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM equipamentos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
