from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import sqlite3
import json
import requests
import os
from datetime import datetime, date
from database import init_database, insert_default_data

app = Flask(__name__)
CORS(app)

# 初始化数据库
init_database()
insert_default_data()

def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect('settings.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    """主页面"""
    return render_template('index.html')

@app.route('/api/task_lists')
def get_task_lists():
    """获取所有任务列表"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 一次性获取所有任务列表及其统计信息
    cursor.execute('''
        SELECT 
            tl.id, tl.name, tl.icon, tl.color, tl.sort_order,
            COUNT(t.id) as total_tasks,
            COUNT(CASE WHEN t.completed = 1 THEN 1 END) as completed_tasks
        FROM task_lists tl
        LEFT JOIN tasks t ON tl.id = t.list_id
        GROUP BY tl.id, tl.name, tl.icon, tl.color, tl.sort_order
        ORDER BY tl.sort_order
    ''')
    
    lists = cursor.fetchall()
    conn.close()
    
    result = []
    for task_list in lists:
        result.append({
            'id': task_list['id'],
            'name': task_list['name'],
            'icon': task_list['icon'],
            'color': task_list['color'],
            'sort_order': task_list['sort_order'],
            'total_tasks': task_list['total_tasks'] or 0,
            'completed_tasks': task_list['completed_tasks'] or 0
        })
    
    return jsonify(result)

@app.route('/api/tasks')
def get_tasks():
    """获取任务列表"""
    list_id = request.args.get('list_id')
    show_completed = request.args.get('show_completed', 'true').lower() == 'true'
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if list_id:
        # 获取特定列表的任务
        query = '''
            SELECT id, title, description, completed, priority, due_date, 
                   list_id, created_at, updated_at, completed_at, is_important
            FROM tasks 
            WHERE list_id = ?
        '''
        params = [list_id]
    else:
        # 获取所有任务
        query = '''
            SELECT id, title, description, completed, priority, due_date, 
                   list_id, created_at, updated_at, completed_at, is_important
            FROM tasks
        '''
        params = []
    
    if not show_completed:
        query += ' AND completed = 0'
    
    query += ' ORDER BY is_important DESC, due_date ASC, created_at DESC'
    
    cursor.execute(query, params)
    tasks = cursor.fetchall()
    conn.close()
    
    result = []
    for task in tasks:
        result.append({
            'id': task['id'],
            'title': task['title'],
            'description': task['description'],
            'completed': bool(task['completed']),
            'priority': task['priority'],
            'due_date': task['due_date'],
            'list_id': task['list_id'],
            'created_at': task['created_at'],
            'updated_at': task['updated_at'],
            'completed_at': task['completed_at'],
            'is_important': bool(task['is_important'])
        })
    
    return jsonify(result)

@app.route('/api/tasks/<int:task_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_task(task_id):
    """处理单个任务的获取、更新和删除"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute('''
            SELECT id, title, description, completed, priority, due_date, 
                   list_id, created_at, updated_at, completed_at, is_important
            FROM tasks 
            WHERE id = ?
        ''', (task_id,))
        
        task = cursor.fetchone()
        conn.close()
        
        if task:
            return jsonify({
                'id': task['id'],
                'title': task['title'],
                'description': task['description'],
                'completed': bool(task['completed']),
                'priority': task['priority'],
                'due_date': task['due_date'],
                'list_id': task['list_id'],
                'created_at': task['created_at'],
                'updated_at': task['updated_at'],
                'completed_at': task['completed_at'],
                'is_important': bool(task['is_important'])
            })
        else:
            return jsonify({'error': '任务不存在'}), 404
    
    elif request.method == 'PUT':
        data = request.get_json()
        
        # 构建更新语句
        update_fields = []
        update_values = []
        
        for field in ['title', 'description', 'priority', 'due_date', 'list_id', 'is_important']:
            if field in data:
                update_fields.append(f"{field} = ?")
                update_values.append(data[field])
        
        if 'completed' in data:
            update_fields.append("completed = ?")
            update_values.append(data['completed'])
            if data['completed']:
                update_fields.append("completed_at = ?")
                update_values.append(datetime.now().isoformat())
            else:
                update_fields.append("completed_at = ?")
                update_values.append(None)
        
        if not update_fields:
            return jsonify({'error': '没有要更新的字段'}), 400
        
        update_fields.append("updated_at = ?")
        update_values.append(datetime.now().isoformat())
        update_values.append(task_id)
        
        cursor.execute(f'''
            UPDATE tasks 
            SET {', '.join(update_fields)}
            WHERE id = ?
        ''', update_values)
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    
    elif request.method == 'DELETE':
        cursor.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """创建新任务"""
    data = request.get_json()
    
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': '任务标题不能为空'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO tasks (title, description, priority, due_date, list_id, is_important)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        title,
        data.get('description', ''),
        data.get('priority', 'medium'),
        data.get('due_date'),
        data.get('list_id'),
        data.get('is_important', False)
    ))
    
    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'id': task_id, 'success': True})

@app.route('/api/task_lists', methods=['POST'])
def create_task_list():
    """创建新任务列表"""
    data = request.get_json()
    
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': '列表名称不能为空'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 获取最大的排序顺序
    cursor.execute('SELECT MAX(sort_order) as max_order FROM task_lists')
    max_order = cursor.fetchone()['max_order'] or 0
    
    cursor.execute('''
        INSERT INTO task_lists (name, icon, color, sort_order)
        VALUES (?, ?, ?, ?)
    ''', (
        name,
        data.get('icon', '📋'),
        data.get('color', '#0078d4'),
        max_order + 1
    ))
    
    list_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'id': list_id, 'success': True})

@app.route('/api/task_lists/<int:list_id>', methods=['PUT', 'DELETE'])
def handle_task_list(list_id):
    """处理任务列表的更新和删除"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'PUT':
        data = request.get_json()
        
        update_fields = []
        update_values = []
        
        for field in ['name', 'icon', 'color']:
            if field in data:
                update_fields.append(f"{field} = ?")
                update_values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': '没有要更新的字段'}), 400
        
        update_values.append(list_id)
        
        cursor.execute(f'''
            UPDATE task_lists 
            SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', update_values)
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    
    elif request.method == 'DELETE':
        # 删除列表及其所有任务
        cursor.execute('DELETE FROM tasks WHERE list_id = ?', (list_id,))
        cursor.execute('DELETE FROM task_lists WHERE id = ?', (list_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})

@app.route('/api/user_preferences', methods=['GET', 'PUT'])
def handle_user_preferences():
    """处理用户偏好设置"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute('SELECT * FROM user_preferences WHERE id = 1')
        prefs = cursor.fetchone()
        conn.close()
        
        if prefs:
            return jsonify({
                'theme': prefs['theme'],
                'language': prefs['language'],
                'accent_color': prefs['accent_color'],
                'font_size': prefs['font_size'],
                'animations_enabled': bool(prefs['animations_enabled']),
                'transparency_enabled': bool(prefs['transparency_enabled']),
                'view_mode': prefs['view_mode'],
                'show_completed': bool(prefs['show_completed']),
                'default_list_id': prefs['default_list_id']
            })
        else:
            return jsonify({'error': '用户偏好不存在'}), 404
    
    elif request.method == 'PUT':
        data = request.get_json()
        
        # 构建更新语句
        update_fields = []
        update_values = []
        
        for field in ['theme', 'language', 'accent_color', 'font_size', 
                     'animations_enabled', 'transparency_enabled', 
                     'view_mode', 'show_completed', 'default_list_id']:
            if field in data:
                update_fields.append(f"{field} = ?")
                update_values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': '没有要更新的字段'}), 400
        
        update_values.append(1)  # WHERE id = 1
        
        cursor.execute(f'''
            UPDATE user_preferences 
            SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', update_values)
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})

@app.route('/api/stats')
def get_stats():
    """获取任务统计信息"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 总任务数
    cursor.execute('SELECT COUNT(*) as total FROM tasks')
    total_tasks = cursor.fetchone()['total']
    
    # 已完成任务数
    cursor.execute('SELECT COUNT(*) as completed FROM tasks WHERE completed = 1')
    completed_tasks = cursor.fetchone()['completed']
    
    # 重要任务数
    cursor.execute('SELECT COUNT(*) as important FROM tasks WHERE is_important = 1 AND completed = 0')
    important_tasks = cursor.fetchone()['important']
    
    # 今日到期任务数
    today = date.today().isoformat()
    cursor.execute('SELECT COUNT(*) as today_due FROM tasks WHERE due_date = ? AND completed = 0', (today,))
    today_due_tasks = cursor.fetchone()['today_due']
    
    # 本周到期任务数
    cursor.execute('''
        SELECT COUNT(*) as week_due 
        FROM tasks 
        WHERE due_date BETWEEN ? AND ? AND completed = 0
    ''', (today, date.fromordinal(date.today().toordinal() + 7).isoformat()))
    week_due_tasks = cursor.fetchone()['week_due']
    
    conn.close()
    
    return jsonify({
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'pending_tasks': total_tasks - completed_tasks,
        'important_tasks': important_tasks,
        'today_due_tasks': today_due_tasks,
        'week_due_tasks': week_due_tasks,
        'completion_rate': round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
    })

@app.route('/api/search')
def search_tasks():
    """搜索任务"""
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({'error': '缺少搜索查询'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT t.id, t.title, t.description, t.completed, t.priority, 
               t.due_date, t.list_id, tl.name as list_name, tl.icon as list_icon
        FROM tasks t
        LEFT JOIN task_lists tl ON t.list_id = tl.id
        WHERE t.title LIKE ? OR t.description LIKE ?
        ORDER BY t.is_important DESC, t.due_date ASC
    ''', (f'%{query}%', f'%{query}%'))
    
    results = cursor.fetchall()
    conn.close()
    
    search_results = []
    for result in results:
        search_results.append({
            'id': result['id'],
            'title': result['title'],
            'description': result['description'],
            'completed': bool(result['completed']),
            'priority': result['priority'],
            'due_date': result['due_date'],
            'list_id': result['list_id'],
            'list_name': result['list_name'],
            'list_icon': result['list_icon']
        })
    
    return jsonify(search_results)

# AI助手相关API
def load_ai_config():
    """加载AI配置"""
    try:
        with open('ai_config.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {
            "assistant": {
                "name": "AI助手",
                "model": "gpt-3.5-turbo",
                "provider": "openai-compatible",
                "api_key": "",
                "api_base": "https://api.openai.com/v1",
                "max_tokens": 500,
                "temperature": 0.7,
                "system_prompt": "你是一个专业的任务管理AI助手。",
                "welcome_message": "你好！我是你的AI助手。",
                "typing_delay": {"min": 1000, "max": 2000}
            }
        }

def save_ai_config(config):
    """保存AI配置"""
    try:
        with open('ai_config.json', 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"保存配置失败: {e}")
        return False

@app.route('/api/ai/config', methods=['GET', 'PUT'])
def handle_ai_config():
    """处理AI配置"""
    if request.method == 'GET':
        config = load_ai_config()
        # 隐藏API密钥
        if 'assistant' in config and 'api_key' in config['assistant']:
            config['assistant']['api_key'] = '***' if config['assistant']['api_key'] else ''
        return jsonify(config)
    
    elif request.method == 'PUT':
        data = request.get_json()
        current_config = load_ai_config()
        
        # 更新配置
        if 'assistant' in data:
            current_config['assistant'].update(data['assistant'])
        if 'features' in data:
            current_config['features'].update(data['features'])
        if 'ui' in data:
            current_config['ui'].update(data['ui'])
        
        # 如果API密钥是***，保持原值不变
        if data.get('assistant', {}).get('api_key') == '***':
            original_config = load_ai_config()
            current_config['assistant']['api_key'] = original_config['assistant'].get('api_key', '')
        
        if save_ai_config(current_config):
            return jsonify({'success': True})
        else:
            return jsonify({'error': '保存配置失败'}), 500

@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    """AI聊天接口"""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': '消息不能为空'}), 400
        
        config = load_ai_config()
        api_key = config['assistant'].get('api_key', '')
        
        # 如果没有配置API密钥，使用本地回复
        if not api_key:
            return jsonify({
                'response': generate_local_response(user_message),
                'source': 'local'
            })
        
        # 获取当前任务数据作为上下文
        task_context = get_task_context()
        
        # 构建消息
        messages = [
            {
                "role": "system",
                "content": config['assistant']['system_prompt'] + f"\n\n当前任务数据：\n{task_context}"
            },
            {
                "role": "user",
                "content": user_message
            }
        ]
        
        # 调用OpenAI兼容API
        response = call_openai_api(messages, config)
        
        if response:
            return jsonify({
                'response': response,
                'source': 'ai'
            })
        else:
            # API调用失败，降级到本地回复
            return jsonify({
                'response': generate_local_response(user_message),
                'source': 'local_fallback'
            })
            
    except Exception as e:
        print(f"AI聊天错误: {e}")
        return jsonify({
            'response': '抱歉，我遇到了一些问题。请稍后再试。',
            'source': 'error'
        }), 500

def call_openai_api(messages, config):
    """调用OpenAI兼容API"""
    try:
        headers = {
            'Authorization': f'Bearer {config["assistant"]["api_key"]}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': config['assistant']['model'],
            'messages': messages,
            'max_tokens': config['assistant']['max_tokens'],
            'temperature': config['assistant']['temperature']
        }
        
        response = requests.post(
            f"{config['assistant']['api_base']}/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result['choices'][0]['message']['content']
        else:
            print(f"API调用失败: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"API调用异常: {e}")
        return None

def get_task_context():
    """获取当前任务数据作为AI上下文"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取基本统计
        cursor.execute('SELECT COUNT(*) as total FROM tasks')
        total_tasks = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as completed FROM tasks WHERE completed = 1')
        completed_tasks = cursor.fetchone()['completed']
        
        cursor.execute('SELECT COUNT(*) as important FROM tasks WHERE is_important = 1 AND completed = 0')
        important_tasks = cursor.fetchone()['important']
        
        # 获取最近的任务
        cursor.execute('''
            SELECT title, completed, priority, due_date 
            FROM tasks 
            ORDER BY created_at DESC 
            LIMIT 5
        ''')
        recent_tasks = cursor.fetchall()
        
        conn.close()
        
        context = f"总任务数: {total_tasks}, 已完成: {completed_tasks}, 重要待办: {important_tasks}\n"
        context += "最近任务:\n"
        for task in recent_tasks:
            status = "✓" if task['completed'] else "○"
            priority = task['priority'] or 'medium'
            due_date = f" (截止: {task['due_date']})" if task['due_date'] else ""
            context += f"{status} {task['title']} [{priority}]{due_date}\n"
        
        return context
        
    except Exception as e:
        print(f"获取任务上下文失败: {e}")
        return "无法获取任务数据"

def generate_local_response(user_message):
    """生成本地回复（当AI不可用时）"""
    lower_message = user_message.lower()
    
    # 创建任务相关
    if any(keyword in lower_message for keyword in ['创建', '新建', '添加', '任务']):
        return '好的！我来帮你创建任务。请在上方输入框中输入任务标题，按回车即可快速创建。你也可以点击新建任务按钮来设置更多详细信息。📝'
    
    # 查找任务相关
    if any(keyword in lower_message for keyword in ['查找', '搜索', '找']):
        return '我可以帮你查找任务！请使用顶部的搜索框，输入关键词来查找你需要的任务。你可以搜索任务标题或描述内容。🔍'
    
    # 总结相关
    if any(keyword in lower_message for keyword in ['总结', '统计', '报告']):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('SELECT COUNT(*) as total FROM tasks')
            total_tasks = cursor.fetchone()['total']
            
            cursor.execute('SELECT COUNT(*) as completed FROM tasks WHERE completed = 1')
            completed_tasks = cursor.fetchone()['completed']
            
            conn.close()
            
            completion_rate = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
            
            return f'📊 **任务总结报告**\n\n• 总任务数: {total_tasks}\n• 已完成: {completed_tasks}\n• 待完成: {total_tasks - completed_tasks}\n• 完成率: {completion_rate}%\n\n继续加油！💪'
        except:
            return '抱歉，无法获取任务统计数据。'
    
    # 问候相关
    if any(keyword in lower_message for keyword in ['你好', '嗨', '早上好', '下午好', '晚上好']):
        hour = datetime.now().hour
        if hour < 12:
            return '早上好！今天有什么任务计划吗？🌟 我可以帮你创建和管理今天的任务。'
        elif hour < 18:
            return '下午好！需要我帮你整理任务或制定计划吗？'
        else:
            return '晚上好！今天完成任务了吗？我可以帮你明天的计划。'
    
    # 帮助相关
    if any(keyword in lower_message for keyword in ['帮助', '怎么用', '功能']):
        return '''我可以帮助你：
📋 创建、编辑和管理任务
🔍 查找和搜索任务
📊 提供任务统计和总结
⭐ 设置任务优先级
📅 管理截止日期
💡 提供时间管理建议

有什么具体需要帮助的吗？'''
    
    # 默认回复
    return '我理解你的需求。虽然我目前使用的是基础回复模式，但我可以帮你管理任务。你可以尝试问我关于创建任务、查找任务或获取任务总结的问题。🤝'

@app.route('/api/ai/test', methods=['POST'])
def test_ai_connection():
    """测试AI连接"""
    try:
        data = request.get_json()
        config = load_ai_config()
        api_key = config['assistant'].get('api_key', '')
        
        if not api_key:
            return jsonify({
                'success': False,
                'error': '未配置API密钥'
            })
        
        # 发送测试消息
        test_message = "你好，这是一个连接测试。"
        messages = [
            {
                "role": "system",
                "content": "你是一个AI助手。"
            },
            {
                "role": "user",
                "content": test_message
            }
        ]
        
        response = call_openai_api(messages, config)
        
        if response:
            return jsonify({
                'success': True,
                'response': response,
                'source': 'ai'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'API调用失败'
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
