-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 04, 2025 at 06:56 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `library`
--
CREATE DATABASE IF NOT EXISTS `library` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE library;
DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_add_fine` (IN `p_user_id` INT, IN `p_borrowing_id` INT, IN `p_fine_type` ENUM('Overdue','Lost','Damage'), IN `p_amount` DECIMAL(8,2), IN `p_days_overdue` INT)   BEGIN
    
    INSERT INTO fines (user_id, borrowing_id, fine_type, amount, days_overdue)
    VALUES (p_user_id, p_borrowing_id, p_fine_type, p_amount, p_days_overdue);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_borrow_book` (IN `p_user_id` INT, IN `p_book_id` INT, IN `p_librarian_id` INT)   BEGIN
    DECLARE v_max_books INT;
    DECLARE v_unpaid_fines DECIMAL(8,2);
    DECLARE v_available INT;
    
    SELECT max_books_per_member INTO v_max_books FROM system_settings LIMIT 1;
    SELECT SUM(amount) INTO v_unpaid_fines FROM fines WHERE user_id = p_user_id AND payment_status = 'Unpaid';
    SELECT (total_copies - (SELECT COUNT(*) FROM borrowings WHERE book_id = p_book_id AND status = 'Active')) INTO v_available FROM books WHERE book_id = p_book_id;
    
    IF v_unpaid_fines > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Member has unpaid fines';
    ELSEIF (SELECT COUNT(*) FROM borrowings WHERE user_id = p_user_id AND status = 'Active') >= v_max_books THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Member reached max books limit';
    ELSEIF v_available <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Book not available';
    ELSEIF (SELECT role FROM users WHERE user_id = p_librarian_id) != 'Librarian' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only Librarian can process borrowing';
    ELSE
        INSERT INTO borrowings (user_id, book_id, checkout_librarian_id, due_date)
        VALUES (p_user_id, p_book_id, p_librarian_id, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL (SELECT loan_period_days FROM system_settings LIMIT 1) DAY));
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_reserve_book` (IN `p_user_id` INT, IN `p_book_id` INT)   BEGIN
    DECLARE v_available INT;
    SELECT (total_copies - (SELECT COUNT(*) FROM borrowings WHERE book_id = p_book_id AND status = 'Active')) INTO v_available FROM books WHERE book_id = p_book_id;
    
    IF v_available > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Book is available - borrow instead of reserving';
    ELSE
        INSERT INTO reservations (user_id, book_id, queue_position)
        VALUES (p_user_id, p_book_id, (SELECT IFNULL(MAX(queue_position), 0) + 1 FROM reservations WHERE book_id = p_book_id AND status = 'Pending'));
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_return_book` (IN `p_borrowing_id` INT, IN `p_librarian_id` INT)   BEGIN
    DECLARE v_role ENUM('Member','Librarian');
    SELECT role INTO v_role FROM users WHERE user_id = p_librarian_id;
    
    IF v_role != 'Librarian' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only Librarian can process return';
    ELSE
        UPDATE borrowings
        SET return_date = CURRENT_TIMESTAMP, return_librarian_id = p_librarian_id, status = 'Returned'
        WHERE borrowing_id = p_borrowing_id;
        
        -- Trigger will handle fine calculation and available_copies update
        
        -- Notify next reservation if book was reserved
        IF (SELECT COUNT(*) FROM reservations WHERE book_id = (SELECT book_id FROM borrowings WHERE borrowing_id = p_borrowing_id) AND status = 'Pending') > 0 THEN
            INSERT INTO notifications (user_id, type, message)
            SELECT user_id, 'Reservation Available', 'Your reserved book is now available'
            FROM reservations
            WHERE book_id = (SELECT book_id FROM borrowings WHERE borrowing_id = p_borrowing_id)
            AND status = 'Pending'
            ORDER BY queue_position ASC LIMIT 1;
        END IF;
    END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action_type` varchar(100) DEFAULT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`log_id`, `user_id`, `action_type`, `table_name`, `record_id`, `details`, `created_at`) VALUES
(1, 1, 'Borrow Processed', 'borrowings', 1, 'Librarian1 processed borrowing for Member1', '2025-12-01 19:04:10'),
(2, 2, 'Reservation Created', 'reservations', 1, 'Member1 created reservation for Book4', '2025-12-01 19:04:10');

-- --------------------------------------------------------

--
-- Table structure for table `books`
--

CREATE TABLE `books` (
  `book_id` int(11) NOT NULL,
  `isbn` varchar(20) NOT NULL,
  `title` varchar(500) NOT NULL,
  `author` varchar(200) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `publication_year` year(4) DEFAULT NULL,
  `publisher` varchar(200) DEFAULT NULL,
  `total_copies` int(11) DEFAULT 1,
  `book_value` decimal(10,2) DEFAULT NULL,
  `status` enum('Available','On Loan','Reserved') DEFAULT 'Available'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `books`
--

INSERT INTO `books` (`book_id`, `isbn`, `title`, `author`, `category`, `publication_year`, `publisher`, `total_copies`, `book_value`, `status`) VALUES
(1, '978-3-16-148410-0', 'The Great Gatsby', 'F. Scott Fitzgerald', 'Fiction', '1925', 'Scribner', 5, 20.00, 'Available'),
(2, '978-0-14-118776-1', '1984', 'George Orwell', 'Dystopian', '1949', 'Penguin', 3, 15.00, 'Available'),
(3, '978-0-7432-7356-5', 'To Kill a Mockingbird', 'Harper Lee', 'Fiction', '1960', 'J.B. Lippincott', 4, 18.00, 'Available'),
(4, '978-0-307-27767-1', 'The Catcher in the Rye', 'J.D. Salinger', 'Fiction', '1951', 'Little, Brown', 2, 12.00, 'Available'),
(5, '978-0-06-112008-4', 'Pride and Prejudice', 'Jane Austen', 'Romance', '0000', 'T. Egerton', 6, 22.00, 'Available'),
(6, '12345', 'New Book', 'Me', 'Test', '2024', 'ABC', 5, NULL, 'Available');

-- --------------------------------------------------------

--
-- Table structure for table `borrowings`
--

CREATE TABLE `borrowings` (
  `borrowing_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `checkout_librarian_id` int(11) NOT NULL,
  `return_librarian_id` int(11) DEFAULT NULL,
  `checkout_date` datetime DEFAULT current_timestamp(),
  `due_date` datetime NOT NULL,
  `return_date` datetime DEFAULT NULL,
  `status` enum('Active','Returned','Overdue','Lost') DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `borrowings`
