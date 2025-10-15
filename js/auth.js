// js/auth.js
class AuthService {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Восстанавливаем пользователя из localStorage
        const user = localStorage.getItem('currentUser');
        if (user) {
            this.currentUser = JSON.parse(user);
        }
        
        console.log('🔧 AuthService инициализирован (localStorage)');
        console.log('👤 Текущий пользователь:', this.currentUser?.username || 'null');
    }

    async login(username, password) {
        try {
            console.log('🔐 Попытка входа:', username);
            
            // Ищем пользователя в localStorage
            const users = JSON.parse(localStorage.getItem('service_desk_users') || '[]');
            const user = users.find(u => 
                u.username === username && 
                u.password === password && 
                u.isActive !== false
            );

            if (user) {
                console.log('✅ Успешный вход:', user.name);
                
                // Обновляем время входа
                user.lastLogin = new Date().toISOString();
                localStorage.setItem('service_desk_users', JSON.stringify(users));
                
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                return true;
            } else {
                console.log('❌ Неверный логин или пароль');
                return false;
            }
        } catch (error) {
            console.error('💥 Ошибка входа:', error);
            return false;
        }
    }

    // Создание пользователя
    async createUser(userData) {
        try {
            if (!this.hasPermission('create_users')) {
                throw new Error('Недостаточно прав для создания пользователей');
            }

            const users = JSON.parse(localStorage.getItem('service_desk_users') || '[]');
            
            // Проверка на уникальность
            if (users.find(u => u.username === userData.username)) {
                throw new Error('Пользователь с таким логином уже существует');
            }

            const newUser = {
                id: Date.now(),
                ...userData,
                created_date: new Date().toISOString(),
                isActive: true,
                lastLogin: null,
                permissions: this.getPermissionsByRole(userData.role)
            };

            users.push(newUser);
            localStorage.setItem('service_desk_users', JSON.stringify(users));
            
            console.log('✅ Пользователь создан:', newUser.username);
            return newUser;

        } catch (error) {
            console.error('❌ Ошибка создания пользователя:', error);
            throw error;
        }
    }

    // Получение всех пользователей
    async getAllUsers() {
        try {
            return JSON.parse(localStorage.getItem('service_desk_users') || '[]');
        } catch (error) {
            console.error('❌ Ошибка получения пользователей:', error);
            return [];
        }
    }

    // Обновление пользователя
    async updateUser(userId, userData) {
        try {
            if (!this.hasPermission('edit_users')) {
                throw new Error('Недостаточно прав для редактирования пользователей');
            }

            const users = JSON.parse(localStorage.getItem('service_desk_users') || '[]');
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                throw new Error('Пользователь не найден');
            }

            // Обновляем права если изменилась роль
            if (userData.role) {
                userData.permissions = this.getPermissionsByRole(userData.role);
            }

            users[userIndex] = { ...users[userIndex], ...userData };
            localStorage.setItem('service_desk_users', JSON.stringify(users));
            
            console.log('✅ Пользователь обновлен:', userId);
            return users[userIndex];

        } catch (error) {
            console.error('❌ Ошибка обновления пользователя:', error);
            throw error;
        }
    }

    // Удаление пользователя
    async deleteUser(userId) {
        try {
            if (!this.hasPermission('delete_users')) {
                throw new Error('Недостаточно прав для удаления пользователей');
            }

            if (this.currentUser && this.currentUser.id === userId) {
                throw new Error('Нельзя удалить свою учетную запись');
            }

            const users = JSON.parse(localStorage.getItem('service_desk_users') || '[]');
            const updatedUsers = users.filter(u => u.id !== userId);
            localStorage.setItem('service_desk_users', JSON.stringify(updatedUsers));
            
            console.log('✅ Пользователь удален:', userId);
            return true;

        } catch (error) {
            console.error('❌ Ошибка удаления пользователя:', error);
            throw error;
        }
    }

    // Права доступа по роли
    getPermissionsByRole(role) {
        const permissions = {
            'admin': [
                'create_users', 'edit_users', 'delete_users', 
                'manage_tickets', 'view_reports', 'system_settings',
                'export_data', 'manage_categories', 'manage_departments'
            ],
            'manager': [
                'manage_tickets', 'view_reports', 'assign_tickets',
                'edit_tickets', 'close_tickets', 'view_users'
            ],
            'user': [
                'create_tickets', 'view_own_tickets', 'edit_own_tickets'
            ]
        };
        return permissions[role] || permissions['user'];
    }

    // Проверка прав
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
        if (!this.currentUser || !this.currentUser.permissions) {
            return false;
        }
        return this.currentUser.permissions.includes(permission);
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
}

// Создаем глобальный экземпляр
window.auth = new AuthService();

// Обработчик формы входа
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');

        // Показываем загрузку
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Вход...';
        submitBtn.disabled = true;

        window.auth.login(username, password).then(success => {
            if (success) {
                window.location.href = 'dashboard.html';
            } else {
                errorMessage.textContent = 'Неверный логин или пароль';
                errorMessage.style.display = 'block';
            }
        }).catch(error => {
            errorMessage.textContent = 'Ошибка при входе в систему';
            errorMessage.style.display = 'block';
        }).finally(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    });
}

// Обработчик выхода
if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        window.auth.logout();
    });
}

// Защита dashboard страниц
if (window.location.pathname.includes('dashboard.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.auth.isAuthenticated()) {
            window.location.href = 'login.html';
        }
    });
}