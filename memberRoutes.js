const router = require("express").Router();
const auth = require("../middleware/auth");
const { getDashboard } = require("../controllers/memberController");

router.get("/:id/dashboard", auth(["Member", "Librarian"]), getDashboard);

module.exports = router;
