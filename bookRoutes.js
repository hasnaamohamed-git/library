const router = require("express").Router();
const auth = require("../middleware/auth");
const { addBook, updateBook, deleteBook, getBooks } = require("../controllers/bookController");

// Only librarians can add/edit/delete
router.post("/", auth(["Librarian"]), addBook);
router.put("/:id", auth(["Librarian"]), updateBook);
router.delete("/:id", auth(["Librarian"]), deleteBook);

// Anyone can view books
router.get("/", getBooks);

module.exports = router;
