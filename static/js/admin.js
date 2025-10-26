// 后台管理页面JavaScript

// 全局变量
let currentPage = 'dashboard';
let usersData = [];
let tasksData = [];

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});

// 初始化后台管理
function initializeAdmin() {
    // 检查管理员权限
    checkAdminAuth();
    
    // 绑定侧边栏导航
    bindSidebarNavigation();
    
    // 绑定搜索和过滤事件
    bindSearchEvents();
    
    // 加载仪表板数据
    loadDashboardData();
}

// 检查管理员权限
async function checkAdminAuth() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        if (!data.authenticated) {
            // 未登录，跳转到登录页面
            window.location.href = '/login';
            return;
        }
        
        // 检查是否为管理员（这里简单检查用户名，实际应该检查角色）
        if (data.user.username !== '123') { // 假设用户123是管理员
            alert('您没有访问管理后台的权限');
            window.location.href = '/';
            return;
        }
        
        // 显示当前用户信息
        document.getElementById('currentUserName').textContent = data.user.username;
        
    } catch (error) {
        console.error('检查管理员权限失败:', error);
        window.location.href = '/login';
    }
}

// 绑定侧边栏导航
function bindSidebarNavigation() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });
}

// 显示指定页面
function showPage(pageName) {
    // 更新侧边栏激活状态
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });
    
    // 隐藏所有页面
    document.querySelectorAll('.admin-page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 显示目标页面
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = pageName;
        
        // 根据页面加载相应数据
        switch (pageName) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'users':
                loadUsersData();
                break;
            case 'tasks':
                loadTasksData();
                break;
        }
    }
}

