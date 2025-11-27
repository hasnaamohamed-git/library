// API base URL
const API_BASE = 'http://localhost:3000/api';

// Utility functions
function showMessage(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="message ${type}">${message}</div>`;
        setTimeout(() => {
            element.innerHTML = '';
        }, 5000);
    }
}

function getUserRole() {
    return localStorage.getItem('userRole');
}

function isLoggedIn() {
    return !!localStorage.getItem('userRole');
}

function redirectToDashboard() {
    const role = getUserRole();
    if (role === 'librarian') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

// Login functionality
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('userRole', data.role);
                showMessage('message', 'Login successful!', 'success');
                setTimeout(() => {
                    redirectToDashboard();
                }, 1000);
            } else {
                showMessage('message', data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('message', 'Network error. Please try again.', 'error');
        }
    });
}

// Register functionality
if (document.getElementById('register-form')) {
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('message', 'Registration successful! Please login.', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showMessage('message', data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Register error:', error);
            showMessage('message', 'Network error. Please try again.', 'error');
        }
    });
}

// Search functionality
if (document.getElementById('search-form')) {
    document.getElementById('search-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('search-title').value;
        const author = document.getElementById('search-author').value;
        const isbn = document.getElementById('search-isbn').value;
        const category = document.getElementById('search-category').value;

        const params = new URLSearchParams();
        if (title) params.append('title', title);
        if (author) params.append('author', author);
        if (isbn) params.append('isbn', isbn);
        if (category) params.append('category', category);

        try {
            const response = await fetch(`${API_BASE}/books/search?${params}`);
            const data = await response.json();

            displaySearchResults(data.books);
        } catch (error) {
            console.error('Search error:', error);
            showMessage('search-message', 'Search failed. Please try again.', 'error');
        }
    });
}

function displaySearchResults(books) {
    const resultsDiv = document.getElementById('search-results');
    if (!resultsDiv) return;

    if (books.length === 0) {
        resultsDiv.innerHTML = '<p>No books found matching your criteria.</p>';
        return;
    }

    resultsDiv.innerHTML = books.map(book => `
        <div class="book-item">
            <h3>${book.title}</h3>
            <p><strong>Author:</strong> ${book.author}</p>
            <p><strong>ISBN:</strong> ${book.isbn}</p>
            <p><strong>Category:</strong> ${book.category || 'N/A'}</p>
            <p><strong>Status:</strong> ${getStatusText(book.status, book.available_copies)}</p>
            <div class="book-actions">
                ${book.available_copies > 0 ?
                    `<button class="btn" onclick="borrowBook(${book.id})">Borrow</button>` :
                    `<button class="btn" onclick="reserveBook(${book.id})">Reserve</button>`
                }
            </div>
        </div>
    `).join('');
}

function getStatusText(status, availableCopies) {
    if (availableCopies > 0) return 'Available';
    if (status === 'on_loan') return 'On Loan';
    if (status === 'reserved') return 'Reserved';
    return status;
}

// Borrow book function
async function borrowBook(bookId) {
    if (!isLoggedIn()) {
        alert('Please login to borrow books.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/borrow`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bookId }),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            alert('Book borrowed successfully! Due date: ' + data.dueDate);
            location.reload();
        } else {
            alert(data.error || 'Failed to borrow book');
        }
    } catch (error) {
        console.error('Borrow error:', error);
        alert('Network error. Please try again.');
    }
}

// Reserve book function
async function reserveBook(bookId) {
    if (!isLoggedIn()) {
        alert('Please login to reserve books.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/reserve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bookId }),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Book reserved successfully! Your position in queue: ${data.queuePosition}`);
            location.reload();
        } else {
            alert(data.error || 'Failed to reserve book');
        }
    } catch (error) {
        console.error('Reserve error:', error);
        alert('Network error. Please try again.');
    }
}

// Dashboard functionality
if (window.location.pathname.includes('dashboard.html')) {
    loadDashboard();
}

