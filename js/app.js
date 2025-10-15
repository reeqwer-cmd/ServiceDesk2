// js/app.js
class App {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        this.currentTab = 'tickets';
        this.init();
    }

    async init() {
        console.log('🚀 Инициализация приложения...');
        this.initializeEventListeners();
        this.checkAdminPermissions();
        this.updateUserInfo();
        this.loadInitialData();
        
        // Показываем первую вкладку
        this.switchTab('tickets');
    }

    initializeEventListeners() {
        console.log('🔧 Инициализация обработчиков событий...');
        
        // Навигация по вкладкам
        document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = e.target.getAttribute('data-tab');
                console.log('📁 Переключение на вкладку:', tabName);
                this.switchTab(tabName);
            });
        });

        // Кнопка обновления
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refreshCurrentTab();
        });

        // Форма создания заявки
        document.getElementById('createTicketForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateTicket(new FormData(e.target));
        });

        // Динамическая загрузка категорий при выборе подразделения
        document.getElementById('ticketDepartment')?.addEventListener('change', async (e) => {
            await this.loadCategoriesForDepartment(e.target.value);
        });

        // Управление подразделениями и категориями
        document.getElementById('createDepartmentBtn')?.addEventListener('click', () => {
            this.showCreateDepartmentModal();
        });

        document.getElementById('createCategoryBtn')?.addEventListener('click', () => {
            this.showCreateCategoryModal();
        });

        // Вкладки управления
        document.querySelectorAll('.tab-button[data-subtab]').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchSubTab(e.target.getAttribute('data-subtab'));
            });
        });

        // Создание пользователя
        document.getElementById('createUserBtn')?.addEventListener('click', () => {
            this.showCreateUserModal();
        });

        // Фильтры заявок
        document.getElementById('statusFilter')?.addEventListener('change', () => {
            this.loadTickets();
        });

        document.getElementById('searchTickets')?.addEventListener('input', () => {
            this.loadTickets();
        });

        // Поиск пользователей
        document.getElementById('searchUsers')?.addEventListener('input', () => {
            this.loadUsersManagement();
        });

        document.getElementById('roleFilter')?.addEventListener('change', () => {
            this.loadUsersManagement();
        });

        console.log('✅ Все обработчики событий инициализированы');
    }

    switchTab(tabName) {
        console.log('🔄 Переключение на вкладку:', tabName);
        
        // Скрыть все вкладки
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Убрать активный класс со всех пунктов меню
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Показать выбранную вкладку
        const targetTab = document.getElementById(tabName);
        if (targetTab) {
            targetTab.classList.add('active');
            console.log('✅ Вкладка показана:', tabName);
        } else {
            console.error('❌ Вкладка не найдена:', tabName);
        }
        
        // Активировать пункт меню
        const targetNavItem = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active');
        }
        
        // Обновить заголовок
        const titleElement = document.getElementById('contentTitle');
        if (titleElement) {
            titleElement.textContent = this.getTabTitle(tabName);
        }
        
        // Загрузить данные для вкладки
        this.currentTab = tabName;
        this.loadTabData(tabName);
    }

    getTabTitle(tabName) {
        const titles = {
            'tickets': 'Заявки',
            'create-ticket': 'Создать заявку',
            'users': 'Пользователи',
            'departments-management': 'Управление подразделениями',
            'user-management': 'Управление пользователями',
            'reports': 'Отчеты'
        };
        return titles[tabName] || 'Панель управления';
    }

    async loadTabData(tabName) {
        console.log('📥 Загрузка данных для вкладки:', tabName);
        
        switch(tabName) {
            case 'tickets':
                await this.loadTickets();
                break;
            case 'create-ticket':
                await this.loadDepartmentsForForms();
                break;
            case 'users':
                await this.loadUsers();
                break;
            case 'departments-management':
                await this.loadDepartmentsAndCategories();
                break;
            case 'user-management':
                await this.loadUsersManagement();
                break;
            case 'reports':
                await this.loadReports();
                break;
        }
    }

    async loadInitialData() {
        console.log('📦 Загрузка начальных данных...');
        // Создаем тестовые подразделения и категории если их нет
        await this.createSampleData();
        await this.loadDepartmentsForForms();
    }

    async createSampleData() {
        const departments = window.dataManager.getDepartments();
        if (departments.length === 0) {
            console.log('📝 Создание тестовых данных...');
            
            // Создаем подразделения
            const itDept = window.dataManager.createDepartment({
                name: 'IT отдел',
                description: 'Отдел информационных технологий'
            });
            
            const hrDept = window.dataManager.createDepartment({
                name: 'HR отдел',
                description: 'Отдел кадров'
            });
            
            // Создаем категории для IT
            window.dataManager.createCategory({
                name: 'Проблемы с компьютером',
                description: 'Неисправности компьютеров и ноутбуков',
                department_id: itDept.id
            });
            
            window.dataManager.createCategory({
                name: 'Проблемы с сетью',
                description: 'Проблемы с интернетом и локальной сетью',
                department_id: itDept.id
            });
            
            // Создаем категории для HR
            window.dataManager.createCategory({
                name: 'Отпуска',
                description: 'Оформление отпусков',
                department_id: hrDept.id
            });
            
            console.log('✅ Тестовые данные созданы');
        }
    }

    updateUserInfo() {
        const userInfo = document.getElementById('userInfo');
        if (userInfo && this.currentUser.name) {
            userInfo.textContent = `Пользователь: ${this.currentUser.name} (${this.currentUser.role})`;
        }
    }

    checkAdminPermissions() {
        const isAdmin = window.auth?.isAdmin?.() || this.currentUser.role === 'admin';
        console.log('👑 Проверка прав администратора:', isAdmin);
        
        const adminElements = document.querySelectorAll('.admin-only');
        
        adminElements.forEach(element => {
            element.style.display = isAdmin ? 'block' : 'none';
        });
    }

    // ===== ЗАЯВКИ =====
    async loadTickets() {
        const container = document.getElementById('ticketsList');
        if (!container) {
            console.error('❌ Контейнер заявок не найден');
            return;
        }

        container.innerHTML = '<div class="empty-state">Загрузка заявок...</div>';

        try {
            let tickets;
            if (window.auth?.isAdmin?.()) {
                tickets = await window.ticketManager.getAllTickets();
            } else {
                tickets = await window.ticketManager.getUserTickets();
            }

            console.log('📋 Загружено заявок:', tickets.length);

            // Применяем фильтры
            const statusFilter = document.getElementById('statusFilter')?.value || '';
            const searchFilter = document.getElementById('searchTickets')?.value.toLowerCase() || '';

            if (statusFilter) {
                tickets = tickets.filter(ticket => ticket.status === statusFilter);
            }

            if (searchFilter) {
                tickets = tickets.filter(ticket => 
                    ticket.title.toLowerCase().includes(searchFilter) ||
                    (ticket.description && ticket.description.toLowerCase().includes(searchFilter))
                );
            }

            this.renderTicketsList(tickets, container);
        } catch (error) {
            console.error('❌ Ошибка загрузки заявок:', error);
            container.innerHTML = '<div class="empty-state">Ошибка загрузки заявок</div>';
        }
    }

    renderTicketsList(tickets, container) {
        if (!tickets || tickets.length === 0) {
            container.innerHTML = '<div class="empty-state">Заявки не найдены</div>';
            return;
        }

        container.innerHTML = tickets.map(ticket => {
            // Получаем названия подразделения и категории
            const departments = window.dataManager.getDepartments();
            const categories = window.dataManager.getCategories();
            
            const department = departments.find(d => d.id === ticket.department_id);
            const category = categories.find(c => c.id === ticket.category_id);

            return `
                <div class="ticket-item">
                    <div class="ticket-header">
                        <h3 class="ticket-title">${ticket.title || 'Без названия'}</h3>
                        <div class="ticket-meta">
                            <span class="ticket-badge ${window.ticketManager?.getStatusClass?.(ticket.status) || 'status-open'}">
                                ${window.ticketManager?.getStatusText?.(ticket.status) || ticket.status}
                            </span>
                            <span class="ticket-badge ${window.ticketManager?.getPriorityClass?.(ticket.priority) || 'priority-medium'}">
                                ${window.ticketManager?.getPriorityText?.(ticket.priority) || ticket.priority}
                            </span>
                        </div>
                    </div>
                    <div class="ticket-description">
                        ${ticket.description || 'Описание отсутствует'}
                    </div>
                    <div class="ticket-footer">
                        <div class="ticket-info">
                            <span>Подразделение: ${department?.name || 'Не указано'}</span>
                            <span>Категория: ${category?.name || 'Не указана'}</span>
                            <span>Создана: ${this.formatDate(ticket.created_date)}</span>
                        </div>
                        <div class="ticket-actions">
                            ${window.auth?.isAdmin?.() ? `
                                <button class="btn-secondary" onclick="app.editTicket(${ticket.id})">Редактировать</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async handleCreateTicket(formData) {
        try {
            const ticketData = {
                title: formData.get('title'),
                description: formData.get('description'),
                departmentId: parseInt(formData.get('departmentId')),
                categoryId: parseInt(formData.get('categoryId')),
                priority: formData.get('priority')
            };

            // Проверка обязательных полей
            if (!ticketData.title || !ticketData.departmentId || !ticketData.categoryId) {
                throw new Error('Заполните все обязательные поля');
            }

            await window.ticketManager.createTicket(ticketData);
            
            alert('✅ Заявка успешно создана!');
            document.getElementById('createTicketForm').reset();
            this.switchTab('tickets');
            
        } catch (error) {
            alert('❌ Ошибка при создании заявки: ' + error.message);
        }
    }

    // ===== ПОДРАЗДЕЛЕНИЯ И КАТЕГОРИИ =====
    async loadDepartmentsForForms() {
        const departmentSelect = document.getElementById('ticketDepartment');
        if (!departmentSelect) return;

        try {
            const departments = await window.departmentsManager?.getAllDepartments?.() || [];
            departmentSelect.innerHTML = '<option value="">Выберите подразделение</option>' +
                departments.map(dept => 
                    `<option value="${dept.id}">${dept.name}</option>`
                ).join('');
        } catch (error) {
            console.error('❌ Ошибка загрузки подразделений:', error);
        }
    }

    async loadCategoriesForDepartment(departmentId) {
        const categorySelect = document.getElementById('ticketCategory');
        if (!categorySelect) return;

        if (!departmentId) {
            categorySelect.innerHTML = '<option value="">Сначала выберите подразделение</option>';
            return;
        }

        try {
            const categories = await window.departmentsManager?.getCategoriesByDepartment?.(departmentId) || [];
            categorySelect.innerHTML = '<option value="">Выберите категорию</option>' +
                categories.map(cat => 
                    `<option value="${cat.id}">${cat.name}</option>`
                ).join('');
        } catch (error) {
            console.error('❌ Ошибка загрузки категорий:', error);
            categorySelect.innerHTML = '<option value="">Ошибка загрузки категорий</option>';
        }
    }

    async loadDepartmentsAndCategories() {
        await this.loadDepartmentsList();
        await this.loadCategoriesList();
    }

    async loadDepartmentsList() {
        try {
            const departments = await window.departmentsManager?.getAllDepartments?.() || [];
            this.renderDepartmentsList(departments);
        } catch (error) {
            console.error('❌ Ошибка загрузки подразделений:', error);
        }
    }

    renderDepartmentsList(departments) {
        const container = document.getElementById('departmentsList');
        if (!container) return;

        if (!departments || departments.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет созданных подразделений</div>';
            return;
        }

        container.innerHTML = departments.map(dept => `
            <div class="department-item">
                <div class="department-info">
                    <h4>${dept.name}</h4>
                    <p>${dept.description || 'Описание отсутствует'}</p>
                    <div class="department-meta">
                        <span>Создано: ${this.formatDate(dept.created_date)}</span>
                        <span>Категорий: ${dept.categories_count || 0}</span>
                    </div>
                </div>
                <div class="department-actions">
                    <button class="btn-secondary" onclick="app.editDepartment(${dept.id})">✏️</button>
                    <button class="btn-danger" onclick="app.deleteDepartment(${dept.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    async loadCategoriesList() {
        try {
            const categories = await window.departmentsManager?.getAllCategories?.() || [];
            this.renderCategoriesList(categories);
        } catch (error) {
            console.error('❌ Ошибка загрузки категорий:', error);
        }
    }

    renderCategoriesList(categories) {
        const container = document.getElementById('categoriesList');
        if (!container) return;

        if (!categories || categories.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет созданных категорий</div>';
            return;
        }

        container.innerHTML = categories.map(cat => `
            <div class="category-item">
                <div class="category-info">
                    <h4>${cat.name}</h4>
                    <p>${cat.description || 'Описание отсутствует'}</p>
                    <div class="category-meta">
                        <span>Подразделение: ${cat.department_name || 'Не указано'}</span>
                        <span>Создано: ${this.formatDate(cat.created_date)}</span>
                    </div>
                </div>
                <div class="category-actions">
                    <button class="btn-secondary" onclick="app.editCategory(${cat.id})">✏️</button>
                    <button class="btn-danger" onclick="app.deleteCategory(${cat.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    showCreateDepartmentModal() {
        this.showModal(
            'Создание подразделения',
            `
            <form id="createDepartmentForm">
                <div class="form-group">
                    <label for="departmentName">Название:</label>
                    <input type="text" id="departmentName" name="name" required>
                </div>
                <div class="form-group">
                    <label for="departmentDescription">Описание:</label>
                    <textarea id="departmentDescription" name="description" rows="3"></textarea>
                </div>
            </form>
            `,
            async () => {
                const form = document.getElementById('createDepartmentForm');
                const formData = new FormData(form);
                
                const departmentData = {
                    name: formData.get('name'),
                    description: formData.get('description')
                };

                if (!departmentData.name) {
                    throw new Error('Название подразделения обязательно');
                }

                await window.departmentsManager.createDepartment(departmentData);
                await this.loadDepartmentsAndCategories();
                await this.loadDepartmentsForForms(); // Обновляем селекты в формах
            }
        );
    }

    showCreateCategoryModal() {
        this.loadDepartmentOptions().then(optionsHTML => {
            this.showModal(
                'Создание категории',
                `
                <form id="createCategoryForm">
                    <div class="form-group">
                        <label for="categoryName">Название:</label>
                        <input type="text" id="categoryName" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="categoryDescription">Описание:</label>
                        <textarea id="categoryDescription" name="description" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="categoryDepartment">Подразделение:</label>
                        <select id="categoryDepartment" name="departmentId" required>
                            ${optionsHTML}
                        </select>
                    </div>
                </form>
                `,
                async () => {
                    const form = document.getElementById('createCategoryForm');
                    const formData = new FormData(form);
                    
                    const categoryData = {
                        name: formData.get('name'),
                        description: formData.get('description'),
                        departmentId: parseInt(formData.get('departmentId'))
                    };

                    if (!categoryData.name || !categoryData.departmentId) {
                        throw new Error('Название и подразделение обязательны');
                    }

                    await window.departmentsManager.createCategory(categoryData);
                    await this.loadDepartmentsAndCategories();
                }
            );
        });
    }

    async loadDepartmentOptions() {
        try {
            const departments = await window.departmentsManager?.getAllDepartments?.() || [];
            return '<option value="">Выберите подразделение</option>' +
                departments.map(dept => 
                    `<option value="${dept.id}">${dept.name}</option>`
                ).join('');
        } catch (error) {
            return '<option value="">Ошибка загрузки подразделений</option>';
        }
    }

    // ===== ПОЛЬЗОВАТЕЛИ =====
    async loadUsers() {
        const container = document.getElementById('usersList');
        if (!container) return;

        try {
            const users = await window.auth?.getAllUsers?.() || [];
            this.renderUsersList(users, container);
        } catch (error) {
            console.error('❌ Ошибка загрузки пользователей:', error);
            container.innerHTML = '<div class="empty-state">Ошибка загрузки пользователей</div>';
        }
    }

    async loadUsersManagement() {
        const container = document.getElementById('usersManagementList');
        if (!container) return;

        try {
            let users = await window.auth?.getAllUsers?.() || [];
            
            // Применяем фильтры
            const searchFilter = document.getElementById('searchUsers')?.value.toLowerCase() || '';
            const roleFilter = document.getElementById('roleFilter')?.value || '';

            if (searchFilter) {
                users = users.filter(user => 
                    user.name.toLowerCase().includes(searchFilter) ||
                    user.username.toLowerCase().includes(searchFilter) ||
                    (user.email && user.email.toLowerCase().includes(searchFilter))
                );
            }

            if (roleFilter) {
                users = users.filter(user => user.role === roleFilter);
            }

            this.renderUsersManagementList(users);
        } catch (error) {
            console.error('❌ Ошибка загрузки пользователей:', error);
            container.innerHTML = '<div class="empty-state">Ошибка загрузки пользователей</div>';
        }
    }

    renderUsersList(users, container) {
        if (!users || users.length === 0) {
            container.innerHTML = '<div class="empty-state">Пользователи не найдены</div>';
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p>Логин: ${user.username} | Роль: ${user.role} | Отдел: ${user.department || 'Не указан'}</p>
                </div>
            </div>
        `).join('');
    }

    renderUsersManagementList(users) {
        const container = document.getElementById('usersManagementList');
        if (!container) return;

        if (!users || users.length === 0) {
            container.innerHTML = '<div class="empty-state">Пользователи не найдены</div>';
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p>Логин: ${user.username} | Роль: ${user.role} | Email: ${user.email || 'Не указан'}</p>
                    <small>Зарегистрирован: ${this.formatDate(user.created_date)}</small>
                </div>
                <div class="user-actions">
                    <button class="btn-secondary" onclick="app.editUser(${user.id})">✏️</button>
                    <button class="btn-danger" onclick="app.deleteUser(${user.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    showCreateUserModal() {
        this.showModal(
            'Создание пользователя',
            `
            <form id="createUserForm">
                <div class="form-group">
                    <label for="userName">ФИО:</label>
                    <input type="text" id="userName" name="name" required>
                </div>
                <div class="form-group">
                    <label for="userUsername">Логин:</label>
                    <input type="text" id="userUsername" name="username" required>
                </div>
                <div class="form-group">
                    <label for="userEmail">Email:</label>
                    <input type="email" id="userEmail" name="email">
                </div>
                <div class="form-group">
                    <label for="userPassword">Пароль:</label>
                    <input type="password" id="userPassword" name="password" required>
                </div>
                <div class="form-group">
                    <label for="userRole">Роль:</label>
                    <select id="userRole" name="role" required>
                        <option value="user">Пользователь</option>
                        <option value="manager">Менеджер</option>
                        <option value="admin">Администратор</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="userDepartment">Отдел:</label>
                    <input type="text" id="userDepartment" name="department">
                </div>
            </form>
            `,
            async () => {
                const form = document.getElementById('createUserForm');
                const formData = new FormData(form);
                
                const userData = {
                    name: formData.get('name'),
                    username: formData.get('username'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    role: formData.get('role'),
                    department: formData.get('department')
                };

                if (!userData.name || !userData.username || !userData.password) {
                    throw new Error('Заполните обязательные поля');
                }

                await window.auth.createUser(userData);
                await this.loadUsersManagement();
            }
        );
    }

    // ===== ОТЧЕТЫ =====
    async loadReports() {
        try {
            const stats = await window.ticketManager?.getStats?.() || {
                total: 0,
                open: 0,
                inProgress: 0,
                resolved: 0
            };
            this.renderReports(stats);
        } catch (error) {
            console.error('❌ Ошибка загрузки отчетов:', error);
        }
    }

    renderReports(stats) {
        document.getElementById('totalTickets').textContent = stats.total || 0;
        document.getElementById('openTickets').textContent = stats.open || 0;
        document.getElementById('inProgressTickets').textContent = stats.inProgress || 0;
        document.getElementById('resolvedTickets').textContent = stats.resolved || 0;
    }

    // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
    switchSubTab(subTab) {
        document.querySelectorAll('.subtab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const targetSubTab = document.getElementById(`${subTab}-subtab`);
        if (targetSubTab) {
            targetSubTab.classList.add('active');
        }
        
        document.querySelectorAll('.tab-button[data-subtab]').forEach(button => {
            button.classList.remove('active');
        });
        
        const targetButton = document.querySelector(`[data-subtab="${subTab}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
        }
    }

    showModal(title, content, onConfirm) {
        const modalOverlay = document.getElementById('modalOverlay');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        
        if (!modalOverlay || !modalTitle || !modalContent) {
            console.error('❌ Модальные элементы не найдены');
            return;
        }
        
        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        
        // Добавляем кнопки действий
        modalContent.innerHTML += `
            <div class="modal-actions">
                <button type="button" class="btn-secondary" id="modalCancel">Отмена</button>
                <button type="button" class="btn-primary" id="modalConfirm">Сохранить</button>
            </div>
        `;
        
        modalOverlay.style.display = 'flex';
        
        // Обработчики для кнопок
        const cancelBtn = document.getElementById('modalCancel');
        const confirmBtn = document.getElementById('modalConfirm');
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                modalOverlay.style.display = 'none';
            };
        }
        
        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                try {
                    await onConfirm();
                    modalOverlay.style.display = 'none';
                } catch (error) {
                    alert('❌ Ошибка: ' + error.message);
                }
            };
        }
        
        // Закрытие по клику на оверлей
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.style.display = 'none';
            }
        };
    }

    refreshCurrentTab() {
        this.loadTabData(this.currentTab);
    }

    formatDate(dateString) {
        if (!dateString) return 'Не указана';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
        } catch (error) {
            return dateString;
        }
    }

    // Методы для редактирования и удаления (заглушки)
    editTicket(ticketId) {
        alert('Редактирование заявки ' + ticketId);
    }

    editDepartment(departmentId) {
        alert('Редактирование подразделения ' + departmentId);
    }

    editCategory(categoryId) {
        alert('Редактирование категории ' + categoryId);
    }

    editUser(userId) {
        alert('Редактирование пользователя ' + userId);
    }

    async deleteDepartment(departmentId) {
        if (confirm('Вы уверены, что хотите удалить это подразделение? Все связанные категории также будут удалены.')) {
            try {
                await window.departmentsManager.deleteDepartment(departmentId);
                await this.loadDepartmentsAndCategories();
                await this.loadDepartmentsForForms(); // Обновляем селекты
            } catch (error) {
                alert('❌ Ошибка: ' + error.message);
            }
        }
    }

    async deleteCategory(categoryId) {
        if (confirm('Вы уверены, что хотите удалить эту категорию?')) {
            try {
                await window.departmentsManager.deleteCategory(categoryId);
                await this.loadDepartmentsAndCategories();
            } catch (error) {
                alert('❌ Ошибка: ' + error.message);
            }
        }
    }

    async deleteUser(userId) {
        if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
            try {
                await window.auth.deleteUser(userId);
                await this.loadUsersManagement();
            } catch (error) {
                alert('❌ Ошибка: ' + error.message);
            }
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM загружен, инициализируем приложение...');
    window.app = new App();
});

console.log('🚀 Service Desk App загружен');