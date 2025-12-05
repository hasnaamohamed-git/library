const router = require("express").Router();
const auth = require("../middleware/auth");
const { borrowBook, returnBook } = require("../controllers/borrowController");

// just member 
router.post("/borrow", auth(["Member", "Librarian"]), borrowBook);
router.post("/return", auth(["Member", "Librarian"]), returnBook);

module.exports = router;
