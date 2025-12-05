const db = require("../config/db");

exports.addBook = (req, res) => {
  const { isbn, title, author, category, publication_year, publisher, total_copies } = req.body;

  const sql = `
    INSERT INTO books (isbn, title, author, category, publication_year, publisher, total_copies)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [isbn, title, author, category, publication_year, publisher, total_copies], (err) => {
    if (err) return res.status(400).json(err);
    res.json({ msg: "Book added" });
  });
};

exports.updateBook = (req, res) => {
  const { id } = req.params;

  const fields = req.body;
  const sql = "UPDATE books SET ? WHERE book_id=?";

  db.query(sql, [fields, id], (err) => {
    if (err) return res.status(400).json(err);
    res.json({ msg: "Book updated" });
  });
};

exports.deleteBook = (req, res) => {
  db.query("DELETE FROM books WHERE book_id=?", [req.params.id], (err) => {
    if (err) return res.status(400).json(err);
    res.json({ msg: "Book deleted" });
  });
};

exports.getBooks = (req, res) => {
  db.query("SELECT * FROM books", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
};
