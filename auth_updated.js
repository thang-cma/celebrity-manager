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

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  // Kiểm tra mật khẩu phải có ít nhất 1 chữ và 1 số
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json("Mật khẩu phải chứa ít nhất 6 ký tự, bao gồm chữ và số.");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json("Đăng ký thành công!");
  } catch (err) {
    res.status(500).json(err.message);
  }
});