--

INSERT INTO `borrowings` (`borrowing_id`, `user_id`, `book_id`, `checkout_librarian_id`, `return_librarian_id`, `checkout_date`, `due_date`, `return_date`, `status`) VALUES
(1, 3, 1, 1, NULL, '2025-12-01 19:04:10', '2025-12-15 19:04:10', NULL, 'Active'),
(2, 4, 2, 1, NULL, '2025-12-01 19:04:10', '2025-12-15 19:04:10', NULL, 'Active'),
(3, 5, 3, 2, NULL, '2025-12-01 19:04:10', '2025-12-15 19:04:10', NULL, 'Active');

--
-- Triggers `borrowings`
--
DELIMITER $$
CREATE TRIGGER `tr_borrow_insert` AFTER INSERT ON `borrowings` FOR EACH ROW UPDATE books
SET status = IF(total_copies - (SELECT COUNT(*) FROM borrowings WHERE book_id = NEW.book_id AND status = 'Active') <= 0, 'On Loan', 'Available')
WHERE book_id = NEW.book_id
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `tr_borrow_log` AFTER INSERT ON `borrowings` FOR EACH ROW INSERT INTO activity_logs (user_id, action_type, table_name, record_id, details)
VALUES (NEW.checkout_librarian_id, 'Borrow Created', 'borrowings', NEW.borrowing_id, CONCAT('Borrowing for user ', NEW.user_id, ' of book ', NEW.book_id))
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `tr_borrow_return` AFTER UPDATE ON `borrowings` FOR EACH ROW BEGIN
    IF NEW.return_date IS NOT NULL AND OLD.return_date IS NULL THEN
        UPDATE books
        SET status = IF(total_copies - (SELECT COUNT(*) FROM borrowings WHERE book_id = NEW.book_id AND status = 'Active') > 0, 'Available', 'Reserved')
        WHERE book_id = NEW.book_id;
        
        -- Calculate overdue fine if applicable
        IF NEW.return_date > OLD.due_date THEN
            INSERT INTO fines (user_id, borrowing_id, fine_type, amount, days_overdue)
            VALUES (NEW.user_id, NEW.borrowing_id, 'Overdue', (DATEDIFF(NEW.return_date, OLD.due_date) * (SELECT fine_per_day FROM system_settings LIMIT 1)), DATEDIFF(NEW.return_date, OLD.due_date));
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `fines`
--

