// 全局变量
let currentListId = null;
let taskLists = [];
let tasks = [];
let userPreferences = {};
let currentEditingTaskId = null;
let showCompleted = true;
let moreMenuOpen = false;
let isAddingTask = false; // 防止重复添加任务的标志
let aiAssistantOpen = false; // AI助手面板状态

// AI助手拖动相关变量
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let aiButtonPosition = { x: 0, y: 0 }; // 存储按钮位置

// 日历周视图相关变量
let currentWeekStart = null;
let calendarViewMode = 'timeline'; // 'timeline' 或 'grid'
let weekTasks = [];
let draggedTask = null;
let calendarDropZone = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    checkMobileView();
});

// 检查是否为移动端视图
function checkMobileView() {
    const isMobile = window.innerWidth <= 768;
    const mobileHeader = document.querySelector('.mobile-header');
    const desktopHeader = document.querySelector('header.bg-white');
    const sidebar = document.getElementById('sidebar');
    
    if (isMobile) {
        // 显示移动端头部，隐藏桌面端头部
        if (mobileHeader) mobileHeader.style.display = 'flex';
        if (desktopHeader) desktopHeader.style.display = 'none';
        
        // 侧边栏默认隐藏
        if (sidebar) {
            sidebar.classList.remove('mobile-open');
        }
    } else {
        // 隐藏移动端头部，显示桌面端头部
        if (mobileHeader) mobileHeader.style.display = 'none';
        if (desktopHeader) desktopHeader.style.display = 'block';
        
        // 侧边栏默认显示
        if (sidebar) {
            sidebar.classList.remove('mobile-open');
        }
    }
}

// 切换移动端侧边栏
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    
    if (sidebar && overlay) {
        const isOpen = sidebar.classList.contains('mobile-open');
        
        if (isOpen) {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('show');
        } else {
            sidebar.classList.add('mobile-open');
            overlay.classList.add('show');
        }
    }
}

// 点击外部关闭移动端侧边栏
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const isMobile = window.innerWidth <= 768;
    
    // 只在移动端模式下处理
    if (isMobile && sidebar && sidebar.classList.contains('mobile-open')) {
        // 检查是否点击了侧边栏外部区域
        // 排除侧边栏本身、菜单按钮、遮罩层
        if (!sidebar.contains(event.target) && 
            !mobileMenuBtn.contains(event.target) &&
            !overlay.contains(event.target)) {
            
            // 关闭侧边栏
            sidebar.classList.remove('mobile-open');
            if (overlay) {
                overlay.classList.remove('show');
            }
        }
    }
});

// 监听窗口大小变化
window.addEventListener('resize', function() {
    checkMobileView();
});
    
// 检查用户认证状态
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        if (!data.authenticated) {
            // 未登录，跳转到登录页面
            window.location.href = '/login';
            return;
        }
        
        // 已登录，设置用户信息并初始化应用
        currentUser = data.user;
        updateUserDisplay();
        await initializeApp();
        
    } catch (error) {
        console.error('检查认证状态失败:', error);
        // 出错时跳转到登录页面
        window.location.href = '/login';
    }
}

// 更新用户显示信息
function updateUserDisplay() {
    if (!currentUser) return;
    
    const userDisplayName = document.getElementById('userDisplayName');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');
    const mobileUserAvatar = document.getElementById('mobileUserAvatar');
    
    if (userDisplayName) {
        userDisplayName.textContent = currentUser.full_name || currentUser.username;
    }
    
    if (userEmail) {
        userEmail.textContent = currentUser.email;
    }
    
    // 桌面端用户头像
    if (userAvatar) {
        // 如果有头像URL，使用头像；否则显示用户名首字母
        if (currentUser.avatar_url) {
            userAvatar.innerHTML = `<img src="${currentUser.avatar_url}" alt="用户头像" style="width: 20px; height: 20px; border-radius: 50%;">`;
        } else {
            const firstLetter = (currentUser.username || 'U').charAt(0).toUpperCase();
            userAvatar.innerHTML = `<span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; background: var(--windows-blue); color: white; border-radius: 50%; font-size: 12px; font-weight: bold;">${firstLetter}</span>`;
        }
    }
    
    // 移动端用户头像
    if (mobileUserAvatar) {
        // 如果有头像URL，使用头像；否则显示用户名首字母
        if (currentUser.avatar_url) {
            mobileUserAvatar.innerHTML = `<img src="${currentUser.avatar_url}" alt="用户头像" style="width: 24px; height: 24px; border-radius: 50%;">`;
        } else {
            const firstLetter = (currentUser.username || 'U').charAt(0).toUpperCase();
            mobileUserAvatar.innerHTML = `<span style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; background: var(--windows-blue); color: white; border-radius: 50%; font-size: 14px; font-weight: bold;">${firstLetter}</span>`;
        }
    }
}

// 切换用户菜单
function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.classList.toggle('hidden');
    }
}

// 显示用户资料
function showUserProfile() {
    toggleUserMenu();
    showNotification('用户资料功能开发中...', 'info');
}

// 显示用户设置
function showUserSettings() {
    toggleUserMenu();
    showNotification('用户设置功能开发中...', 'info');
}

// 用户登出
async function logout() {
    if (!confirm('确定要退出登录吗？')) {
        return;
    }
    
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            showNotification('已成功退出登录');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1000);
        } else {
            throw new Error('退出登录失败');
        }
    } catch (error) {
        console.error('退出登录失败:', error);
        showNotification('退出登录失败，请重试', 'error');
    }
}

// 点击外部关闭用户菜单
document.addEventListener('click', function(event) {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const mobileUserMenuBtn = document.getElementById('mobileUserMenuBtn');
    const userMenu = document.getElementById('userMenu');
    
    if (userMenu && userMenuBtn && mobileUserMenuBtn && 
        !userMenuBtn.contains(event.target) && 
        !mobileUserMenuBtn.contains(event.target) && 
        !userMenu.contains(event.target)) {
        userMenu.classList.add('hidden');
    }
});
    
// 初始化应用
async function initializeApp() {
    try {
        await loadTaskLists();
        await loadUserPreferences();
        await loadStats();
        setupEventListeners();
        renderSidebar();
        
        // 初始化AI助手拖动功能
        initializeAIDrag();
        
        // 检查PWA安装提示
        checkPWAInstallPrompt();
        
        // 默认显示"我的一天"列表
        const todayList = taskLists.find(list => list.name === '我的一天');
        if (todayList) {
            navigateToList(todayList.id);
        } else if (taskLists.length > 0) {
            navigateToList(taskLists[0].id);
        }
    } catch (error) {
        console.error('初始化失败:', error);
        showNotification('初始化失败，请刷新页面重试', 'error');
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 搜索框
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // 模态框外部点击关闭（右侧面板）
    const taskModal = document.getElementById('taskModal');
    taskModal.addEventListener('click', function(e) {
        if (e.target === taskModal || e.target.classList.contains('modal-backdrop')) {
            hideTaskModal();
        }
    });

    // 新建列表模态框外部点击关闭
    const newListModal = document.getElementById('newListModal');
    newListModal.addEventListener('click', function(e) {
        if (e.target === newListModal) {
            hideNewListModal();
        }
    });

    // 快速添加任务输入框
    const quickAddInput = document.getElementById('quickAddInput');
    quickAddInput.addEventListener('keypress', handleQuickAdd);
    
    // AI配置提供商选择事件
    const aiProviderSelect = document.getElementById('aiProvider');
    if (aiProviderSelect) {
        aiProviderSelect.addEventListener('change', updateApiBaseByProvider);
    }

    // AI模型选择事件
    const aiModelSelect = document.getElementById('aiModel');
    if (aiModelSelect) {
        aiModelSelect.addEventListener('change', handleModelChange);
    }
}

// 加载任务列表
async function loadTaskLists() {
    try {
        const response = await fetch('/api/task_lists');
        taskLists = await response.json();
    } catch (error) {
        console.error('加载任务列表失败:', error);
        throw error;
    }
}

// 加载用户偏好
async function loadUserPreferences() {
    try {
        const response = await fetch('/api/user_preferences');
        userPreferences = await response.json();
        showCompleted = userPreferences.show_completed;
        applyTheme(userPreferences.theme);
        updateShowCompletedIcon();
    } catch (error) {
        console.error('加载用户偏好失败:', error);
    }
}

// 加载统计信息
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        renderStats(stats);
    } catch (error) {
        console.error('加载统计信息失败:', error);
        document.getElementById('statsInfo').innerHTML = `
            <div class="text-red-500 text-sm">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                无法加载统计信息
            </div>
        `;
    }
}

// 渲染统计信息
function renderStats(stats) {
    const statsInfo = document.getElementById('statsInfo');
    statsInfo.innerHTML = `
        <div class="space-y-1">
            <div class="flex justify-between">
                <span>总任务:</span>
                <span class="font-medium">${stats.total_tasks}</span>
            </div>
            <div class="flex justify-between">
                <span>已完成:</span>
                <span class="font-medium text-green-600">${stats.completed_tasks}</span>
            </div>
            <div class="flex justify-between">
                <span>待完成:</span>
                <span class="font-medium text-orange-600">${stats.pending_tasks}</span>
            </div>
            <div class="flex justify-between">
                <span>完成率:</span>
                <span class="font-medium text-blue-600">${stats.completion_rate}%</span>
            </div>
        </div>
    `;
}

