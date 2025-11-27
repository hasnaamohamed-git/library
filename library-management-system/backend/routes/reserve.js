const express = require('express');
const db = require('../db');

const router = express.Router();

// Middleware to check if user is logged in
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Reserve book
router.post('/', requireAuth, async (req, res) => {
    const { bookId } = req.body;
    const userId = req.session.userId;

    try {
        // Check if book exists and is not available
        const [book] = await db.query('SELECT * FROM books WHERE id = ?', [bookId]);
        if (book.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        if (book[0].available_copies > 0) {
            return res.status(400).json({ error: 'Book is currently available. No need to reserve.' });
        }

        // Check if user already has an active reservation for this book
        const [existingReservation] = await db.query(
            'SELECT id FROM reservations WHERE user_id = ? AND book_id = ? AND status = "active"',
            [userId, bookId]
        );

        if (existingReservation.length > 0) {
            return res.status(400).json({ error: 'You already have an active reservation for this book' });
        }

        // Get current queue position
        const [queueCount] = await db.query(
            'SELECT COUNT(*) as count FROM reservations WHERE book_id = ? AND status = "active"',
            [bookId]
        );

        const queuePosition = queueCount[0].count + 1;

        // Create reservation
        const [result] = await db.query(
            'INSERT INTO reservations (user_id, book_id, queue_position) VALUES (?, ?, ?)',
            [userId, bookId, queuePosition]
        );

        res.json({
            message: 'Book reserved successfully',
            reservationId: result.insertId,
            queuePosition: queuePosition
        });
    } catch (error) {
        console.error('Reserve error:', error);
        res.status(500).json({ error: 'Failed to reserve book' });
    }
});

// Get user's reservations
router.get('/my-reservations', requireAuth, async (req, res) => {
    const userId = req.session.userId;

    try {
        const [reservations] = await db.query(`
            SELECT r.*, b.title, b.author, b.isbn
            FROM reservations r
            JOIN books b ON r.book_id = b.id
            WHERE r.user_id = ? AND r.status = 'active'
            ORDER BY r.reservation_date
        `, [userId]);

        res.json({ reservations });
    } catch (error) {
        console.error('Get reservations error:', error);
        res.status(500).json({ error: 'Failed to retrieve reservations' });
    }
});

// Cancel reservation
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    try {
        // Check if reservation belongs to user
        const [reservation] = await db.query(
            'SELECT * FROM reservations WHERE id = ? AND user_id = ? AND status = "active"',
            [id, userId]
        );

        if (reservation.length === 0) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        // Delete reservation
        await db.query('DELETE FROM reservations WHERE id = ?', [id]);

        // Update queue positions for remaining reservations
        await db.query(
            'UPDATE reservations SET queue_position = queue_position - 1 WHERE book_id = ? AND status = "active" AND queue_position > ?',
            [reservation[0].book_id, reservation[0].queue_position]
        );

        res.json({ message: 'Reservation cancelled successfully' });
    } catch (error) {
        console.error('Cancel reservation error:', error);
        res.status(500).json({ error: 'Failed to cancel reservation' });
    }
});

module.exports = router;
