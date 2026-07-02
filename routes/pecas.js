const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  const busca = req.query.busca;
  let rows;
  if (busca) {
    const q = `%${busca}%`;
    rows = await db.query(
      'SELECT * FROM pecas WHERE nome ILIKE ? OR codigo ILIKE ? OR categoria ILIKE ? ORDER BY nome',
      [q, q, q]
    );
  } else {
    rows = await db.query('SELECT * FROM pecas ORDER BY nome');
  }
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nome, codigo, categoria, quantidade, quantidade_minima, preco_unitario, localizacao } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  const row = await db.run(
    `INSERT INTO pecas (nome, codigo, categoria, quantidade, quantidade_minima, preco_unitario, localizacao)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    [nome, codigo, categoria, quantidade || 0, quantidade_minima || 0, preco_unitario || 0, localizacao]
  );
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const { nome, codigo, categoria, quantidade, quantidade_minima, preco_unitario, localizacao } = req.body;
  const row = await db.run(
    `UPDATE pecas SET nome=?, codigo=?, categoria=?, quantidade=?, quantidade_minima=?, preco_unitario=?, localizacao=?
     WHERE id=? RETURNING *`,
    [nome, codigo, categoria, quantidade || 0, quantidade_minima || 0, preco_unitario || 0, localizacao, req.params.id]
  );
  res.json(row);
});

router.post('/:id/ajuste', async (req, res) => {
  const { delta } = req.body;
  const peca = await db.one('SELECT * FROM pecas WHERE id = ?', [req.params.id]);
  if (!peca) return res.status(404).json({ erro: 'Peça não encontrada' });
  const nova = Math.max(0, peca.quantidade + Number(delta || 0));
  const row = await db.run('UPDATE pecas SET quantidade = ? WHERE id = ? RETURNING *', [nova, req.params.id]);
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  await db.run('DELETE FROM pecas WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
