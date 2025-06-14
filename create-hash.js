// Tạo file create-hash.js
const bcrypt = require('bcrypt');
const password = '123456'; // hoặc bất kỳ mật khẩu mới nào bạn muốn
bcrypt.hash(password, 10).then(hash => {
  console.log('Hash:', hash);
});
