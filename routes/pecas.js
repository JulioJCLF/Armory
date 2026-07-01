const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const busca = req.query.busca;
  let rows;
  if (busca) {
    const q = `%${busca}%`;
    rows = db.prepare('SELECT * FROM pecas WHERE nome LIKE ? OR codigo LIKE ? OR categoria LIKE ? ORDER BY nome').all(q, q, q);
  } else {
    rows = db.prepare('SELECT * FROM pecas ORDER BY nome').all();
  }
  res.json(rows);
});

router.post('/', (req, res) => {
  const { nome, codigo, categoria, quantidade, quantidade_minima, preco_unitario, localizacao } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  const info = db.prepare(
    `INSERT INTO pecas (nome, codigo, categoria, quantidade, quantidade_minima, preco_unitario, localizacao)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(nome, codigo, categoria, quantidade || 0, quantidade_minima || 0, preco_unitario || 0, localizacao);
  res.status(201).json(db.prepare('SELECT * FROM pecas WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { nome, codigo, categoria, quantidade, quantidade_minima, preco_unitario, localizacao } = req.body;
  db.prepare(
    `UPDATE pecas SET nome=?, codigo=?, categoria=?, quantidade=?, quantidade_minima=?, preco_unitario=?, localizacao=? WHERE id=?`
  ).run(nome, codigo, categoria, quantidade || 0, quantidade_minima || 0, preco_unitario || 0, localizacao, req.params.id);
  res.json(db.prepare('SELECT * FROM pecas WHERE id = ?').get(req.params.id));
});

// Ajuste rápido de estoque (+/-)
router.post('/:id/ajuste', (req, res) => {
  const { delta } = req.body;
  const peca = db.prepare('SELECT * FROM pecas WHERE id = ?').get(req.params.id);
  if (!peca) return res.status(404).json({ erro: 'Peça não encontrada' });
  const nova = Math.max(0, peca.quantidade + Number(delta || 0));
  db.prepare('UPDATE pecas SET quantidade = ? WHERE id = ?').run(nova, req.params.id);
  res.json(db.prepare('SELECT * FROM pecas WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM pecas WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