CREATE TABLE `fines` (
  `fine_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `borrowing_id` int(11) DEFAULT NULL,
  `fine_type` enum('Overdue','Lost','Damage') NOT NULL,
  `amount` decimal(8,2) NOT NULL,
  `days_overdue` int(11) DEFAULT NULL,
  `issued_at` datetime DEFAULT current_timestamp(),
  `payment_status` enum('Unpaid','Paid','Waived') DEFAULT 'Unpaid',
  `paid_by_librarian_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `fines`
--

INSERT INTO `fines` (`fine_id`, `user_id`, `borrowing_id`, `fine_type`, `amount`, `days_overdue`, `issued_at`, `payment_status`, `paid_by_librarian_id`) VALUES
(1, 3, 1, 'Overdue', 5.00, NULL, '2025-12-01 19:04:10', 'Unpaid', NULL),
(2, 4, 2, 'Damage', 10.00, NULL, '2025-12-01 19:04:10', 'Unpaid', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(100) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `type`, `message`, `is_read`, `created_at`) VALUES
(1, 3, 'Reservation Available', 'Your reserved book is now available.', 0, '2025-12-01 19:04:10'),
(2, 4, 'Overdue Reminder', 'Your borrowed book is overdue.', 0, '2025-12-01 19:04:10');

-- --------------------------------------------------------

--
-- Table structure for table `reservations`
--

CREATE TABLE `reservations` (
  `reservation_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `queue_position` int(11) NOT NULL,
  `reserved_at` datetime DEFAULT current_timestamp(),
  `status` enum('Pending','Notified','Fulfilled','Cancelled','Expired') DEFAULT 'Pending',
  `notified_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reservations`
--

INSERT INTO `reservations` (`reservation_id`, `user_id`, `book_id`, `queue_position`, `reserved_at`, `status`, `notified_at`, `expires_at`) VALUES
(1, 3, 4, 1, '2025-12-01 19:04:10', 'Pending', NULL, NULL),
(2, 4, 4, 2, '2025-12-01 19:04:10', 'Pending', NULL, NULL);

--
-- Triggers `reservations`
--
DELIMITER $$
CREATE TRIGGER `tr_reservation_log` AFTER INSERT ON `reservations` FOR EACH ROW INSERT INTO activity_logs (user_id, action_type, table_name, record_id, details)
VALUES (NEW.user_id, 'Reservation Created', 'reservations', NEW.reservation_id, CONCAT('Reservation for book ', NEW.book_id))
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `setting_id` int(11) NOT NULL,
  `loan_period_days` int(11) DEFAULT 14,
  `fine_per_day` decimal(6,2) DEFAULT 1.00,
  `max_books_per_member` int(11) DEFAULT 5,
  `reservation_hold_hours` int(11) DEFAULT 48
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`setting_id`, `loan_period_days`, `fine_per_day`, `max_books_per_member`, `reservation_hold_hours`) VALUES
(1, 14, 1.00, 5, 48);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `role` enum('Member','Librarian') DEFAULT 'Member',
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `registered_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `email`, `password_hash`, `username`, `phone`, `address`, `role`, `status`, `registered_at`) VALUES
(1, 'librarian1@example.com', 'hashed_password1', 'Admin', '1234567890', 'Library Address', 'Librarian', 'Active', '2025-12-01 19:04:10'),
(2, 'librarian2@example.com', 'hashed_password2', 'Admin', '0987654321', 'Library Address', 'Librarian', 'Active', '2025-12-01 19:04:10'),
(3, 'member1@example.com', 'hashed_password3', 'John Doe', '1112223334', 'User Address1', 'Member', 'Active', '2025-12-01 19:04:10'),
(4, 'member2@example.com', 'hashed_password4', 'Jane Smith', '4445556667', 'User Address2', 'Member', 'Active', '2025-12-01 19:04:10'),
(5, 'member3@example.com', 'hashed_password5', 'Bob Johnson', '7778889990', 'User Address3', 'Member', 'Active', '2025-12-01 19:04:10'),
(6, 'test@test.com', '$2b$10$PNQugYlgMId58SiO4VKXbelxCM1iCUnsvXqhQ/htwBCPKxmBg4KQG', 'Jak Roso', NULL, NULL, 'Member', 'Active', '2025-12-04 01:44:54'),
(7, 'admin@example.com', '$2b$10$UTSgaR/CWYTqMWyBIgstmuwsFEd5AIMpfsUmFiRDUgIaGQNVD8W9S', 'Admin', NULL, NULL, 'Librarian', 'Active', '2025-12-04 02:00:39'),
(9, 'Rania@example.com', '$2b$10$CMLBi0nbmMrINUOKGT2xeuSd3LlPtgHWsNGf0r4M3ihQ7Jpd6GnRq', 'rania ali', NULL, NULL, 'Member', 'Active', '2025-12-04 18:27:57');

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_member_activity`
-- (See below for the actual view)
--
CREATE TABLE `view_member_activity` ();

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_most_borrowed_books`
-- (See below for the actual view)
--
CREATE TABLE `view_most_borrowed_books` (
`book_id` int(11)
,`title` varchar(500)
,`borrow_count` bigint(21)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_overdue_borrowings`
-- (See below for the actual view)
--
CREATE TABLE `view_overdue_borrowings` ();

-- --------------------------------------------------------

--
-- Structure for view `view_member_activity`
--
DROP TABLE IF EXISTS `view_member_activity`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_member_activity`  AS SELECT `u`.`user_id` AS `user_id`, `u`.`first_name` AS `first_name`, `u`.`last_name` AS `last_name`, (select count(0) from `borrowings` where `borrowings`.`user_id` = `u`.`user_id`) AS `borrowings_count`, (select sum(`fines`.`amount`) from `fines` where `fines`.`user_id` = `u`.`user_id` and `fines`.`payment_status` = 'Unpaid') AS `unpaid_fines`, (select count(0) from `reservations` where `reservations`.`user_id` = `u`.`user_id`) AS `reservations_count` FROM `users` AS `u` WHERE `u`.`role` = 'Member' ;

-- --------------------------------------------------------

--
-- Structure for view `view_most_borrowed_books`
--
DROP TABLE IF EXISTS `view_most_borrowed_books`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_most_borrowed_books`  AS SELECT `b`.`book_id` AS `book_id`, `b`.`title` AS `title`, count(`br`.`borrowing_id`) AS `borrow_count` FROM (`books` `b` join `borrowings` `br` on(`b`.`book_id` = `br`.`book_id`)) GROUP BY `b`.`book_id` ORDER BY count(`br`.`borrowing_id`) DESC LIMIT 0, 10 ;

-- --------------------------------------------------------

--
-- Structure for view `view_overdue_borrowings`
--
DROP TABLE IF EXISTS `view_overdue_borrowings`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_overdue_borrowings`  AS SELECT `br`.`borrowing_id` AS `borrowing_id`, `u`.`first_name` AS `member_name`, `b`.`title` AS `book_title`, `br`.`due_date` AS `due_date`, to_days(curdate()) - to_days(`br`.`due_date`) AS `days_overdue` FROM ((`borrowings` `br` join `users` `u` on(`br`.`user_id` = `u`.`user_id`)) join `books` `b` on(`br`.`book_id` = `b`.`book_id`)) WHERE `br`.`status` = 'Active' AND `br`.`due_date` < curdate() ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `books`
--
ALTER TABLE `books`
  ADD PRIMARY KEY (`book_id`),
  ADD UNIQUE KEY `isbn` (`isbn`);

--
-- Indexes for table `borrowings`
--
ALTER TABLE `borrowings`
  ADD PRIMARY KEY (`borrowing_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `book_id` (`book_id`),
  ADD KEY `checkout_librarian_id` (`checkout_librarian_id`),
  ADD KEY `return_librarian_id` (`return_librarian_id`);

--
-- Indexes for table `fines`
--
ALTER TABLE `fines`
  ADD PRIMARY KEY (`fine_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `borrowing_id` (`borrowing_id`),
  ADD KEY `paid_by_librarian_id` (`paid_by_librarian_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `reservations`
--
ALTER TABLE `reservations`
  ADD PRIMARY KEY (`reservation_id`),
  ADD UNIQUE KEY `book_id` (`book_id`,`queue_position`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`setting_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `books`
--
ALTER TABLE `books`
  MODIFY `book_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `borrowings`
--
ALTER TABLE `borrowings`
  MODIFY `borrowing_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `fines`
--
ALTER TABLE `fines`
  MODIFY `fine_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `reservations`
--
ALTER TABLE `reservations`
  MODIFY `reservation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `setting_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `borrowings`
--
ALTER TABLE `borrowings`
  ADD CONSTRAINT `borrowings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `borrowings_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`),
  ADD CONSTRAINT `borrowings_ibfk_3` FOREIGN KEY (`checkout_librarian_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `borrowings_ibfk_4` FOREIGN KEY (`return_librarian_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `fines`
--
ALTER TABLE `fines`
  ADD CONSTRAINT `fines_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fines_ibfk_2` FOREIGN KEY (`borrowing_id`) REFERENCES `borrowings` (`borrowing_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fines_ibfk_3` FOREIGN KEY (`paid_by_librarian_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `reservations`
--
ALTER TABLE `reservations`
  ADD CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reservations_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