async function loadDashboard() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Load profile info
        const profileResponse = await fetch(`${API_BASE}/auth/profile`, { credentials: 'include' });
        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            document.getElementById('profile-info').innerHTML = `
                <p><strong>Name:</strong> ${profileData.name}</p>
                <p><strong>Email:</strong> ${profileData.email}</p>
                <p><strong>Role:</strong> ${profileData.role}</p>
            `;
        }

        // Load borrowed books
        const borrowedResponse = await fetch(`${API_BASE}/borrow/my-books`, { credentials: 'include' });
        if (borrowedResponse.ok) {
            const borrowedData = await borrowedResponse.json();
            displayBorrowedBooks(borrowedData.borrowings);
        }

        // Load fines
        const finesResponse = await fetch(`${API_BASE}/fines/my-fines`, { credentials: 'include' });
        if (finesResponse.ok) {
            const finesData = await finesResponse.json();
            displayFines(finesData.fines, finesData.total);
        }

        // Load reservations
        const reservationsResponse = await fetch(`${API_BASE}/reserve/my-reservations`, { credentials: 'include' });
        if (reservationsResponse.ok) {
            const reservationsData = await reservationsResponse.json();
            displayReservations(reservationsData.reservations);
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

function displayBorrowedBooks(borrowings) {
    const container = document.getElementById('borrowed-books');
    if (borrowings.length === 0) {
        container.innerHTML = '<p>You have no borrowed books.</p>';
        return;
    }

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Borrow Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${borrowings.map(borrowing => `
                    <tr>
                        <td>${borrowing.title}</td>
                        <td>${borrowing.author}</td>
                        <td>${new Date(borrowing.borrow_date).toLocaleDateString()}</td>
                        <td>${new Date(borrowing.due_date).toLocaleDateString()}</td>
                        <td>${borrowing.status}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayFines(fines, total) {
    const container = document.getElementById('fines-info');
    if (fines.length === 0) {
        container.innerHTML = '<p>You have no outstanding fines.</p>';
        return;
    }

    container.innerHTML = `
        <p><strong>Total Outstanding Fines: $${total.toFixed(2)}</strong></p>
        <table class="table">
            <thead>
                <tr>
                    <th>Book</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${fines.map(fine => `
                    <tr>
                        <td>${fine.book_title || 'N/A'}</td>
                        <td>$${fine.amount.toFixed(2)}</td>
                        <td>${fine.reason}</td>
                        <td>${new Date(fine.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayReservations(reservations) {
    const container = document.getElementById('reservations-list');
    if (reservations.length === 0) {
        container.innerHTML = '<p>You have no active reservations.</p>';
        return;
    }

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Queue Position</th>
                    <th>Reservation Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${reservations.map(reservation => `
                    <tr>
                        <td>${reservation.title}</td>
                        <td>${reservation.author}</td>
                        <td>${reservation.queue_position}</td>
                        <td>${new Date(reservation.reservation_date).toLocaleDateString()}</td>
                        <td><button class="btn btn-danger" onclick="cancelReservation(${reservation.id})">Cancel</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function cancelReservation(reservationId) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;

    try {
        const response = await fetch(`${API_BASE}/reserve/${reservationId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            alert('Reservation cancelled successfully.');
            loadDashboard();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to cancel reservation');
        }
    } catch (error) {
        console.error('Cancel reservation error:', error);
        alert('Network error. Please try again.');
    }
}

// Logout functionality
if (document.getElementById('logout-link')) {
    document.getElementById('logout-link').addEventListener('click', async (e) => {
        e.preventDefault();

        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        localStorage.removeItem('userRole');
        window.location.href = 'index.html';
    });
}

// Reserve form on dashboard
if (document.getElementById('reserve-form')) {
    document.getElementById('reserve-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const bookId = document.getElementById('reserve-book-id').value;

        try {
            const response = await fetch(`${API_BASE}/reserve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ bookId: parseInt(bookId) }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('reserve-message', `Book reserved successfully! Your position in queue: ${data.queuePosition}`, 'success');
                document.getElementById('reserve-form').reset();
                loadDashboard();
            } else {
                showMessage('reserve-message', data.error || 'Failed to reserve book', 'error');
            }
        } catch (error) {
            console.error('Reserve error:', error);
            showMessage('reserve-message', 'Network error. Please try again.', 'error');
        }
    });
}
