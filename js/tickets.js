// js/tickets.js
class TicketManager {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    }

    // Создание новой заявки
    async createTicket(ticketData) {
        try {
            if (!this.currentUser.id) {
                throw new Error('Пользователь не авторизован');
            }

            const ticket = {
                title: ticketData.title,
                description: ticketData.description,
                department_id: ticketData.departmentId,
                category_id: ticketData.categoryId,
                priority: ticketData.priority,
                status: 'open',
                created_by: this.currentUser.id
            };

            const createdTicket = window.dataManager.createTicket(ticket);
            console.log('✅ Заявка создана:', createdTicket);
            return createdTicket;
            
        } catch (error) {
            console.error('❌ Ошибка создания заявки:', error);
            throw error;
        }
    }

    // Получение всех заявок (для админов/менеджеров)
    async getAllTickets() {
        try {
            const tickets = window.dataManager.getTickets();
            return tickets;
        } catch (error) {
            console.error('❌ Ошибка получения заявок:', error);
            return [];
        }
    }

    // Получение заявок текущего пользователя
    async getUserTickets() {
        try {
            if (!this.currentUser.id) {
                return [];
            }
            
            const tickets = window.dataManager.getTicketsByUser(this.currentUser.id);
            return tickets;
        } catch (error) {
            console.error('❌ Ошибка получения заявок пользователя:', error);
            return [];
        }
    }

    // Обновление заявки
    async updateTicket(ticketId, updates) {
        try {
            const updatedTicket = window.dataManager.updateTicket(ticketId, updates);
            console.log('✅ Заявка обновлена:', updatedTicket);
            return updatedTicket;
        } catch (error) {
            console.error('❌ Ошибка обновления заявки:', error);
            throw error;
        }
    }

    // Удаление заявки
    async deleteTicket(ticketId) {
        try {
            window.dataManager.deleteTicket(ticketId);
            console.log('✅ Заявка удалена');
            return true;
        } catch (error) {
            console.error('❌ Ошибка удаления заявки:', error);
            throw error;
        }
    }

    // Получение статистики
    async getStats() {
        try {
            const stats = window.dataManager.getTicketsStats();
            return stats;
        } catch (error) {
            console.error('❌ Ошибка получения статистики:', error);
            return { total: 0, open: 0, inProgress: 0, resolved: 0 };
        }
    }

    // Вспомогательные методы для отображения
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getStatusText(status) {
        const statusMap = {
            'open': 'Открыта',
            'in-progress': 'В работе',
            'resolved': 'Решена',
            'closed': 'Закрыта'
        };
        return statusMap[status] || status;
    }

    getPriorityText(priority) {
        const priorityMap = {
            'low': 'Низкий',
            'medium': 'Средний',
            'high': 'Высокий',
            'critical': 'Критический'
        };
        return priorityMap[priority] || priority;
    }

    getStatusClass(status) {
        const classMap = {
            'open': 'status-open',
            'in-progress': 'status-in-progress',
            'resolved': 'status-resolved',
            'closed': 'status-closed'
        };
        return classMap[status] || 'status-open';
    }

    getPriorityClass(priority) {
        const classMap = {
            'low': 'priority-low',
            'medium': 'priority-medium',
            'high': 'priority-high',
            'critical': 'priority-critical'
        };
        return classMap[priority] || 'priority-medium';
    }
}

// Создаем глобальный экземпляр
window.ticketManager = new TicketManager();