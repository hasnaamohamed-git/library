const router = require("express").Router();
const auth = require("../middleware/auth");
const { getUserFines, payFine } = require("../controllers/fineController");

router.get("/:user_id", auth(["Member", "Librarian"]), getUserFines);
router.post("/pay", auth(["Member", "Librarian"]), payFine);

module.exports = router;
