// ✅ Full server.js đã sửa
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

const app = express();
const JWT_SECRET = 'mysecret123';

// Multer cấu hình upload ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = Date.now() + ext;
    cb(null, filename);
  }
});
const upload = multer({ storage });

// Middleware xác thực token
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Bạn chưa đăng nhập' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token không hợp lệ' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới được thực hiện thao tác này' });
  }
  next();
}

// Cấu hình Express
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Kết nối MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/celebs');

// Mongoose models
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String,
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Celeb' }],
  ratings: [{
    celeb: { type: mongoose.Schema.Types.ObjectId, ref: 'Celeb' },
    value: Number
  }]
}));

const Celeb = mongoose.model('Celeb', {
  name: String,
  image: String,
  description: String,
  profession: [String],
  totalRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 }
});

// Tạo admin mặc định
(async () => {
  const exist = await User.findOne({ username: 'admin' });
  if (!exist) {
    const hashed = await bcrypt.hash('123456', 10);
    await new User({ username: 'admin', password: hashed, role: 'admin' }).save();
    console.log('✅ Đã tạo tài khoản admin / 123456');
  }
})();

// API
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: 'Sai tài khoản' });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: 'Sai mật khẩu' });
  const token = jwt.sign({ username, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});

app.post('/api/auth/register-public', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Thiếu thông tin' });
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  if (!passwordRegex.test(password)) return res.status(400).json({ error: 'Mật khẩu yếu' });
  const exist = await User.findOne({ username });
  if (exist) return res.status(400).json({ error: 'Tài khoản đã tồn tại' });
  const hashed = await bcrypt.hash(password, 10);
  await new User({ username, password: hashed, role: 'user' }).save();
  res.json({ message: 'Đăng ký thành công' });
});

app.get('/api/users/me', authMiddleware, async (req, res) => {
  const user = await User.findOne({ username: req.user.username });
  res.json({ ratings: user.ratings || [] });
});

app.get('/api/celebs', async (req, res) => {
  const celebs = await Celeb.find();
  res.json(celebs);
});

app.post('/api/celebs', authMiddleware, adminOnly, upload.single('image'), async (req, res) => {
  let { name, profession, description } = req.body;
  if (typeof profession === 'string') {
    try {
      profession = JSON.parse(profession);
    } catch {
      profession = profession.split(',').map(p => p.trim());
    }
  }
  if (!name || !profession || !req.file) return res.status(400).json({ error: 'Thiếu thông tin' });
  const imagePath = `/uploads/${req.file.filename}`;
  const celeb = new Celeb({ name, profession, description, image: imagePath });
  await celeb.save();
  res.status(201).json(celeb);
});

app.put('/api/celebs/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const updated = await Celeb.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Lỗi khi cập nhật' });
  }
});

app.delete('/api/celebs/:id', authMiddleware, adminOnly, async (req, res) => {
  await Celeb.findByIdAndDelete(req.params.id);
  res.json({ message: 'Đã xoá' });
});

app.post('/api/users/favorites/:celebId', authMiddleware, async (req, res) => {
  const user = await User.findOne({ username: req.user.username });
  const celebId = req.params.celebId;
  const index = user.favorites.indexOf(celebId);
  if (index > -1) user.favorites.splice(index, 1);
  else user.favorites.push(celebId);
  await user.save();
  res.json({ favorites: user.favorites });
});

app.get('/api/users/favorites', authMiddleware, async (req, res) => {
  const user = await User.findOne({ username: req.user.username }).populate('favorites');
  res.json(user.favorites);
});

// Đánh giá sao
app.post('/api/celebs/:id/rate', authMiddleware, async (req, res) => {
  const rating = parseInt(req.body.rating);
  const { id } = req.params;
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Số sao phải từ 1 đến 5.' });
  }
  try {
    const celeb = await Celeb.findById(id);
    if (!celeb) return res.status(404).json({ message: 'Không tìm thấy người nổi tiếng.' });
    const user = await User.findOne({ username: req.user.username });
    const existing = user.ratings.find(r => r.celeb.toString() === id);
    if (existing) {
      return res.status(400).json({ message: 'Bạn chỉ được đánh giá một lần.' });
    }
    celeb.totalRating += rating;
    celeb.ratingCount += 1;
    user.ratings.push({ celeb: id, value: rating });
    await celeb.save();
    await user.save();
    res.json({ message: 'Đánh giá đã được ghi nhận.' });
  } catch (err) {
    console.error('Lỗi khi đánh giá:', err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// Xếp hạng theo yêu thích
app.get('/api/celebs/rank', async (req, res) => {
  try {
    const celebs = await Celeb.find().lean();
    const users = await User.find().lean();
    const countMap = {};
    users.forEach(u => {
      u.favorites?.forEach(id => {
        countMap[id] = (countMap[id] || 0) + 1;
      });
    });
    const ranked = celebs.map(c => ({
      ...c,
      favoritesCount: countMap[c._id.toString()] || 0
    })).sort((a, b) => b.favoritesCount - a.favoritesCount);
    res.json(ranked);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// Reset đánh giá
app.post('/api/celebs/reset-ratings', authMiddleware, adminOnly, async (req, res) => {
  try {
    await Celeb.updateMany({}, { totalRating: 0, ratingCount: 0 });
    await User.updateMany({}, { ratings: [] });
    res.json({ message: 'Đã reset toàn bộ đánh giá' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi reset đánh giá' });
  }
});

// Thêm nút reset từ frontend (chỉ demo gọn trong đây)
app.get('/admin/reset-ratings', (req, res) => {
  res.send(`
    <html><body style="font-family:sans-serif; padding:40px">
    <h2>Reset toàn bộ đánh giá</h2>
    <button onclick="go()" style="padding:10px 20px; background:#dc2626; color:#fff; border:none; border-radius:8px">Reset</button>
    <script>
      async function go() {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/celebs/reset-ratings', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        alert(data.message);
      }
    </script>
    </body></html>
  `);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Khởi động
app.listen(3000, () => {
  console.log('✅ Server đang chạy tại http://localhost:3000');
});
