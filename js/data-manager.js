// js/data-manager.js
class DataManager {
    constructor() {
        console.log('📊 DataManager инициализирован (localStorage)');
    }

    // ===== ПОЛЬЗОВАТЕЛИ =====
    getUsers() {
        return JSON.parse(localStorage.getItem('service_desk_users') || '[]');
    }

    // ===== ПОДРАЗДЕЛЕНИЯ =====
    getDepartments() {
        return JSON.parse(localStorage.getItem('service_departments') || '[]');
    }

    createDepartment(departmentData) {
        const departments = this.getDepartments();
        const newDepartment = {
            id: Date.now(),
            ...departmentData,
            created_date: new Date().toISOString()
        };
        departments.push(newDepartment);
        localStorage.setItem('service_departments', JSON.stringify(departments));
        return newDepartment;
    }

    deleteDepartment(departmentId) {
        const departments = this.getDepartments();
        const updatedDepartments = departments.filter(d => d.id !== departmentId);
        localStorage.setItem('service_departments', JSON.stringify(updatedDepartments));
        return true;
    }

    // ===== КАТЕГОРИИ =====
    getCategories() {
        return JSON.parse(localStorage.getItem('service_categories') || '[]');
    }

    getCategoriesByDepartment(departmentId) {
        const categories = this.getCategories();
        return categories.filter(c => c.department_id == departmentId);
    }

    createCategory(categoryData) {
        const categories = this.getCategories();
        const newCategory = {
            id: Date.now(),
            ...categoryData,
            created_date: new Date().toISOString()
        };
        categories.push(newCategory);
        localStorage.setItem('service_categories', JSON.stringify(categories));
        return newCategory;
    }

    deleteCategory(categoryId) {
        const categories = this.getCategories();
        const updatedCategories = categories.filter(c => c.id !== categoryId);
        localStorage.setItem('service_categories', JSON.stringify(updatedCategories));
        return true;
    }

    // ===== ЗАЯВКИ =====
    getTickets() {
        return JSON.parse(localStorage.getItem('service_tickets') || '[]');
    }

    getTicketsByUser(userId) {
        const tickets = this.getTickets();
        return tickets.filter(t => t.created_by == userId);
    }

    createTicket(ticketData) {
        const tickets = this.getTickets();
        const newTicket = {
            id: Date.now(),
            ...ticketData,
            created_date: new Date().toISOString(),
            status: ticketData.status || 'open'
        };
        tickets.push(newTicket);
        localStorage.setItem('service_tickets', JSON.stringify(tickets));
        return newTicket;
    }

    updateTicket(ticketId, updates) {
        const tickets = this.getTickets();
        const ticketIndex = tickets.findIndex(t => t.id === ticketId);
        
        if (ticketIndex === -1) {
            throw new Error('Заявка не найдена');
        }

        tickets[ticketIndex] = { ...tickets[ticketIndex], ...updates };
        localStorage.setItem('service_tickets', JSON.stringify(tickets));
        return tickets[ticketIndex];
    }

    deleteTicket(ticketId) {
        const tickets = this.getTickets();
        const updatedTickets = tickets.filter(t => t.id !== ticketId);
        localStorage.setItem('service_tickets', JSON.stringify(updatedTickets));
        return true;
    }

    getTicketsStats() {
        const tickets = this.getTickets();
        return {
            total: tickets.length,
            open: tickets.filter(t => t.status === 'open').length,
            inProgress: tickets.filter(t => t.status === 'in-progress').length,
            resolved: tickets.filter(t => t.status === 'resolved').length
        };
    }
}

// Создаем глобальный экземпляр
window.dataManager = new DataManager();