-- ==============================================================================
-- PBK COMMUNITY WELFARE FUND - DATABASE SCHEMA & INITIALIZATION SCRIPT
-- File: BackEnd/database.sql
-- Database Name: pbk_db
-- Compatible with: MySQL 8.0+ / MariaDB 10.5+
-- ==============================================================================

-- 1. CREATE DATABASE
CREATE DATABASE IF NOT EXISTS `pbk_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `pbk_db`;

-- Disable foreign key checks during creation/import
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 2. TABLE: members (Community Members & Donors)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `members`;
CREATE TABLE `members` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) DEFAULT NULL,
  `gender` ENUM('M', 'F', 'N') NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `dob` VARCHAR(50) DEFAULT NULL,
  `door_no` VARCHAR(50) DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT NULL,
  `district` VARCHAR(100) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `village` VARCHAR(100) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `is_deleted` TINYINT(1) DEFAULT 0,
  `scheduled_deletion_at` DATETIME DEFAULT NULL,
  `deletion_reason` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_members_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABLE: admins (Administrative System Users)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) DEFAULT NULL,
  `gender` ENUM('M', 'F', 'N') NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'Super Admin',
  `state` VARCHAR(100) DEFAULT NULL,
  `district` VARCHAR(100) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `village` VARCHAR(100) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admins_phone` (`phone`),
  UNIQUE KEY `uq_admins_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABLE: admin_invitations (Secret Invitation Tokens for New Admins)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `admin_invitations`;
CREATE TABLE `admin_invitations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `invitation_code_hash` VARCHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `status` ENUM('Pending', 'Used', 'Expired', 'Revoked') DEFAULT 'Pending',
  `created_by_admin_id` INT DEFAULT NULL,
  `used_by_admin_id` INT DEFAULT NULL,
  `used_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `role` VARCHAR(50) DEFAULT 'Admin',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_invitation_hash` (`invitation_code_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABLE: registration_otps (One-Time Passwords for Verification)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `registration_otps`;
CREATE TABLE `registration_otps` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_type` ENUM('Member', 'Admin') NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `otp_type` ENUM('Phone', 'Email') NOT NULL,
  `otp_code` VARCHAR(6) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `status` ENUM('Pending', 'Verified', 'Expired', 'Used') DEFAULT 'Pending',
  `attempts` INT DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABLE: password_reset_requests (Forgot Password Verification Requests)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `password_reset_requests`;
CREATE TABLE `password_reset_requests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_type` ENUM('Admin', 'Member') NOT NULL,
  `user_id` INT NOT NULL,
  `verification_code` VARCHAR(10) DEFAULT NULL,
  `expires_at` DATETIME DEFAULT NULL,
  `status` ENUM('Pending', 'Verified', 'Used', 'Expired') DEFAULT 'Pending',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABLE: funds (Annual Welfare Fund Allocations)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `funds`;
CREATE TABLE `funds` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `financial_year` VARCHAR(20) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `target_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `status` ENUM('Active', 'Inactive', 'Completed') DEFAULT 'Active',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABLE: fund_usage (Expenses and Allocations from Funds)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `fund_usage`;
CREATE TABLE `fund_usage` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `fund_id` INT NOT NULL,
  `usage_date` DATE NOT NULL,
  `fund_type` VARCHAR(100) DEFAULT NULL,
  `purpose` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `status` ENUM('Pending', 'Approved', 'Completed', 'Cancelled') DEFAULT 'Pending',
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_fund_usage_fund_idx` (`fund_id`),
  CONSTRAINT `fk_fund_usage_fund` FOREIGN KEY (`fund_id`) REFERENCES `funds` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. TABLE: causes (Charity Causes, Welfare Events & Disaster Relief)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `causes`;
CREATE TABLE `causes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cause_code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `target_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `raised_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `target_per_member` DECIMAL(12, 2) DEFAULT 0.00,
  `status` ENUM('Draft', 'Published', 'Completed', 'Cancelled') DEFAULT 'Draft',
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_causes_code` (`cause_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. TABLE: contributions (Member Donations & Payment Ledger)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `contributions`;
CREATE TABLE `contributions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `contribution_amount` DECIMAL(12, 2) NOT NULL,
  `contribution_type` VARCHAR(100) DEFAULT NULL,
  `fund_name` VARCHAR(150) DEFAULT NULL,
  `contribution_date` DATE NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `transaction_reference` VARCHAR(100) DEFAULT NULL,
  `receipt_number` VARCHAR(100) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'completed', 'cancelled', 'rejected') DEFAULT 'pending',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_contributions_receipt` (`receipt_number`),
  KEY `fk_contributions_member_idx` (`member_id`),
  CONSTRAINT `fk_contributions_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. TABLE: announcements (Community Broadcasts & Notices)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `announcement_type` VARCHAR(50) DEFAULT NULL,
  `status` ENUM('Draft', 'Published', 'Archived') DEFAULT 'Draft',
  `publish_date` DATE DEFAULT NULL,
  `expiry_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. TABLE: activity_logs (System Audit Trail)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE `activity_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_type` ENUM('Admin', 'Member') NOT NULL,
  `user_id` INT NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. TABLE: member_documents (Uploaded Verification Documents)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `member_documents`;
CREATE TABLE `member_documents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `document_type` VARCHAR(100) NOT NULL,
  `document_name` VARCHAR(255) NOT NULL,
  `document_path` VARCHAR(500) DEFAULT NULL,
  `verification_status` ENUM('Pending', 'Verified', 'Rejected') DEFAULT 'Pending',
  `uploaded_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_member_documents_member_idx` (`member_id`),
  CONSTRAINT `fk_member_documents_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. TABLE: deleted_records (30-Day Soft-Delete Recycle Bin)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `deleted_records`;
CREATE TABLE `deleted_records` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `record_type` VARCHAR(50) NOT NULL,
  `record_id` INT NOT NULL,
  `record_name` VARCHAR(150) DEFAULT NULL,
  `record_data` TEXT NOT NULL,
  `deleted_by` VARCHAR(100) DEFAULT NULL,
  `reason` VARCHAR(255) DEFAULT NULL,
  `deleted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME DEFAULT NULL,
  `status` VARCHAR(20) DEFAULT 'Pending',
  `restored_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_deleted_records_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 15. OPTIONAL STARTER / SEED DATA
-- ------------------------------------------------------------------------------
-- Insert default funds if none exist
INSERT INTO `funds` (`id`, `financial_year`, `name`, `target_amount`, `status`)
VALUES 
  (1, '2026 - 2027', 'Youth Fund', 100000.00, 'Active'),
  (2, '2026 - 2027', 'Village Fund', 100000.00, 'Active'),
  (3, '2026 - 2027', 'General Fund', 100000.00, 'Active')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
