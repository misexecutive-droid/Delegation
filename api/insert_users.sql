-- ==========================================================
-- TaskMatrix - Default Seed Users for MySQL / phpMyAdmin
-- Database: vjsco9cf_task
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Insert Default Store & Department
INSERT INTO `Store` (`id`, `name`, `code`, `address`, `isActive`, `createdAt`, `updatedAt`)
VALUES ('store_main_001', 'Main Store', 'STR-01', 'Headquarters', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `Department` (`id`, `name`, `storeId`, `isActive`, `createdAt`, `updatedAt`)
VALUES ('dept_ops_001', 'Operations', 'store_main_001', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `Department` (`id`, `name`, `storeId`, `isActive`, `createdAt`, `updatedAt`)
VALUES ('dept_sales_001', 'Sales & Support', 'store_main_001', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Insert Default Users (Admin, Manager, Agent, Staff)
-- Passwords:
-- admin@vjsconnect.com   => Admin@12345
-- manager@vjsconnect.com => Password@123
-- agent@vjsconnect.com   => Password@123
-- staff@vjsconnect.com   => Password@123

INSERT INTO `User` (
    `id`, 
    `email`, 
    `passwordHash`, 
    `firstName`, 
    `lastName`, 
    `role`, 
    `departmentId`, 
    `storeId`, 
    `isActive`, 
    `rank`, 
    `phone`, 
    `createdAt`, 
    `updatedAt`
) VALUES 
(
    'usr_admin_001',
    'admin@vjsconnect.com',
    '$2y$10$b2XZv6R6DWfhyrRhKJy3X..HjPrzasFXC796y7ddYCrDng9bCHVYC',
    'Admin',
    'User',
    'ADMIN',
    'dept_ops_001',
    'store_main_001',
    1,
    1,
    '9876543210',
    NOW(),
    NOW()
),
(
    'usr_manager_001',
    'manager@vjsconnect.com',
    '$2y$10$/tq5MTGZ8pfltk1hYRm82OfnkTseNlz0.J/b6GZ9b6CYG4u/ERwpS',
    'Operations',
    'Manager',
    'MANAGER',
    'dept_ops_001',
    'store_main_001',
    1,
    2,
    '9876543211',
    NOW(),
    NOW()
),
(
    'usr_agent_001',
    'agent@vjsconnect.com',
    '$2y$10$/tq5MTGZ8pfltk1hYRm82OfnkTseNlz0.J/b6GZ9b6CYG4u/ERwpS',
    'Support',
    'Agent',
    'AGENT',
    'dept_sales_001',
    'store_main_001',
    1,
    4,
    '9876543212',
    NOW(),
    NOW()
),
(
    'usr_staff_001',
    'staff@vjsconnect.com',
    '$2y$10$/tq5MTGZ8pfltk1hYRm82OfnkTseNlz0.J/b6GZ9b6CYG4u/ERwpS',
    'Store',
    'Staff',
    'USER',
    'dept_ops_001',
    'store_main_001',
    1,
    6,
    '9876543213',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE 
    `passwordHash` = VALUES(`passwordHash`),
    `firstName` = VALUES(`firstName`),
    `lastName` = VALUES(`lastName`),
    `role` = VALUES(`role`),
    `isActive` = VALUES(`isActive`);

SET FOREIGN_KEY_CHECKS = 1;