// 渲染侧边栏导航
function renderSidebar() {
    const sidebarNav = document.getElementById('sidebarNav');
    sidebarNav.innerHTML = '';

    taskLists.forEach(list => {
        const navItem = document.createElement('div');
        navItem.className = 'sidebar-item flex items-center space-x-3';
        navItem.dataset.listId = list.id;
        navItem.onclick = () => navigateToList(list.id);

        const completedCount = list.completed_tasks || 0;
        const totalCount = list.total_tasks || 0;
        const showBadge = completedCount > 0;

        navItem.innerHTML = `
            <span class="text-xl">${list.icon}</span>
            <div class="flex-1">
                <div class="font-medium">${list.name}</div>
                ${totalCount > 0 ? `<div class="text-xs text-gray-500">${completedCount}/${totalCount} 已完成</div>` : ''}
            </div>
            ${showBadge ? `<div class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">${completedCount}</div>` : ''}
        `;

        sidebarNav.appendChild(navItem);
    });
}

// 更新任务列表统计（不重新加载整个列表）
function updateTaskListStats() {
    // 更新当前列表的统计
    const currentList = taskLists.find(list => list.id === currentListId);
    if (currentList) {
        const completedCount = tasks.filter(task => task.completed).length;
        const totalCount = tasks.length;
        currentList.completed_tasks = completedCount;
        currentList.total_tasks = totalCount;
        
        // 更新侧边栏中当前列表的显示
        const navItem = document.querySelector(`[data-list-id="${currentListId}"]`);
        if (navItem) {
            const completedElement = navItem.querySelector('.text-xs.text-gray-500');
            const badgeElement = navItem.querySelector('.bg-green-100');
            
            if (completedElement) {
                completedElement.textContent = totalCount > 0 ? `${completedCount}/${totalCount} 已完成` : '';
            }
            
            if (badgeElement) {
                if (completedCount > 0) {
                    badgeElement.textContent = completedCount;
                    badgeElement.classList.remove('hidden');
                } else {
                    badgeElement.classList.add('hidden');
                }
            }
        }
    }
}

// 导航到指定列表
async function navigateToList(listId) {
    if (currentListId === listId) return;

    currentListId = listId;
    updateSidebarActiveState(listId);
    
    try {
        await loadTasks(listId);
        showPage('tasksList');
        
        const list = taskLists.find(l => l.id === listId);
        if (list) {
            updatePageHeader(list.name, getListDescription(list.name));
        }
    } catch (error) {
        console.error('加载任务列表失败:', error);
        showNotification('加载任务失败', 'error');
    }
}

// 获取列表描述
function getListDescription(listName) {
    const descriptions = {
        '我的一天': '今日任务',
        '重要': '重要任务',
        '已计划': '已计划的任务',
        '任务': '所有任务',
        '购物': '购物清单',
        '工作': '工作任务',
        '个人': '个人事务'
    };
    return descriptions[listName] || '任务列表';
}

// 更新侧边栏活动状态
function updateSidebarActiveState(listId) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[data-list-id="${listId}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// 加载任务列表
async function loadTasks(listId = null) {
    try {
        const url = listId ? `/api/tasks?list_id=${listId}&show_completed=${showCompleted}` : `/api/tasks?show_completed=${showCompleted}`;
        const response = await fetch(url);
        tasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error('加载任务失败:', error);
        throw error;
    }
}

// 渲染任务列表
function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    
    if (tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="text-center py-12 slide-down">
                <i class="fas fa-clipboard-list text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">暂无任务</p>
                <p class="text-sm text-gray-400 mt-2">点击上方"+ 新建任务"按钮创建第一个任务</p>
            </div>
        `;
        return;
    }

    // 清空容器并添加滑动效果
    tasksList.innerHTML = '';
    tasksList.classList.add('slide-down');
    
    // 为每个任务项创建并添加渐进式动画
    tasks.forEach((task, index) => {
        const taskItem = createTaskItem(task);
        
        // 添加渐进式进入动画类
        taskItem.classList.add('task-item-enter');
        
        // 为前8个任务项添加延迟动画类
        if (index < 8) {
            taskItem.classList.add(`task-item-stagger-${index + 1}`);
        }
        
        tasksList.appendChild(taskItem);
    });
    
    // 动画完成后移除动画类
    setTimeout(() => {
        tasksList.classList.remove('slide-down');
        const taskItems = tasksList.querySelectorAll('.task-item');
        taskItems.forEach(item => {
            item.classList.remove('task-item-enter');
            // 移除所有延迟类
            for (let i = 1; i <= 8; i++) {
                item.classList.remove(`task-item-stagger-${i}`);
            }
        });
    }, 600);
}

// 创建任务项
function createTaskItem(task) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item relative ${task.completed ? 'completed' : ''}`;
    taskItem.dataset.taskId = task.id;

    const priorityClass = `priority-${task.priority}`;
    const dueDateText = task.due_date ? formatDate(task.due_date) : '';
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed;

    taskItem.innerHTML = `
        <div class="priority-indicator ${priorityClass}"></div>
        <div class="flex items-start space-x-3">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                 onclick="toggleTaskComplete(${task.id})"></div>
            <div class="flex-1 min-w-0">
                <div class="task-title">${task.title}</div>
                ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                <div class="task-meta">
                    ${dueDateText ? `
                        <div class="task-meta-item ${isOverdue ? 'overdue' : ''}">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${dueDateText}</span>
                        </div>
                    ` : ''}
                    ${task.start_time ? `
                        <div class="task-meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${task.start_time}${task.end_time ? ' - ' + task.end_time : ''}</span>
                        </div>
                    ` : ''}
                    ${task.is_important ? `
                        <div class="task-meta-item important">
                            <i class="fas fa-star"></i>
                            <span>重要</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="important-star ${task.is_important ? 'fas' : 'far'} fa-star" 
                        onclick="toggleTaskImportant(${task.id})"></button>
                <button class="task-action-btn" onclick="editTask(${task.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="task-action-btn delete" onclick="deleteTask(${task.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;

    return taskItem;
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
        return '今天';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return '明天';
    } else {
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
}

// 切换任务完成状态
async function toggleTaskComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed: !task.completed })
        });

        if (response.ok) {
            await loadTasks(currentListId);
            await loadStats();
            updateTaskListStats(); // 更新侧边栏统计（不重新加载整个列表）
            showNotification(task.completed ? '任务已标记为未完成' : '任务已完成');
        } else {
            throw new Error('更新失败');
        }
    } catch (error) {
        console.error('更新任务状态失败:', error);
        showNotification('更新失败，请重试', 'error');
    }
}

// 切换任务重要性
async function toggleTaskImportant(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_important: !task.is_important })
        });

        if (response.ok) {
            await loadTasks(currentListId);
            showNotification(task.is_important ? '已取消重要标记' : '已标记为重要');
        } else {
            throw new Error('更新失败');
        }
    } catch (error) {
        console.error('更新任务重要性失败:', error);
        showNotification('更新失败，请重试', 'error');
    }
}

// 快速添加任务
function handleQuickAdd(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addQuickTask();
    }
}

async function addQuickTask(event) {
    // 防止重复提交
    if (isAddingTask) {
        return;
    }

    // 如果点击的是输入框，不处理，让输入框获得焦点
    if (event && event.target.tagName === 'INPUT') {
        return;
    }

    const input = document.getElementById('quickAddInput');
    const title = input.value.trim();
    
    if (!title) {
        // 如果没有输入内容，聚焦到输入框
        input.focus();
        return;
    }

    // 设置防重复标志
    isAddingTask = true;

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                list_id: currentListId || userPreferences.default_list_id
            })
        });

        if (response.ok) {
            input.value = '';
            await loadTasks(currentListId);
            await loadStats();
            updateTaskListStats(); // 更新侧边栏统计
            showNotification('任务已添加');
        } else {
            throw new Error('创建失败');
        }
    } catch (error) {
        console.error('创建任务失败:', error);
        showNotification('创建失败，请重试', 'error');
    } finally {
        // 重置防重复标志
        isAddingTask = false;
    }
}

// 显示添加任务模态框
function showAddTaskModal() {
    currentEditingTaskId = null;
    document.getElementById('modalTitle').textContent = '新建任务';
    document.getElementById('taskForm').reset();
    loadTaskListOptions();
    showTaskModal();
}

// 编辑任务
async function editTask(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`);
        const task = await response.json();
        
        currentEditingTaskId = taskId;
        document.getElementById('modalTitle').textContent = '编辑任务';
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskDueDate').value = task.due_date || '';
        document.getElementById('taskStartTime').value = task.start_time || '';
        document.getElementById('taskEndTime').value = task.end_time || '';
        document.getElementById('taskImportant').checked = task.is_important;
        
        loadTaskListOptions(task.list_id);
        showTaskModal();
    } catch (error) {
        console.error('加载任务详情失败:', error);
        showNotification('加载任务失败', 'error');
    }
}

// 加载任务列表选项
async function loadTaskListOptions(selectedId = null) {
    const select = document.getElementById('taskListId');
    select.innerHTML = '';
    
    taskLists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.id;
        option.textContent = list.name;
        if (list.id === selectedId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

// 显示任务模态框
function showTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.add('show');
    
    // 确保面板从右侧滑入
    const panel = modal.querySelector('.task-edit-panel');
    panel.style.transform = 'translateX(0)';
    panel.style.opacity = '1';
}

// 隐藏任务模态框
function hideTaskModal() {
    const modal = document.getElementById('taskModal');
    const panel = modal.querySelector('.task-edit-panel');
    
    // 先让面板滑出
    panel.style.transform = 'translateX(100%)';
    panel.style.opacity = '0';
    
    // 延迟隐藏模态框，让动画完成
    setTimeout(() => {
        modal.classList.remove('show');
        currentEditingTaskId = null;
    }, 300);
}

// 保存任务
async function saveTask(event) {
    event.preventDefault();
    
    const formData = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        priority: document.getElementById('taskPriority').value,
        due_date: document.getElementById('taskDueDate').value,
        start_time: document.getElementById('taskStartTime').value,
        end_time: document.getElementById('taskEndTime').value,
        list_id: parseInt(document.getElementById('taskListId').value),
        is_important: document.getElementById('taskImportant').checked
    };

    if (!formData.title) {
        showNotification('任务标题不能为空', 'error');
        return;
    }

    try {
        const url = currentEditingTaskId ? `/api/tasks/${currentEditingTaskId}` : '/api/tasks';
        const method = currentEditingTaskId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            hideTaskModal();
            await loadTasks(currentListId);
            await loadStats();
            updateTaskListStats(); // 更新侧边栏统计
            showNotification(currentEditingTaskId ? '任务已更新' : '任务已创建');
        } else {
            throw new Error('保存失败');
        }
    } catch (error) {
        console.error('保存任务失败:', error);
        showNotification('保存失败，请重试', 'error');
    }
}

// 删除任务
async function deleteTask(taskId) {
    if (!confirm('确定要删除这个任务吗？')) {
        return;
    }

    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadTasks(currentListId);
            await loadStats();
            updateTaskListStats(); // 更新侧边栏统计
            showNotification('任务已删除');
        } else {
            throw new Error('删除失败');
        }
    } catch (error) {
        console.error('删除任务失败:', error);
        showNotification('删除失败，请重试', 'error');
    }
}

// 搜索处理
async function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        showPage('tasksList');
        if (currentListId) {
            const list = taskLists.find(l => l.id === currentListId);
            if (list) {
                updatePageHeader(list.name, getListDescription(list.name));
            }
        }
        return;
    }

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        renderSearchResults(results, query);
        showPage('searchResults');
        updatePageHeader('搜索结果', `搜索 "${query}" 的结果`);
    } catch (error) {
        console.error('搜索失败:', error);
        showNotification('搜索失败', 'error');
    }
}

// 渲染搜索结果
function renderSearchResults(results, query) {
    const searchResults = document.getElementById('searchResults');
    
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-search text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">未找到与 "${query}" 相关的任务</p>
            </div>
        `;
        return;
    }

    searchResults.innerHTML = `
        <div class="mb-6">
            <p class="text-gray-600">找到 ${results.length} 个结果</p>
        </div>
    `;

    results.forEach(result => {
        const taskItem = createTaskItem(result);
        searchResults.appendChild(taskItem);
    });
}

// 切换显示已完成任务
async function toggleShowCompleted() {
    showCompleted = !showCompleted;
    
    try {
        const response = await fetch('/api/user_preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ show_completed: showCompleted })
        });

        if (response.ok) {
            userPreferences.show_completed = showCompleted;
            updateShowCompletedIcon();
            await loadTasks(currentListId);
            showNotification(showCompleted ? '显示已完成任务' : '隐藏已完成任务');
        }
    } catch (error) {
        console.error('更新设置失败:', error);
        showNotification('更新设置失败', 'error');
    }
}

// 更新显示已完成任务图标
function updateShowCompletedIcon() {
    const icon = document.getElementById('showCompletedIcon');
    icon.className = showCompleted ? 'fas fa-eye-slash' : 'fas fa-eye';
}

// 主题切换
async function toggleTheme() {
    const newTheme = userPreferences.theme === 'light' ? 'dark' : 'light';
    
    try {
        const response = await fetch('/api/user_preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ theme: newTheme })
        });

        if (response.ok) {
            userPreferences.theme = newTheme;
            applyTheme(newTheme);
            showNotification(`已切换到${newTheme === 'light' ? '浅色' : '深色'}主题`);
        }
    } catch (error) {
        console.error('切换主题失败:', error);
        showNotification('切换主题失败', 'error');
    }
}

// 应用主题
function applyTheme(theme) {
    const themeIcon = document.getElementById('themeIcon');
    
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fas fa-sun';
        // 更新Tailwind CSS的深色模式类
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeIcon.className = 'fas fa-moon';
        // 移除Tailwind CSS的深色模式类
        document.documentElement.classList.remove('dark');
    }
}

// 显示页面
function showPage(pageId) {
    const pages = ['tasksList', 'searchResults', 'calendarWeekView'];
    pages.forEach(id => {
        const page = document.getElementById(id);
        if (id === pageId) {
            page.classList.remove('hidden');
        } else {
            page.classList.add('hidden');
        }
    });
}

// 更新页面标题
function updatePageHeader(title, subtitle) {
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('pageSubtitle').textContent = subtitle;
}

// 显示通知
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    
    // 设置背景颜色
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg fade-in`;
    
    switch (type) {
        case 'error':
            notification.classList.add('bg-red-500', 'text-white');
            break;
        case 'info':
            notification.classList.add('bg-blue-500', 'text-white');
            break;
        default:
            notification.classList.add('bg-green-500', 'text-white');
    }
    
    notification.classList.remove('hidden');
    
    // 3秒后自动隐藏
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
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

// 新建列表相关功能
function showNewListModal() {
    const modal = document.getElementById('newListModal');
    document.getElementById('newListForm').reset();
    document.getElementById('newListIcon').value = '📋';
    
    // 重置图标选择状态
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // 默认选中第一个图标
    const firstIcon = document.querySelector('.icon-option[data-icon="📋"]');
    if (firstIcon) {
        firstIcon.classList.add('selected');
    }
    
    // 显示模态框
    modal.classList.add('show');
    
    // 触发内容动画
    setTimeout(() => {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(1) translateY(0)';
            content.style.opacity = '1';
        }
    }, 50);
}

function hideNewListModal() {
    const modal = document.getElementById('newListModal');
    const content = modal.querySelector('.modal-content');
    
    // 先隐藏内容
    if (content) {
        content.style.transform = 'scale(0.9) translateY(20px)';
        content.style.opacity = '0';
    }
    
    // 延迟隐藏模态框
    setTimeout(() => {
        modal.classList.remove('show');
    }, 300);
}

