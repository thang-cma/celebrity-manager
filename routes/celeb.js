const express = require('express');
const router = express.Router();
const { requireLogin, requireAdmin } = require('../middleware/auth');
const Celebrity = require('../models/Celebrity'); // giả sử bạn có model này

// ✅ Lấy danh sách người nổi tiếng
router.get('/list', requireLogin, async (req, res) => {
  const list = await Celebrity.find();
  res.json(list);
});

// ✅ Thêm người nổi tiếng (admin)
router.post('/add', requireAdmin, async (req, res) => {
  const celeb = new Celebrity(req.body);
  await celeb.save();
  res.send('Thêm thành công');
});

// ✅ Xoá người nổi tiếng (admin)
router.delete('/delete/:id', requireAdmin, async (req, res) => {
  await Celebrity.findByIdAndDelete(req.params.id);
  res.send('Xóa thành công');
});

// ✅ Sửa thông tin người nổi tiếng (admin)
router.put('/edit/:id', requireAdmin, async (req, res) => {
  await Celebrity.findByIdAndUpdate(req.params.id, req.body);
  res.send('Sửa thành công');
});

// ✅ Chấm sao (người dùng)
router.post('/rate/:id', requireLogin, async (req, res) => {
  const { rating } = req.body;
  const { id } = req.params;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Số sao phải từ 1 đến 5.' });
  }

  try {
    const celeb = await Celebrity.findById(id);
    if (!celeb) {
      return res.status(404).json({ message: 'Không tìm thấy người nổi tiếng.' });
    }

    celeb.totalRating = (celeb.totalRating || 0) + rating;
    celeb.ratingCount = (celeb.ratingCount || 0) + 1;

    await celeb.save();

    res.json({ message: 'Đánh giá đã được ghi nhận.' });
  } catch (err) {
    console.error('Lỗi khi đánh giá:', err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// ✅ Xếp hạng theo lượt yêu thích (từ nhiều đến ít)
router.get('/rank', async (req, res) => {
  try {
    const celebs = await Celebrity.find().lean();

    const ranked = celebs.map(c => ({
      _id: c._id,
      name: c.name,
      profession: c.profession,
      image: c.image,
      favoritesCount: (c.favoritedBy || []).length
    })).sort((a, b) => b.favoritesCount - a.favoritesCount);

    res.json(ranked);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi xếp hạng' });
  }
});

module.exports = router;
