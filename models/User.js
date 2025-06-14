const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Celeb' }]
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