function selectIcon(icon) {
    // 更新隐藏字段的值
    document.getElementById('newListIcon').value = icon;
    
    // 更新选中状态
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const selectedBtn = document.querySelector(`.icon-option[data-icon="${icon}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }
}

async function saveNewList(event) {
    event.preventDefault();
    
    const listName = document.getElementById('newListName').value.trim();
    const listIcon = document.getElementById('newListIcon').value;
    
    if (!listName) {
        showNotification('列表名称不能为空', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/task_lists', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: listName,
                icon: listIcon
            })
        });
        
        if (response.ok) {
            hideNewListModal();
            await loadTaskLists();
            renderSidebar();
            await loadStats();
            showNotification('列表创建成功');
            
            // 自动导航到新创建的列表
            const newList = taskLists.find(list => list.name === listName && list.icon === listIcon);
            if (newList) {
                navigateToList(newList.id);
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || '创建失败');
        }
    } catch (error) {
        console.error('创建列表失败:', error);
        showNotification('创建列表失败: ' + error.message, 'error');
    }
}

// 切换更多菜单 - 改为滑动式侧边栏
function toggleMoreMenu() {
    const sidebar = document.getElementById('slidingSidebar');
    const overlay = document.getElementById('slidingSidebarOverlay');
    const moreBtn = document.getElementById('moreBtn');
    
    if (sidebar.classList.contains('show')) {
        // 关闭侧边栏
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
        moreBtn.style.background = 'var(--windows-blue)';
        moreBtn.style.color = 'white';
        
        // 重置动画
        setTimeout(() => {
            const sections = sidebar.querySelectorAll('.sidebar-section');
            sections.forEach((section, index) => {
                section.style.animation = 'none';
                section.style.opacity = '0';
                section.style.transform = 'translateY(20px)';
            });
        }, 300);
    } else {
        // 打开侧边栏
        sidebar.classList.add('show');
        overlay.classList.add('show');
        moreBtn.style.background = 'var(--windows-surface)';
        moreBtn.style.color = 'var(--windows-text)';
        
        // 触发渐进式动画
        setTimeout(() => {
            const sections = sidebar.querySelectorAll('.sidebar-section');
            sections.forEach((section, index) => {
                section.style.animation = `fadeInSection 0.5s ease-out ${0.1 + index * 0.1}s both`;
            });
        }, 100);
    }
}

// 处理更多菜单操作
function handleMoreAction(action) {
    toggleMoreMenu(); // 关闭菜单
    
    switch (action) {
        case 'calendar_week':
            showCalendarWeekView();
            break;
        case 'import':
            showNotification('导入任务功能开发中...', 'info');
            break;
        case 'export':
            showNotification('导出任务功能开发中...', 'info');
            break;
        case 'ai_config':
            showAIConfigModal();
            break;
        case 'settings':
            showSettingsModal();
            break;
        case 'themes':
            showThemesModal();
            break;
        case 'notifications':
            showNotificationsModal();
            break;
        case 'shortcuts':
            showShortcutsModal();
            break;
        case 'install_app':
            showInstallAppDialog();
            break;
    case 'about':
        showAboutDialog();
        break;
        default:
            showNotification('功能开发中...', 'info');
    }
}

// 点击外部关闭滑动侧边栏
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('slidingSidebar');
    const overlay = document.getElementById('slidingSidebarOverlay');
    const moreBtn = document.getElementById('moreBtn');
    
    // 如果侧边栏是打开的，且点击的不是侧边栏内部、更多按钮或遮罩层，则关闭
    if (sidebar && sidebar.classList.contains('show') && 
        !sidebar.contains(event.target) && 
        !moreBtn.contains(event.target) &&
        !overlay.contains(event.target)) {
        toggleMoreMenu();
    }
});

// 防止侧边栏内部点击事件冒泡
document.getElementById('slidingSidebar').addEventListener('click', function(event) {
    event.stopPropagation();
});

// AI助手相关功能
// 语音识别相关变量
let recognition = null;
let isRecording = false;

function toggleAIAssistant() {
    const panel = document.getElementById('aiAssistantPanel');
    const btn = document.getElementById('aiAssistantBtn');
    
    aiAssistantOpen = !aiAssistantOpen;
    
    if (aiAssistantOpen) {
        panel.classList.add('show');
        btn.style.transform = 'scale(0.95)';
        
        // 聚焦到输入框
        setTimeout(() => {
            document.getElementById('aiInput').focus();
        }, 300);
        
        // 加载对话历史
        loadConversationHistory();
    } else {
        panel.classList.remove('show');
        btn.style.transform = 'scale(1)';
        
        // 停止录音（如果正在录音）
        if (isRecording) {
            stopVoiceInput();
        }
    }
}

// 初始化语音识别
function initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('浏览器不支持语音识别功能');
        return false;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    // 配置语音识别
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    recognition.maxAlternatives = 1;
    
    // 识别开始
    recognition.onstart = function() {
        console.log('语音识别开始');
        isRecording = true;
        const voiceBtn = document.getElementById('aiVoiceBtn');
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
        
        // 显示录音提示
        showNotification('正在录音...', 'info');
    };
    
    // 识别结果
    recognition.onresult = function(event) {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // 实时更新输入框
        const aiInput = document.getElementById('aiInput');
        if (finalTranscript) {
            aiInput.value = finalTranscript;
        } else if (interimTranscript) {
            aiInput.value = interimTranscript;
        }
    };
    
    // 识别结束
    recognition.onend = function() {
        console.log('语音识别结束');
        stopVoiceInput();
    };
    
    // 识别错误
    recognition.onerror = function(event) {
        console.error('语音识别错误:', event.error);
        stopVoiceInput();
        
        let errorMessage = '语音识别失败';
        switch (event.error) {
            case 'no-speech':
                errorMessage = '未检测到语音';
                break;
            case 'audio-capture':
                errorMessage = '无法访问麦克风';
                break;
            case 'not-allowed':
                errorMessage = '麦克风权限被拒绝';
                break;
            case 'network':
                errorMessage = '网络错误';
                break;
            case 'service-not-allowed':
                errorMessage = '语音识别服务不可用';
                break;
        }
        
        showNotification(errorMessage, 'error');
    };
    
    return true;
}

// 切换语音输入
function toggleVoiceInput() {
    if (!recognition) {
        if (!initializeSpeechRecognition()) {
            showNotification('您的浏览器不支持语音识别功能', 'error');
            return;
        }
    }
    
    if (isRecording) {
        stopVoiceInput();
    } else {
        startVoiceInput();
    }
}

// 开始语音输入
function startVoiceInput() {
    if (!recognition) {
        showNotification('语音识别未初始化', 'error');
        return;
    }
    
    try {
        recognition.start();
    } catch (error) {
        console.error('启动语音识别失败:', error);
        showNotification('启动语音识别失败', 'error');
    }
}

// 停止语音输入
function stopVoiceInput() {
    if (recognition && isRecording) {
        recognition.stop();
    }
    
    isRecording = false;
    const voiceBtn = document.getElementById('aiVoiceBtn');
    voiceBtn.classList.remove('recording');
    voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    
    // 如果有识别结果，自动发送
    const aiInput = document.getElementById('aiInput');
    if (aiInput.value.trim()) {
        setTimeout(() => {
            sendAIMessage();
        }, 500);
    }
}

// 加载对话历史
async function loadConversationHistory() {
    try {
        const response = await fetch('/api/ai/history');
        const data = await response.json();
        
        const messagesContainer = document.getElementById('aiChatMessages');
        messagesContainer.innerHTML = '';
        
        if (data.history && data.history.length > 0) {
            // 显示历史消息
            data.history.forEach(msg => {
                if (msg.role !== 'system') { // 不显示系统消息
                    addAIMessage(msg.content, msg.role, false);
                }
            });
        } else {
            // 显示欢迎消息
            addAIMessage('你好！我是你的AI助手 👋', 'assistant');
            addAIMessage('我可以帮助你管理任务，比如：', 'assistant');
            addAIMessage('• 创建新任务\n• 查找特定任务\n• 管理任务优先级\n• 提供任务建议', 'assistant');
            addAIMessage('有什么可以帮助你的吗？', 'assistant');
        }
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        console.error('加载对话历史失败:', error);
        // 如果加载失败，显示欢迎消息
        const messagesContainer = document.getElementById('aiChatMessages');
        if (messagesContainer.children.length === 0) {
            addAIMessage('你好！我是你的AI助手 👋', 'assistant');
            addAIMessage('我可以帮助你管理任务，比如：', 'assistant');
            addAIMessage('• 创建新任务\n• 查找特定任务\n• 管理任务优先级\n• 提供任务建议', 'assistant');
            addAIMessage('有什么可以帮助你的吗？', 'assistant');
        }
    }
}

// 清空对话历史
async function clearConversationHistory() {
    if (!confirm('确定要清空对话历史吗？这将删除所有聊天记录。')) {
        return;
    }
    
    try {
        const response = await fetch('/api/ai/history', {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // 清空界面
            const messagesContainer = document.getElementById('aiChatMessages');
            messagesContainer.innerHTML = '';
            
            // 重新显示欢迎消息
            addAIMessage('对话历史已清空。让我们重新开始吧！', 'assistant');
            addAIMessage('你好！我是你的AI助手 👋', 'assistant');
            addAIMessage('我可以帮助你管理任务，比如：', 'assistant');
            addAIMessage('• 创建新任务\n• 查找特定任务\n• 管理任务优先级\n• 提供任务建议', 'assistant');
            addAIMessage('有什么可以帮助你的吗？', 'assistant');
            
            showNotification('对话历史已清空');
        } else {
            throw new Error('清空失败');
        }
    } catch (error) {
        console.error('清空对话历史失败:', error);
        showNotification('清空对话历史失败', 'error');
    }
}

function handleAIInput(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendAIMessage();
    }
}

async function sendAIMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // 添加用户消息
    addAIMessage(message, 'user');
    input.value = '';
    
    // 显示AI正在思考
    showAITyping();
    
    try {
        // 调用后端AI接口
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message
            })
        });
        
        const data = await response.json();
        
        hideAITyping();
        
        if (data.response) {
            addAIMessage(data.response, 'assistant');
            
            // 处理AI通过接口执行的操作
            if (data.source === 'ai_with_actions' && data.actions) {
                await handleAIActions(data.actions);
            }
            
            // 显示回复来源标识
            if (data.source === 'ai') {
                console.log('AI回复来源: 真实AI');
            } else if (data.source === 'ai_with_actions') {
                console.log('AI回复来源: AI执行操作');
                console.log('执行的操作:', data.actions);
            } else if (data.source === 'local_fallback') {
                console.log('AI回复来源: 本地降级');
            } else {
                // 本地回复
                console.log('AI回复来源: 本地规则');
            }
        } else {
            addAIMessage('抱歉，我无法处理你的请求。请稍后再试。', 'assistant');
        }
    } catch (error) {
        console.error('AI聊天错误:', error);
        hideAITyping();
        
        // 降级到本地回复
        const response = generateAIResponse(message);
        addAIMessage(response, 'assistant');
    }
}

// 处理AI执行的操作
async function handleAIActions(actions) {
    console.log('处理AI操作:', actions);
    
    // 刷新相关数据
    let needsRefresh = false;
    let needsStatsRefresh = false;
    let needsListsRefresh = false;
    
    // 检查操作类型，决定需要刷新的内容
    for (const action of actions) {
        if (action.success) {
            switch (action.action) {
                case 'create_task':
                case 'update_task':
                case 'delete_task':
                    needsRefresh = true;
                    needsStatsRefresh = true;
                    break;
                case 'create_list':
                    needsListsRefresh = true;
                    needsStatsRefresh = true;
                    break;
                case 'search_tasks':
                    // 搜索操作不需要刷新，但可能需要显示搜索结果
                    if (action.results && action.results.length > 0) {
                        await showSearchResults(action.results, action.query);
                    } else {
                        showNotification(`未找到包含"${action.query}"的任务`, 'info');
                    }
                    break;
            }
        }
    }
    
    // 执行刷新操作
    if (needsListsRefresh) {
        await loadTaskLists();
        renderSidebar();
    }
    
    if (needsRefresh) {
        await loadTasks(currentListId);
        updateTaskListStats();
    }
    
    if (needsStatsRefresh) {
        await loadStats();
    }
    
    // 如果有成功的任务操作，显示通知
    const successfulActions = actions.filter(a => a.success);
    if (successfulActions.length > 0) {
        const actionMessages = successfulActions.map(a => a.message).join('\n');
        showNotification('AI操作完成', 'success');
    }
    
    // 如果有失败的操作，显示错误通知
    const failedActions = actions.filter(a => !a.success);
    if (failedActions.length > 0) {
        const errorMessages = failedActions.map(a => a.error).join('\n');
        showNotification('部分操作失败', 'error');
    }
}

// 显示搜索结果
async function showSearchResults(results, query) {
    // 切换到搜索结果页面
    showPage('searchResults');
    updatePageHeader('AI搜索结果', `AI找到 "${query}" 的结果`);
    
    // 渲染搜索结果
    const searchResults = document.getElementById('searchResults');
    
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-search text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">AI未找到与 "${query}" 相关的任务</p>
            </div>
        `;
        return;
    }
    
    searchResults.innerHTML = `
        <div class="mb-6">
            <p class="text-gray-600">AI找到 ${results.length} 个结果</p>
        </div>
    `;
    
    results.forEach(result => {
        const taskItem = createTaskItem(result);
        searchResults.appendChild(taskItem);
    });
}

