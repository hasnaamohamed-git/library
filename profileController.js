// controllers/profileController.js
const db = require("../config/db");
const bcrypt = require("bcrypt");

exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { username, email, password } = req.body;

  let updates = [];
  let values = [];

  if (username) {
    updates.push("username = ?");
    values.push(username);
  }
  if (email) {
    updates.push("email = ?");
    values.push(email);
  }
  if (password) {
    const hashed = bcrypt.hashSync(password, 10);
    updates.push("password_hash = ?");
    values.push(hashed);
  }

  if (updates.length === 0) {
    return res.status(400).json({ msg: "لا توجد بيانات لتحديثها" });
  }

  values.push(userId);
  const sql = `UPDATE users SET ${updates.join(", ")} WHERE user_id = ?`;

  db.query(sql, values, (err) => {
    if (err) return res.status(500).json({ msg: "خطأ في التحديث", error: err });
    res.json({ msg: "تم تحديث البيانات بنجاح" });
  });
};