const express = require('express');
const db = require('../db');

const router = express.Router();

// Middleware to check if user is librarian
const requireLibrarian = (req, res, next) => {
    if (req.session.userRole !== 'librarian') {
        return res.status(403).json({ error: 'Access denied. Librarian role required.' });
    }
    next();
};

// Get all users
router.get('/users', requireLibrarian, async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT id, name, email, role, created_at,
                   (SELECT COUNT(*) FROM borrowings WHERE user_id = users.id AND status = 'active') as active_borrowings,
                   (SELECT SUM(amount) FROM fines WHERE user_id = users.id AND status = 'unpaid') as unpaid_fines
            FROM users
            ORDER BY name
        `);

        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
});

// Update user (librarian only)
router.put('/users/:id', requireLibrarian, async (req, res) => {
    const { id } = req.params;
    const { name, email, role } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }

    try {
        // Check if user exists
        const [existingUser] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
        if (existingUser.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if email is already taken by another user
        const [emailCheck] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
        if (emailCheck.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        await db.query(
            'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
            [name, email, role || 'member', id]
        );

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Deactivate user (librarian only)
router.delete('/users/:id', requireLibrarian, async (req, res) => {
    const { id } = req.params;

    try {
        // Check if user has active borrowings
        const [activeBorrowings] = await db.query('SELECT id FROM borrowings WHERE user_id = ? AND status = "active"', [id]);
        if (activeBorrowings.length > 0) {
            return res.status(400).json({ error: 'Cannot deactivate user with active borrowings' });
        }

        // Instead of deleting, we could add a status column, but for now we'll prevent deletion
        // For this implementation, we'll just return an error
        res.status(400).json({ error: 'User deactivation not implemented. Contact administrator.' });
    } catch (error) {
        console.error('Deactivate user error:', error);
        res.status(500).json({ error: 'Failed to deactivate user' });
    }
});

// Get most borrowed books report
router.get('/reports/most-borrowed', requireLibrarian, async (req, res) => {
    const { startDate, endDate, limit = 10 } = req.query;

    try {
        let query = `
            SELECT b.title, b.author, b.isbn, COUNT(br.id) as borrow_count
            FROM books b
            JOIN borrowings br ON b.id = br.book_id
            WHERE br.status IN ('returned', 'overdue')
        `;
        const params = [];

        if (startDate) {
            query += ' AND br.borrow_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND br.borrow_date <= ?';
            params.push(endDate);
        }

        query += ' GROUP BY b.id ORDER BY borrow_count DESC LIMIT ?';
        params.push(parseInt(limit));

        const [report] = await db.query(query, params);
        res.json({ report });
    } catch (error) {
        console.error('Most borrowed report error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Get member activity report
router.get('/reports/member-activity', requireLibrarian, async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        let query = `
            SELECT u.name, u.email,
                   COUNT(DISTINCT br.id) as books_borrowed,
                   COUNT(DISTINCT CASE WHEN br.return_date IS NOT NULL THEN br.id END) as books_returned,
                   SUM(CASE WHEN f.status = 'unpaid' THEN f.amount ELSE 0 END) as outstanding_fines,
                   MAX(br.borrow_date) as last_activity
            FROM users u
            LEFT JOIN borrowings br ON u.id = br.user_id
            LEFT JOIN fines f ON u.id = f.user_id
        `;
        const params = [];

        if (startDate) {
            query += ' WHERE br.borrow_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND br.borrow_date <= ?';
            params.push(endDate);
        }

        query += ' GROUP BY u.id ORDER BY books_borrowed DESC';

        const [report] = await db.query(query, params);
        res.json({ report });
    } catch (error) {
        console.error('Member activity report error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

module.exports = router;
