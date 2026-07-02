const express = require('express');
const db = require('../db');
const router = express.Router();

async function carregarOrdem(id) {
  const ordem = await db.one('SELECT * FROM ordens WHERE id = ?', [id]);
  if (!ordem) return null;
  ordem.cliente = await db.one('SELECT * FROM clientes WHERE id = ?', [ordem.cliente_id]);
  ordem.equipamento = ordem.equipamento_id
    ? await db.one('SELECT * FROM equipamentos WHERE id = ?', [ordem.equipamento_id])
    : null;
  ordem.pecas = await db.query('SELECT * FROM ordem_pecas WHERE ordem_id = ?', [id]);
  const totalPecas = ordem.pecas.reduce((s, p) => s + p.quantidade * p.preco_unitario, 0);
  ordem.total_pecas = totalPecas;
  ordem.total = totalPecas + (ordem.valor_mao_obra || 0);
  return ordem;
}

router.get('/', async (req, res) => {
  const rows = await db.query(
    `SELECT o.*, c.nome AS cliente_nome, e.marca AS equip_marca, e.modelo AS equip_modelo
     FROM ordens o
     JOIN clientes c ON c.id = o.cliente_id
     LEFT JOIN equipamentos e ON e.id = o.equipamento_id
     ORDER BY o.criado_em DESC`
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const ordem = await carregarOrdem(req.params.id);
  if (!ordem) return res.status(404).json({ erro: 'Ordem não encontrada' });
  res.json(ordem);
});

router.post('/', async (req, res) => {
  const {
    cliente_id, equipamento_id, descricao_problema, servico_realizado,
    status, valor_mao_obra, data_previsao, observacoes, pecas
  } = req.body;
  if (!cliente_id) return res.status(400).json({ erro: 'Cliente é obrigatório' });

  const ordemId = await db.transaction(async (q) => {
    const { rows: [{ id }] } = await q(
      `INSERT INTO ordens (cliente_id, equipamento_id, descricao_problema, servico_realizado, status, valor_mao_obra, data_previsao, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [cliente_id, equipamento_id || null, descricao_problema, servico_realizado,
       status || 'aberta', valor_mao_obra || 0, data_previsao, observacoes]
    );
    await q(
      'UPDATE ordens SET numero = ? WHERE id = ?',
      [`OS-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`, id]
    );
    for (const p of (pecas || [])) {
      await q(
        `INSERT INTO ordem_pecas (ordem_id, peca_id, descricao, quantidade, preco_unitario)
         VALUES (?, ?, ?, ?, ?)`,
        [id, p.peca_id || null, p.descricao, p.quantidade || 1, p.preco_unitario || 0]
      );
      if (p.peca_id) {
        await q(
          'UPDATE pecas SET quantidade = GREATEST(0, quantidade - ?) WHERE id = ?',
          [p.quantidade || 1, p.peca_id]
        );
      }
    }
    return id;
  });

  res.status(201).json(await carregarOrdem(ordemId));
});

router.put('/:id', async (req, res) => {
  const { equipamento_id, descricao_problema, servico_realizado, status,
          valor_mao_obra, data_previsao, observacoes } = req.body;
  const existe = await db.one('SELECT id FROM ordens WHERE id = ?', [req.params.id]);
  if (!existe) return res.status(404).json({ erro: 'Ordem não encontrada' });

  const atual = await db.one('SELECT data_conclusao, status FROM ordens WHERE id = ?', [req.params.id]);
  const conclusao = status === 'concluida' || status === 'entregue'
    ? (atual.data_conclusao || new Date().toISOString().slice(0, 10))
    : null;

  await db.run(
    `UPDATE ordens SET equipamento_id=?, descricao_problema=?, servico_realizado=?, status=?,
     valor_mao_obra=?, data_previsao=?, data_conclusao=?, observacoes=? WHERE id=?`,
    [equipamento_id || null, descricao_problema, servico_realizado, status,
     valor_mao_obra || 0, data_previsao, conclusao, observacoes, req.params.id]
  );
  res.json(await carregarOrdem(req.params.id));
});

router.delete('/:id', async (req, res) => {
  await db.run('DELETE FROM ordens WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
module.exports.carregarOrdem = carregarOrdem;
