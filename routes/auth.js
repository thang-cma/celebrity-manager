const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user || user.password !== password) {
    return res.status(401).send('Sai tài khoản hoặc mật khẩu');
  }

  req.session.user = {
    id: user._id,
    username: user.username,
    role: user.role
  };

  res.send('Đăng nhập thành công');
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.send('Đăng xuất thành công');
});

// Route trả về user hiện tại
router.get('/user', (req, res) => {
  res.json(req.session.user || null);
});

module.exports = router;
