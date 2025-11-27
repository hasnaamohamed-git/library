// Admin panel functionality
const API_BASE = 'http://localhost:3000/api';

// Check if user is librarian
function checkAdminAccess() {
    const role = localStorage.getItem('userRole');
    if (role !== 'librarian') {
        alert('Access denied. Librarian role required.');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Tab switching
function showTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Remove active class from all buttons
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');

    // Load tab content
    switch(tabName) {
        case 'books':
            loadBooks();
            break;
        case 'users':
            loadUsers();
            break;
        case 'borrowings':
            loadBorrowings();
            break;
        case 'reports':
            // Reports are loaded on demand
            break;
    }
}

// Books management
function showAddBookForm() {
    document.getElementById('add-book-form').style.display = 'block';
}

function hideAddBookForm() {
    document.getElementById('add-book-form').style.display = 'none';
    document.getElementById('book-form').reset();
}

async function loadBooks() {
    try {
        const response = await fetch(`${API_BASE}/books`, { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
            displayBooks(data.books);
        } else {
            alert(data.error || 'Failed to load books');
        }
    } catch (error) {
        console.error('Load books error:', error);
        alert('Network error. Please try again.');
    }
}

function displayBooks(books) {
    const container = document.getElementById('books-list');
    if (books.length === 0) {
        container.innerHTML = '<p>No books found.</p>';
        return;
    }

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>ISBN</th>
                    <th>Category</th>
                    <th>Total Copies</th>
                    <th>Available</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${books.map(book => `
                    <tr>
                        <td>${book.title}</td>
                        <td>${book.author}</td>
                        <td>${book.isbn}</td>
                        <td>${book.category || 'N/A'}</td>
                        <td>${book.total_copies}</td>
                        <td>${book.available_copies}</td>
                        <td>${book.status}</td>
                        <td>
                            <button class="btn btn-small" onclick="editBook(${book.id})">Edit</button>
                            <button class="btn btn-danger btn-small" onclick="deleteBook(${book.id})">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

if (document.getElementById('book-form')) {
    document.getElementById('book-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('book-title').value;
        const author = document.getElementById('book-author').value;
        const isbn = document.getElementById('book-isbn').value;
        const category = document.getElementById('book-category').value;
        const totalCopies = document.getElementById('book-copies').value;

        try {
            const response = await fetch(`${API_BASE}/books`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, author, isbn, category, totalCopies: parseInt(totalCopies) }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                alert('Book added successfully!');
                hideAddBookForm();
                loadBooks();
            } else {
                alert(data.error || 'Failed to add book');
            }
        } catch (error) {
            console.error('Add book error:', error);
            alert('Network error. Please try again.');
        }
    });
}

async function editBook(bookId) {
    // For simplicity, we'll use prompt. In a real app, you'd show a modal
    const newTitle = prompt('Enter new title:');
    if (!newTitle) return;

    const newAuthor = prompt('Enter new author:');
    if (!newAuthor) return;

    const newIsbn = prompt('Enter new ISBN:');
    if (!newIsbn) return;

    const newCategory = prompt('Enter new category:');
    const newCopies = prompt('Enter total copies:');

    try {
        const response = await fetch(`${API_BASE}/books/${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: newTitle,
                author: newAuthor,
                isbn: newIsbn,
                category: newCategory,
                totalCopies: parseInt(newCopies)
            }),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            alert('Book updated successfully!');
            loadBooks();
        } else {
            alert(data.error || 'Failed to update book');
        }
    } catch (error) {
        console.error('Update book error:', error);
        alert('Network error. Please try again.');
    }
}

async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
        const response = await fetch(`${API_BASE}/books/${bookId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            alert('Book deleted successfully!');
            loadBooks();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to delete book');
        }
    } catch (error) {
        console.error('Delete book error:', error);
        alert('Network error. Please try again.');
    }
}

// Users management
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`, { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
            displayUsers(data.users);
        } else {
            alert(data.error || 'Failed to load users');
        }
    } catch (error) {
        console.error('Load users error:', error);
        alert('Network error. Please try again.');
    }
}

