// js/app.js
class ServiceDeskApp {
    constructor() {
        this.tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTickets();
        this.loadUsers();
        this.updateUserInfo();
        this.updateReports();
        this.toggleAdminFeatures();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(item.dataset.tab);
            });
        });

        // Create ticket form
        if (document.getElementById('createTicketForm')) {
            document.getElementById('createTicketForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.createTicket();
            });
        }

        // Refresh button
        if (document.getElementById('refreshBtn')) {
            document.getElementById('refreshBtn').addEventListener('click', () => {
                this.loadTickets();
                this.updateReports();
            });
        }

        // User management
        if (document.getElementById('createUserBtn')) {
            document.getElementById('createUserBtn').addEventListener('click', () => {
                this.showCreateUserModal();
            });
        }

        // User search and filters
        if (document.getElementById('searchUsers')) {
            document.getElementById('searchUsers').addEventListener('input', () => {
                this.loadUserManagement();
            });
        }

        if (document.getElementById('roleFilter')) {
            document.getElementById('roleFilter').addEventListener('change', () => {
                this.loadUserManagement();
            });
        }
    }

    toggleAdminFeatures() {
        const adminTabs = document.querySelectorAll('.admin-only');
        const isAdmin = auth.isAdmin();
        
        adminTabs.forEach(tab => {
            tab.style.display = isAdmin ? 'block' : 'none';
        });
    }

    switchTab(tabName) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const targetContent = document.getElementById(tabName);
        if (targetContent) {
            targetContent.classList.add('active');
        }

        // Update content title
        const titles = {
            'tickets': 'Заявки',
            'create-ticket': 'Создать заявку',
            'users': 'Пользователи',
            'reports': 'Отчеты',
            'user-management': 'Управление пользователями'
        };
        
        if (document.getElementById('contentTitle')) {
            document.getElementById('contentTitle').textContent = titles[tabName] || 'Панель управления';
        }

        // Load specific tab data
        if (tabName === 'user-management') {
            this.loadUserManagement();
        }
    }

    async loadUserManagement() {
        if (!auth.isAdmin()) return;

        const searchQuery = document.getElementById('searchUsers')?.value || '';
        const roleFilter = document.getElementById('roleFilter')?.value || '';
        
        try {
            let users = await auth.getAllUsers();
            
            // Убедимся, что users - это массив
            if (!Array.isArray(users)) {
                console.error('users is not an array:', users);
                users = [];
            }
            
            // Apply filters
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                users = users.filter(user => 
                    user.name.toLowerCase().includes(query) ||
                    user.username.toLowerCase().includes(query) ||
                    user.email.toLowerCase().includes(query)
                );
            }
            
            if (roleFilter) {
                users = users.filter(user => user.role === roleFilter);
            }

            const usersList = document.getElementById('usersManagementList');
            if (!usersList) return;

            if (users.length === 0) {
                usersList.innerHTML = '<p class="no-users">Пользователи не найдены</p>';
                return;
            }

            usersList.innerHTML = users.map(user => `
                <div class="user-card ${user.role} ${user.id === auth.currentUser.id ? 'current-user' : ''}">
                    <div class="user-info">
                        <div class="user-main">
                            <strong>${user.name}</strong>
                            <span class="user-role ${user.role}">${this.getRoleText(user.role)}</span>
                        </div>
                        <div class="user-details">
                            <div><strong>Логин:</strong> ${user.username}</div>
                            <div><strong>Email:</strong> ${user.email}</div>
                            <div><strong>Отдел:</strong> ${user.department}</div>
                            <div><strong>Создан:</strong> ${new Date(user.created).toLocaleDateString()}</div>
                            <div><strong>Статус:</strong> 
                                <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                                    ${user.isActive ? 'Активен' : 'Неактивен'}
                                </span>
                            </div>
                            <div class="permissions-list">
                                ${(user.permissions || []).map(perm => `
                                    <span class="permission-tag">${this.getPermissionText(perm)}</span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="user-actions">
                        ${user.id !== auth.currentUser.id ? `
                            <button class="btn-small btn-edit" onclick="app.editUser(${user.id})">✏️ Редактировать</button>
                            <button class="btn-small btn-delete" onclick="app.deleteUser(${user.id})">🗑️ Удалить</button>
                            <button class="btn-small btn-toggle" onclick="app.toggleUserStatus(${user.id}, ${!user.isActive})">
                                ${user.isActive ? '🚫 Деактивировать' : '✅ Активировать'}
                            </button>
                        ` : '<span class="current-user-label">👆 Это вы</span>'}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            const usersList = document.getElementById('usersManagementList');
            if (usersList) {
                usersList.innerHTML = '<p class="no-users">Ошибка загрузки пользователей</p>';
            }
        }
    }

    showCreateUserModal() {
        const modalHTML = `
            <div class="modal-overlay" id="createUserModal">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Создать нового пользователя</h3>
                        <button class="modal-close" onclick="app.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="createUserForm">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="newUserName">ФИО:</label>
                                    <input type="text" id="newUserName" name="name" required>
                                </div>
                                <div class="form-group">
                                    <label for="newUserUsername">Логин:</label>
                                    <input type="text" id="newUserUsername" name="username" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="newUserEmail">Email:</label>
                                    <input type="email" id="newUserEmail" name="email" required>
                                </div>
                                <div class="form-group">
                                    <label for="newUserDepartment">Отдел:</label>
                                    <input type="text" id="newUserDepartment" name="department" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="newUserRole">Роль:</label>
                                    <select id="newUserRole" name="role" required>
                                        <option value="user">Пользователь</option>
                                        <option value="manager">Менеджер</option>
                                        <option value="admin">Администратор</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="newUserPassword">Пароль:</label>
                                    <input type="text" id="newUserPassword" name="password" required>
                                </div>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" onclick="app.closeModal()">Отмена</button>
                                <button type="submit" class="btn-primary">Создать пользователя</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        document.getElementById('createUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createNewUser();
        });
    }

    async createNewUser() {
        const form = document.getElementById('createUserForm');
        const formData = new FormData(form);

        try {
            const userData = {
                name: formData.get('name'),
                username: formData.get('username'),
                email: formData.get('email'),
                department: formData.get('department'),
                role: formData.get('role'),
                password: formData.get('password')
            };

            await auth.createUser(userData);
            this.closeModal();
            await this.loadUserManagement();
            this.showMessage('Пользователь успешно создан!', 'success');
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    async editUser(userId) {
        try {
            const users = await auth.getAllUsers();
            const user = users.find(u => u.id === userId);
            
            if (!user) return;

            const modalHTML = `
                <div class="modal-overlay" id="editUserModal">
                    <div class="modal">
                        <div class="modal-header">
                            <h3>Редактировать пользователя</h3>
                            <button class="modal-close" onclick="app.closeModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="editUserForm">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editUserName">ФИО:</label>
                                        <input type="text" id="editUserName" name="name" value="${user.name}" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="editUserEmail">Email:</label>
                                        <input type="email" id="editUserEmail" name="email" value="${user.email}" required>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editUserDepartment">Отдел:</label>
                                        <input type="text" id="editUserDepartment" name="department" value="${user.department}" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="editUserRole">Роль:</label>
                                        <select id="editUserRole" name="role" required>
                                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>Пользователь</option>
                                            <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Менеджер</option>
                                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Администратор</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" name="isActive" ${user.isActive ? 'checked' : ''}>
                                        Активный пользователь
                                    </label>
                                </div>
                                <div class="form-actions">
                                    <button type="button" class="btn-secondary" onclick="app.closeModal()">Отмена</button>
                                    <button type="submit" class="btn-primary">Сохранить изменения</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            document.getElementById('editUserForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.updateUser(userId);
            });
        } catch (error) {
            console.error('Ошибка редактирования пользователя:', error);
            this.showMessage('Ошибка загрузки данных пользователя', 'error');
        }
    }

    async updateUser(userId) {
        const form = document.getElementById('editUserForm');
        const formData = new FormData(form);

        try {
            const userData = {
                name: formData.get('name'),
                email: formData.get('email'),
                department: formData.get('department'),
                role: formData.get('role'),
                isActive: formData.get('isActive') === 'on'
            };

            await auth.updateUser(userId, userData);
            this.closeModal();
            await this.loadUserManagement();
            this.showMessage('Пользователь успешно обновлен!', 'success');
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
            return;
        }

        try {
            await auth.deleteUser(userId);
            await this.loadUserManagement();
            this.showMessage('Пользователь успешно удален!', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    async toggleUserStatus(userId, newStatus) {
        try {
            await auth.updateUser(userId, { isActive: newStatus });
            await this.loadUserManagement();
            this.showMessage(`Пользователь ${newStatus ? 'активирован' : 'деактивирован'}!`, 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => modal.remove());
    }

    showMessage(message, type = 'info') {
        const existingMessage = document.getElementById('flashMessage');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageHTML = `
            <div id="flashMessage" class="flash-message ${type}">
                ${message}
                <button onclick="this.parentElement.remove()">&times;</button>
            </div>
        `;

        document.body.insertAdjacentHTML('afterbegin', messageHTML);

        setTimeout(() => {
            const messageEl = document.getElementById('flashMessage');
            if (messageEl) {
                messageEl.remove();
            }
        }, 5000);
    }

    getRoleText(role) {
        const roles = {
            'admin': 'Администратор',
            'manager': 'Менеджер',
            'user': 'Пользователь'
        };
        return roles[role] || role;
    }

    getPermissionText(permission) {
        const permissions = {
            'create_users': 'Создание пользователей',
            'edit_users': 'Редактирование пользователей',
            'delete_users': 'Удаление пользователей',
            'manage_tickets': 'Управление заявками',
            'view_reports': 'Просмотр отчетов',
            'create_tickets': 'Создание заявок'
        };
        return permissions[permission] || permission;
    }

    loadTickets() {
        const ticketsList = document.getElementById('ticketsList');
        if (ticketsList) {
            ticketsList.innerHTML = '<p>Функционал заявок будет добавлен позже</p>';
        }
    }

    createTicket() {
        alert('Функционал создания заявок будет добавлен позже');
    }

    loadUsers() {
        const usersList = document.getElementById('usersList');
        if (usersList) {
            usersList.innerHTML = '<p>Список пользователей доступен в разделе "Управление пользователями" для администраторов</p>';
        }
    }

    updateUserInfo() {
        const userInfo = document.getElementById('userInfo');
        if (userInfo && this.currentUser) {
            userInfo.textContent = `Пользователь: ${this.currentUser.name} (${this.getRoleText(this.currentUser.role)})`;
        }
    }

    updateReports() {
        document.getElementById('totalTickets').textContent = '0';
        document.getElementById('openTickets').textContent = '0';
        document.getElementById('inProgressTickets').textContent = '0';
        document.getElementById('resolvedTickets').textContent = '0';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        window.app = new ServiceDeskApp();
    }
});