function addAIMessage(message, sender) {
    const messagesContainer = document.getElementById('aiChatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ai-message-${sender} ai-message-enter`;
    
    const avatar = document.createElement('div');
    avatar.className = 'ai-avatar-small';
    if (sender === 'assistant') {
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
    } else {
        avatar.innerHTML = '<i class="fas fa-user"></i>';
    }
    
    const content = document.createElement('div');
    content.className = 'ai-message-content';
    
    // 处理多行消息
    const lines = message.split('\n');
    if (lines.length > 1) {
        lines.forEach((line, index) => {
            if (line.startsWith('• ')) {
                const ul = document.createElement('ul');
                ul.className = 'ai-suggestions';
                const li = document.createElement('li');
                li.textContent = line.substring(2);
                ul.appendChild(li);
                content.appendChild(ul);
            } else {
                const p = document.createElement('p');
                p.textContent = line;
                if (index > 0) p.style.marginTop = '8px';
                content.appendChild(p);
            }
        });
    } else {
        const p = document.createElement('p');
        p.textContent = message;
        content.appendChild(p);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messagesContainer.appendChild(messageDiv);
    
    // 滚动到底部
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // 移除动画类
    setTimeout(() => {
        messageDiv.classList.remove('ai-message-enter');
    }, 300);
}

function showAITyping() {
    const messagesContainer = document.getElementById('aiChatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'aiTypingIndicator';
    typingDiv.className = 'ai-message ai-message-assistant ai-message-enter';
    
    const avatar = document.createElement('div');
    avatar.className = 'ai-avatar-small';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';
    
    const content = document.createElement('div');
    content.className = 'ai-message-content';
    content.innerHTML = '<span class="ai-typing">正在思考</span>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(content);
    messagesContainer.appendChild(typingDiv);
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    setTimeout(() => {
        typingDiv.classList.remove('ai-message-enter');
    }, 300);
}

function hideAITyping() {
    const typingIndicator = document.getElementById('aiTypingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function generateAIResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // 创建任务相关
    if (lowerMessage.includes('创建') || lowerMessage.includes('新建') || lowerMessage.includes('添加')) {
        return '好的！我来帮你创建一个任务。📝\n\n请告诉我任务的标题，我还可以帮你设置优先级和截止日期。你也可以直接在上方输入框快速添加任务哦！';
    }
    
    // 查找任务相关
    if (lowerMessage.includes('查找') || lowerMessage.includes('搜索') || lowerMessage.includes('找')) {
        return '我可以帮你查找任务！🔍\n\n你可以使用顶部的搜索框，输入关键词来查找任务。我也可以帮你按优先级、截止日期等条件筛选任务。';
    }
    
    // 任务总结相关
    if (lowerMessage.includes('总结') || lowerMessage.includes('统计') || lowerMessage.includes('报告')) {
        return '让我为你生成任务总结！📊\n\n根据当前数据：\n• 总任务数：' + tasks.length + '\n• 已完成：' + tasks.filter(t => t.completed).length + '\n• 待完成：' + tasks.filter(t => !t.completed).length + '\n\n你的任务完成率很不错，继续加油！💪';
    }
    
    // 优先级相关
    if (lowerMessage.includes('优先级') || lowerMessage.includes('重要')) {
        return '关于任务优先级，我建议：\n\n🔴 高优先级：紧急且重要的任务\n🟡 中优先级：重要但不紧急的任务\n🟢 低优先级：可以稍后处理的任务\n\n你可以为任务设置星标来标记重要任务！⭐';
    }
    
    // 时间管理相关
    if (lowerMessage.includes('时间') || lowerMessage.includes('计划') || lowerMessage.includes('安排')) {
        return '时间管理小贴士：⏰\n\n• 使用"我的一天"列表来规划今日任务\n• 为重要任务设置截止日期\n• 定期回顾和调整任务优先级\n• 记住：完成比完美更重要！\n\n需要我帮你制定计划吗？';
    }
    
    // 问候相关
    if (lowerMessage.includes('你好') || lowerMessage.includes('嗨') || lowerMessage.includes('早上好') || lowerMessage.includes('晚上好')) {
        const hour = new Date().getHours();
        let greeting = '你好';
        if (hour < 12) greeting = '早上好';
        else if (hour < 18) greeting = '下午好';
        else greeting = '晚上好';
        
        return greeting + '！今天有什么任务计划吗？🌟\n\n我可以帮你：\n• 创建今天的任务清单\n• 查看重要的待办事项\n• 分析你的任务完成情况\n\n让我们一起高效地完成今天的任务吧！';
    }
    
    // 帮助相关
    if (lowerMessage.includes('帮助') || lowerMessage.includes('怎么用') || lowerMessage.includes('功能')) {
        return '我来为你介绍主要功能：🚀\n\n📋 **任务管理**\n• 创建、编辑、删除任务\n• 设置优先级和截止日期\n• 标记重要任务\n\n🔍 **搜索和筛选**\n• 按关键词搜索任务\n• 按列表分类查看\n• 显示/隐藏已完成任务\n\n📊 **统计分析**\n• 查看任务完成率\n• 各列表任务统计\n• 进度追踪\n\n还有什么想了解的吗？';
    }
    
    // 默认回复
    const defaultResponses = [
        '这是个好问题！让我想想... 🤔\n\n我建议你可以尝试使用搜索功能查找相关任务，或者创建一个新的任务列表来更好地组织你的工作。需要我演示具体操作吗？',
        '我理解你的需求！💡\n\n你可以通过快捷按钮快速创建任务，或者在输入框中直接输入任务标题。我会帮你管理好所有的待办事项。',
        '很好的想法！✨\n\n记住要合理分配任务优先级，重要的任务要优先完成。如果你需要任何帮助，随时都可以问我！',
        '我在这里帮助你！🤝\n\n无论是创建任务、查找信息还是制定计划，我都能提供支持。告诉我你具体需要什么帮助吧！'
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

function handleQuickAction(action) {
    switch (action) {
        case 'create':
            addAIMessage('我想创建一个新任务', 'user');
            showAITyping();
            setTimeout(() => {
                hideAITyping();
                addAIMessage('好的！我来帮你创建任务。📝\n\n请在上方输入框中输入任务标题，按回车即可快速创建。你也可以点击新建任务按钮来设置更多详细信息。', 'assistant');
                
                // 聚焦到快速输入框
                setTimeout(() => {
                    document.getElementById('quickAddInput').focus();
                }, 500);
            }, 1000);
            break;
            
        case 'find':
            addAIMessage('帮我查找任务', 'user');
            showAITyping();
            setTimeout(() => {
                hideAITyping();
                addAIMessage('我来帮你查找任务！🔍\n\n请使用顶部的搜索框，输入关键词来查找你需要的任务。你可以搜索任务标题或描述内容。', 'assistant');
                
                // 聚焦到搜索框
                setTimeout(() => {
                    document.getElementById('searchInput').focus();
                }, 500);
            }, 1000);
            break;
            
        case 'summary':
            addAIMessage('显示任务总结', 'user');
            showAITyping();
            setTimeout(() => {
                hideAITyping();
                const totalTasks = tasks.length;
                const completedTasks = tasks.filter(t => t.completed).length;
                const pendingTasks = totalTasks - completedTasks;
                const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                
                let summary = `📊 **任务总结报告**\n\n`;
                summary += `• **总任务数**: ${totalTasks}\n`;
                summary += `• **已完成**: ${completedTasks}\n`;
                summary += `• **待完成**: ${pendingTasks}\n`;
                summary += `• **完成率**: ${completionRate}%\n\n`;
                
                if (pendingTasks > 0) {
                    const importantTasks = tasks.filter(t => !t.completed && t.is_important).length;
                    if (importantTasks > 0) {
                        summary += `⭐ **重要待办**: ${importantTasks} 个任务\n\n`;
                    }
                    
                    const todayTasks = tasks.filter(t => !t.completed && t.due_date === new Date().toISOString().split('T')[0]).length;
                    if (todayTasks > 0) {
                        summary += `📅 **今日到期**: ${todayTasks} 个任务\n\n`;
                    }
                }
                
                if (completionRate >= 80) {
                    summary += `🎉 **太棒了！** 你的任务完成率很高，继续保持！`;
                } else if (completionRate >= 60) {
                    summary += `💪 **不错！** 继续努力，你可以做得更好！`;
                } else {
                    summary += `🚀 **加油！** 专注于重要任务，一步一个脚印来提高完成率。`;
                }
                
                addAIMessage(summary, 'assistant');
            }, 1000);
            break;
    }
}

// 点击外部关闭AI助手
document.addEventListener('click', function(event) {
    const aiAssistant = document.getElementById('aiAssistant');
    const aiBtn = document.getElementById('aiAssistantBtn');
    const aiPanel = document.getElementById('aiAssistantPanel');
    
    if (aiAssistantOpen && 
        !aiAssistant.contains(event.target) && 
        !aiBtn.contains(event.target) &&
        !aiPanel.contains(event.target)) {
        toggleAIAssistant();
    }
});

// 通用设置相关功能
function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('show');
    loadSettings();
    
    // 触发内容动画
    setTimeout(() => {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(1) translateY(0)';
            content.style.opacity = '1';
        }
    }, 50);
}

function hideSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const content = modal.querySelector('.modal-content');
    
    // 先隐藏内容
    if (content) {
        content.style.transform = 'scale(0.9) translateY(20px)';
        content.style.opacity = '0';
    }
    
    // 延迟隐藏模态框
    setTimeout(() => {
        modal.classList.remove('show');
    }, 300);
}

function loadSettings() {
    // 从localStorage加载设置
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    
    // 基本设置
    document.getElementById('languageSetting').value = settings.language || 'zh-CN';
    document.getElementById('timezoneSetting').value = settings.timezone || 'Asia/Shanghai';
    document.getElementById('defaultListSetting').value = settings.defaultList || 'today';
    document.getElementById('taskSortSetting').value = settings.taskSort || 'created';
    
    // 数据管理
    document.getElementById('autoSaveInterval').value = settings.autoSaveInterval || '0';
    document.getElementById('dataCleanupSetting').value = settings.dataCleanup || 'never';
    document.getElementById('enableBackup').checked = settings.enableBackup !== false;
    document.getElementById('enableSync').checked = settings.enableSync || false;
}

async function saveSettings(event) {
    event.preventDefault();
    
    const settings = {
        language: document.getElementById('languageSetting').value,
        timezone: document.getElementById('timezoneSetting').value,
        defaultList: document.getElementById('defaultListSetting').value,
        taskSort: document.getElementById('taskSortSetting').value,
        autoSaveInterval: document.getElementById('autoSaveInterval').value,
        dataCleanup: document.getElementById('dataCleanupSetting').value,
        enableBackup: document.getElementById('enableBackup').checked,
        enableSync: document.getElementById('enableSync').checked
    };
    
    // 保存到localStorage
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    // 保存到服务器
    try {
        const response = await fetch('/api/user_preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            hideSettingsModal();
            showNotification('设置已保存');
            
            // 应用语言设置
            if (settings.language) {
                applyLanguageSetting(settings.language);
            }
        } else {
            throw new Error('保存失败');
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        showNotification('保存设置失败', 'error');
    }
}

function applyLanguageSetting(language) {
    // 这里可以实现语言切换逻辑
    console.log('应用语言设置:', language);
    // 可以重新加载页面或更新界面文本
}

// 主题外观相关功能
function showThemesModal() {
    const modal = document.getElementById('themesModal');
    modal.classList.add('show');
    loadThemes();
    
    // 触发内容动画
    setTimeout(() => {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(1) translateY(0)';
            content.style.opacity = '1';
        }
    }, 50);
}

function hideThemesModal() {
    const modal = document.getElementById('themesModal');
    const content = modal.querySelector('.modal-content');
    
    // 先隐藏内容
    if (content) {
        content.style.transform = 'scale(0.9) translateY(20px)';
        content.style.opacity = '0';
    }
    
    // 延迟隐藏模态框
    setTimeout(() => {
        modal.classList.remove('show');
    }, 300);
}

function loadThemes() {
    // 从localStorage加载主题设置
    const themes = JSON.parse(localStorage.getItem('appThemes') || '{}');
    
    // 预设主题
    const currentTheme = themes.theme || 'light';
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    const selectedTheme = document.querySelector(`.theme-option[onclick="selectTheme('${currentTheme}')"]`);
    if (selectedTheme) {
        selectedTheme.classList.add('selected');
    }
    
    // 自定义颜色
    document.getElementById('primaryColor').value = themes.primaryColor || '#0078d4';
    document.getElementById('accentColor').value = themes.accentColor || '#ff8c00';
    document.getElementById('backgroundColor').value = themes.backgroundColor || '#f3f3f3';
    document.getElementById('textColor').value = themes.textColor || '#323130';
    
    // 界面设置
    document.getElementById('fontSizeSetting').value = themes.fontSize || 'medium';
    document.getElementById('uiDensitySetting').value = themes.uiDensity || 'comfortable';
    document.getElementById('enableAnimations').checked = themes.enableAnimations !== false;
    document.getElementById('enableTransitions').checked = themes.enableTransitions !== false;
    document.getElementById('enableShadows').checked = themes.enableShadows !== false;
}

function selectTheme(theme) {
    // 更新选中状态
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`.theme-option[onclick="selectTheme('${theme}')"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // 应用主题
    applyTheme(theme);
}

async function saveThemes(event) {
    event.preventDefault();
    
    const themes = {
        theme: document.querySelector('.theme-option.selected')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || 'light',
        primaryColor: document.getElementById('primaryColor').value,
        accentColor: document.getElementById('accentColor').value,
        backgroundColor: document.getElementById('backgroundColor').value,
        textColor: document.getElementById('textColor').value,
        fontSize: document.getElementById('fontSizeSetting').value,
        uiDensity: document.getElementById('uiDensitySetting').value,
        enableAnimations: document.getElementById('enableAnimations').checked,
        enableTransitions: document.getElementById('enableTransitions').checked,
        enableShadows: document.getElementById('enableShadows').checked
    };
    
    // 保存到localStorage
    localStorage.setItem('appThemes', JSON.stringify(themes));
    
    // 应用自定义颜色
    if (themes.primaryColor) {
        document.documentElement.style.setProperty('--windows-blue', themes.primaryColor);
    }
    if (themes.backgroundColor) {
        document.documentElement.style.setProperty('--windows-bg', themes.backgroundColor);
    }
    if (themes.textColor) {
        document.documentElement.style.setProperty('--windows-text', themes.textColor);
    }
    
    // 应用字体大小
    applyFontSize(themes.fontSize);
    
    // 应用界面密度
    applyUIDensity(themes.uiDensity);
    
    hideThemesModal();
    showNotification('主题已保存');
}

function applyFontSize(size) {
    const root = document.documentElement;
    const sizes = {
        small: '14px',
        medium: '16px',
        large: '18px',
        'extra-large': '20px'
    };
    
    root.style.fontSize = sizes[size] || '16px';
}

function applyUIDensity(density) {
    const body = document.body;
    body.classList.remove('ui-density-compact', 'ui-density-comfortable', 'ui-density-spacious');
    body.classList.add(`ui-density-${density}`);
}

function resetToDefaultTheme() {
    // 重置为默认主题
    selectTheme('light');
    
    // 重置颜色
    document.getElementById('primaryColor').value = '#0078d4';
    document.getElementById('accentColor').value = '#ff8c00';
    document.getElementById('backgroundColor').value = '#f3f3f3';
    document.getElementById('textColor').value = '#323130';
    
    // 重置界面设置
    document.getElementById('fontSizeSetting').value = 'medium';
    document.getElementById('uiDensitySetting').value = 'comfortable';
    document.getElementById('enableAnimations').checked = true;
    document.getElementById('enableTransitions').checked = true;
    document.getElementById('enableShadows').checked = true;
    
    showNotification('已恢复默认主题');
}

// 通知设置相关功能
function showNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    modal.classList.add('show');
    loadNotifications();
    checkNotificationPermission();
    
    // 触发内容动画
    setTimeout(() => {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(1) translateY(0)';
            content.style.opacity = '1';
        }
    }, 50);
}

function hideNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    const content = modal.querySelector('.modal-content');
    
    // 先隐藏内容
    if (content) {
        content.style.transform = 'scale(0.9) translateY(20px)';
        content.style.opacity = '0';
    }
    
    // 延迟隐藏模态框
    setTimeout(() => {
        modal.classList.remove('show');
    }, 300);
}

function loadNotifications() {
    // 从localStorage加载通知设置
    const notifications = JSON.parse(localStorage.getItem('appNotifications') || '{}');
    
    // 任务提醒
    document.getElementById('taskDueReminder').checked = notifications.taskDueReminder !== false;
    document.getElementById('importantTaskReminder').checked = notifications.importantTaskReminder !== false;
    document.getElementById('dailyTaskSummary').checked = notifications.dailyTaskSummary || false;
    document.getElementById('weeklyTaskReport').checked = notifications.weeklyTaskReport || false;
    document.getElementById('reminderTime').value = notifications.reminderTime || '30';
    
    // 声音设置
    document.getElementById('enableSoundReminder').checked = notifications.enableSoundReminder !== false;
    document.getElementById('enableVibration').checked = notifications.enableVibration || false;
    document.getElementById('reminderVolume').value = notifications.reminderVolume || 70;
    document.getElementById('reminderSound').value = notifications.reminderSound || 'default';
    
    // 桌面通知
    document.getElementById('enableDesktopNotification').checked = notifications.enableDesktopNotification !== false;
    document.getElementById('showTaskDetails').checked = notifications.showTaskDetails !== false;
    document.getElementById('autoDismissNotification').checked = notifications.autoDismissNotification !== false;
    
    // 更新音量显示
    updateVolumeDisplay();
}

async function saveNotifications(event) {
    event.preventDefault();
    
    const notifications = {
        taskDueReminder: document.getElementById('taskDueReminder').checked,
        importantTaskReminder: document.getElementById('importantTaskReminder').checked,
        dailyTaskSummary: document.getElementById('dailyTaskSummary').checked,
        weeklyTaskReport: document.getElementById('weeklyTaskReport').checked,
        reminderTime: document.getElementById('reminderTime').value,
        enableSoundReminder: document.getElementById('enableSoundReminder').checked,
        enableVibration: document.getElementById('enableVibration').checked,
        reminderVolume: document.getElementById('reminderVolume').value,
        reminderSound: document.getElementById('reminderSound').value,
        enableDesktopNotification: document.getElementById('enableDesktopNotification').checked,
        showTaskDetails: document.getElementById('showTaskDetails').checked,
        autoDismissNotification: document.getElementById('autoDismissNotification').checked
    };
    
    // 保存到localStorage
    localStorage.setItem('appNotifications', JSON.stringify(notifications));
    
    hideNotificationsModal();
    showNotification('通知设置已保存');
}

function updateVolumeDisplay() {
    const volume = document.getElementById('reminderVolume').value;
    document.getElementById('volumeValue').textContent = volume + '%';
}

function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            updateNotificationStatus(permission);
            
            if (permission === 'granted') {
                showNotification('通知权限已授予', 'success');
            } else if (permission === 'denied') {
                showNotification('通知权限被拒绝', 'error');
            } else {
                showNotification('通知权限未设置', 'info');
            }
        });
    } else {
        showNotification('浏览器不支持桌面通知', 'error');
    }
}

function updateNotificationStatus(permission) {
    const statusElement = document.getElementById('notificationStatus');
    const statusText = {
        granted: '已授权',
        denied: '已拒绝',
        default: '未设置'
    };
    
    statusElement.textContent = statusText[permission] || '未设置';
    
    // 更新样式
    statusElement.className = 'text-sm px-2 py-1 rounded';
    if (permission === 'granted') {
        statusElement.classList.add('bg-green-100', 'text-green-800');
    } else if (permission === 'denied') {
        statusElement.classList.add('bg-red-100', 'text-red-800');
    } else {
        statusElement.classList.add('bg-gray-200');
    }
}

function testNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('测试通知', {
            body: '这是一个测试通知，用于验证通知功能是否正常工作。',
            icon: '/static/icons/icon-192.png',
            tag: 'test-notification'
        });
        
        // 自动关闭
        setTimeout(() => {
            notification.close();
        }, 3000);
        
        showNotification('测试通知已发送', 'success');
    } else {
        showNotification('请先授予通知权限', 'error');
    }
}

// 快捷键相关功能
function showShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    modal.classList.add('show');
    loadShortcuts();
    
    // 触发内容动画
    setTimeout(() => {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(1) translateY(0)';
            content.style.opacity = '1';
        }
    }, 50);
}

function hideShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    const content = modal.querySelector('.modal-content');
    
    // 先隐藏内容
    if (content) {
        content.style.transform = 'scale(0.9) translateY(20px)';
        content.style.opacity = '0';
    }
    
    // 延迟隐藏模态框
    setTimeout(() => {
        modal.classList.remove('show');
    }, 300);
}

function loadShortcuts() {
    // 从localStorage加载快捷键设置
    const shortcuts = JSON.parse(localStorage.getItem('appShortcuts') || '{}');
    
    // 加载自定义快捷键列表
    renderCustomShortcuts(shortcuts.custom || []);
}

function renderCustomShortcuts(customShortcuts) {
    const container = document.getElementById('customShortcutsList');
    container.innerHTML = '';
    
    customShortcuts.forEach((shortcut, index) => {
        const shortcutItem = document.createElement('div');
        shortcutItem.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        shortcutItem.innerHTML = `
            <div class="flex-1">
                <div class="font-medium text-sm">${shortcut.action}</div>
                <div class="text-xs text-gray-500">${shortcut.key}</div>
            </div>
            <button type="button" onclick="removeCustomShortcut(${index})" class="text-red-500 hover:text-red-700">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(shortcutItem);
    });
}

function recordShortcut() {
    const actionSelect = document.getElementById('customAction');
    const shortcutInput = document.getElementById('customShortcut');
    
    if (!actionSelect.value) {
        showNotification('请先选择一个操作', 'error');
        return;
    }
    
    // 开始录制
    shortcutInput.value = '按下快捷键...';
    shortcutInput.style.background = '#fef3c7';
    
    const handleKeyDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 构建快捷键字符串
        let keyString = '';
        if (e.ctrlKey) keyString += 'Ctrl+';
        if (e.altKey) keyString += 'Alt+';
        if (e.shiftKey) keyString += 'Shift+';
        
        // 处理特殊键
        if (e.key === ' ') {
            keyString += 'Space';
        } else if (e.key.length === 1) {
            keyString += e.key.toUpperCase();
        } else {
            keyString += e.key;
        }
        
        shortcutInput.value = keyString;
        shortcutInput.style.background = '#ffffff';
        
        // 移除事件监听器
        document.removeEventListener('keydown', handleKeyDown, true);
    };
    
    // 添加事件监听器
    document.addEventListener('keydown', handleKeyDown, true);
    
    // 5秒后自动停止录制
    setTimeout(() => {
        document.removeEventListener('keydown', handleKeyDown, true);
        if (shortcutInput.value === '按下快捷键...') {
            shortcutInput.value = '';
            shortcutInput.style.background = '#ffffff';
        }
    }, 5000);
}

