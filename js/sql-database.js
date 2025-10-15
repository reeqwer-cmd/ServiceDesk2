// js/sql-database.js
class SQLDatabase {
    constructor() {
        this.db = null;
        this.storageKey = 'service_desk_sql_db';
        this.init();
    }

    async init() {
        try {
            console.log('🔄 Инициализация SQL базы данных...');
            
            // Ждем загрузки SQL.js
            if (typeof window.SQL === 'undefined') {
                console.error('❌ SQL.js не загружен');
                setTimeout(() => this.init(), 1000); // Повторяем попытку
                return;
            }

            console.log('✅ SQL.js загружен, создаем базу данных...');

            // Восстанавливаем базу из localStorage или создаем новую
            const savedDB = localStorage.getItem(this.storageKey);
            
            if (savedDB) {
                try {
                    const arrayBuffer = this.base64ToUint8Array(savedDB);
                    this.db = new window.SQL.Database(arrayBuffer);
                    console.log('✅ База данных восстановлена из localStorage');
                } catch (error) {
                    console.log('⚠️ Ошибка восстановления, создаем новую базу');
                    this.createNewDatabase();
                }
            } else {
                this.createNewDatabase();
            }
            
        } catch (error) {
            console.error('❌ Ошибка инициализации базы данных:', error);
            this.createNewDatabase();
        }
    }

    createNewDatabase() {
        try {
            this.db = new window.SQL.Database();
            console.log('✅ Новая база данных создана');
            this.createTables();
            this.createDefaultAdmin();
            this.saveDatabase();
        } catch (error) {
            console.error('❌ Ошибка создания новой базы:', error);
        }
    }

