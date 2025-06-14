function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).send('Bạn chưa đăng nhập');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('Không đủ quyền');
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
