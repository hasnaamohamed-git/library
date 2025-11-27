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

// Search books
router.get('/search', async (req, res) => {
    const { title, author, isbn, category } = req.query;

    try {
        let query = 'SELECT * FROM books WHERE 1=1';
        const params = [];

        if (title) {
            query += ' AND title LIKE ?';
            params.push(`%${title}%`);
        }
        if (author) {
            query += ' AND author LIKE ?';
            params.push(`%${author}%`);
        }
        if (isbn) {
            query += ' AND isbn LIKE ?';
            params.push(`%${isbn}%`);
        }
        if (category) {
            query += ' AND category LIKE ?';
            params.push(`%${category}%`);
        }

        const [books] = await db.query(query, params);
        res.json({ books });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get all books (for admin)
router.get('/', requireLibrarian, async (req, res) => {
    try {
        const [books] = await db.query('SELECT * FROM books ORDER BY title');
        res.json({ books });
    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ error: 'Failed to retrieve books' });
    }
});

// Add new book (librarian only)
router.post('/', requireLibrarian, async (req, res) => {
    const { title, author, isbn, category, totalCopies } = req.body;

    if (!title || !author || !isbn) {
        return res.status(400).json({ error: 'Title, author, and ISBN are required' });
    }

    try {
        // Check if ISBN already exists
        const [existingBook] = await db.query('SELECT id FROM books WHERE isbn = ?', [isbn]);
        if (existingBook.length > 0) {
            return res.status(400).json({ error: 'Book with this ISBN already exists' });
        }

        const copies = totalCopies || 1;
        const [result] = await db.query(
            'INSERT INTO books (title, author, isbn, category, total_copies, available_copies) VALUES (?, ?, ?, ?, ?, ?)',
            [title, author, isbn, category || '', copies, copies]
        );

        res.status(201).json({ message: 'Book added successfully', bookId: result.insertId });
    } catch (error) {
        console.error('Add book error:', error);
        res.status(500).json({ error: 'Failed to add book' });
    }
});

// Update book (librarian only)
router.put('/:id', requireLibrarian, async (req, res) => {
    const { id } = req.params;
    const { title, author, isbn, category, totalCopies } = req.body;

    if (!title || !author || !isbn) {
        return res.status(400).json({ error: 'Title, author, and ISBN are required' });
    }

    try {
        // Check if book exists
        const [existingBook] = await db.query('SELECT * FROM books WHERE id = ?', [id]);
        if (existingBook.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Check if new ISBN conflicts with another book
        const [isbnCheck] = await db.query('SELECT id FROM books WHERE isbn = ? AND id != ?', [isbn, id]);
        if (isbnCheck.length > 0) {
            return res.status(400).json({ error: 'ISBN already exists for another book' });
        }

        const copies = totalCopies || existingBook[0].total_copies;
        await db.query(
            'UPDATE books SET title = ?, author = ?, isbn = ?, category = ?, total_copies = ?, available_copies = ? WHERE id = ?',
            [title, author, isbn, category || '', copies, copies, id]
        );

        res.json({ message: 'Book updated successfully' });
    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({ error: 'Failed to update book' });
    }
});

// Delete book (librarian only)
router.delete('/:id', requireLibrarian, async (req, res) => {
    const { id } = req.params;

    try {
        // Check if book is currently borrowed
        const [borrowings] = await db.query('SELECT id FROM borrowings WHERE book_id = ? AND status = "active"', [id]);
        if (borrowings.length > 0) {
            return res.status(400).json({ error: 'Cannot delete book that is currently borrowed' });
        }

        const [result] = await db.query('DELETE FROM books WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

module.exports = router;
