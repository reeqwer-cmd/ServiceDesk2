// js/auth.js
class AuthService {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        const user = localStorage.getItem('currentUser');
        if (user) {
            this.currentUser = JSON.parse(user);
        }
        this.initializeDefaultUsers();
    }

    initializeDefaultUsers() {
        if (!localStorage.getItem('users')) {
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
                    isActive: true,
                    permissions: this.getAdminPermissions()
                }
            ];
            localStorage.setItem('users', JSON.stringify(defaultUsers));
        }
    }

    async login(username, password) {
        try {
            console.log('🔐 Попытка входа для пользователя:', username);
            
            // Пытаемся использовать SQL базу
            if (window.sqlDB && window.sqlDB.db) {
                console.log('📊 Используем SQL базу данных');
                const user = await window.sqlDB.getUserByUsername(username);
                console.log('👤 Результат поиска в SQL:', user);
                
                if (user && user.password === password && user.isActive === true) {
                    console.log('✅ Пароль и статус верны');
                    
                    // ПРОВЕРКА ЦЕЛОСТНОСТИ ПРАВ ПРИ ВХОДЕ
                    if (!this.validateUserPermissions(user)) {
                        console.warn('⚠️ Обнаружены проблемы с правами пользователя, исправляем...');
                        await this.fixUserPermissions(user);
                    }
                    
                    this.currentUser = user;
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    
                    // Обновляем время последнего входа
                    try {
                        await window.sqlDB.updateUser(user.id, {
                            lastLogin: new Date().toISOString()
                        });
                        console.log('🕐 Время входа обновлено');
                    } catch (updateError) {
                        console.warn('⚠️ Не удалось обновить время входа:', updateError);
                    }
                    
                    console.log('✅ Успешный вход через SQL:', user.name);
                    return true;
                } else {
                    console.log('❌ SQL аутентификация не удалась:', {
                        userFound: !!user,
                        passwordMatch: user ? user.password === password : false,
                        isActive: user ? user.isActive : false
                    });
                }
            }
            
            // Fallback на localStorage
            console.log('🔄 Используем localStorage как fallback');
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => 
                u.username.toLowerCase() === username.toLowerCase() && 
                u.password === password && 
                u.isActive === true
            );
            
            if (user) {
                console.log('✅ Успешный вход через localStorage:', user.name);
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                return true;
            }
            
            console.log('❌ Аутентификация не удалась во всех методах');
            return false;
        } catch (error) {
            console.error('💥 Ошибка входа:', error);
            return false;
        }
    }

    logout() {
        console.log('🚪 Выход пользователя:', this.currentUser?.name);
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    hasPermission(permission) {
        return this.currentUser && 
               this.currentUser.permissions && 
               this.currentUser.permissions.includes(permission);
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    requirePermission(permission) {
        if (!this.isAuthenticated() || !this.hasPermission(permission)) {
            alert('Недостаточно прав для выполнения этого действия');
            return false;
        }
        return true;
    }

    // ДОБАВИТЬ: Проверка целостности прав пользователя
    validateUserPermissions(user) {
        if (!user || !user.role || !user.permissions) {
            return false;
        }
        
        const expectedPermissions = this.getPermissionsByRole(user.role);
        const hasAllPermissions = expectedPermissions.every(perm => 
            user.permissions.includes(perm)
        );
        
        if (!hasAllPermissions) {
            console.warn(`⚠️ У пользователя ${user.username} неполные права для роли ${user.role}`);
            console.warn(`Ожидалось: ${expectedPermissions.join(', ')}`);
            console.warn(`Фактически: ${user.permissions.join(', ')}`);
            return false;
        }
        return true;
    }

    // ДОБАВИТЬ: Автоматическое исправление прав
    async fixUserPermissions(user) {
        try {
            const correctPermissions = this.getPermissionsByRole(user.role);
            console.log(`🔧 Исправление прав для ${user.username}:`, correctPermissions);
            
            if (window.sqlDB && window.sqlDB.db) {
                await window.sqlDB.updateUser(user.id, {
                    permissions: correctPermissions
                });
            }
            
            // Обновляем текущего пользователя если это он
            if (this.currentUser && this.currentUser.id === user.id) {
                this.currentUser.permissions = correctPermissions;
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            }
            
            console.log('✅ Права пользователя исправлены');
        } catch (error) {
            console.error('❌ Ошибка исправления прав:', error);
        }
    }

    // User management methods
    async createUser(userData) {
        if (!this.hasPermission('create_users')) {
            throw new Error('Недостаточно прав для создания пользователей');
        }

        try {
            // Пытаемся использовать SQL базу
            if (window.sqlDB && window.sqlDB.db) {
                userData.createdBy = this.currentUser.username;
                return await window.sqlDB.createUser(userData);
            }
            
            // Fallback на localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            
            if (users.find(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
                throw new Error('Пользователь с таким логином уже существует');
            }

            const newUser = {
                id: Date.now(),
                username: userData.username,
                password: userData.password,
                name: userData.name,
                email: userData.email,
                department: userData.department,
                role: userData.role || 'user',
                created: new Date().toISOString(),
                isActive: true,
                permissions: this.getPermissionsByRole(userData.role),
                createdBy: this.currentUser.username
            };

            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            
            return newUser;
        } catch (error) {
            console.error('Ошибка создания пользователя:', error);
            throw error;
        }
    }

    async updateUser(userId, userData) {
        if (!this.hasPermission('edit_users')) {
            throw new Error('Недостаточно прав для редактирования пользователей');
        }

        try {
            // Пытаемся использовать SQL базу
            if (window.sqlDB && window.sqlDB.db) {
                return await window.sqlDB.updateUser(userId, userData);
            }
            
            // Fallback на localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                throw new Error('Пользователь не найден');
            }

            if (userData.role) {
                userData.permissions = this.getPermissionsByRole(userData.role);
            }

            users[userIndex] = { ...users[userIndex], ...userData };
            localStorage.setItem('users', JSON.stringify(users));
            
            return users[userIndex];
        } catch (error) {
            console.error('Ошибка обновления пользователя:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        if (!this.hasPermission('delete_users')) {
            throw new Error('Недостаточно прав для удаления пользователей');
        }

        if (this.currentUser && this.currentUser.id === userId) {
            throw new Error('Нельзя удалить свою учетную запись');
        }

        try {
            // Пытаемся использовать SQL базу
            if (window.sqlDB && window.sqlDB.db) {
                return await window.sqlDB.deleteUser(userId);
            }
            
            // Fallback на localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const updatedUsers = users.filter(u => u.id !== userId);
            localStorage.setItem('users', JSON.stringify(updatedUsers));
            
            return true;
        } catch (error) {
            console.error('Ошибка удаления пользователя:', error);
            throw error;
        }
    }

    async getAllUsers() {
        if (!this.hasPermission('create_users')) {
            return [];
        }

        try {
            // Пытаемся использовать SQL базу
            if (window.sqlDB && window.sqlDB.db) {
                return await window.sqlDB.getAllUsers();
            }
            
            // Fallback на localStorage
            return JSON.parse(localStorage.getItem('users') || '[]');
        } catch (error) {
            console.error('Ошибка получения пользователей:', error);
            return [];
        }
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
        return permissions[role] || permissions['user'];
    }

    // ДОБАВИТЬ: Отдельный метод для прав администратора
    getAdminPermissions() {
        return [
            'create_users', 'edit_users', 'delete_users', 
            'manage_tickets', 'view_reports', 'system_settings',
            'export_data', 'manage_categories'
        ];
    }
}

const auth = new AuthService();

// Login form handler
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');

        console.log('📝 Обработка формы входа:', { username, password });
        
        auth.login(username, password).then(success => {
            if (success) {
                console.log('🎉 Перенаправление на dashboard');
                window.location.href = 'dashboard.html';
            } else {
                console.log('❌ Показать сообщение об ошибке');
                errorMessage.textContent = 'Неверный логин или пароль';
                errorMessage.style.display = 'block';
            }
        }).catch(error => {
            console.error('💥 Ошибка при входе:', error);
            errorMessage.textContent = 'Ошибка при входе в систему';
            errorMessage.style.display = 'block';
        });
    });
}