function addCustomShortcut() {
    const actionSelect = document.getElementById('customAction');
    const shortcutInput = document.getElementById('customShortcut');
    
    if (!actionSelect.value || !shortcutInput.value) {
        showNotification('请选择操作并设置快捷键', 'error');
        return;
    }
    
    // 检查快捷键冲突
    if (checkShortcutConflict(shortcutInput.value)) {
        showNotification('快捷键冲突，请选择其他组合键', 'error');
        return;
    }
    
    // 获取现有快捷键
    const shortcuts = JSON.parse(localStorage.getItem('appShortcuts') || '{}');
    const customShortcuts = shortcuts.custom || [];
    
    // 添加新快捷键
    customShortcuts.push({
        action: actionSelect.options[actionSelect.selectedIndex].text,
        key: shortcutInput.value
    });
    
    shortcuts.custom = customShortcuts;
    localStorage.setItem('appShortcuts', JSON.stringify(shortcuts));
    
    // 清空表单
    actionSelect.value = '';
    shortcutInput.value = '';
    
    // 重新渲染列表
    renderCustomShortcuts(customShortcuts);
    
    showNotification('快捷键已添加');
}

function removeCustomShortcut(index) {
    const shortcuts = JSON.parse(localStorage.getItem('appShortcuts') || '{}');
    const customShortcuts = shortcuts.custom || [];
    
    customShortcuts.splice(index, 1);
    shortcuts.custom = customShortcuts;
    
    localStorage.setItem('appShortcuts', JSON.stringify(shortcuts));
    renderCustomShortcuts(customShortcuts);
    
    showNotification('快捷键已删除');
}

function checkShortcutConflict(newShortcut) {
    // 这里可以实现快捷键冲突检查逻辑
    // 暂时返回false，表示无冲突
    return false;
}

function resetToDefaultShortcuts() {
    localStorage.removeItem('appShortcuts');
    renderCustomShortcuts([]);
    showNotification('已恢复默认快捷键');
}

async function saveShortcuts(event) {
    event.preventDefault();
    
    // 添加当前录制的快捷键
    const shortcutInput = document.getElementById('customShortcut');
    if (shortcutInput.value && shortcutInput.value !== '按下快捷键...') {
        addCustomShortcut();
    }
    
    hideShortcutsModal();
    showNotification('快捷键设置已保存');
}

// AI配置相关功能
function showAIConfigModal() {
    const modal = document.getElementById('aiConfigModal');
    modal.classList.add('show');
    loadAIConfig();
    
    // 触发内容动画
    setTimeout(() => {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(1) translateY(0)';
            content.style.opacity = '1';
        }
    }, 50);
}

function hideAIConfigModal() {
    const modal = document.getElementById('aiConfigModal');
    const content = modal.querySelector('.modal-content');
    
    // 先隐藏内容
    if (content) {
        content.style.transform = 'scale(0.9) translateY(20px)';
        content.style.opacity = '0';
    }
    
    // 延迟隐藏模态框
    setTimeout(() => {
        modal.classList.remove('show');
    }, 300);
}

async function loadAIConfig() {
    try {
        const response = await fetch('/api/ai/config');
        const config = await response.json();
        
        // 填充基本设置
        document.getElementById('aiName').value = config.assistant.name || 'AI助手';
        document.getElementById('aiMode').value = config.assistant.mode || 'smart';
        document.getElementById('aiProvider').value = config.assistant.provider || 'openai';
        document.getElementById('aiApiBase').value = config.assistant.api_base || 'https://api.openai.com/v1';
        document.getElementById('aiApiKey').value = config.assistant.api_key || '';
        document.getElementById('aiMaxTokens').value = config.assistant.max_tokens || 500;
        document.getElementById('aiTemperature').value = config.assistant.temperature || 0.7;
        document.getElementById('aiSystemPrompt').value = config.assistant.system_prompt || '';
        document.getElementById('aiWelcomeMessage').value = config.assistant.welcome_message || '';
        
        // 处理模型选择
        const modelSelect = document.getElementById('aiModel');
        const customModelInput = document.getElementById('aiCustomModel');
        const savedModel = config.assistant.model || 'gpt-3.5-turbo';
        
        // 检查是否为预设模型
        const presetModels = [
            'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o',
            'claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus',
            'qwen-plus', 'qwen-turbo',
            'moonshot-v1-8k', 'moonshot-v1-32k',
            'glm-4', 'deepseek-chat'
        ];
        
        if (presetModels.includes(savedModel)) {
            // 预设模型，直接选择
            modelSelect.value = savedModel;
            customModelInput.style.display = 'none';
        } else {
            // 自定义模型，显示输入框并填入值
            modelSelect.value = 'custom';
            customModelInput.value = savedModel;
            customModelInput.style.display = 'block';
        }
        
        // 填充高级设置
        document.getElementById('aiTimeout').value = config.assistant.timeout || 30;
        document.getElementById('aiRetries').value = config.assistant.retries || 3;
        document.getElementById('aiStreamResponse').checked = config.assistant.stream_response || false;
        document.getElementById('aiSaveHistory').checked = config.assistant.save_history !== false; // 默认为true
        
        // 填充功能开关
        const features = config.features || {};
        document.getElementById('aiTaskCreation').checked = features.task_creation !== false;
        document.getElementById('aiTaskCategorization').checked = features.task_categorization !== false;
        document.getElementById('aiPrioritySuggestion').checked = features.priority_suggestion !== false;
        document.getElementById('aiTimeManagement').checked = features.time_management !== false;
        document.getElementById('aiTaskSummary').checked = features.task_summary !== false;
        
        // 根据提供商更新API基础URL
        updateApiBaseByProvider();
        
    } catch (error) {
        console.error('加载AI配置失败:', error);
        showNotification('加载AI配置失败', 'error');
    }
}

// 根据提供商更新API基础URL
function updateApiBaseByProvider() {
    const provider = document.getElementById('aiProvider').value;
    const apiBaseInput = document.getElementById('aiApiBase');
    
    const providerUrls = {
        'openai': 'https://api.openai.com/v1',
        'azure': 'https://your-resource.openai.azure.com',
        'anthropic': 'https://api.anthropic.com',
        'alibaba': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        'moonshot': 'https://api.moonshot.cn/v1',
        'zhipu': 'https://open.bigmodel.cn/api/paas/v4',
        'deepseek': 'https://api.deepseek.com',
        'custom': apiBaseInput.value
    };
    
    if (provider !== 'custom' && providerUrls[provider]) {
        apiBaseInput.value = providerUrls[provider];
    }
}

