const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: COOKIE_MAX_AGE_MS,
  path: '/',
});

const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
};

const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
};

const parseCookies = (cookieHeader = '') => {
  return cookieHeader.split(';').reduce((cookies, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return cookies;
    cookies[key] = decodeURIComponent(rest.join('='));
    return cookies;
  }, {});
};

const getTokenFromRequest = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME] || null;
};

module.exports = {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  getTokenFromRequest,
};