// Logout handler
if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        auth.logout();
    });
}

// Protect dashboard pages
if (window.location.pathname.includes('dashboard.html')) {
    if (!auth.requireAuth()) {
        window.location.href = 'login.html';
    }
}

// Добавим отладочную информацию
console.log('🔧 AuthService инициализирован');
console.log('👤 Текущий пользователь:', auth.currentUser);
console.log('🔐 Доступные пользователи в localStorage:', JSON.parse(localStorage.getItem('users') || '[]'));

// ДОБАВИТЬ: Административные команды для консоли
window.adminTools = {
    // Проверить целостность системы
    checkSystemHealth: async function() {
        const users = await window.sqlDB.getAllUsers();
        console.log('🔍 Проверка целостности системы:');
        users.forEach(user => {
            const isValid = auth.validateUserPermissions(user);
            console.log(`${isValid ? '✅' : '❌'} ${user.username} (${user.role}):`, 
                        isValid ? 'OK' : 'НЕПОЛНЫЕ ПРАВА');
        });
    },
    
    // Восстановить права администратора
    fixAdminRights: async function() {
        const adminUser = await window.sqlDB.getUserByUsername('admin');
        if (adminUser) {
            await auth.fixUserPermissions(adminUser);
            console.log('✅ Права администратора восстановлены');
        } else {
            console.log('❌ Администратор не найден');
        }
    },
    
    // Показать статистику прав
    showPermissionsStats: async function() {
        const users = await window.sqlDB.getAllUsers();
        console.log('📊 Статистика прав:');
        users.forEach(user => {
            console.log(`- ${user.username} (${user.role}): ${user.permissions.length} прав`);
        });
    }
};

console.log(`
🎮 АДМИНИСТРАТИВНЫЕ КОМАНДЫ:

adminTools.checkSystemHealth() - проверить целостность
adminTools.fixAdminRights()    - исправить права админа  
adminTools.showPermissionsStats() - статистика прав
`);