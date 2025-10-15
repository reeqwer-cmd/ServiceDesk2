// js/database.js
class UserDatabase {
    constructor() {
        this.dbName = 'service_desk_db';
        this.userStore = 'users';
        this.init();
    }

    init() {
        // Для простоты используем localStorage как "базу данных"
        // В реальном проекте здесь был бы IndexedDB или API к серверу
        if (!localStorage.getItem(this.dbName)) {
            this.initializeDatabase();
        }
    }

    initializeDatabase() {
        const defaultUsers = [
            { 
                id: 1, 
                username: 'admin', 
                password: 'Fghtkm123', 
                name: 'Главный Администратор', 
                role: 'admin',
                email: 'admin@company.com',
                department: 'IT',
                created: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                permissions: ['create_users', 'edit_users', 'delete_users', 'manage_tickets', 'view_reports', 'system_settings']
            }
        ];
        
        this.saveAllUsers(defaultUsers);
        console.log('✅ База данных инициализирована с администратором');
    }

    // Сохранить всех пользователей
    saveAllUsers(users) {
        const db = this.getDatabase();
        db.users = users;
        localStorage.setItem(this.dbName, JSON.stringify(db));
    }

    // Получить базу данных
    getDatabase() {
        return JSON.parse(localStorage.getItem(this.dbName) || '{"users":[]}');
    }

    // Получить всех пользователей
    getAllUsers() {
        const db = this.getDatabase();
        return db.users || [];
    }

    // Найти пользователя по ID
    getUserById(id) {
        const users = this.getAllUsers();
        return users.find(user => user.id === id);
    }

    // Найти пользователя по логину
    getUserByUsername(username) {
        const users = this.getAllUsers();
        return users.find(user => user.username.toLowerCase() === username.toLowerCase());
    }

    // Создать нового пользователя
    createUser(userData) {
        const users = this.getAllUsers();
        
        // Проверка на уникальность логина
        if (this.getUserByUsername(userData.username)) {
            throw new Error('Пользователь с таким логином уже существует');
        }

        // Проверка на уникальность email
        if (users.find(user => user.email.toLowerCase() === userData.email.toLowerCase())) {
            throw new Error('Пользователь с таким email уже существует');
        }

        const newUser = {
            id: Date.now(), // Генерируем ID на основе времени
            username: userData.username,
            password: userData.password,
            name: userData.name,
            email: userData.email,
            department: userData.department,
            role: userData.role || 'user',
            created: new Date().toISOString(),
            lastLogin: null,
            isActive: true,
            permissions: this.getPermissionsByRole(userData.role),
            createdBy: JSON.parse(localStorage.getItem('currentUser'))?.username || 'system'
        };

        users.push(newUser);
        this.saveAllUsers(users);
        
        console.log('✅ Пользователь создан в базе:', newUser);
        return newUser;
    }

    // Обновить пользователя
    updateUser(userId, updates) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex === -1) {
            throw new Error('Пользователь не найден');
        }

        // Обновляем права при смене роли
        if (updates.role) {
            updates.permissions = this.getPermissionsByRole(updates.role);
        }

        users[userIndex] = { ...users[userIndex], ...updates };
        this.saveAllUsers(users);
        
        console.log('✅ Пользователь обновлен:', users[userIndex]);
        return users[userIndex];
    }

    // Удалить пользователя
    deleteUser(userId) {
        const users = this.getAllUsers();
        const updatedUsers = users.filter(user => user.id !== userId);
        this.saveAllUsers(updatedUsers);
        
        console.log('✅ Пользователь удален, ID:', userId);
        return true;
    }

    // Обновить время последнего входа
    updateLastLogin(username) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(user => user.username === username);
        
        if (userIndex !== -1) {
            users[userIndex].lastLogin = new Date().toISOString();
            this.saveAllUsers(users);
        }
    }

    // Получить права доступа по роли
    getPermissionsByRole(role) {
        const permissions = {
            'admin': [
                'create_users', 'edit_users', 'delete_users', 
                'manage_tickets', 'view_reports', 'system_settings',
                'export_data', 'manage_categories'
            ],
            'manager': [
                'manage_tickets', 'view_reports', 'assign_tickets',
                'edit_tickets', 'close_tickets'
            ],
            'user': [
                'create_tickets', 'view_own_tickets', 'edit_own_tickets'
            ]
        };
        
        return permissions[role] || permissions['user'];
    }

    // Поиск пользователей
    searchUsers(query, roleFilter = '') {
        let users = this.getAllUsers();
        
        if (query) {
            const searchTerm = query.toLowerCase();
            users = users.filter(user => 
                user.name.toLowerCase().includes(searchTerm) ||
                user.username.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm) ||
                user.department.toLowerCase().includes(searchTerm)
            );
        }
        
        if (roleFilter) {
            users = users.filter(user => user.role === roleFilter);
        }
        
        return users;
    }

    // Статистика пользователей
    getUserStats() {
        const users = this.getAllUsers();
        return {
            total: users.length,
            active: users.filter(u => u.isActive).length,
            admins: users.filter(u => u.role === 'admin').length,
            managers: users.filter(u => u.role === 'manager').length,
            regularUsers: users.filter(u => u.role === 'user').length
        };
    }

    // Экспорт пользователей (для админа)
    exportUsers() {
        const users = this.getAllUsers();
        const dataStr = JSON.stringify(users, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        return URL.createObjectURL(dataBlob);
    }
}

// Создаем глобальный экземпляр базы данных
window.userDB = new UserDatabase();

// Команды для отладки
console.log(`
🎮 КОМАНДЫ ДЛЯ РАБОТЫ С БАЗОЙ ДАННЫХ:

userDB.getAllUsers() - получить всех пользователей
userDB.getUserStats() - статистика пользователей
userDB.searchUsers("поиск") - поиск пользователей
userDB.exportUsers() - экспорт пользователей

📊 Текущая статистика:`, window.userDB.getUserStats());