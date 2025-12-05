const db = require("../config/db");

exports.getDashboard = (req, res) => {
  const userId = req.params.id;

  const result = {};

  db.query("SELECT * FROM borrowings WHERE user_id=?", [userId], (err, borrows) => {
    if (err) return res.status(500).json(err);

    result.borrowings = borrows;

    db.query("SELECT * FROM fines WHERE user_id=?", [userId], (err, fines) => {
      if (err) return res.status(500).json(err);

      result.fines = fines;

      db.query("SELECT * FROM reservations WHERE user_id=?", [userId], (err, reservations) => {
        if (err) return res.status(500).json(err);

        result.reservations = reservations;

        res.json(result);
      });
    });
  });
};
