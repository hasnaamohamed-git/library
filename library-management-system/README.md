# Community Library Management System

A comprehensive web application for managing a community library's operations, built with Node.js, Express, MySQL, and vanilla JavaScript.

## Features

### Member Features
- User registration and authentication
- Book search by title, author, ISBN, or category
- Borrow available books (14-day loan period)
- Reserve unavailable books (FIFO queue system)
- View borrowing history and current loans
- View outstanding fines

### Librarian Features
- All member features plus:
- Add, edit, and delete books from catalog
- Check in returned books with automatic fine calculation
- Manage user accounts
- View analytical reports (most borrowed books, member activity)
- Process fine payments and waivers

### System Features
- Automatic fine calculation ($0.50 per day overdue)
- Reservation queue management with notifications
- Borrowing eligibility checks (no overdue books, fines < $10)
- Secure password hashing and session management
- Role-based access control

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Security**: bcryptjs for password hashing, express-session for sessions

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm (comes with Node.js)

## Installation

1. **Clone or download the project**
   ```bash
   cd library-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MySQL database**
   - Create a new MySQL database named `library_db`
   - Run the schema file to create tables:
     ```sql
     mysql -u your_username -p library_db < database/schema.sql
     ```

4. **Configure database connection**
   - Edit `backend/db.js` and update the database credentials:
     ```javascript
     const db = mysql.createConnection({
         host: 'localhost',
         user: 'your_mysql_username',
         password: 'your_mysql_password',
         database: 'library_db'
     });
     ```

5. **Start the server**
   ```bash
   node backend/server.js
   ```

6. **Access the application**
   - Open your browser and go to: `http://localhost:3000`
   - Register a new account or login with existing credentials

## Default Accounts

After running the schema, you can create these test accounts:

**Librarian Account:**
- Email: librarian@library.com
- Password: librarian123

**Member Account:**
- Email: member@library.com
- Password: member123

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Books
- `GET /api/books/search` - Search books
- `GET /api/books` - Get all books (librarian only)
- `POST /api/books` - Add new book (librarian only)
- `PUT /api/books/:id` - Update book (librarian only)
- `DELETE /api/books/:id` - Delete book (librarian only)

### Borrowing
- `POST /api/borrow` - Borrow a book
- `PUT /api/borrow/return` - Return a book (librarian only)
- `GET /api/borrow/my-books` - Get user's borrowed books

### Reservations
- `POST /api/reserve` - Reserve a book
- `GET /api/reserve/my-reservations` - Get user's reservations
- `DELETE /api/reserve/:id` - Cancel reservation

### Fines
- `GET /api/fines/my-fines` - Get user's fines
- `PUT /api/fines/pay` - Pay fines (librarian only)
- `PUT /api/fines/waive` - Waive fines (librarian only)

### Admin
- `GET /api/admin/users` - Get all users (librarian only)
- `PUT /api/admin/users/:id` - Update user (librarian only)
- `GET /api/admin/reports/most-borrowed` - Most borrowed books report
- `GET /api/admin/reports/member-activity` - Member activity report

## Database Schema

The system uses the following main tables:
- `users` - Member and librarian accounts
- `books` - Book catalog with availability tracking
- `borrowings` - Borrowing records with due dates
- `reservations` - Book reservation queue
- `fines` - Fine records and payment tracking

## Security Features

- Password hashing with bcryptjs
- Session-based authentication
- Role-based access control (member vs librarian)
- Input validation and SQL injection prevention
- CORS protection
- Secure cookie settings

## Testing

Comprehensive testing has been performed covering:
- User registration and authentication
- Book search and management
- Borrowing and return processes
- Reservation system
- Fine calculation and management
- Admin panel functionality
- Edge cases and error handling

See `TEST_RESULTS.md` for detailed test results.

## Project Structure

```
library-management-system/
├── backend/
│   ├── db.js                 # Database connection
│   ├── server.js            # Main server file
│   └── routes/
│       ├── auth.js          # Authentication routes
│       ├── books.js         # Book management routes
│       ├── borrow.js        # Borrowing routes
│       ├── reserve.js       # Reservation routes
│       ├── fines.js         # Fine management routes
│       └── admin.js         # Admin routes
├── frontend/
│   ├── index.html           # Home page with search
│   ├── login.html           # Login page
│   ├── register.html        # Registration page
│   ├── dashboard.html       # Member dashboard
│   ├── admin.html           # Admin panel
│   ├── styles.css           # CSS styles
│   ├── app.js               # Main client-side logic
│   └── admin.js             # Admin panel logic
├── database/
│   └── schema.sql           # Database schema
├── TEST_RESULTS.md          # Test results
├── TODO.md                  # Project tasks
├── README.md                # This file
└── package.json             # Dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For support or questions, please contact the development team or create an issue in the repository.
