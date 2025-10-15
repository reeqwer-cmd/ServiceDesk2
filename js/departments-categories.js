// js/departments-categories.js
class DepartmentsManager {
    constructor() {
        console.log('📊 DepartmentsManager инициализирован');
    }

    // Подразделения
    async getAllDepartments() {
        return window.dataManager.getDepartments();
    }

    async createDepartment(departmentData) {
        return window.dataManager.createDepartment(departmentData);
    }

    async deleteDepartment(departmentId) {
        return window.dataManager.deleteDepartment(departmentId);
    }

    // Категории
    async getAllCategories() {
        const categories = window.dataManager.getCategories();
        const departments = window.dataManager.getDepartments();
        
        // Добавляем названия подразделений к категориям
        return categories.map(category => {
            const department = departments.find(d => d.id === category.department_id);
            return {
                ...category,
                department_name: department ? department.name : 'Неизвестно'
            };
        });
    }

    async getCategoriesByDepartment(departmentId) {
        const categories = window.dataManager.getCategoriesByDepartment(departmentId);
        const departments = window.dataManager.getDepartments();
        
        return categories.map(category => {
            const department = departments.find(d => d.id === category.department_id);
            return {
                ...category,
                department_name: department ? department.name : 'Неизвестно'
            };
        });
    }

    async createCategory(categoryData) {
        return window.dataManager.createCategory(categoryData);
    }

    async deleteCategory(categoryId) {
        return window.dataManager.deleteCategory(categoryId);
    }
}

// Создаем глобальный экземпляр
window.departmentsManager = new DepartmentsManager();