// 绑定搜索和过滤事件
function bindSearchEvents() {
    // 用户搜索
    const userSearch = document.getElementById('userSearch');
    const userStatusFilter = document.getElementById('userStatusFilter');
    
    if (userSearch) {
        userSearch.addEventListener('input', debounce(filterUsers, 300));
    }
    
    if (userStatusFilter) {
        userStatusFilter.addEventListener('change', filterUsers);
    }
    
    // 任务搜索
    const taskSearch = document.getElementById('taskSearch');
    const taskStatusFilter = document.getElementById('taskStatusFilter');
    
    if (taskSearch) {
        taskSearch.addEventListener('input', debounce(filterTasks, 300));
    }
    
    if (taskStatusFilter) {
        taskStatusFilter.addEventListener('change', filterTasks);
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 加载仪表板数据
async function loadDashboardData() {
    try {
        // 加载统计数据
        await loadStats();
        
        // 加载最近用户
        await loadRecentUsers();
        
    } catch (error) {
        console.error('加载仪表板数据失败:', error);
    }
}

// 加载统计数据
async function loadStats() {
    try {
        // 获取用户统计
        const usersResponse = await fetch('/api/admin/stats/users');
        const usersStats = await usersResponse.json();
        document.getElementById('totalUsers').textContent = usersStats.total || 0;
        
        // 获取任务统计
        const tasksResponse = await fetch('/api/admin/stats/tasks');
        const tasksStats = await tasksResponse.json();
        document.getElementById('totalTasks').textContent = tasksStats.total || 0;
        document.getElementById('totalLists').textContent = tasksStats.lists || 0;
        document.getElementById('activeToday').textContent = tasksStats.active_today || 0;
        
    } catch (error) {
        console.error('加载统计数据失败:', error);
        // 设置默认值
        document.getElementById('totalUsers').textContent = '0';
        document.getElementById('totalTasks').textContent = '0';
        document.getElementById('totalLists').textContent = '0';
        document.getElementById('activeToday').textContent = '0';
    }
}

// 加载最近用户
async function loadRecentUsers() {
    const container = document.getElementById('recentUsersTable');
    
    try {
        const response = await fetch('/api/admin/users?limit=5&sort=created_at&order=desc');
        const users = await response.json();
        
        if (users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="empty-title">暂无用户</div>
                    <div class="empty-description">还没有用户注册</div>
                </div>
            `;
            return;
        }
        
        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>用户</th>
                        <th>注册时间</th>
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>
                                <div class="user-info-cell">
                                    <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                                    <div class="user-details">
                                        <div class="user-name-cell">${user.username}</div>
                                        <div class="user-email-cell">${user.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td>${formatDate(user.created_at)}</td>
                            <td>
                                <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">
                                    ${user.is_active ? '活跃' : '禁用'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
        
    } catch (error) {
        console.error('加载最近用户失败:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-title">加载失败</div>
                <div class="empty-description">无法加载用户数据</div>
            </div>
        `;
    }
}

// 加载用户数据
async function loadUsersData() {
    const container = document.getElementById('usersTable');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        const response = await fetch('/api/admin/users');
        usersData = await response.json();
        
        displayUsers(usersData);
        
    } catch (error) {
        console.error('加载用户数据失败:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-title">加载失败</div>
                <div class="empty-description">无法加载用户数据</div>
            </div>
        `;
    }
}

// 显示用户列表
function displayUsers(users) {
    const container = document.getElementById('usersTable');
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="empty-title">暂无用户</div>
                <div class="empty-description">没有找到匹配的用户</div>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>用户</th>
                    <th>注册时间</th>
                    <th>最后登录</th>
                    <th>状态</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>
                            <div class="user-info-cell">
                                <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                                <div class="user-details">
                                    <div class="user-name-cell">${user.username}</div>
                                    <div class="user-email-cell">${user.email}</div>
                                </div>
                            </div>
                        </td>
                        <td>${formatDate(user.created_at)}</td>
                        <td>${user.last_login ? formatDate(user.last_login) : '从未登录'}</td>
                        <td>
                            <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">
                                ${user.is_active ? '活跃' : '禁用'}
                            </span>
                        </td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-sm btn-info" onclick="viewUserDetails(${user.id})" title="查看详情">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm ${user.is_active ? 'btn-secondary' : 'btn-primary'}" 
                                        onclick="toggleUserStatus(${user.id}, ${!user.is_active})" title="${user.is_active ? '禁用' : '启用'}">
                                    <i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i>
                                    ${user.is_active ? '禁用' : '启用'}
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id}, '${user.username}')" title="删除用户">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// 过滤用户
function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const statusFilter = document.getElementById('userStatusFilter').value;
    
    let filteredUsers = usersData.filter(user => {
        // 搜索过滤
        const matchesSearch = !searchTerm || 
            user.username.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm);
        
        // 状态过滤
        const matchesStatus = !statusFilter || 
            (statusFilter === 'active' && user.is_active) ||
            (statusFilter === 'inactive' && !user.is_active);
        
        return matchesSearch && matchesStatus;
    });
    
    displayUsers(filteredUsers);
}

// 刷新用户数据
function refreshUsers() {
    loadUsersData();
}

// 切换用户状态
async function toggleUserStatus(userId, newStatus) {
    const action = newStatus ? '启用' : '禁用';
    
    if (!confirm(`确定要${action}这个用户吗？`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_active: newStatus })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 刷新用户数据
            await loadUsersData();
            
            // 显示成功消息
            showNotification(`用户${action}成功`, 'success');
        } else {
            showNotification(`操作失败: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('切换用户状态失败:', error);
        showNotification('操作失败，请重试', 'error');
    }
}

// 加载任务数据
async function loadTasksData() {
    const container = document.getElementById('tasksTable');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        const response = await fetch('/api/admin/tasks');
        tasksData = await response.json();
        
        displayTasks(tasksData);
        
    } catch (error) {
        console.error('加载任务数据失败:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-title">加载失败</div>
                <div class="empty-description">无法加载任务数据</div>
            </div>
        `;
    }
}

// 显示任务列表
function displayTasks(tasks) {
    const container = document.getElementById('tasksTable');
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-tasks"></i>
                </div>
                <div class="empty-title">暂无任务</div>
                <div class="empty-description">没有找到匹配的任务</div>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>任务标题</th>
                    <th>用户</th>
                    <th>列表</th>
                    <th>优先级</th>
                    <th>状态</th>
                    <th>创建时间</th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map(task => `
                    <tr>
                        <td>
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary);">${task.title}</div>
                                ${task.description ? `<div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">${task.description.substring(0, 50)}${task.description.length > 50 ? '...' : ''}</div>` : ''}
                            </div>
                        </td>
                        <td>${task.username}</td>
                        <td>${task.list_name || '未分类'}</td>
                        <td>
                            <span class="priority-badge priority-${task.priority || 'medium'}">
                                ${getPriorityText(task.priority)}
                            </span>
                        </td>
                        <td>
                            <span class="status-badge ${task.completed ? 'status-completed' : 'status-pending'}">
                                ${task.completed ? '已完成' : '待完成'}
                            </span>
                        </td>
                        <td>${formatDate(task.created_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// 过滤任务
function filterTasks() {
    const searchTerm = document.getElementById('taskSearch').value.toLowerCase();
    const statusFilter = document.getElementById('taskStatusFilter').value;
    
    let filteredTasks = tasksData.filter(task => {
        // 搜索过滤
        const matchesSearch = !searchTerm || 
            task.title.toLowerCase().includes(searchTerm) ||
            (task.description && task.description.toLowerCase().includes(searchTerm));
        
        // 状态过滤
        const matchesStatus = !statusFilter || 
            (statusFilter === 'completed' && task.completed) ||
            (statusFilter === 'pending' && !task.completed);
        
        return matchesSearch && matchesStatus;
    });
    
    displayTasks(filteredTasks);
}

// 刷新任务数据
function refreshTasks() {
    loadTasksData();
}

// 获取优先级文本
function getPriorityText(priority) {
    const priorityMap = {
        'high': '高',
        'medium': '中',
        'low': '低'
    };
    return priorityMap[priority] || '中';
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            return diffMinutes <= 1 ? '刚刚' : `${diffMinutes}分钟前`;
        }
        return `${diffHours}小时前`;
    } else if (diffDays === 1) {
        return '昨天';
    } else if (diffDays < 7) {
        return `${diffDays}天前`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // 添加样式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--primary-color)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 查看用户详情
async function viewUserDetails(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}/details`);
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        
        // 创建模态框显示用户详情
        showUserDetailsModal(data);
        
    } catch (error) {
        console.error('获取用户详情失败:', error);
        showNotification('获取用户详情失败', 'error');
    }
}

// 显示用户详情模态框
function showUserDetailsModal(data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>用户详情</h3>
                <button class="modal-close" onclick="closeModal(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="user-details-section">
                    <h4>基本信息</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>用户名:</label>
                            <span>${data.user.username}</span>
                        </div>
                        <div class="detail-item">
                            <label>邮箱:</label>
                            <span>${data.user.email}</span>
                        </div>
                        <div class="detail-item">
                            <label>姓名:</label>
                            <span>${data.user.full_name || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>状态:</label>
                            <span class="status-badge ${data.user.is_active ? 'status-active' : 'status-inactive'}">
                                ${data.user.is_active ? '活跃' : '禁用'}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>注册时间:</label>
                            <span>${formatDate(data.user.created_at)}</span>
                        </div>
                        <div class="detail-item">
                            <label>最后登录:</label>
                            <span>${data.user.last_login ? formatDate(data.user.last_login) : '从未登录'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="user-details-section">
                    <h4>数据统计</h4>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-number">${data.statistics.task_count}</div>
                            <div class="stat-label">总任务数</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${data.statistics.completed_tasks}</div>
                            <div class="stat-label">已完成</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${data.statistics.pending_tasks}</div>
                            <div class="stat-label">待完成</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${data.statistics.list_count}</div>
                            <div class="stat-label">任务列表</div>
                        </div>
                    </div>
                </div>
                
                ${data.recent_tasks.length > 0 ? `
                <div class="user-details-section">
                    <h4>最近任务</h4>
                    <div class="recent-tasks">
                        ${data.recent_tasks.map(task => `
                            <div class="task-item">
                                <div class="task-title">${task.title}</div>
                                <div class="task-meta">
                                    <span class="priority-badge priority-${task.priority || 'medium'}">
                                        ${getPriorityText(task.priority)}
                                    </span>
                                    <span class="status-badge ${task.completed ? 'status-completed' : 'status-pending'}">
                                        ${task.completed ? '已完成' : '待完成'}
                                    </span>
                                    <span class="task-date">${formatDate(task.created_at)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal(this)">关闭</button>
            </div>
        </div>
    `;
    
    // 添加样式
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    document.body.appendChild(modal);
    
    // 点击背景关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// 删除用户
async function deleteUser(userId, username) {
    // 防止删除管理员
    if (username === '123') {
        showNotification('不能删除管理员账户', 'error');
        return;
    }
    
    // 确认删除
    const confirmMessage = `确定要删除用户 "${username}" 吗？\n\n此操作将永久删除该用户的所有数据，包括：\n• 用户账户信息\n• 所有任务和列表\n• 偏好设置\n• 登录记录\n\n此操作不可恢复！`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // 二次确认
    const finalConfirm = prompt(`请输入用户名 "${username}" 以确认删除操作：`);
    if (finalConfirm !== username) {
        showNotification('用户名不匹配，删除操作已取消', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 刷新用户数据
            await loadUsersData();
            
            // 显示详细的成功消息
            const deletedData = result.deleted_data;
            const message = `用户 "${username}" 已成功删除！\n\n删除的数据：\n• 会话记录: ${deletedData.sessions} 条\n• 偏好设置: ${deletedData.prefs} 条\n• 任务: ${deletedData.tasks} 个\n• 任务列表: ${deletedData.lists} 个`;
            
            showNotification(message, 'success');
        } else {
            showNotification(`删除失败: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('删除用户失败:', error);
        showNotification('删除用户失败，请重试', 'error');
    }
}

// 关闭模态框
function closeModal(element) {
    const modal = element.closest('.modal-overlay');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// 退出登录
function logout() {
    if (confirm('确定要退出管理后台吗？')) {
        fetch('/api/auth/logout', { method: 'POST' })
            .then(() => {
                window.location.href = '/login';
            })
            .catch(error => {
                console.error('退出失败:', error);
                window.location.href = '/login';
            });
    }
}

// 添加优先级徽章样式
const style = document.createElement('style');
style.textContent = `
    .priority-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .priority-high {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger-color);
    }
    
    .priority-medium {
        background: rgba(245, 158, 11, 0.1);
        color: var(--warning-color);
    }
    
    .priority-low {
        background: rgba(16, 185, 129, 0.1);
        color: var(--success-color);
    }
    
    .status-completed {
        background: rgba(16, 185, 129, 0.1);
        color: var(--success-color);
    }
    
    .status-pending {
        background: rgba(245, 158, 11, 0.1);
        color: var(--warning-color);
    }
    
    /* 模态框样式 */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease;
    }
    
    .modal-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        animation: slideUp 0.3s ease;
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color);
    }
    
    .modal-header h3 {
        margin: 0;
        color: var(--text-primary);
        font-size: 1.25rem;
        font-weight: 600;
    }
    
    .modal-close {
        background: none;
        border: none;
        font-size: 1.25rem;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 6px;
        transition: all 0.2s ease;
    }
    
    .modal-close:hover {
        background: var(--hover-bg);
        color: var(--text-primary);
    }
    
    .modal-body {
        padding: 1.5rem;
        max-height: 60vh;
        overflow-y: auto;
    }
    
    .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
    }
    
    .user-details-section {
        margin-bottom: 2rem;
    }
    
    .user-details-section:last-child {
        margin-bottom: 0;
    }
    
    .user-details-section h4 {
        margin: 0 0 1rem 0;
        color: var(--text-primary);
        font-size: 1.125rem;
        font-weight: 600;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--primary-color);
    }
    
    .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }
    
    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .detail-item label {
        font-weight: 600;
        color: var(--text-secondary);
        font-size: 0.875rem;
    }
    
    .detail-item span {
        color: var(--text-primary);
        font-size: 0.875rem;
    }
    
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
    }
    
    .stat-card {
        background: var(--background-secondary);
        padding: 1rem;
        border-radius: 8px;
        text-align: center;
        border: 1px solid var(--border-color);
    }
    
    .stat-number {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary-color);
        margin-bottom: 0.25rem;
    }
    
    .stat-label {
        font-size: 0.75rem;
        color: var(--text-secondary);
        font-weight: 500;
    }
    
    .recent-tasks {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .task-item {
        background: var(--background-secondary);
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }
    
    .task-title {
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
    }
    
    .task-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
    }
    
    .task-date {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-left: auto;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideUp {
        from { 
            opacity: 0;
            transform: translateY(20px);
        }
        to { 
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* 响应式设计 */
    @media (max-width: 768px) {
        .modal-content {
            width: 95%;
            max-height: 90vh;
        }
        
        .modal-header,
        .modal-body,
        .modal-footer {
            padding: 1rem;
        }
        
        .detail-grid {
            grid-template-columns: 1fr;
        }
        
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .task-meta {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .task-date {
            margin-left: 0;
            margin-top: 0.25rem;
        }
    }
`;
document.head.appendChild(style);
