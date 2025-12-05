const db = require("../config/db");

exports.getUserFines = (req, res) => {
  const user_id = req.params.user_id;

  db.query("SELECT * FROM fines WHERE user_id=?", [user_id], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
};

exports.payFine = (req, res) => {
  const { fine_id } = req.body;

  const sql = `
    UPDATE fines 
    SET status='Paid' 
    WHERE fine_id=?
  `;

  db.query(sql, [fine_id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Fine paid successfully" });
  });
};
