const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


exports.register = (req, res) => {
  const { email, password, username } = req.body;

  
  if (!email || !password || !username) {
    return res.status(400).json({ msg: "All fields are required" });
  }

  const hashed = bcrypt.hashSync(password, 10);

  const sql = `
    INSERT INTO users (email, password_hash, username, role)
    VALUES (?, ?, ?, 'Member')
  `;

  db.query(sql, [email, hashed, username], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ msg: "Email already exists" });
      }
      return res.status(500).json({ msg: "Database error", error: err });
    }
    res.json({ msg: "Registered successfully" });
  });
};


exports.login = (req, res) => {
  const { email, password } = req.body;

  
  if (!email || !password) {
    return res.status(400).json({ msg: "Email and password are required" });
  }

  db.query("SELECT * FROM users WHERE email=?", [email], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows.length) return res.status(404).json({ msg: "User not found" });

    const user = rows[0];

    bcrypt.compare(password, user.password_hash, (err, match) => {
      if (err) return res.status(500).json(err);
      if (!match) return res.status(401).json({ msg: "Wrong password" });

      const accessToken = jwt.sign(
        {
          id: user.user_id,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "30m" }
      );

      const refreshToken = jwt.sign(
        { id: user.user_id },
        process.env.REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ 
        accessToken, 
        refreshToken, 
        role: user.role,
        userId: user.user_id,
        username: user.username
      });
    });
  });
};


exports.refresh = (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ msg: "Refresh token is required" });
  }

  jwt.verify(token, process.env.REFRESH_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ msg: "Invalid refresh token" });

    const newAccess = jwt.sign(
      { id: decoded.id },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    res.json({ accessToken: newAccess });
  });
};