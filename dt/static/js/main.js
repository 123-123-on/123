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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
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

    // 模态框外部点击关闭
    const taskModal = document.getElementById('taskModal');
    taskModal.addEventListener('click', function(e) {
        if (e.target === taskModal) {
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
    taskItem.className = `task-item windows-card relative ${task.completed ? 'completed' : ''}`;
    taskItem.dataset.taskId = task.id;

    const priorityClass = `priority-${task.priority}`;
    const dueDateText = task.due_date ? formatDate(task.due_date) : '';
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed;

    taskItem.innerHTML = `
        <div class="priority-indicator ${priorityClass}"></div>
        <div class="flex items-center space-x-3 pl-2">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                 onclick="toggleTaskComplete(${task.id})"></div>
            <div class="flex-1 min-w-0">
                <div class="task-title font-medium">${task.title}</div>
                ${task.description ? `<div class="text-sm text-gray-500 mt-1">${task.description}</div>` : ''}
                <div class="flex items-center space-x-4 mt-2">
                    ${dueDateText ? `
                        <div class="text-xs ${isOverdue ? 'text-red-500' : 'text-gray-500'}">
                            <i class="fas fa-calendar-alt mr-1"></i>${dueDateText}
                        </div>
                    ` : ''}
                    ${task.is_important ? `
                        <div class="text-xs text-orange-500">
                            <i class="fas fa-star mr-1"></i>重要
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button class="important-star ${task.is_important ? 'fas' : 'far'} fa-star" 
                        onclick="toggleTaskImportant(${task.id})"></button>
                <button class="text-gray-400 hover:text-gray-600" onclick="editTask(${task.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="text-gray-400 hover:text-red-500" onclick="deleteTask(${task.id})">
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

async function addQuickTask() {
    // 防止重复提交
    if (isAddingTask) {
        return;
    }

    const input = document.getElementById('quickAddInput');
    const title = input.value.trim();
    
    if (!title) return;

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
    document.getElementById('taskModal').classList.add('show');
}

// 隐藏任务模态框
function hideTaskModal() {
    document.getElementById('taskModal').classList.remove('show');
    currentEditingTaskId = null;
}

// 保存任务
async function saveTask(event) {
    event.preventDefault();
    
    const formData = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        priority: document.getElementById('taskPriority').value,
        due_date: document.getElementById('taskDueDate').value,
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
    const pages = ['tasksList', 'searchResults'];
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
    
    document.getElementById('newListModal').classList.add('show');
}

function hideNewListModal() {
    document.getElementById('newListModal').classList.remove('show');
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

// 切换更多菜单
function toggleMoreMenu() {
    const moreMenu = document.getElementById('moreMenu');
    const moreBtn = document.getElementById('moreBtn');
    
    moreMenuOpen = !moreMenuOpen;
    
    if (moreMenuOpen) {
        moreMenu.classList.add('show');
        moreBtn.style.background = 'var(--windows-blue)';
        moreBtn.style.color = 'white';
    } else {
        moreMenu.classList.remove('show');
        moreBtn.style.background = 'var(--windows-surface)';
        moreBtn.style.color = 'var(--windows-text)';
    }
}

// 处理更多菜单操作
function handleMoreAction(action) {
    toggleMoreMenu(); // 关闭菜单
    
    switch (action) {
        case 'import':
            showNotification('导入任务功能开发中...', 'info');
            break;
        case 'export':
            showNotification('导出任务功能开发中...', 'info');
            break;
        case 'settings':
            showNotification('设置功能开发中...', 'info');
            break;
        case 'about':
            showNotification('Microsoft To Do 克隆版本 v1.0', 'info');
            break;
        default:
            showNotification('功能开发中...', 'info');
    }
}

// 点击外部关闭更多菜单
document.addEventListener('click', function(event) {
    const moreBtn = document.getElementById('moreBtn');
    const moreMenu = document.getElementById('moreMenu');
    const actionButtonsContainer = document.getElementById('actionButtonsContainer');
    
    // 如果点击的不是更多按钮或菜单内部，且不在按钮容器内，则关闭菜单
    if (moreMenuOpen && 
        !moreBtn.contains(event.target) && 
        !moreMenu.contains(event.target) &&
        !actionButtonsContainer.contains(event.target)) {
        toggleMoreMenu();
    }
});

// 防止菜单内部点击事件冒泡
document.getElementById('moreMenu').addEventListener('click', function(event) {
    event.stopPropagation();
});

// AI助手相关功能
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
        
        // 添加欢迎消息（如果还没有消息）
        const messagesContainer = document.getElementById('aiChatMessages');
        if (messagesContainer.children.length === 0) {
            addAIMessage('你好！我是你的AI助手 👋', 'assistant');
            addAIMessage('我可以帮助你管理任务，比如：', 'assistant');
            addAIMessage('• 创建新任务\n• 查找特定任务\n• 管理任务优先级\n• 提供任务建议', 'assistant');
            addAIMessage('有什么可以帮助你的吗？', 'assistant');
        }
    } else {
        panel.classList.remove('show');
        btn.style.transform = 'scale(1)';
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
            
            // 显示回复来源标识
            if (data.source === 'ai') {
                // AI回复，可以添加特殊标识
                console.log('AI回复来源: 真实AI');
            } else if (data.source === 'local_fallback') {
                // 降级到本地回复
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

// AI配置相关功能
function showAIConfigModal() {
    loadAIConfig();
    document.getElementById('aiConfigModal').classList.add('show');
}

function hideAIConfigModal() {
    document.getElementById('aiConfigModal').classList.remove('show');
}

async function loadAIConfig() {
    try {
        const response = await fetch('/api/ai/config');
        const config = await response.json();
        
        // 填充表单
        document.getElementById('aiName').value = config.assistant.name || 'AI助手';
        document.getElementById('aiModel').value = config.assistant.model || 'gpt-3.5-turbo';
        document.getElementById('aiApiBase').value = config.assistant.api_base || 'https://api.openai.com/v1';
        document.getElementById('aiApiKey').value = config.assistant.api_key || '';
        document.getElementById('aiMaxTokens').value = config.assistant.max_tokens || 500;
        document.getElementById('aiTemperature').value = config.assistant.temperature || 0.7;
        document.getElementById('aiSystemPrompt').value = config.assistant.system_prompt || '';
        document.getElementById('aiWelcomeMessage').value = config.assistant.welcome_message || '';
        
    } catch (error) {
        console.error('加载AI配置失败:', error);
        showNotification('加载AI配置失败', 'error');
    }
}

async function saveAIConfig(event) {
    event.preventDefault();
    
    const config = {
        assistant: {
            name: document.getElementById('aiName').value,
            model: document.getElementById('aiModel').value,
            api_base: document.getElementById('aiApiBase').value,
            api_key: document.getElementById('aiApiKey').value,
            max_tokens: parseInt(document.getElementById('aiMaxTokens').value),
            temperature: parseFloat(document.getElementById('aiTemperature').value),
            system_prompt: document.getElementById('aiSystemPrompt').value,
            welcome_message: document.getElementById('aiWelcomeMessage').value
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

// 修改更多菜单，添加AI配置选项
function handleMoreAction(action) {
    toggleMoreMenu(); // 关闭菜单
    
    switch (action) {
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
            showNotification('设置功能开发中...', 'info');
            break;
        case 'about':
            showNotification('Microsoft To Do 克隆版本 v1.0', 'info');
            break;
        default:
            showNotification('功能开发中...', 'info');
    }
}