// 处理模型选择变化
function handleModelChange() {
    const modelSelect = document.getElementById('aiModel');
    const customModelInput = document.getElementById('aiCustomModel');
    
    if (modelSelect.value === 'custom') {
        // 显示自定义输入框
        customModelInput.style.display = 'block';
        customModelInput.focus();
        
        // 如果自定义输入框有值，更新模型选择
        if (customModelInput.value.trim()) {
            // 这里可以添加验证逻辑
            console.log('使用自定义模型:', customModelInput.value);
        }
    } else {
        // 隐藏自定义输入框
        customModelInput.style.display = 'none';
    }
}

async function saveAIConfig(event) {
    event.preventDefault();
    
    // 获取模型值，如果是自定义则使用输入框的值
    const modelSelect = document.getElementById('aiModel');
    const customModelInput = document.getElementById('aiCustomModel');
    let selectedModel = modelSelect.value;
    
    if (selectedModel === 'custom') {
        selectedModel = customModelInput.value.trim();
        if (!selectedModel) {
            showNotification('请输入自定义模型名称', 'error');
            customModelInput.focus();
            return;
        }
    }
    
    const config = {
        assistant: {
            name: document.getElementById('aiName').value,
            mode: document.getElementById('aiMode').value,
            model: selectedModel,
            provider: document.getElementById('aiProvider').value,
            api_base: document.getElementById('aiApiBase').value,
            api_key: document.getElementById('aiApiKey').value,
            max_tokens: parseInt(document.getElementById('aiMaxTokens').value),
            temperature: parseFloat(document.getElementById('aiTemperature').value),
            system_prompt: document.getElementById('aiSystemPrompt').value,
            welcome_message: document.getElementById('aiWelcomeMessage').value,
            timeout: parseInt(document.getElementById('aiTimeout').value),
            retries: parseInt(document.getElementById('aiRetries').value),
            stream_response: document.getElementById('aiStreamResponse').checked,
            save_history: document.getElementById('aiSaveHistory').checked
        },
        features: {
            task_creation: document.getElementById('aiTaskCreation').checked,
            task_categorization: document.getElementById('aiTaskCategorization').checked,
            priority_suggestion: document.getElementById('aiPrioritySuggestion').checked,
            time_management: document.getElementById('aiTimeManagement').checked,
            task_summary: document.getElementById('aiTaskSummary').checked
        }
    };
    
    try {
        const response = await fetch('/api/ai/config', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(config)
        });
        
        if (response.ok) {
            hideAIConfigModal();
            showNotification('AI配置已保存');
            
            // 更新AI助手头部的名称
            document.querySelector('.ai-assistant-title').textContent = config.assistant.name;
        } else {
            throw new Error('保存失败');
        }
    } catch (error) {
        console.error('保存AI配置失败:', error);
        showNotification('保存AI配置失败', 'error');
    }
}

// 恢复默认系统提示词
function resetToDefaultPrompt() {
    const defaultPrompt = `你是一个专业的任务管理AI助手，帮助用户高效管理他们的待办事项。你的任务是：
1. 帮助用户创建、编辑和管理任务
2. 提供任务优先级建议
3. 协助制定时间管理计划
4. 回答任务管理相关的问题
5. 提供提高效率的建议

请用友好、专业的语调回复，回复要简洁有用。如果用户询问任务相关的信息，你可以基于当前的任务数据回答。`;
    
    document.getElementById('aiSystemPrompt').value = defaultPrompt;
    showNotification('已恢复默认系统提示词');
}

// 恢复默认欢迎消息
function resetToDefaultWelcome() {
    const defaultWelcome = `你好！我是你的AI助手 👋
我可以帮助你管理任务，比如：
• 创建新任务
• 查找特定任务
• 管理任务优先级
• 提供任务建议

有什么可以帮助你的吗？`;
    
    document.getElementById('aiWelcomeMessage').value = defaultWelcome;
    showNotification('已恢复默认欢迎消息');
}

