// js/init.js
console.log('🚀 Инициализация Service Desk System...');

function initializeSystem() {
    console.log('🔄 Инициализация системы...');
    
    // Создаем администратора в localStorage
    const adminUser = {
        id: 1,
        username: 'admin',
        password: 'Fghtkm123',
        name: 'Главный Администратор',
        email: 'admin@company.com',
        role: 'admin',
        department: 'IT',
        created_date: new Date().toISOString(),
        isActive: true,
        permissions: [
            'create_users', 'edit_users', 'delete_users', 
            'manage_tickets', 'view_reports', 'system_settings',
            'export_data', 'manage_categories', 'manage_departments'
        ],
        lastLogin: null
    };

    // Сохраняем пользователей
    localStorage.setItem('service_desk_users', JSON.stringify([adminUser]));
    
    // Инициализируем другие данные если нужно
    if (!localStorage.getItem('service_departments')) {
        localStorage.setItem('service_departments', JSON.stringify([]));
    }
    if (!localStorage.getItem('service_categories')) {
        localStorage.setItem('service_categories', JSON.stringify([]));
    }
    if (!localStorage.getItem('service_tickets')) {
        localStorage.setItem('service_tickets', JSON.stringify([]));
    }
    
    console.log('✅ Система инициализирована!');
    console.log('👑 Администратор: admin / Fghtkm123');
    
    return adminUser;
}

// Проверяем и создаем систему если нужно
function checkAndInitializeSystem() {
    const users = JSON.parse(localStorage.getItem('service_desk_users') || '[]');
    
    if (users.length === 0) {
        console.log('📝 Система не инициализирована, создаем...');
        initializeSystem();
    } else {
        console.log('✅ Система уже инициализирована');
        console.log('👥 Пользователей:', users.length);
    }
}

// Запускаем при загрузке
document.addEventListener('DOMContentLoaded', function() {
    checkAndInitializeSystem();
});

// Глобальные функции для отладки
window.debugSystem = function() {
    console.log('=== ДЕБАГ СИСТЕМЫ ===');
    console.log('Пользователи:', JSON.parse(localStorage.getItem('service_desk_users') || '[]'));
    console.log('Текущий пользователь:', JSON.parse(localStorage.getItem('currentUser') || 'null'));
    console.log('====================');
};

window.resetSystem = function() {
    localStorage.removeItem('service_desk_users');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('service_departments');
    localStorage.removeItem('service_categories');
    localStorage.removeItem('service_tickets');
    console.log('✅ Система сброшена');
    initializeSystem();
    location.reload();
};

console.log('🎮 Команды: debugSystem(), resetSystem()');