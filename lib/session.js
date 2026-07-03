const { createHmac, timingSafeEqual } = require('crypto');

const COOKIE  = 'caliber.sess';
const MAX_AGE = 7 * 24 * 60 * 60; // seconds

function sign(data, secret) {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

function createToken(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${sign(data, secret)}`;
}

function verifyToken(token, secret) {
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const data    = token.slice(0, i);
  const sigBuf  = Buffer.from(token.slice(i + 1), 'base64url');
  const expBuf  = Buffer.from(sign(data, secret), 'base64url');
  if (sigBuf.length !== expBuf.length) return null;
  try {
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    return JSON.parse(Buffer.from(data, 'base64url').toString());
  } catch { return null; }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

function sessionMiddleware(secret) {
  return (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const payload = cookies[COOKIE] ? verifyToken(cookies[COOKIE], secret) : null;

    req.session = {
      userId:   payload?.userId   ?? null,
      username: payload?.username ?? null,
    };

    res.setSession = (userId, username) => {
      const token  = createToken({ userId, username }, secret);
      const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
      res.setHeader('Set-Cookie',
        `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}${secure}`);
    };

    res.clearSession = () => {
      res.setHeader('Set-Cookie',
        `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
    };

    next();
  };
}

module.exports = { sessionMiddleware };
