const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  createReservation,
  getUserReservations,
  cancelReservation
} = require("../controllers/reservationController");

router.post("/", auth(["Member", "Librarian"]), createReservation);
router.get("/:user_id", auth(["Member", "Librarian"]), getUserReservations);
router.delete("/:id", auth(["Member", "Librarian"]), cancelReservation);

module.exports = router;
