// js/sql-database.js
class SQLDatabase {
    constructor() {
        this.db = null;
        this.storageKey = 'service_desk_sql_db';
        this.init();
    }

    async init() {
        try {
            // Загружаем SQL.js
            const SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });

            // Восстанавливаем базу из localStorage или создаем новую
            const savedDb = localStorage.getItem(this.storageKey);
            
            if (savedDb) {
                // Конвертируем base64 обратно в Uint8Array
                const data = this.base64ToUint8Array(savedDb);
                this.db = new SQL.Database(data);
                console.log('✅ База данных восстановлена из localStorage');
            } else {
                this.db = new SQL.Database();
                console.log('✅ Новая база данных создана');
            }
            
            // Инициализируем таблицы
            this.initializeTables();
            
        } catch (error) {
            console.error('❌ Ошибка инициализации базы данных:', error);
            this.useFallback = true;
        }
    }

    // Сохраняем базу в localStorage
    saveDatabase() {
        if (this.db) {
            try {
                const data = this.db.export();
                const base64 = this.uint8ArrayToBase64(data);
                localStorage.setItem(this.storageKey, base64);
                console.log('💾 База данных сохранена');
            } catch (error) {
                console.error('❌ Ошибка сохранения базы:', error);
            }
        }
    }

    // Конвертируем Uint8Array в base64
    uint8ArrayToBase64(uint8Array) {
        let binary = '';
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        return btoa(binary);
    }

    // Конвертируем base64 в Uint8Array
    base64ToUint8Array(base64) {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    initializeTables() {
        // Таблица пользователей
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                department TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                is_active BOOLEAN DEFAULT 1,
                permissions TEXT,
                created_by TEXT
            )
        `);

        // Таблица заявок
        this.db.run(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                priority TEXT NOT NULL,
                category TEXT NOT NULL,
                status TEXT DEFAULT 'open',
                created_by TEXT NOT NULL,
                assigned_to TEXT,
                created DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Проверяем есть ли администратор
        const adminCheck = this.db.exec("SELECT * FROM users WHERE username = 'admin'");
        if (adminCheck[0]?.values.length === 0) {
            this.createAdminUser();
        } else {
            // ОБНОВЛЯЕМ существующего admin чтобы права были правильными
            this.fixAdminPermissions();
        }

        // Запускаем миграции для исправления возможных проблем
        this.runMigrations();

        this.saveDatabase(); // Сохраняем после инициализации
        console.log('✅ Таблицы базы данных созданы');
    }

    // Добавить метод для исправления прав администратора
    fixAdminPermissions() {
        const adminPermissions = JSON.stringify(this.getAdminPermissions());
        
        this.db.run(
            "UPDATE users SET role = 'admin', permissions = ? WHERE username = 'admin'",
            [adminPermissions]
        );
        console.log('🔧 Права администратора проверены и исправлены');
    }

    // Добавить метод для миграций
    runMigrations() {
        console.log('🔄 Запуск миграций базы данных...');
        
        const migrations = [
            // Миграция 1: исправить права администраторов
            `UPDATE users SET permissions = '${JSON.stringify(this.getAdminPermissions())}' 
             WHERE role = 'admin' AND permissions NOT LIKE '%create_users%'`,
            
            // Миграция 2: убедиться что admin имеет роль admin
            `UPDATE users SET role = 'admin' WHERE username = 'admin' AND role != 'admin'`,
            
            // Миграция 3: добавить отсутствующие права для существующих пользователей
            `UPDATE users SET permissions = '${JSON.stringify(this.getPermissionsByRole('admin'))}' 
             WHERE username = 'admin'`
        ];
        
        migrations.forEach((migration, index) => {
            try {
                this.db.exec(migration);
                console.log(`✅ Миграция ${index + 1} выполнена`);
            } catch (error) {
                console.warn(`⚠️ Миграция ${index + 1} пропущена:`, error.message);
            }
        });
    }

    createAdminUser() {
        const adminUser = {
            username: 'admin',
            password: 'Fghtkm123',
            name: 'Главный Администратор',
            email: 'admin@company.com',
            department: 'IT',
            role: 'admin',
            permissions: JSON.stringify(this.getAdminPermissions()),
            created_by: 'system'
        };

        this.db.run(`
            INSERT INTO users (username, password, name, email, department, role, permissions, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            adminUser.username,
            adminUser.password,
            adminUser.name,
            adminUser.email,
            adminUser.department,
            adminUser.role,
            adminUser.permissions,
            adminUser.created_by
        ]);

        this.saveDatabase(); // Сохраняем после создания админа
        console.log('✅ Администратор создан в SQL базе');
    }

    // Методы для работы с пользователями
    async createUser(userData) {
        try {
            // ЗАЩИТА: проверяем что не перезаписываем администратора
            if (userData.username !== 'admin') {
                const adminCheck = this.db.exec("SELECT id FROM users WHERE username = 'admin'");
                if (adminCheck[0]?.values.length > 0) {
                    const adminId = adminCheck[0].values[0][0];
                    console.log('🔒 Admin ID защищен:', adminId);
                }
            }

            // Проверяем уникальность логина
            const usernameCheck = this.db.exec(
                "SELECT id FROM users WHERE username = ?", 
                [userData.username]
            );
            
            if (usernameCheck[0]?.values.length > 0) {
                throw new Error('Пользователь с таким логином уже существует');
            }

            // Проверяем уникальность email
            const emailCheck = this.db.exec(
                "SELECT id FROM users WHERE email = ?", 
                [userData.email]
            );
            
            if (emailCheck[0]?.values.length > 0) {
                throw new Error('Пользователь с таким email уже существует');
            }

            const permissions = this.getPermissionsByRole(userData.role);

            this.db.run(`
                INSERT INTO users (username, password, name, email, department, role, permissions, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userData.username,
                userData.password,
                userData.name,
                userData.email,
                userData.department,
                userData.role,
                JSON.stringify(permissions),
                userData.createdBy || 'system'
            ]);

            this.saveDatabase(); // Сохраняем после создания пользователя
            
            console.log('✅ Пользователь создан в SQL базе:', userData.username);
            return this.getUserByUsername(userData.username);
            
        } catch (error) {
            console.error('❌ Ошибка создания пользователя:', error);
            throw error;
        }
    }

    async getUserByUsername(username) {
        try {
            const result = this.db.exec(
                "SELECT * FROM users WHERE username = ?", 
                [username]
            );
            
            if (result[0]?.values.length > 0) {
                const user = this.mapUserFromDB(result[0].values[0], result[0].columns);
                return user;
            }
            return null;
        } catch (error) {
            console.error('❌ Ошибка получения пользователя:', error);
            return null;
        }
    }

    async getAllUsers() {
        try {
            const result = this.db.exec("SELECT * FROM users ORDER BY created DESC");
            if (result[0]?.values.length > 0) {
                return result[0].values.map(row => 
                    this.mapUserFromDB(row, result[0].columns)
                );
            }
            return [];
        } catch (error) {
            console.error('❌ Ошибка получения пользователей:', error);
            return [];
        }
    }

    async updateUser(userId, updates) {
        try {
            // ЗАЩИТА: Не позволяем изменить роль или права администратора
            const user = await this.getUserById(userId);
            if (user && user.username === 'admin') {
                if (updates.role && updates.role !== 'admin') {
                    throw new Error('Нельзя изменить роль администратора');
                }
                if (updates.permissions) {
                    console.warn('⚠️ Права администратора защищены от изменений');
                    delete updates.permissions; // Игнорируем попытку изменить права
                }
                if (updates.username && updates.username !== 'admin') {
                    throw new Error('Нельзя изменить логин администратора');
                }
            }

            const setClause = [];
            const values = [];

            // Преобразуем названия полей для SQL
            const fieldMap = {
                isActive: 'is_active',
                lastLogin: 'last_login',
                createdBy: 'created_by'
            };

            Object.keys(updates).forEach(key => {
                const dbField = fieldMap[key] || key;
                
                if (dbField === 'permissions' && typeof updates[key] === 'object') {
                    setClause.push(`${dbField} = ?`);
                    values.push(JSON.stringify(updates[key]));
                } else {
                    setClause.push(`${dbField} = ?`);
                    values.push(updates[key]);
                }
            });

            values.push(userId);

            this.db.run(
                `UPDATE users SET ${setClause.join(', ')} WHERE id = ?`,
                values
            );

            this.saveDatabase(); // Сохраняем после обновления
            
            console.log('✅ Пользователь обновлен, ID:', userId);
            return this.getUserById(userId);
            
        } catch (error) {
            console.error('❌ Ошибка обновления пользователя:', error);
            throw error;
        }
    }

    async getUserById(userId) {
        try {
            const result = this.db.exec(
                "SELECT * FROM users WHERE id = ?", 
                [userId]
            );
            
            if (result[0]?.values.length > 0) {
                return this.mapUserFromDB(result[0].values[0], result[0].columns);
            }
            return null;
        } catch (error) {
            console.error('❌ Ошибка получения пользователя:', error);
            return null;
        }
    }

    async deleteUser(userId) {
        try {
            // ЗАЩИТА: Не позволяем удалить администратора
            const user = await this.getUserById(userId);
            if (user && user.username === 'admin') {
                throw new Error('Нельзя удалить администратора системы');
            }

            this.db.run("DELETE FROM users WHERE id = ?", [userId]);
            this.saveDatabase(); // Сохраняем после удаления
            console.log('✅ Пользователь удален, ID:', userId);
            return true;
        } catch (error) {
            console.error('❌ Ошибка удаления пользователя:', error);
            throw error;
        }
    }

    mapUserFromDB(row, columns) {
        const user = {};
        columns.forEach((col, index) => {
            // Преобразуем названия полей обратно
            const fieldMap = {
                'is_active': 'isActive',
                'last_login': 'lastLogin', 
                'created_by': 'createdBy'
            };
            const fieldName = fieldMap[col] || col;
            user[fieldName] = row[index];
        });

        // Парсим permissions из JSON строки
        if (user.permissions) {
            try {
                user.permissions = JSON.parse(user.permissions);
            } catch {
                user.permissions = [];
            }
        }

        // Преобразуем булевы значения
        if (user.isActive !== undefined) {
            user.isActive = Boolean(user.isActive);
        }

        return user;
    }

    getPermissionsByRole(role) {
        const permissions = {
            'admin': this.getAdminPermissions(),
            'manager': [
                'manage_tickets', 'view_reports', 'assign_tickets',
                'edit_tickets', 'close_tickets'
            ],
            'user': [
                'create_tickets', 'view_own_tickets', 'edit_own_tickets'
            ]
        };
        
        // Всегда возвращаем права, даже если роль не найдена
        return permissions[role] || permissions['user'];
    }

    // Добавить отдельный метод для прав администратора
    getAdminPermissions() {
        return [
            'create_users', 'edit_users', 'delete_users', 
            'manage_tickets', 'view_reports', 'system_settings',
            'export_data', 'manage_categories'
        ];
    }

    // Отладочная информация
    getDatabaseInfo() {
        try {
            const userCount = this.db.exec("SELECT COUNT(*) as count FROM users")[0]?.values[0][0] || 0;
            const adminCheck = this.db.exec("SELECT role, permissions FROM users WHERE username = 'admin'");
            let adminInfo = 'Не найден';
            
            if (adminCheck[0]?.values.length > 0) {
                const admin = adminCheck[0].values[0];
                adminInfo = `Роль: ${admin[0]}, Прав: ${JSON.parse(admin[1]).length}`;
            }
            
            return {
                totalUsers: userCount,
                adminUser: adminInfo,
                storageSize: localStorage.getItem(this.storageKey)?.length || 0,
                storageKey: this.storageKey
            };
        } catch (error) {
            return { error: error.message };
        }
    }
}

// Создаем глобальный экземпляр базы данных
window.sqlDB = new SQLDatabase();

// Отладочные команды для консоли
console.log(`
🎮 Команды для отладки базы данных:

// Проверить состояние базы
sqlDB.getDatabaseInfo()

// Проверить всех пользователей
sqlDB.getAllUsers().then(users => console.log('Пользователи:', users))

// Проверить администратора
sqlDB.getUserByUsername('admin').then(admin => console.log('Админ:', admin))

// Проверить localStorage
Object.keys(localStorage).forEach(key => console.log(key + ':', localStorage[key].length + ' chars'))
`);