function displayUsers(users) {
    const container = document.getElementById('users-list');
    if (users.length === 0) {
        container.innerHTML = '<p>No users found.</p>';
        return;
    }

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Active Borrowings</th>
                    <th>Unpaid Fines</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>${user.role}</td>
                        <td>${user.active_borrowings || 0}</td>
                        <td>$${user.unpaid_fines ? user.unpaid_fines.toFixed(2) : '0.00'}</td>
                        <td>
                            <button class="btn btn-small" onclick="editUser(${user.id})">Edit</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function editUser(userId) {
    const newName = prompt('Enter new name:');
    if (!newName) return;

    const newEmail = prompt('Enter new email:');
    if (!newEmail) return;

    const newRole = prompt('Enter new role (member/librarian):');
    if (!newRole || !['member', 'librarian'].includes(newRole)) return;

    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: newName, email: newEmail, role: newRole }),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            alert('User updated successfully!');
            loadUsers();
        } else {
            alert(data.error || 'Failed to update user');
        }
    } catch (error) {
        console.error('Update user error:', error);
        alert('Network error. Please try again.');
    }
}

// Borrowings management
async function loadBorrowings() {
    try {
        // Get all borrowings (this would need a new endpoint, for now we'll show a message)
        document.getElementById('borrowings-list').innerHTML = '<p>Borrowings management interface coming soon.</p>';
    } catch (error) {
        console.error('Load borrowings error:', error);
    }
}

// Reports
if (document.getElementById('most-borrowed-form')) {
    document.getElementById('most-borrowed-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const limit = document.getElementById('report-limit').value;

        try {
            const response = await fetch(`${API_BASE}/admin/reports/most-borrowed?limit=${limit}`, { credentials: 'include' });
            const data = await response.json();

            if (response.ok) {
                displayMostBorrowedReport(data.report);
            } else {
                alert(data.error || 'Failed to generate report');
            }
        } catch (error) {
            console.error('Report error:', error);
            alert('Network error. Please try again.');
        }
    });
}

function displayMostBorrowedReport(report) {
    const container = document.getElementById('most-borrowed-report');
    if (report.length === 0) {
        container.innerHTML = '<p>No borrowing data found.</p>';
        return;
    }

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>ISBN</th>
                    <th>Borrow Count</th>
                </tr>
            </thead>
            <tbody>
                ${report.map(item => `
                    <tr>
                        <td>${item.title}</td>
                        <td>${item.author}</td>
                        <td>${item.isbn}</td>
                        <td>${item.borrow_count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function generateMemberActivityReport() {
    try {
        const response = await fetch(`${API_BASE}/admin/reports/member-activity`, { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
            displayMemberActivityReport(data.report);
        } else {
            alert(data.error || 'Failed to generate report');
        }
    } catch (error) {
        console.error('Report error:', error);
        alert('Network error. Please try again.');
    }
}

function displayMemberActivityReport(report) {
    const container = document.getElementById('member-activity-report');
    if (report.length === 0) {
        container.innerHTML = '<p>No member activity data found.</p>';
        return;
    }

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Books Borrowed</th>
                    <th>Books Returned</th>
                    <th>Outstanding Fines</th>
                    <th>Last Activity</th>
                </tr>
            </thead>
            <tbody>
                ${report.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.email}</td>
                        <td>${item.books_borrowed || 0}</td>
                        <td>${item.books_returned || 0}</td>
                        <td>$${item.outstanding_fines ? item.outstanding_fines.toFixed(2) : '0.00'}</td>
                        <td>${item.last_activity ? new Date(item.last_activity).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Initialize admin panel
if (window.location.pathname.includes('admin.html')) {
    if (checkAdminAccess()) {
        loadBooks(); // Load books by default
    }
}