async function testAIConnection() {
    const testResult = document.getElementById('aiTestResult');
    testResult.innerHTML = '<div class="text-blue-500"><i class="fas fa-spinner fa-spin mr-2"></i>正在测试连接...</div>';
    
    try {
        const response = await fetch('/api/ai/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            testResult.innerHTML = `
                <div class="text-green-600">
                    <i class="fas fa-check-circle mr-2"></i>连接成功！
                    <div class="text-xs mt-1">回复: ${data.response.substring(0, 50)}...</div>
                </div>
            `;
        } else {
            testResult.innerHTML = `
                <div class="text-red-600">
                    <i class="fas fa-exclamation-circle mr-2"></i>连接失败: ${data.error}
                </div>
            `;
        }
    } catch (error) {
        console.error('测试AI连接失败:', error);
        testResult.innerHTML = `
            <div class="text-red-600">
                <i class="fas fa-exclamation-circle mr-2"></i>连接失败: ${error.message}
            </div>
        `;
    }
}

// AI助手拖动功能
function initializeAIDrag() {
    const aiBtn = document.getElementById('aiAssistantBtn');
    const aiAssistant = document.getElementById('aiAssistant');
    
    if (!aiBtn) return;
    
    // 从localStorage加载保存的位置
    const savedPosition = localStorage.getItem('aiButtonPosition');
    if (savedPosition) {
        try {
            aiButtonPosition = JSON.parse(savedPosition);
            applyAIPosition();
        } catch (e) {
            console.error('解析AI按钮位置失败:', e);
        }
    }
    
    // 添加拖动事件监听器
    aiBtn.addEventListener('mousedown', startAIDrag);
    aiBtn.addEventListener('touchstart', startAIDrag, { passive: false });
    
    // 添加拖动样式类
    aiBtn.classList.add('draggable');
    
    // 防止拖动时触发点击事件
    aiBtn.addEventListener('click', function(e) {
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
        }
    });
}

function startAIDrag(e) {
    // 只在左键点击时开始拖动
    if (e.type === 'mousedown' && e.button !== 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const aiBtn = document.getElementById('aiAssistantBtn');
    const aiAssistant = document.getElementById('aiAssistant');
    
    isDragging = true;
    aiBtn.classList.add('dragging');
    
    // 获取鼠标/触摸位置
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    // 计算偏移量
    const rect = aiBtn.getBoundingClientRect();
    dragOffset.x = clientX - rect.left;
    dragOffset.y = clientY - rect.top;
    
    // 添加全局事件监听器
    document.addEventListener('mousemove', doAIDrag);
    document.addEventListener('mouseup', stopAIDrag);
    document.addEventListener('touchmove', doAIDrag, { passive: false });
    document.addEventListener('touchend', stopAIDrag);
    
    // 显示拖动边界指示器
    showDragBoundary();
}

function doAIDrag(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    // 计算新位置
    let newX = clientX - dragOffset.x;
    let newY = clientY - dragOffset.y;
    
    // 获取窗口尺寸
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const buttonSize = 60; // 按钮大小
    
    // 限制在窗口范围内
    newX = Math.max(0, Math.min(newX, windowWidth - buttonSize));
    newY = Math.max(0, Math.min(newY, windowHeight - buttonSize));
    
    // 更新位置
    aiButtonPosition.x = newX;
    aiButtonPosition.y = newY;
    
    applyAIPosition();
}

function stopAIDrag(e) {
    if (!isDragging) return;
    
    isDragging = false;
    
    const aiBtn = document.getElementById('aiAssistantBtn');
    aiBtn.classList.remove('dragging');
    
    // 移除全局事件监听器
    document.removeEventListener('mousemove', doAIDrag);
    document.removeEventListener('mouseup', stopAIDrag);
    document.removeEventListener('touchmove', doAIDrag);
    document.removeEventListener('touchend', stopAIDrag);
    
    // 隐藏拖动边界指示器
    hideDragBoundary();
    
    // 保存位置到localStorage
    localStorage.setItem('aiButtonPosition', JSON.stringify(aiButtonPosition));
    
    // 延迟一小段时间后再允许点击，防止拖动结束后立即触发点击
    setTimeout(() => {
        isDragging = false;
    }, 100);
}

function applyAIPosition() {
    const aiAssistant = document.getElementById('aiAssistant');
    if (!aiAssistant) return;
    
    // 应用位置
    aiAssistant.style.left = aiButtonPosition.x + 'px';
    aiAssistant.style.top = aiButtonPosition.y + 'px';
    aiAssistant.style.right = 'auto';
    aiAssistant.style.bottom = 'auto';
}

function showDragBoundary() {
    // 创建或显示边界指示器
    let boundary = document.querySelector('.drag-boundary');
    if (!boundary) {
        boundary = document.createElement('div');
        boundary.className = 'drag-boundary';
        document.body.appendChild(boundary);
    }
    boundary.classList.add('active');
}

function hideDragBoundary() {
    const boundary = document.querySelector('.drag-boundary');
    if (boundary) {
        boundary.classList.remove('active');
    }
}

// 重置AI助手位置
function resetAIPosition() {
    aiButtonPosition = { x: 0, y: 0 };
    const aiAssistant = document.getElementById('aiAssistant');
    if (aiAssistant) {
        aiAssistant.style.left = 'auto';
        aiAssistant.style.top = 'auto';
        aiAssistant.style.right = '16px';
        aiAssistant.style.bottom = '16px';
    }
    localStorage.removeItem('aiButtonPosition');
}



// 日历周视图相关功能
async function showCalendarWeekView() {
    try {
        // 隐藏其他页面
        document.getElementById('tasksList').classList.add('hidden');
        document.getElementById('searchResults').classList.add('hidden');
        document.getElementById('calendarWeekView').classList.remove('hidden');
        
        // 更新页面标题
        updatePageHeader('日历周视图', '在周视图时间轴上轻松安排日程');
        
        // 初始化周视图
        if (!currentWeekStart) {
            currentWeekStart = getWeekStart(new Date());
        }
        
        // 默认显示时间轴视图
        calendarViewMode = 'timeline';
        updateCalendarViewButtons();
        
        // 加载周数据
        await loadCalendarWeek();
        
        // 渲染日历视图
        renderCalendarView();
        
    } catch (error) {
        console.error('显示日历周视图失败:', error);
        showNotification('加载日历视图失败', 'error');
    }
}

// 获取周开始日期（周一）
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
    return new Date(d.setDate(diff));
}

// 格式化日期为ISO字符串
function formatDateToISO(date) {
    return date.toISOString().split('T')[0];
}

// 加载周数据
async function loadCalendarWeek() {
    try {
        const weekStartStr = formatDateToISO(currentWeekStart);
        const response = await fetch(`/api/calendar/week?week_start=${weekStartStr}`);
        const data = await response.json();
        
        weekTasks = data.days || [];
        updateWeekTitle();
        
    } catch (error) {
        console.error('加载周数据失败:', error);
        showNotification('加载周数据失败', 'error');
    }
}

// 更新周标题
function updateWeekTitle() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const startDate = currentWeekStart.toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric' 
    });
    const endDate = weekEnd.toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric' 
    });
    
    const today = new Date();
    const isCurrentWeek = today >= currentWeekStart && today <= weekEnd;
    
    const title = isCurrentWeek ? '本周' : `${startDate} - ${endDate}`;
    document.getElementById('weekTitle').textContent = title;
}

// 渲染日历视图
function renderCalendarView() {
    if (calendarViewMode === 'timeline') {
        renderTimelineView();
    } else {
        renderGridView();
    }
}

// 渲染时间轴视图
function renderTimelineView() {
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '';
    container.className = 'calendar-timeline-container';
    
    // 创建星期标题行
    const weekdaysRow = document.createElement('div');
    weekdaysRow.className = 'calendar-weekdays';
    
    // 添加空白角落（时间标签位置）
    const cornerCell = document.createElement('div');
    cornerCell.className = 'calendar-weekday';
    cornerCell.textContent = '';
    weekdaysRow.appendChild(cornerCell);
    
    // 添加星期标题
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const today = formatDateToISO(new Date());
    
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentDate.getDate() + dayIndex);
        const dateStr = formatDateToISO(currentDate);
        const isToday = dateStr === today;
        
        const weekdayCell = document.createElement('div');
        weekdayCell.className = `calendar-weekday ${isToday ? 'calendar-day-today' : ''}`;
        weekdayCell.innerHTML = `
            <div>${weekDays[dayIndex]}</div>
            <div style="font-size: 12px; font-weight: normal;">${currentDate.getDate()}</div>
        `;
        weekdaysRow.appendChild(weekdayCell);
    }
    
    container.appendChild(weekdaysRow);
    
    // 创建时间轴主体
    const timelineBody = document.createElement('div');
    timelineBody.className = 'calendar-timeline-body';
    
    // 创建时间标签列
    const timeLabels = document.createElement('div');
    timeLabels.className = 'calendar-time-labels';
    
    for (let hour = 0; hour < 24; hour++) {
        const timeLabel = document.createElement('div');
        timeLabel.className = 'calendar-time-label';
        timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
        timeLabels.appendChild(timeLabel);
    }
    
    // 创建日期列容器
    const dayColumnsContainer = document.createElement('div');
    dayColumnsContainer.className = 'calendar-day-columns';
    
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentDate.getDate() + dayIndex);
        const dateStr = formatDateToISO(currentDate);
        const isToday = dateStr === today;
        
        const dayColumn = document.createElement('div');
        dayColumn.className = `calendar-day-column ${isToday ? 'calendar-day-today' : ''}`;
        dayColumn.dataset.date = dateStr;
        
        // 时间槽容器
        const timeSlots = document.createElement('div');
        timeSlots.className = 'calendar-time-slots';
        
        for (let hour = 0; hour < 24; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'calendar-time-slot';
            timeSlot.dataset.hour = hour;
            timeSlot.dataset.date = dateStr;
            
            // 添加拖放事件
            timeSlot.addEventListener('dragover', handleCalendarDragOver);
            timeSlot.addEventListener('drop', handleCalendarDrop);
            timeSlot.addEventListener('dragleave', handleCalendarDragLeave);
            
            timeSlots.appendChild(timeSlot);
        }
        
        // 添加任务块
        const dayTasks = weekTasks[dayIndex]?.tasks || [];
        dayTasks.forEach(task => {
            const taskBlock = createCalendarTaskBlock(task);
            timeSlots.appendChild(taskBlock);
        });
        
        dayColumn.appendChild(timeSlots);
        dayColumnsContainer.appendChild(dayColumn);
    }
    
    timelineBody.appendChild(timeLabels);
    timelineBody.appendChild(dayColumnsContainer);
    container.appendChild(timelineBody);
}

// 渲染宫格视图
function renderGridView() {
    const container = document.getElementById('gridContainer');
    container.innerHTML = '';
    
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const today = formatDateToISO(new Date());
    
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentDate.getDate() + dayIndex);
        const dateStr = formatDateToISO(currentDate);
        const isToday = dateStr === today;
        
        const gridDay = document.createElement('div');
        gridDay.className = 'calendar-grid-day';
        
        // 日期头部
        const dayHeader = document.createElement('div');
        dayHeader.className = `calendar-grid-day-header ${isToday ? 'calendar-grid-day-today' : ''}`;
        dayHeader.innerHTML = `
            <div>${weekDays[dayIndex]} ${currentDate.getDate()}</div>
        `;
        gridDay.appendChild(dayHeader);
        
        // 任务列表
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'calendar-grid-tasks';
        
        const dayTasks = weekTasks[dayIndex]?.tasks || [];
        dayTasks.forEach(task => {
            const taskElement = createCalendarGridTask(task);
            tasksContainer.appendChild(taskElement);
        });
        
        if (dayTasks.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-gray-400 text-sm text-center py-4';
            emptyMessage.textContent = '暂无任务';
            tasksContainer.appendChild(emptyMessage);
        }
        
        gridDay.appendChild(tasksContainer);
        container.appendChild(gridDay);
    }
}

// 创建日历任务块（时间轴视图）
function createCalendarTaskBlock(task) {
    const taskBlock = document.createElement('div');
    taskBlock.className = `calendar-task-block priority-${task.priority} ${task.completed ? 'completed' : ''}`;
    taskBlock.dataset.taskId = task.id;
    taskBlock.draggable = true;
    
    // 计算位置和高度
    const startHour = task.start_time ? parseInt(task.start_time.split(':')[0]) : 9;
    const endHour = task.end_time ? parseInt(task.end_time.split(':')[0]) : startHour + 1;
    const height = Math.max((endHour - startHour) * 60, 40); // 最小高度40px
    
    taskBlock.style.top = `${startHour * 60}px`;
    taskBlock.style.height = `${height}px`;
    
    // 使用计算出的时间来显示，确保一致性
    const displayTime = `${startHour.toString().padStart(2, '0')}:00`;
    
    taskBlock.innerHTML = `
        <div class="calendar-task-time">${displayTime}</div>
        <div class="calendar-task-title">${task.title}</div>
    `;
    
    // 添加拖拽事件
    taskBlock.addEventListener('dragstart', handleTaskDragStart);
    taskBlock.addEventListener('dragend', handleTaskDragEnd);
    
    // 添加点击事件
    taskBlock.addEventListener('click', () => editTask(task.id));
    
    return taskBlock;
}

// 创建日历任务（宫格视图）
function createCalendarGridTask(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `calendar-grid-task priority-${task.priority} ${task.completed ? 'completed' : ''}`;
    taskElement.dataset.taskId = task.id;
    
    taskElement.innerHTML = `
        ${task.start_time ? `<div class="calendar-grid-task-time">${task.start_time}</div>` : ''}
        <div class="calendar-grid-task-title">${task.title}</div>
    `;
    
    // 添加点击事件
    taskElement.addEventListener('click', () => editTask(task.id));
    
    return taskElement;
}

// 切换日历视图模式
function switchCalendarView(mode) {
    calendarViewMode = mode;
    updateCalendarViewButtons();
    renderCalendarView();
}

// 更新视图按钮状态
function updateCalendarViewButtons() {
    const timelineBtn = document.getElementById('timelineViewBtn');
    const gridBtn = document.getElementById('gridViewBtn');
    
    if (calendarViewMode === 'timeline') {
        timelineBtn.classList.add('active');
        gridBtn.classList.remove('active');
    } else {
        timelineBtn.classList.remove('active');
        gridBtn.classList.add('active');
    }
}

// 周导航功能
function previousWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    loadCalendarWeek().then(() => {
        renderCalendarView();
    });
}

function nextWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    loadCalendarWeek().then(() => {
        renderCalendarView();
    });
}

function goToToday() {
    currentWeekStart = getWeekStart(new Date());
    loadCalendarWeek().then(() => {
        renderCalendarView();
    });
}

// 拖拽功能
function handleTaskDragStart(e) {
    draggedTask = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleTaskDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedTask = null;
    
    // 清除所有拖放区域的高亮
    document.querySelectorAll('.calendar-drop-zone').forEach(zone => {
        zone.remove();
    });
}

function handleCalendarDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // 创建或更新拖放区域
    const timeSlot = e.target.closest('.calendar-time-slot');
    if (timeSlot) {
        showDropZone(timeSlot);
    }
}

function handleCalendarDragLeave(e) {
    // 检查是否离开了时间槽
    const timeSlot = e.target.closest('.calendar-time-slot');
    if (!timeSlot || !timeSlot.contains(e.relatedTarget)) {
        hideDropZone(timeSlot);
    }
}

function handleCalendarDrop(e) {
    e.preventDefault();
    
    const timeSlot = e.target.closest('.calendar-time-slot');
    if (timeSlot && draggedTask) {
        const taskId = parseInt(draggedTask.dataset.taskId);
        const newDate = timeSlot.dataset.date;
        const newHour = parseInt(timeSlot.dataset.hour);
        
        // 更新任务时间
        updateTaskTime(taskId, newDate, newHour);
    }
    
    hideDropZone(timeSlot);
}

// 显示拖放区域
function showDropZone(timeSlot) {
    hideDropZone(); // 先清除其他区域
    
    const dropZone = document.createElement('div');
    dropZone.className = 'calendar-drop-zone active';
    dropZone.style.position = 'absolute';
    dropZone.style.top = '0';
    dropZone.style.left = '0';
    dropZone.style.right = '0';
    dropZone.style.bottom = '0';
    
    timeSlot.style.position = 'relative';
    timeSlot.appendChild(dropZone);
    calendarDropZone = dropZone;
}

// 隐藏拖放区域
function hideDropZone() {
    if (calendarDropZone) {
        calendarDropZone.remove();
        calendarDropZone = null;
    }
}

// 更新任务时间
async function updateTaskTime(taskId, newDate, newHour) {
    try {
        const startTime = `${newHour.toString().padStart(2, '0')}:00`;
        const endTime = `${(newHour + 1).toString().padStart(2, '0')}:00`;
        
        console.log(`更新任务时间: 任务ID=${taskId}, 日期=${newDate}, 开始时间=${startTime}, 结束时间=${endTime}, 小时=${newHour}`);
        
        const response = await fetch(`/api/tasks/${taskId}/time`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                due_date: newDate,
                start_time: startTime,
                end_time: endTime
            })
        });
        
        if (response.ok) {
            showNotification(`任务时间已更新到 ${startTime}`);
            await loadCalendarWeek();
            renderCalendarView();
        } else {
            throw new Error('更新失败');
        }
    } catch (error) {
        console.error('更新任务时间失败:', error);
        showNotification('更新任务时间失败', 'error');
    }
}

// PWA智能安装提示功能
let deferredPrompt = null;
let installButton;
let pwaInstallModal = null;
let pwaInstallSupported = false;

// 监听beforeinstallprompt事件
window.addEventListener('beforeinstallprompt', (e) => {
    // 阻止默认的安装横幅
    e.preventDefault();
    // 保存事件以便后续触发
    deferredPrompt = e;
    pwaInstallSupported = true;
    console.log('PWA安装提示已准备，可以安装应用');
    
    // 显示安装提示按钮（如果有的话）
    if (installButton) {
        installButton.style.display = 'block';
    }
});

// 监听PWA安装成功事件
window.addEventListener('appinstalled', (evt) => {
    console.log('PWA应用已成功安装');
    deferredPrompt = null;
    pwaInstallSupported = false;
    showNotification('应用安装成功！感谢您的支持 🎉');
    
    // 关闭任何打开的安装模态框
    if (pwaInstallModal) {
        closePWAInstallModal();
    }
});

// 检查是否应该显示PWA安装提示
async function checkPWAInstallPrompt() {
    try {
        // 获取用户偏好设置
        const response = await fetch('/api/user_preferences');
        const preferences = await response.json();
        
        // 如果用户已经选择不再显示，则不提示
        if (preferences.pwa_install_dismissed) {
            console.log('用户已选择不再显示PWA安装提示');
            return;
        }
        
        // 检查是否在移动端
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) {
            console.log('非移动端，不显示PWA安装提示');
            return;
        }
        
        // 检查是否已经安装
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('PWA已安装，不显示提示');
            return;
        }
        
        // 延迟3秒后显示提示，避免影响页面加载
        setTimeout(() => {
            showPWAInstallModal();
        }, 3000);
        
    } catch (error) {
        console.error('检查PWA安装提示失败:', error);
    }
}

// 显示PWA安装提示模态框
function showPWAInstallModal() {
    // 如果已经显示，则不再显示
    if (pwaInstallModal) {
        return;
    }
    
    // 创建模态框
    pwaInstallModal = document.createElement('div');
    pwaInstallModal.className = 'pwa-install-modal';
    pwaInstallModal.innerHTML = `
        <div class="pwa-install-backdrop" onclick="closePWAInstallModal()"></div>
        <div class="pwa-install-content">
            <div class="pwa-install-header">
                <div class="pwa-install-icon">📱</div>
                <div class="pwa-install-title">安装应用到手机</div>
                <button class="pwa-install-close" onclick="closePWAInstallModal()">×</button>
            </div>
            <div class="pwa-install-body">
                <div class="pwa-install-description">
                    将Microsoft To Do安装到您的手机桌面，享受更便捷的使用体验！
                </div>
                <div class="pwa-install-features">
                    <div class="pwa-feature">
                        <i class="fas fa-bolt"></i>
                        <span>快速启动</span>
                    </div>
                    <div class="pwa-feature">
                        <i class="fas fa-wifi"></i>
                        <span>离线使用</span>
                    </div>
                    <div class="pwa-feature">
                        <i class="fas fa-bell"></i>
                        <span>推送通知</span>
                    </div>
                </div>
                <div class="pwa-install-actions">
                    <button class="pwa-install-btn-primary" onclick="installPWA()">
                        <i class="fas fa-download"></i>
                        立即安装
                    </button>
                    <button class="pwa-install-btn-secondary" onclick="dismissPWAInstall()">
                        不再显示
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .pwa-install-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        }
        
        .pwa-install-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
        }
        
        .pwa-install-content {
            position: relative;
            background: white;
            border-radius: 16px;
            padding: 0;
            max-width: 320px;
            width: 90%;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            animation: slideUp 0.4s ease;
            margin: 20px;
        }
        
        .pwa-install-header {
            display: flex;
            align-items: center;
            padding: 20px 20px 16px;
            border-bottom: 1px solid #f0f0f0;
            position: relative;
        }
        
        .pwa-install-icon {
            font-size: 32px;
            margin-right: 12px;
        }
        
        .pwa-install-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            flex: 1;
        }
        
        .pwa-install-close {
            position: absolute;
            top: 20px;
            right: 20px;
            background: none;
            border: none;
            font-size: 24px;
            color: #666;
            cursor: pointer;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        
        .pwa-install-close:hover {
            background: #f5f5f5;
            color: #333;
        }
        
        .pwa-install-body {
            padding: 20px;
        }
        
        .pwa-install-description {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .pwa-install-features {
            display: flex;
            justify-content: space-around;
            margin-bottom: 24px;
        }
        
        .pwa-feature {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            flex: 1;
        }
        
        .pwa-feature i {
            font-size: 20px;
            color: #0078d4;
            margin-bottom: 8px;
        }
        
        .pwa-feature span {
            font-size: 12px;
            color: #666;
        }
        
        .pwa-install-actions {
            display: flex;
            gap: 12px;
        }
        
        .pwa-install-btn-primary {
            flex: 2;
            background: linear-gradient(135deg, #0078d4, #005a9e);
            color: white;
            border: none;
            padding: 14px 20px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .pwa-install-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 120, 212, 0.3);
        }
        
        .pwa-install-btn-secondary {
            flex: 1;
            background: #f8f9fa;
            color: #666;
            border: 1px solid #e9ecef;
            padding: 14px 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .pwa-install-btn-secondary:hover {
            background: #e9ecef;
            color: #333;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { 
                opacity: 0;
                transform: translateY(30px) scale(0.9);
            }
            to { 
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        @media (max-width: 480px) {
            .pwa-install-content {
                margin: 16px;
                width: 95%;
            }
            
            .pwa-install-header {
                padding: 16px 16px 12px;
            }
            
            .pwa-install-body {
                padding: 16px;
            }
            
            .pwa-install-features {
                margin-bottom: 20px;
            }
            
            .pwa-install-actions {
                flex-direction: column;
                gap: 8px;
            }
            
            .pwa-install-btn-primary,
            .pwa-install-btn-secondary {
                padding: 12px 16px;
                font-size: 14px;
            }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(pwaInstallModal);
    
    // 添加动画类
    setTimeout(() => {
        pwaInstallModal.classList.add('show');
    }, 100);
}

// 关闭PWA安装提示模态框
function closePWAInstallModal() {
    if (pwaInstallModal) {
        pwaInstallModal.classList.add('closing');
        
        setTimeout(() => {
            if (pwaInstallModal) {
                pwaInstallModal.remove();
                pwaInstallModal = null;
            }
        }, 300);
    }
}

// 安装PWA
async function installPWA() {
    console.log('开始PWA安装流程...');
    console.log('deferredPrompt状态:', !!deferredPrompt);
    console.log('PWA支持状态:', pwaInstallSupported);
    
    if (deferredPrompt && pwaInstallSupported) {
        try {
            console.log('显示原生PWA安装提示...');
            // 显示安装提示
            deferredPrompt.prompt();
            
            // 等待用户响应
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`用户响应PWA安装提示: ${outcome}`);
            
            if (outcome === 'accepted') {
                showNotification('应用安装成功！感谢您的支持 🎉');
                closePWAInstallModal();
            } else {
                console.log('用户取消了PWA安装');
                showNotification('安装已取消', 'info');
            }
            
            deferredPrompt = null;
            
        } catch (error) {
            console.error('PWA安装失败:', error);
            showNotification('安装失败，请重试', 'error');
        }
    } else {
        // 如果没有deferredPrompt，提供手动安装指导
        console.log('使用手动安装指导...');
        showPWAInstallGuide();
    }
}

// 显示PWA安装指导
function showPWAInstallGuide() {
    const userAgent = navigator.userAgent.toLowerCase();
    let instructions = '';
    
    if (/android/i.test(userAgent)) {
        instructions = `
            <div style="text-align: left; padding: 16px;">
                <h4 style="margin: 0 0 12px 0; color: #333;">Android 安装步骤：</h4>
                <ol style="margin: 0; padding-left: 20px; color: #666; line-height: 1.6;">
                    <li style="margin-bottom: 8px;">点击浏览器菜单（右上角三个点）</li>
                    <li style="margin-bottom: 8px;">选择"添加到主屏幕"或"安装应用"</li>
                    <li style="margin-bottom: 8px;">确认安装到主屏幕</li>
                </ol>
            </div>
        `;
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
        instructions = `
            <div style="text-align: left; padding: 16px;">
                <h4 style="margin: 0 0 12px 0; color: #333;">iOS 安装步骤：</h4>
                <ol style="margin: 0; padding-left: 20px; color: #666; line-height: 1.6;">
                    <li style="margin-bottom: 8px;">点击底部分享按钮</li>
                    <li style="margin-bottom: 8px;">向下滑动，找到"添加到主屏幕"</li>
                    <li style="margin-bottom: 8px;">点击"添加"确认安装</li>
                </ol>
            </div>
        `;
    } else {
        instructions = `
            <div style="text-align: left; padding: 16px;">
                <h4 style="margin: 0 0 12px 0; color: #333;">安装步骤：</h4>
                <p style="margin: 0; color: #666; line-height: 1.6;">
                    请查找浏览器菜单中的"安装应用"或"添加到主屏幕"选项。
                </p>
            </div>
        `;
    }
    
    // 更新模态框内容
    const content = pwaInstallModal.querySelector('.pwa-install-body');
    if (content) {
        content.innerHTML = instructions + `
            <div style="padding: 16px; text-align: center;">
                <button class="pwa-install-btn-primary" onclick="closePWAInstallModal()" style="width: 100%;">
                    我知道了
                </button>
            </div>
        `;
    }
}

// 用户选择不再显示PWA安装提示
async function dismissPWAInstall() {
    try {
        // 更新用户偏好设置
        const response = await fetch('/api/user_preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pwa_install_dismissed: true
            })
        });
        
        if (response.ok) {
            console.log('用户选择不再显示PWA安装提示');
            closePWAInstallModal();
            showNotification('已记录您的选择，将不再显示安装提示');
        } else {
            throw new Error('更新设置失败');
        }
    } catch (error) {
        console.error('更新PWA安装提示设置失败:', error);
        showNotification('设置失败，请重试', 'error');
    }
}

