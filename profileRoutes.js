// routes/profileRoutes.js
const router = require("express").Router();
const auth = require("../middleware/auth");
const { updateProfile } = require("../controllers/profileController");

router.put("/profile", auth(["Member", "Librarian"]), updateProfile);

module.exports = router;