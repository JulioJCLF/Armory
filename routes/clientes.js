const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const busca = req.query.busca;
  let rows;
  if (busca) {
    const q = `%${busca}%`;
    rows = db.prepare(
      `SELECT * FROM clientes WHERE nome LIKE ? OR cpf LIKE ? OR telefone LIKE ? OR email LIKE ? ORDER BY nome`
    ).all(q, q, q, q);
  } else {
    rows = db.prepare('SELECT * FROM clientes ORDER BY nome').all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });
  cliente.equipamentos = db.prepare('SELECT * FROM equipamentos WHERE cliente_id = ? ORDER BY criado_em DESC').all(cliente.id);
  cliente.ordens = db.prepare('SELECT * FROM ordens WHERE cliente_id = ? ORDER BY criado_em DESC').all(cliente.id);
  res.json(cliente);
});

router.post('/', (req, res) => {
  const { nome, cpf, telefone, email, endereco, data_nascimento, aceita_marketing, observacoes } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  const info = db.prepare(
    `INSERT INTO clientes (nome, cpf, telefone, email, endereco, data_nascimento, aceita_marketing, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(nome, cpf, telefone, email, endereco, data_nascimento, aceita_marketing ? 1 : 0, observacoes);
  res.status(201).json(db.prepare('SELECT * FROM clientes WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { nome, cpf, telefone, email, endereco, data_nascimento, aceita_marketing, observacoes } = req.body;
  const existe = db.prepare('SELECT id FROM clientes WHERE id = ?').get(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Cliente não encontrado' });
  db.prepare(
    `UPDATE clientes SET nome=?, cpf=?, telefone=?, email=?, endereco=?, data_nascimento=?, aceita_marketing=?, observacoes=? WHERE id=?`
  ).run(nome, cpf, telefone, email, endereco, data_nascimento, aceita_marketing ? 1 : 0, observacoes, req.params.id);
  res.json(db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM clientes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
