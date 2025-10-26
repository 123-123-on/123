#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
后台管理功能测试脚本
"""

import requests
import json

# 测试配置
BASE_URL = "http://localhost:5000"
ADMIN_USERNAME = "123"
ADMIN_PASSWORD = "123456"

def test_admin_access():
    """测试后台管理访问权限"""
    print("=" * 60)
    print("🔐 测试后台管理访问权限")
    print("=" * 60)
    
    session = requests.Session()
    
    # 1. 测试未登录访问
    print("\n1️⃣ 测试未登录访问后台管理页面")
    response = session.get(f"{BASE_URL}/admin")
    print(f"📊 状态码: {response.status_code}")
    print(f"📍 重定向到: {response.url}")
    
    if response.status_code == 302 and "login" in response.url:
        print("✅ 未正确访问，正确重定向到登录页面")
    else:
        print("❌ 权限控制有问题")
    
    # 2. 管理员登录
    print("\n2️⃣ 管理员登录")
    login_data = {
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    }
    
    response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
    print(f"📊 登录状态码: {response.status_code}")
    
    if response.status_code == 200:
        login_result = response.json()
        if login_result.get("success"):
            print(f"✅ 登录成功: {login_result.get('user', {}).get('username')}")
        else:
            print(f"❌ 登录失败: {login_result.get('error')}")
            return False
    else:
        print("❌ 登录请求失败")
        return False
    
    # 3. 测试登录后访问后台
    print("\n3️⃣ 测试登录后访问后台管理页面")
    response = session.get(f"{BASE_URL}/admin")
    print(f"📊 状态码: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ 管理员可以访问后台")
    else:
        print("❌ 管理员无法访问后台")
        return False
    
    return session

def test_admin_apis(session):
    """测试后台管理API"""
    print("\n" + "=" * 60)
    print("🔧 测试后台管理API")
    print("=" * 60)
    
    # 1. 测试用户统计API
    print("\n📊 测试用户统计API")
    response = session.get(f"{BASE_URL}/api/admin/stats/users")
    print(f"📊 状态码: {response.status_code}")
    
    if response.status_code == 200:
        stats = response.json()
        print(f"✅ 用户统计: {stats}")
    else:
        print(f"❌ 获取用户统计失败: {response.text}")
    
    # 2. 测试任务统计API
    print("\n📋 测试任务统计API")
    response = session.get(f"{BASE_URL}/api/admin/stats/tasks")
    print(f"📊 状态码: {response.status_code}")
    
    if response.status_code == 200:
        stats = response.json()
        print(f"✅ 任务统计: {stats}")
    else:
        print(f"❌ 获取任务统计失败: {response.text}")
    
    # 3. 测试用户列表API
    print("\n👥 测试用户列表API")
    response = session.get(f"{BASE_URL}/api/admin/users")
    print(f"📊 状态码: {response.status_code}")
    
    if response.status_code == 200:
        users = response.json()
        print(f"✅ 用户列表: 找到 {len(users)} 个用户")
        for user in users[:3]:  # 只显示前3个用户
            print(f"   - {user['username']} ({user['email']}) - {'活跃' if user['is_active'] else '禁用'}")
    else:
        print(f"❌ 获取用户列表失败: {response.text}")
    
    # 4. 测试任务列表API
    print("\n📝 测试任务列表API")
    response = session.get(f"{BASE_URL}/api/admin/tasks")
    print(f"📊 状态码: {response.status_code}")
    
    if response.status_code == 200:
        tasks = response.json()
        print(f"✅ 任务列表: 找到 {len(tasks)} 个任务")
        for task in tasks[:3]:  # 只显示前3个任务
            print(f"   - {task['title']} (用户: {task['username']}) - {'已完成' if task['completed'] else '待完成'}")
    else:
        print(f"❌ 获取任务列表失败: {response.text}")

def test_user_management(session):
    """测试用户管理功能"""
    print("\n" + "=" * 60)
    print("👤 测试用户管理功能")
    print("=" * 60)
    
    # 获取用户列表
    response = session.get(f"{BASE_URL}/api/admin/users")
    if response.status_code != 200:
        print("❌ 无法获取用户列表")
        return
    
    users = response.json()
    if not users:
        print("❌ 没有找到用户")
        return
    
    # 选择第一个非管理员用户进行测试
    test_user = None
    for user in users:
        if user['username'] != ADMIN_USERNAME:
            test_user = user
            break
    
    if not test_user:
        print("❌ 没有找到可测试的用户")
        return
    
    print(f"\n🎯 测试用户: {test_user['username']} (ID: {test_user['id']})")
    print(f"📊 当前状态: {'活跃' if test_user['is_active'] else '禁用'}")
    
    # 测试切换用户状态
    new_status = not test_user['is_active']
    action = "启用" if new_status else "禁用"
    
    print(f"\n🔄 测试{action}用户")
    response = session.put(
        f"{BASE_URL}/api/admin/users/{test_user['id']}/status",
        json={"is_active": new_status}
    )
    
    print(f"📊 状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        if result.get("success"):
            print(f"✅ 用户{action}成功")
            
            # 验证状态更改
            response = session.get(f"{BASE_URL}/api/admin/users")
            users = response.json()
            updated_user = next((u for u in users if u['id'] == test_user['id']), None)
            if updated_user and updated_user['is_active'] == new_status:
                print(f"✅ 状态验证成功: {'活跃' if updated_user['is_active'] else '禁用'}")
            else:
                print("❌ 状态验证失败")
            
            # 恢复原始状态
            print(f"\n🔄 恢复原始状态")
            response = session.put(
                f"{BASE_URL}/api/admin/users/{test_user['id']}/status",
                json={"is_active": test_user['is_active']}
            )
            
            if response.status_code == 200:
                print("✅ 原始状态已恢复")
            else:
                print("❌ 恢复原始状态失败")
        else:
            print(f"❌ 用户{action}失败")
    else:
        print(f"❌ 请求失败: {response.text}")

def test_permission_control():
    """测试权限控制"""
    print("\n" + "=" * 60)
    print("🔒 测试权限控制")
    print("=" * 60)
    
    # 创建普通用户会话
    session = requests.Session()
    
    # 1. 测试普通用户登录
    print("\n1️⃣ 测试普通用户登录")
    login_data = {
        "username": "testuser",  # 假设存在这个用户
        "password": "123456"
    }
    
    response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
    print(f"📊 登录状态码: {response.status_code}")
    
    if response.status_code == 200:
        login_result = response.json()
        if login_result.get("success"):
            print(f"✅ 普通用户登录成功: {login_result.get('user', {}).get('username')}")
            
            # 2. 测试普通用户访问后台
            print("\n2️⃣ 测试普通用户访问后台")
            response = session.get(f"{BASE_URL}/admin")
            print(f"📊 状态码: {response.status_code}")
            
            if response.status_code == 302:
                print("✅ 普通用户被正确拒绝访问")
            else:
                print("❌ 权限控制有问题")
            
            # 3. 测试普通用户访问后台API
            print("\n3️⃣ 测试普通用户访问后台API")
            response = session.get(f"{BASE_URL}/api/admin/users")
            print(f"📊 API状态码: {response.status_code}")
            
            if response.status_code == 403:
                print("✅ 普通用户API访问被正确拒绝")
            else:
                print("❌ API权限控制有问题")
        else:
            print(f"⚠️ 普通用户登录失败: {login_result.get('error')}")
            print("📝 这可能是正常的，如果测试用户不存在")
    else:
        print("⚠️ 普通用户登录请求失败")
        print("📝 这可能是正常的，如果测试用户不存在")

def main():
    """主测试函数"""
    print("🚀 开始后台管理功能测试")
    print("📅 测试时间:", "2025-10-26")
    
    try:
        # 测试访问权限
        session = test_admin_access()
        if not session:
            print("\n❌ 管理员登录失败，无法继续测试")
            return
        
        # 测试API功能
        test_admin_apis(session)
        
        # 测试用户管理
        test_user_management(session)
        
        # 测试权限控制
        test_permission_control()
        
        print("\n" + "=" * 60)
        print("✅ 后台管理功能测试完成")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到服务器，请确保应用正在运行")
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {e}")

if __name__ == "__main__":
    main()
