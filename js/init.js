// js/init.js
function initializeTestUsers() {
    console.log('🔄 Инициализация пользователей системы...');
    
    // Создаем пользователей с ПРАВИЛЬНЫМИ паролями
    const defaultUsers = [
        { 
            id: 1, 
            username: 'admin', 
            password: 'Fghtkm123',  // ИСПРАВЛЕНО: ваш пароль
            name: 'Главный Администратор', 
            role: 'admin',
            email: 'admin@company.com',
            department: 'IT',
            created: new Date().toISOString(),
            isActive: true,  // ЯВНО указываем true
            permissions: ['create_users', 'edit_users', 'delete_users', 'manage_tickets', 'view_reports']
        },
        { 
            id: 2, 
            username: 'manager', 
            password: 'manager123', 
            name: 'Менеджер поддержки', 
            role: 'manager',
            email: 'manager@company.com',
            department: 'Техподдержка',
            created: new Date().toISOString(),
            isActive: true,
            permissions: ['manage_tickets', 'view_reports']
        },
        { 
            id: 3, 
            username: 'user', 
            password: 'user123', 
            name: 'Обычный пользователь', 
            role: 'user',
            email: 'user@company.com',
            department: 'Отдел продаж',
            created: new Date().toISOString(),
            isActive: true,
            permissions: ['create_tickets']
        }
    ];
    
    localStorage.setItem('users', JSON.stringify(defaultUsers));
    console.log('✅ Пользователи системы созданы!');
    console.log('👑 Администратор: admin / Fghtkm123 (полные права)');
    console.log('👨‍💼 Менеджер: manager / manager123 (управление заявками)');
    console.log('👤 Пользователь: user / user123 (создание заявок)');
    
    return defaultUsers;
}

// Проверить текущих пользователей
function checkCurrentUsers() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    console.log('=== ТЕКУЩИЕ ДАННЫЕ СИСТЕМЫ ===');
    console.log('Всего пользователей:', users.length);
    users.forEach(user => {
        console.log(`- Логин: "${user.username}" | Пароль: "${user.password}" | Активен: ${user.isActive} | Роль: ${user.role}`);
    });
    console.log('================================');
}

// Вызвать при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Очищаем старые данные и создаем новых пользователей
    localStorage.removeItem('users');
    localStorage.removeItem('currentUser');
    
    initializeTestUsers();
    checkCurrentUsers();
});

// Функция для принудительного создания правильных пользователей
window.createCorrectUsers = function() {
    localStorage.removeItem('users');
    localStorage.removeItem('currentUser');
    
    const users = [
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
    
    localStorage.setItem('users', JSON.stringify(users));
    console.log('✅ Правильные пользователи созданы!');
    console.log('admin / Fghtkm123');
    return users;
};

// Команды для отладки
console.log(`
🎮 КОМАНДЫ ДЛЯ ОТЛАДКИ В КОНСОЛИ:

// Создать правильных пользователей
createCorrectUsers()

// Проверить пользователей
JSON.parse(localStorage.getItem('users'))

// Принудительно войти как admin
const users = JSON.parse(localStorage.getItem('users'));
if (users && users.length > 0) {
    localStorage.setItem('currentUser', JSON.stringify(users[0]));
    console.log('✅ Вошли как:', users[0].name);
    window.location.href = 'dashboard.html';
}

// Очистить все данные
localStorage.clear()
location.reload()
`);