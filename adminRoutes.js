const router = require("express").Router();
const auth = require("../middleware/auth");
const { getUsers, getBorrowings } = require("../controllers/adminController");

router.get("/users", auth(["Librarian"]), getUsers);
router.get("/borrowings", auth(["Librarian"]), getBorrowings);

module.exports = router;
