const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Celeb = require('../models/Celebrity');
const authMiddleware = require('../middleware/auth'); // middleware xác thực token

// ✅ Lấy danh sách người nổi tiếng đã yêu thích
router.get('/favorites', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username }).populate('favorites');
    res.json(user.favorites || []);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ✅ Thêm hoặc xóa người nổi tiếng khỏi danh sách yêu thích
router.post('/favorites/:celebId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    const celebId = req.params.celebId;

    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

    const index = user.favorites.indexOf(celebId);
    if (index > -1) {
      user.favorites.splice(index, 1); // Gỡ khỏi yêu thích
    } else {
      user.favorites.push(celebId); // Thêm vào yêu thích
    }

    await user.save();
    res.status(200).json({ favorites: user.favorites });
  } catch (err) {
    console.error('Lỗi cập nhật yêu thích:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