    createTables() {
        try {
            console.log('📊 Создание таблиц...');

            // Таблица пользователей
            this.db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    name TEXT NOT NULL,
                    email TEXT,
                    role TEXT NOT NULL DEFAULT 'user',
                    department TEXT,
                    created_date TEXT,
                    isActive INTEGER DEFAULT 1,
                    permissions TEXT,
                    lastLogin TEXT
                )
            `);

            // Таблица подразделений
            this.db.run(`
                CREATE TABLE IF NOT EXISTS departments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_date TEXT
                )
            `);

            // Таблица категорий
            this.db.run(`
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    department_id INTEGER,
                    created_date TEXT,
                    FOREIGN KEY (department_id) REFERENCES departments(id)
                )
            `);

            // Таблица заявок
            this.db.run(`
                CREATE TABLE IF NOT EXISTS tickets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    status TEXT DEFAULT 'open',
                    priority TEXT DEFAULT 'medium',
                    department_id INTEGER,
                    category_id INTEGER,
                    created_by INTEGER,
                    assigned_to INTEGER,
                    created_date TEXT,
                    updated_date TEXT,
                    FOREIGN KEY (department_id) REFERENCES departments(id),
                    FOREIGN KEY (category_id) REFERENCES categories(id),
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            `);

            console.log('✅ Все таблицы созданы/проверены');

        } catch (error) {
            console.error('❌ Ошибка создания таблиц:', error);
        }
    }

    createDefaultAdmin() {
        try {
            // Проверяем, есть ли уже администратор
            const result = this.db.exec("SELECT id FROM users WHERE username = 'admin'");
            if (result.length > 0 && result[0].values.length > 0) {
                console.log('✅ Администратор уже существует');
                return;
            }

            // Создаем администратора
            const timestamp = new Date().toISOString();
            const permissions = JSON.stringify([
                'create_users', 'edit_users', 'delete_users', 
                'manage_tickets', 'view_reports', 'system_settings',
                'export_data', 'manage_categories', 'manage_departments'
            ]);

            this.db.run(`
                INSERT INTO users (username, password, name, email, role, department, 
                                 created_date, isActive, permissions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'admin',
                'Fghtkm123',
                'Главный Администратор',
                'admin@company.com',
                'admin',
                'IT',
                timestamp,
                1,
                permissions
            ]);

            console.log('✅ Администратор создан');

        } catch (error) {
            console.error('❌ Ошибка создания администратора:', error);
        }
    }

    // Метод для пересоздания таблиц
    recreateTables() {
        try {
            console.log('🔄 Пересоздание таблиц...');
            
            // Удаляем старые таблицы
            this.db.run('DROP TABLE IF EXISTS tickets');
            this.db.run('DROP TABLE IF EXISTS categories');
            this.db.run('DROP TABLE IF EXISTS departments');
            this.db.run('DROP TABLE IF EXISTS users');
            
            // Создаем заново
            this.createTables();
            this.createDefaultAdmin();
            this.saveDatabase();
            
            console.log('✅ Таблицы пересозданы');
            
        } catch (error) {
            console.error('❌ Ошибка пересоздания таблиц:', error);
        }
    }

    // Сохранение базы данных
    saveDatabase() {
        try {
            if (this.db) {
                const binaryArray = this.db.export();
                const base64String = this.uint8ArrayToBase64(binaryArray);
                localStorage.setItem(this.storageKey, base64String);
                console.log('💾 База данных сохранена');
            }
        } catch (error) {
            console.error('❌ Ошибка сохранения базы данных:', error);
        }
    }

    // Конвертация в base64
    uint8ArrayToBase64(uint8Array) {
        let binary = '';
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        return btoa(binary);
    }

    // Конвертация из base64
    base64ToUint8Array(base64) {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    // МЕТОДЫ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ

    // Получить пользователя по логину
    getUserByUsername(username) {
        try {
            const result = this.db.exec(`
                SELECT id, username, password, name, email, role, department, 
                       created_date, isActive, permissions, lastLogin
                FROM users WHERE username = ? AND isActive = 1
            `, [username]);
            
            if (result.length === 0 || result[0].values.length === 0) {
                return null;
            }
            
            const userData = result[0].values[0];
            return {
                id: userData[0],
                username: userData[1],
                password: userData[2],
                name: userData[3],
                email: userData[4],
                role: userData[5],
                department: userData[6],
                created_date: userData[7],
                isActive: userData[8] === 1,
                permissions: userData[9] ? JSON.parse(userData[9]) : [],
                lastLogin: userData[10]
            };
        } catch (error) {
            console.error('❌ Ошибка поиска пользователя:', error);
            return null;
        }
    }

    // Получить всех пользователей
    getAllUsers() {
        try {
            const result = this.db.exec(`
                SELECT id, username, name, email, role, department, 
                       created_date, isActive, permissions, lastLogin
                FROM users 
                ORDER BY created_date DESC
            `);
            
            if (result.length === 0) return [];
            
            return result[0].values.map(row => ({
                id: row[0],
                username: row[1],
                name: row[2],
                email: row[3],
                role: row[4],
                department: row[5],
                created_date: row[6],
                isActive: row[7] === 1,
                permissions: row[8] ? JSON.parse(row[8]) : [],
                lastLogin: row[9]
            }));
        } catch (error) {
            console.error('❌ Ошибка получения пользователей:', error);
            return [];
        }
    }

    // Создать пользователя
    createUser(userData) {
        try {
            const timestamp = new Date().toISOString();
            const permissions = JSON.stringify(userData.permissions || []);

            this.db.run(`
                INSERT INTO users (username, password, name, email, role, department, 
                                 created_date, isActive, permissions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userData.username,
                userData.password,
                userData.name,
                userData.email,
                userData.role,
                userData.department,
                timestamp,
                1,
                permissions
            ]);

            this.saveDatabase();
            console.log('✅ Пользователь создан:', userData.username);
            return true;

        } catch (error) {
            console.error('❌ Ошибка создания пользователя:', error);
            throw error;
        }
    }

    // Обновить пользователя
    updateUser(userId, updates) {
        try {
            const setClauses = [];
            const values = [];

            Object.keys(updates).forEach(key => {
                setClauses.push(`${key} = ?`);
                values.push(updates[key]);
            });

            values.push(userId);

            const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`;
            this.db.run(query, values);

            this.saveDatabase();
            console.log('✅ Пользователь обновлен:', userId);
            return true;

        } catch (error) {
            console.error('❌ Ошибка обновления пользователя:', error);
            throw error;
        }
    }

    // Удалить пользователя
    deleteUser(userId) {
        try {
            this.db.run('DELETE FROM users WHERE id = ?', [userId]);
            this.saveDatabase();
            console.log('✅ Пользователь удален:', userId);
            return true;

        } catch (error) {
            console.error('❌ Ошибка удаления пользователя:', error);
            throw error;
        }
    }

    // МЕТОДЫ ДЛЯ ПОДРАЗДЕЛЕНИЙ

    // Получить все подразделения
    getAllDepartments() {
        try {
            const result = this.db.exec(`
                SELECT d.*, 
                       (SELECT COUNT(*) FROM categories c WHERE c.department_id = d.id) as categories_count
                FROM departments d 
                ORDER BY d.name
            `);
            
            if (result.length === 0) return [];
            
            return result[0].values.map(row => ({
                id: row[0],
                name: row[1],
                description: row[2],
                created_date: row[3],
                categories_count: row[4] || 0
            }));
        } catch (error) {
            console.error('❌ Ошибка получения подразделений:', error);
            return [];
        }
    }

    // Создать подразделение
    createDepartment(departmentData) {
        try {
            const timestamp = new Date().toISOString();

            this.db.run(`
                INSERT INTO departments (name, description, created_date)
                VALUES (?, ?, ?)
            `, [
                departmentData.name,
                departmentData.description,
                timestamp
            ]);

            this.saveDatabase();
            console.log('✅ Подразделение создано:', departmentData.name);
            return true;

        } catch (error) {
            console.error('❌ Ошибка создания подразделения:', error);
            throw error;
        }
    }

    // Удалить подразделение
    deleteDepartment(departmentId) {
        try {
            this.db.run('DELETE FROM departments WHERE id = ?', [departmentId]);
            this.saveDatabase();
            console.log('✅ Подразделение удалено:', departmentId);
            return true;

        } catch (error) {
            console.error('❌ Ошибка удаления подразделения:', error);
            throw error;
        }
    }

    // МЕТОДЫ ДЛЯ КАТЕГОРИЙ

    // Получить все категории
    getAllCategories() {
        try {
            const result = this.db.exec(`
                SELECT c.*, d.name as department_name
                FROM categories c 
                LEFT JOIN departments d ON c.department_id = d.id 
                ORDER BY d.name, c.name
            `);
            
            if (result.length === 0) return [];
            
            return result[0].values.map(row => ({
                id: row[0],
                name: row[1],
                description: row[2],
                department_id: row[3],
                created_date: row[4],
                department_name: row[5]
            }));
        } catch (error) {
            console.error('❌ Ошибка получения категорий:', error);
            return [];
        }
    }

    // Получить категории по подразделению
    getCategoriesByDepartment(departmentId) {
        try {
            const result = this.db.exec(`
                SELECT c.*, d.name as department_name
                FROM categories c 
                LEFT JOIN departments d ON c.department_id = d.id 
                WHERE c.department_id = ?
                ORDER BY c.name
            `, [departmentId]);
            
            if (result.length === 0) return [];
            
            return result[0].values.map(row => ({
                id: row[0],
                name: row[1],
                description: row[2],
                department_id: row[3],
                created_date: row[4],
                department_name: row[5]
            }));
        } catch (error) {
            console.error('❌ Ошибка получения категорий подразделения:', error);
            return [];
        }
    }

    // Создать категорию
    createCategory(categoryData) {
        try {
            const timestamp = new Date().toISOString();

            this.db.run(`
                INSERT INTO categories (name, description, department_id, created_date)
                VALUES (?, ?, ?, ?)
            `, [
                categoryData.name,
                categoryData.description,
                categoryData.departmentId,
                timestamp
            ]);

            this.saveDatabase();
            console.log('✅ Категория создана:', categoryData.name);
            return true;

        } catch (error) {
            console.error('❌ Ошибка создания категории:', error);
            throw error;
        }
    }

    // Удалить категорию
    deleteCategory(categoryId) {
        try {
            this.db.run('DELETE FROM categories WHERE id = ?', [categoryId]);
            this.saveDatabase();
            console.log('✅ Категория удалена:', categoryId);
            return true;

        } catch (error) {
            console.error('❌ Ошибка удаления категории:', error);
            throw error;
        }
    }

    // МЕТОДЫ ДЛЯ ЗАЯВОК

    // Получить все заявки
    getAllTickets() {
        try {
            const result = this.db.exec(`
                SELECT t.*, 
                       d.name as department_name,
                       c.name as category_name
                FROM tickets t 
                LEFT JOIN departments d ON t.department_id = d.id 
                LEFT JOIN categories c ON t.category_id = c.id 
                ORDER BY t.created_date DESC
            `);
            
            if (result.length === 0) return [];
            
            return result[0].values.map(row => ({
                id: row[0],
                title: row[1],
                description: row[2],
                status: row[3],
                priority: row[4],
                department_id: row[5],
                category_id: row[6],
                created_by: row[7],
                assigned_to: row[8],
                created_date: row[9],
                updated_date: row[10],
                department_name: row[11],
                category_name: row[12]
            }));
        } catch (error) {
            console.error('❌ Ошибка получения заявок:', error);
            return [];
        }
    }

    // Получить заявки пользователя
    getTicketsByUser(userId) {
        try {
            const result = this.db.exec(`
                SELECT t.*, 
                       d.name as department_name,
                       c.name as category_name
                FROM tickets t 
                LEFT JOIN departments d ON t.department_id = d.id 
                LEFT JOIN categories c ON t.category_id = c.id 
                WHERE t.created_by = ?
                ORDER BY t.created_date DESC
            `, [userId]);
            
            if (result.length === 0) return [];
            
            return result[0].values.map(row => ({
                id: row[0],
                title: row[1],
                description: row[2],
                status: row[3],
                priority: row[4],
                department_id: row[5],
                category_id: row[6],
                created_by: row[7],
                assigned_to: row[8],
                created_date: row[9],
                updated_date: row[10],
                department_name: row[11],
                category_name: row[12]
            }));
        } catch (error) {
            console.error('❌ Ошибка получения заявок пользователя:', error);
            return [];
        }
    }

    // Создать заявку
    createTicket(ticketData) {
        try {
            const timestamp = new Date().toISOString();

            this.db.run(`
                INSERT INTO tickets (title, description, status, priority, department_id, category_id, created_by, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ticketData.title,
                ticketData.description,
                ticketData.status || 'open',
                ticketData.priority || 'medium',
                ticketData.departmentId,
                ticketData.categoryId,
                ticketData.createdBy,
                timestamp
            ]);

            this.saveDatabase();
            console.log('✅ Заявка создана:', ticketData.title);
            return true;

        } catch (error) {
            console.error('❌ Ошибка создания заявки:', error);
            throw error;
        }
    }

    // Обновить заявку
    updateTicket(ticketId, updates) {
        try {
            updates.updated_date = new Date().toISOString();
            const setClauses = [];
            const values = [];

            Object.keys(updates).forEach(key => {
                setClauses.push(`${key} = ?`);
                values.push(updates[key]);
            });

            values.push(ticketId);

            const query = `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = ?`;
            this.db.run(query, values);

            this.saveDatabase();
            console.log('✅ Заявка обновлена:', ticketId);
            return true;

        } catch (error) {
            console.error('❌ Ошибка обновления заявки:', error);
            throw error;
        }
    }

    // Удалить заявку
    deleteTicket(ticketId) {
        try {
            this.db.run('DELETE FROM tickets WHERE id = ?', [ticketId]);
            this.saveDatabase();
            console.log('✅ Заявка удалена:', ticketId);
            return true;

        } catch (error) {
            console.error('❌ Ошибка удаления заявки:', error);
            throw error;
        }
    }

    // Получить статистику заявок
    getTicketsStats() {
        try {
            const total = this.db.exec("SELECT COUNT(*) FROM tickets")[0]?.values[0][0] || 0;
            const open = this.db.exec("SELECT COUNT(*) FROM tickets WHERE status = 'open'")[0]?.values[0][0] || 0;
            const inProgress = this.db.exec("SELECT COUNT(*) FROM tickets WHERE status = 'in-progress'")[0]?.values[0][0] || 0;
            const resolved = this.db.exec("SELECT COUNT(*) FROM tickets WHERE status = 'resolved'")[0]?.values[0][0] || 0;
            
            return {
                total: total,
                open: open,
                inProgress: inProgress,
                resolved: resolved
            };
        } catch (error) {
            console.error('❌ Ошибка получения статистики:', error);
            return { total: 0, open: 0, inProgress: 0, resolved: 0 };
        }
    }
}

// Создаем глобальный экземпляр
window.sqlDB = new SQLDatabase();

// Глобальные функции для исправления
window.fixDatabase = function() {
    console.log('🔧 Исправление базы данных...');
    if (window.sqlDB && window.sqlDB.db) {
        window.sqlDB.recreateTables();
        alert('✅ База данных исправлена! Попробуйте войти снова.');
    } else {
        alert('❌ База данных не инициализирована. Перезагрузите страницу.');
    }
};

window.recreateAdmin = function() {
    console.log('👑 Принудительное создание администратора...');
    if (window.sqlDB && window.sqlDB.db) {
        window.sqlDB.createDefaultAdmin();
        alert('✅ Администратор создан! Логин: admin, Пароль: Fghtkm123');
    } else {
        alert('❌ База данных не инициализирована.');
    }
};