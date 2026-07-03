const express = require('express');
const db = require('../db');
const { hashPassword, verifyPassword } = require('../lib/crypto');
const router = express.Router();

router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ erro: 'Não autenticado' });
  const user = await db.one('SELECT id, username, role FROM users WHERE id = ?', [req.session.userId]);
  if (!user) { req.session.destroy(); return res.status(401).json({ erro: 'Sessão inválida' }); }
  res.json(user);
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ erro: 'Preencha usuário e senha' });

  const user = await db.one('SELECT * FROM users WHERE username = ?', [username.trim().toLowerCase()]);
  if (!user || !verifyPassword(password, user.password_hash))
    return res.status(401).json({ erro: 'Usuário ou senha incorretos' });

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ erro: 'Erro de sessão' });
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.save((err2) => {
      if (err2) return res.status(500).json({ erro: 'Erro de sessão' });
      res.json({ ok: true, username: user.username, role: user.role });
    });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.clearCookie('connect.sid').json({ ok: true }));
});

router.post('/change-password', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ erro: 'Não autenticado' });
  const { current, novo } = req.body;
  if (!current || !novo || novo.length < 6)
    return res.status(400).json({ erro: 'Senha nova precisa ter ao menos 6 caracteres' });

  const user = await db.one('SELECT * FROM users WHERE id = ?', [req.session.userId]);
  if (!verifyPassword(current, user.password_hash))
    return res.status(401).json({ erro: 'Senha atual incorreta' });

  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(novo), user.id]);
  res.json({ ok: true });
});

// ── Admin-only user management ────────────────────────────────

async function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ erro: 'Não autenticado' });
  const caller = await db.one('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!caller || caller.role !== 'admin') return res.status(403).json({ erro: 'Acesso negado' });
  next();
}

// Public self-registration — anyone can create a tecnico account
router.post('/signup', async (req, res) => {
  const { username, password, confirm } = req.body;
  if (!username || !password)
    return res.status(400).json({ erro: 'Informe usuário e senha' });
  if (password.length < 6)
    return res.status(400).json({ erro: 'Senha precisa ter ao menos 6 caracteres' });
  if (confirm !== undefined && password !== confirm)
    return res.status(400).json({ erro: 'As senhas não conferem' });

  try {
    const row = await db.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) RETURNING id',
      [username.trim().toLowerCase(), hashPassword(password), 'tecnico']
    );
    res.json({ ok: true, id: row.id });
  } catch (e) {
    if (e.message.includes('unique') || e.message.includes('duplicate'))
      return res.status(409).json({ erro: 'Usuário já existe' });
    res.status(500).json({ erro: 'Erro ao criar usuário' });
  }
});

router.post('/register', requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || password.length < 6)
    return res.status(400).json({ erro: 'Informe usuário e senha (mín. 6 caracteres)' });

  const validRoles = ['admin', 'tecnico'];
  const userRole = validRoles.includes(role) ? role : 'tecnico';

  try {
    const row = await db.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) RETURNING id',
      [username.trim().toLowerCase(), hashPassword(password), userRole]
    );
    res.json({ ok: true, id: row.id });
  } catch (e) {
    if (e.message.includes('unique') || e.message.includes('duplicate'))
      return res.status(409).json({ erro: 'Usuário já existe' });
    res.status(500).json({ erro: 'Erro ao criar usuário' });
  }
});

router.get('/users', requireAdmin, async (req, res) => {
  const users = await db.query('SELECT id, username, role, criado_em FROM users ORDER BY id');
  res.json(users);
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.session.userId)
    return res.status(400).json({ erro: 'Não é possível excluir a própria conta' });
  await db.run('DELETE FROM users WHERE id = ?', [id]);
  res.json({ ok: true });
});

router.patch('/users/:id/role', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.session.userId)
    return res.status(400).json({ erro: 'Não é possível alterar a própria função' });
  const { role } = req.body;
  if (!['admin', 'tecnico'].includes(role))
    return res.status(400).json({ erro: 'Função inválida' });
  await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  res.json({ ok: true });
});

module.exports = router;
