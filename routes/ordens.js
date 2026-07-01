const express = require('express');
const db = require('../db');
const router = express.Router();

function carregarOrdem(id) {
  const ordem = db.prepare('SELECT * FROM ordens WHERE id = ?').get(id);
  if (!ordem) return null;
  ordem.cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(ordem.cliente_id);
  ordem.equipamento = ordem.equipamento_id
    ? db.prepare('SELECT * FROM equipamentos WHERE id = ?').get(ordem.equipamento_id)
    : null;
  ordem.pecas = db.prepare('SELECT * FROM ordem_pecas WHERE ordem_id = ?').all(id);
  const totalPecas = ordem.pecas.reduce((s, p) => s + p.quantidade * p.preco_unitario, 0);
  ordem.total_pecas = totalPecas;
  ordem.total = totalPecas + (ordem.valor_mao_obra || 0);
  return ordem;
}

router.get('/', (req, res) => {
  const rows = db.prepare(
    `SELECT o.*, c.nome AS cliente_nome, e.marca AS equip_marca, e.modelo AS equip_modelo
     FROM ordens o
     JOIN clientes c ON c.id = o.cliente_id
     LEFT JOIN equipamentos e ON e.id = o.equipamento_id
     ORDER BY o.criado_em DESC`
  ).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const ordem = carregarOrdem(req.params.id);
  if (!ordem) return res.status(404).json({ erro: 'Ordem não encontrada' });
  res.json(ordem);
});

router.post('/', (req, res) => {
  const {
    cliente_id, equipamento_id, descricao_problema, servico_realizado,
    status, valor_mao_obra, data_previsao, observacoes, pecas
  } = req.body;
  if (!cliente_id) return res.status(400).json({ erro: 'Cliente é obrigatório' });

  const tx = db.transaction(() => {
    const info = db.prepare(
      `INSERT INTO ordens (cliente_id, equipamento_id, descricao_problema, servico_realizado, status, valor_mao_obra, data_previsao, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(cliente_id, equipamento_id || null, descricao_problema, servico_realizado,
          status || 'aberta', valor_mao_obra || 0, data_previsao, observacoes);
    const ordemId = info.lastInsertRowid;
    db.prepare('UPDATE ordens SET numero = ? WHERE id = ?')
      .run(`OS-${new Date().getFullYear()}-${String(ordemId).padStart(4, '0')}`, ordemId);

    for (const p of (pecas || [])) {
      db.prepare(
        `INSERT INTO ordem_pecas (ordem_id, peca_id, descricao, quantidade, preco_unitario)
         VALUES (?, ?, ?, ?, ?)`
      ).run(ordemId, p.peca_id || null, p.descricao, p.quantidade || 1, p.preco_unitario || 0);
      if (p.peca_id) {
        db.prepare('UPDATE pecas SET quantidade = MAX(0, quantidade - ?) WHERE id = ?')
          .run(p.quantidade || 1, p.peca_id);
      }
    }
    return ordemId;
  });

  const ordemId = tx();
  res.status(201).json(carregarOrdem(ordemId));
});

router.put('/:id', (req, res) => {
  const { equipamento_id, descricao_problema, servico_realizado, status,
          valor_mao_obra, data_previsao, observacoes } = req.body;
  const existe = db.prepare('SELECT id FROM ordens WHERE id = ?').get(req.params.id);
  if (!existe) return res.status(404).json({ erro: 'Ordem não encontrada' });
  const conclusao = status === 'concluida' || status === 'entregue'
    ? (db.prepare('SELECT data_conclusao FROM ordens WHERE id=?').get(req.params.id).data_conclusao
       || new Date().toISOString().slice(0, 10))
    : null;
  db.prepare(
    `UPDATE ordens SET equipamento_id=?, descricao_problema=?, servico_realizado=?, status=?, valor_mao_obra=?, data_previsao=?, data_conclusao=?, observacoes=? WHERE id=?`
  ).run(equipamento_id || null, descricao_problema, servico_realizado, status,
        valor_mao_obra || 0, data_previsao, conclusao, observacoes, req.params.id);
  res.json(carregarOrdem(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM ordens WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
module.exports.carregarOrdem = carregarOrdem;
