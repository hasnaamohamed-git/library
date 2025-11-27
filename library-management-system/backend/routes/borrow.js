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

// Middleware to check if user is librarian
const requireLibrarian = (req, res, next) => {
    if (req.session.userRole !== 'librarian') {
        return res.status(403).json({ error: 'Access denied. Librarian role required.' });
    }
    next();
};

// Borrow book
router.post('/', requireAuth, async (req, res) => {
    const { bookId } = req.body;
    const userId = req.session.userId;

    try {
        // Check borrowing eligibility
        const eligibility = await checkBorrowingEligibility(userId);
        if (!eligibility.eligible) {
            return res.status(400).json({ error: eligibility.reason });
        }

        // Check if book is available
        const [book] = await db.query('SELECT * FROM books WHERE id = ?', [bookId]);
        if (book.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        if (book[0].available_copies <= 0) {
            return res.status(400).json({ error: 'Book is not available for borrowing' });
        }

        // Check if user already has this book borrowed
        const [existingBorrow] = await db.query(
            'SELECT id FROM borrowings WHERE user_id = ? AND book_id = ? AND status = "active"',
            [userId, bookId]
        );

        if (existingBorrow.length > 0) {
            return res.status(400).json({ error: 'You already have this book borrowed' });
        }

        // Calculate due date (14 days from now)
        const borrowDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        // Create borrowing record
        const [result] = await db.query(
            'INSERT INTO borrowings (user_id, book_id, borrow_date, due_date) VALUES (?, ?, ?, ?)',
            [userId, bookId, borrowDate.toISOString().split('T')[0], dueDate.toISOString().split('T')[0]]
        );

        // Update book availability
        await db.query(
            'UPDATE books SET available_copies = available_copies - 1 WHERE id = ?',
            [bookId]
        );

        res.json({
            message: 'Book borrowed successfully',
            borrowingId: result.insertId,
            dueDate: dueDate.toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('Borrow error:', error);
        res.status(500).json({ error: 'Failed to borrow book' });
    }
});

// Return book (librarian only)
router.put('/return', requireLibrarian, async (req, res) => {
    const { bookId } = req.body;

    try {
        // Find active borrowing for this book
        const [borrowing] = await db.query(
            'SELECT * FROM borrowings WHERE book_id = ? AND status = "active"',
            [bookId]
        );

        if (borrowing.length === 0) {
            return res.status(404).json({ error: 'No active borrowing found for this book' });
        }

        const borrowRecord = borrowing[0];
        const returnDate = new Date();
        const dueDate = new Date(borrowRecord.due_date);

        // Calculate fines if overdue
        let fineAmount = 0;
        if (returnDate > dueDate) {
            const daysOverdue = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
            fineAmount = daysOverdue * 0.50; // $0.50 per day
        }

        // Update borrowing record
        await db.query(
            'UPDATE borrowings SET return_date = ?, status = "returned" WHERE id = ?',
            [returnDate.toISOString().split('T')[0], borrowRecord.id]
        );

        // Update book availability
        await db.query(
            'UPDATE books SET available_copies = available_copies + 1 WHERE id = ?',
            [bookId]
        );

        // Create fine record if applicable
        if (fineAmount > 0) {
            await db.query(
                'INSERT INTO fines (user_id, borrowing_id, amount, reason) VALUES (?, ?, ?, ?)',
                [borrowRecord.user_id, borrowRecord.id, fineAmount, 'Overdue book return']
            );
        }

        // Check for reservations and notify next in queue
        await processReservationQueue(bookId);

        res.json({
            message: 'Book returned successfully',
            fineAmount: fineAmount,
            daysOverdue: fineAmount > 0 ? Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24)) : 0
        });
    } catch (error) {
        console.error('Return error:', error);
        res.status(500).json({ error: 'Failed to return book' });
    }
});

// Get user's borrowed books
router.get('/my-books', requireAuth, async (req, res) => {
    const userId = req.session.userId;

    try {
        const [borrowings] = await db.query(`
            SELECT b.id, bk.title, bk.author, bk.isbn, b.borrow_date, b.due_date, b.status
            FROM borrowings b
            JOIN books bk ON b.book_id = bk.id
            WHERE b.user_id = ? AND b.status = 'active'
            ORDER BY b.due_date
        `, [userId]);

        res.json({ borrowings });
    } catch (error) {
        console.error('Get borrowed books error:', error);
        res.status(500).json({ error: 'Failed to retrieve borrowed books' });
    }
});

// Helper function to check borrowing eligibility
async function checkBorrowingEligibility(userId) {
    try {
        // Check for overdue books
        const [overdueBooks] = await db.query(`
            SELECT COUNT(*) as count FROM borrowings
            WHERE user_id = ? AND status = 'active' AND due_date < CURDATE()
        `, [userId]);

        if (overdueBooks[0].count > 0) {
            return { eligible: false, reason: 'You have overdue books. Please return them before borrowing new books.' };
        }

        // Check outstanding fines
        const [fines] = await db.query(
            'SELECT SUM(amount) as total FROM fines WHERE user_id = ? AND status = "unpaid"',
            [userId]
        );

        const totalFines = fines[0].total || 0;
        if (totalFines >= 10.00) {
            return { eligible: false, reason: `Your outstanding fines ($${totalFines.toFixed(2)}) exceed the limit. Please pay your fines before borrowing.` };
        }

        return { eligible: true };
    } catch (error) {
        console.error('Eligibility check error:', error);
        return { eligible: false, reason: 'Unable to verify borrowing eligibility' };
    }
}

// Helper function to process reservation queue
async function processReservationQueue(bookId) {
    try {
        // Get the next reservation in queue
        const [nextReservation] = await db.query(
            'SELECT * FROM reservations WHERE book_id = ? AND status = "active" ORDER BY queue_position LIMIT 1',
            [bookId]
        );

        if (nextReservation.length > 0) {
            const reservation = nextReservation[0];

            // Update reservation status to fulfilled
            await db.query(
                'UPDATE reservations SET status = "fulfilled" WHERE id = ?',
                [reservation.id]
            );

            // Update queue positions for remaining reservations
            await db.query(
                'UPDATE reservations SET queue_position = queue_position - 1 WHERE book_id = ? AND status = "active" AND queue_position > ?',
                [bookId, reservation.queue_position]
            );

            // Here you would typically send a notification to the user
            // For now, we'll just log it
            console.log(`Notification: Book ${bookId} is now available for user ${reservation.user_id}`);
        }
    } catch (error) {
        console.error('Process reservation queue error:', error);
    }
}

module.exports = router;
