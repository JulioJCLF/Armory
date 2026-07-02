const { scryptSync, randomBytes, timingSafeEqual } = require('crypto');

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const derived = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, derived);
}

module.exports = { hashPassword, verifyPassword };
