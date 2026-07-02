const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  const busca = req.query.busca;
  let rows;
  if (busca) {
    const q = `%${busca}%`;
    rows = await db.query(
      `SELECT * FROM clientes WHERE nome ILIKE ? OR cpf ILIKE ? OR telefone ILIKE ? OR email ILIKE ? ORDER BY nome`,
      [q, q, q, q]
    );
  } else {
    rows = await db.query('SELECT * FROM clientes ORDER BY nome');
  }
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const cliente = await db.one('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });
  cliente.equipamentos = await db.query('SELECT * FROM equipamentos WHERE cliente_id = ? ORDER BY criado_em DESC', [cliente.id]);
  cliente.ordens = await db.query('SELECT * FROM ordens WHERE cliente_id = ? ORDER BY criado_em DESC', [cliente.id]);
  res.json(cliente);
});

router.post('/', async (req, res) => {
  const { nome, cpf, telefone, email, endereco, data_nascimento, aceita_marketing, observacoes } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  const row = await db.run(
    `INSERT INTO clientes (nome, cpf, telefone, email, endereco, data_nascimento, aceita_marketing, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    [nome, cpf, telefone, email, endereco, data_nascimento, aceita_marketing ? 1 : 0, observacoes]
  );
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const { nome, cpf, telefone, email, endereco, data_nascimento, aceita_marketing, observacoes } = req.body;
  const existe = await db.one('SELECT id FROM clientes WHERE id = ?', [req.params.id]);
  if (!existe) return res.status(404).json({ erro: 'Cliente não encontrado' });
  const row = await db.run(
    `UPDATE clientes SET nome=?, cpf=?, telefone=?, email=?, endereco=?, data_nascimento=?, aceita_marketing=?, observacoes=?
     WHERE id=? RETURNING *`,
    [nome, cpf, telefone, email, endereco, data_nascimento, aceita_marketing ? 1 : 0, observacoes, req.params.id]
  );
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  await db.run('DELETE FROM clientes WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
