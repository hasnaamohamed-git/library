const db = require("../config/db");

exports.borrowBook = (req, res) => {
  const { user_id, book_id } = req.body;

  const sql = `CALL sp_borrow_book(?, ?)`;

  db.query(sql, [user_id, book_id], (err, result) => {
    if (err) return res.status(500).json(err);

    const msg = result[0][0].message;
    res.json({ message: msg });
  });
};

exports.returnBook = (req, res) => {
  const { user_id, book_id } = req.body;

  const sql = `CALL sp_return_book(?, ?)`;

  db.query(sql, [user_id, book_id], (err, result) => {
    if (err) return res.status(500).json(err);

    const msg = result[0][0].message;
    res.json({ message: msg });
  });
};