// 显示安装应用对话框
function showInstallAppDialog() {
    // 如果支持PWA安装提示，直接触发
    if (deferredPrompt) {
        installPWA();
        return;
    }
    
    // 否则显示安装指导
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
        <div class="modal-content" style="max-width: 400px;">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-semibold">安装应用到手机</h2>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="mb-6">
                <p class="text-gray-600 mb-4">将Microsoft To Do安装到您的手机桌面，享受更便捷的使用体验！</p>
                
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 class="font-semibold text-blue-800 mb-2">
                        <i class="fas fa-bolt mr-2"></i>快速启动
                    </h3>
                    <p class="text-blue-700 text-sm">从桌面直接打开应用，无需浏览器</p>
                </div>
                
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h3 class="font-semibold text-green-800 mb-2">
                        <i class="fas fa-wifi mr-2"></i>离线使用
                    </h3>
                    <p class="text-green-700 text-sm">无网络时也能正常使用核心功能</p>
                </div>
                
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 class="font-semibold text-purple-800 mb-2">
                        <i class="fas fa-bell mr-2"></i>推送通知
                    </h3>
                    <p class="text-purple-700 text-sm">及时接收任务提醒和更新</p>
                </div>
            </div>
            
            <div class="flex justify-end space-x-3">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="windows-button-secondary px-4 py-2">
                    稍后安装
                </button>
                <button onclick="installPWA(); this.parentElement.parentElement.parentElement.remove();" class="windows-button px-4 py-2">
                    <i class="fas fa-download mr-2"></i>立即安装
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加动画类
    setTimeout(() => {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(1) translateY(0)';
            content.style.opacity = '1';
        }
    }, 50);
}

// 显示关于对话框
function showAboutDialog() {
    showNotification('Microsoft To Do - 版本 1.0.0\n一个现代化的任务管理应用\n支持PWA离线使用和AI智能助手', 'info');
}

// 删除账户相关功能
function showDeleteAccountDialog() {
    toggleUserMenu(); // 关闭用户菜单
    
    const modal = document.getElementById('deleteAccountModal');
    modal.classList.add('show');
    
    // 加载用户数据摘要
    loadUserDataSummary();
    
    // 触发内容动画
    setTimeout(() => {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(1) translateY(0)';
            content.style.opacity = '1';
        }
    }, 50);
}

function hideDeleteAccountDialog() {
    const modal = document.getElementById('deleteAccountModal');
    const content = modal.querySelector('.modal-content');
    
    // 先隐藏内容
    if (content) {
        content.style.transform = 'scale(0.9) translateY(20px)';
        content.style.opacity = '0';
    }
    
    // 延迟隐藏模态框
    setTimeout(() => {
        modal.classList.remove('show');
        // 清空表单
        document.getElementById('deleteAccountForm').reset();
        document.getElementById('deleteConfirmation').value = '';
        document.getElementById('deletePassword').value = '';
    }, 300);
}

async function loadUserDataSummary() {
    const summaryDiv = document.getElementById('userDataSummary');
    
    try {
        // 获取用户统计数据
        const [statsResponse, listsResponse, tasksResponse] = await Promise.all([
            fetch('/api/stats'),
            fetch('/api/task_lists'),
            fetch('/api/tasks?show_completed=true')
        ]);
        
        const stats = await statsResponse.json();
        const lists = await listsResponse.json();
        const tasks = await tasksResponse.json();
        
        // 计算数据摘要
        const totalTasks = stats.total_tasks || 0;
        const completedTasks = stats.completed_tasks || 0;
        const pendingTasks = stats.pending_tasks || 0;
        const totalLists = lists.length || 0;
        const importantTasks = tasks.filter(t => t.is_important && !t.completed).length || 0;
        const todayTasks = tasks.filter(t => {
            const today = new Date().toISOString().split('T')[0];
            return t.due_date === today && !t.completed;
        }).length || 0;
        const overdueTasks = tasks.filter(t => {
            return t.due_date && new Date(t.due_date) < new Date() && !t.completed;
        }).length || 0;
        
        // 显示数据摘要
        summaryDiv.innerHTML = `
            <div class="text-sm text-gray-600">
                <h4 class="font-semibold text-gray-800 mb-3">您的数据摘要：</h4>
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-blue-50 p-3 rounded">
                        <div class="text-blue-800 font-medium">${totalTasks}</div>
                        <div class="text-blue-600 text-xs">总任务数</div>
                    </div>
                    <div class="bg-green-50 p-3 rounded">
                        <div class="text-green-800 font-medium">${completedTasks}</div>
                        <div class="text-green-600 text-xs">已完成</div>
                    </div>
                    <div class="bg-orange-50 p-3 rounded">
                        <div class="text-orange-800 font-medium">${pendingTasks}</div>
                        <div class="text-orange-600 text-xs">待完成</div>
                    </div>
                    <div class="bg-purple-50 p-3 rounded">
                        <div class="text-purple-800 font-medium">${totalLists}</div>
                        <div class="text-purple-600 text-xs">任务列表</div>
                    </div>
                    <div class="bg-red-50 p-3 rounded">
                        <div class="text-red-800 font-medium">${importantTasks}</div>
                        <div class="text-red-600 text-xs">重要任务</div>
                    </div>
                    <div class="bg-yellow-50 p-3 rounded">
                        <div class="text-yellow-800 font-medium">${todayTasks}</div>
                        <div class="text-yellow-600 text-xs">今日到期</div>
                    </div>
                </div>
                ${overdueTasks > 0 ? `
                    <div class="mt-3 bg-red-100 border border-red-200 p-3 rounded">
                        <div class="text-red-800 font-medium">${overdueTasks}</div>
                        <div class="text-red-600 text-xs">逾期任务</div>
                    </div>
                ` : ''}
            </div>
        `;
        
    } catch (error) {
        console.error('加载用户数据摘要失败:', error);
        summaryDiv.innerHTML = `
            <div class="text-sm text-red-600">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                无法加载数据摘要，请检查网络连接
            </div>
        `;
    }
}

async function confirmDeleteAccount(event) {
    event.preventDefault();
    
    const confirmation = document.getElementById('deleteConfirmation').value.trim();
    const password = document.getElementById('deletePassword').value;
    
    // 验证确认文本
    if (confirmation !== '删除我的账户') {
        showNotification('请输入正确的确认文本：删除我的账户', 'error');
        return;
    }
    
    // 验证密码
    if (!password) {
        showNotification('请输入密码以验证身份', 'error');
        return;
    }
    
    // 再次确认
    if (!confirm('⚠️ 最后确认：\n\n删除账户将永久清除所有数据，包括：\n• 所有任务和任务列表\n• 用户偏好设置\n• 登录会话记录\n• 所有相关数据\n\n此操作无法撤销，确定要继续吗？')) {
        return;
    }
    
    try {
        // 显示处理状态
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>正在删除...';
        submitBtn.disabled = true;
        
        // 发送删除请求
        const response = await fetch('/api/user/delete-account', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('账户删除成功，即将跳转到登录页面...', 'success');
            
            // 清除本地存储
            localStorage.clear();
            sessionStorage.clear();
            
            // 延迟跳转，让用户看到成功消息
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
            
        } else {
            throw new Error(data.error || '删除账户失败');
        }
        
    } catch (error) {
        console.error('删除账户失败:', error);
        
        // 恢复按钮状态
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-trash-alt mr-2"></i>确认删除账户';
        submitBtn.disabled = false;
        
        // 显示错误信息
        let errorMessage = '删除账户失败';
        if (error.message) {
            if (error.message.includes('密码')) {
                errorMessage = '密码错误，请重新输入';
            } else if (error.message.includes('网络')) {
                errorMessage = '网络连接失败，请检查网络后重试';
            } else if (error.message.includes('权限')) {
                errorMessage = '权限不足，请重新登录后重试';
            } else {
                errorMessage = error.message;
            }
        }
        
        showNotification(errorMessage, 'error');
        
        // 如果是密码错误，清空密码字段
        if (error.message && error.message.includes('密码')) {
            document.getElementById('deletePassword').value = '';
            document.getElementById('deletePassword').focus();
        }
    }
}

// 点击外部关闭删除账户模态框
document.addEventListener('click', function(event) {
    const deleteModal = document.getElementById('deleteAccountModal');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const mobileUserMenuBtn = document.getElementById('mobileUserMenuBtn');
    const userMenu = document.getElementById('userMenu');
    
    // 检查是否点击了删除账户模态框外部
    if (deleteModal && deleteModal.classList.contains('show') && 
        !deleteModal.contains(event.target) && 
        !userMenuBtn.contains(event.target) &&
        !mobileUserMenuBtn.contains(event.target) &&
        !userMenu.contains(event.target)) {
        
        // 检查是否点击了删除账户菜单项
        const deleteMenuItem = event.target.closest('a[onclick*="showDeleteAccountDialog"]');
        if (!deleteMenuItem) {
            hideDeleteAccountDialog();
        }
    }
});

// 检查是否已安装
window.addEventListener('appinstalled', () => {
    console.log('PWA已安装');
    if (pwaInstallModal) {
        closePWAInstallModal();
    }
    showNotification('应用安装成功！感谢您的支持 🎉');
});
