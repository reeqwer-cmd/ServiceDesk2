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
                    permissions: ['create_users', 'edit_users', 'delete_users', 'manage_tickets', 'view_reports']
                }
            ];
            localStorage.setItem('users', JSON.stringify(defaultUsers));
        }
    }

    login(username, password) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.password === password && 
            u.isActive === true
        );
        
        if (user) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            console.log('✅ Успешный вход:', user.name, `(${user.role})`);
            return true;
        }
        
        console.log('❌ Ошибка входа для пользователя:', username);
        return false;
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

    // User management methods
    createUser(userData) {
        if (!this.hasPermission('create_users')) {
            throw new Error('Недостаточно прав для создания пользователей');
        }

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
    }

    updateUser(userId, userData) {
        if (!this.hasPermission('edit_users')) {
            throw new Error('Недостаточно прав для редактирования пользователей');
        }

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
    }

    deleteUser(userId) {
        if (!this.hasPermission('delete_users')) {
            throw new Error('Недостаточно прав для удаления пользователей');
        }

        if (this.currentUser && this.currentUser.id === userId) {
            throw new Error('Нельзя удалить свою учетную запись');
        }

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const updatedUsers = users.filter(u => u.id !== userId);
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        
        return true;
    }

    getAllUsers() {
        if (!this.hasPermission('create_users')) {
            return [];
        }
        return JSON.parse(localStorage.getItem('users') || '[]');
    }

    getPermissionsByRole(role) {
        const permissions = {
            'admin': ['create_users', 'edit_users', 'delete_users', 'manage_tickets', 'view_reports'],
            'manager': ['manage_tickets', 'view_reports'],
            'user': ['create_tickets']
        };
        return permissions[role] || permissions['user'];
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

        if (auth.login(username, password)) {
            window.location.href = 'dashboard.html';
        } else {
            errorMessage.textContent = 'Неверный логин или пароль';
            errorMessage.style.display = 'block';
        }
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