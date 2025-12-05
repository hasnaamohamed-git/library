const db = require("../config/db");

exports.createReservation = (req, res) => {
  const { user_id, book_id } = req.body;

  const sql = `
    INSERT INTO reservations (user_id, book_id, reservation_date, status)
    VALUES (?, ?, NOW(), 'Pending')
  `;

  db.query(sql, [user_id, book_id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Reservation created" });
  });
};

exports.getUserReservations = (req, res) => {
  const user_id = req.params.user_id;

  db.query(
    "SELECT * FROM reservations WHERE user_id=?",
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
};

exports.cancelReservation = (req, res) => {
  const reservation_id = req.params.id;

  db.query(
    "DELETE FROM reservations WHERE reservation_id=?",
    [reservation_id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Reservation cancelled" });
    }
  );
};
