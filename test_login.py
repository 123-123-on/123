#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json

def test_login():
    """测试登录功能"""
    
    url = 'http://localhost:5000/api/auth/login'
    
    # 测试所有用户
    users = [
        {"username": "123", "password": "123456"},
        {"username": "testuser", "password": "123456"},
        {"username": "newuser", "password": "123456"},
        {"username": "user2", "password": "123456"},
        {"username": "用户2", "password": "123456"},
        {"username": "用户3", "password": "123456"},
    ]
    
    print("=" * 60)
    print("🔐 测试用户登录")
    print("=" * 60)
    
    for user_data in users:
        print(f"\n🧪 测试用户: {user_data['username']}")
        try:
            response = requests.post(url, json=user_data)
            print(f"📊 状态码: {response.status_code}")
            print(f"📄 响应内容: {response.text}")
            
            if response.status_code == 200:
                print("✅ 登录成功！")
                # 测试删除账户
                test_delete_with_session(user_data['username'], user_data['password'])
                break
        except Exception as e:
            print(f"❌ 请求失败: {e}")

def test_delete_with_session(username, password):
    """使用已登录的session测试删除账户"""
    print(f"\n🗑️ 使用用户 {username} 测试删除账户")
    
    session = requests.Session()
    
    # 登录
    login_url = 'http://localhost:5000/api/auth/login'
    login_response = session.post(login_url, json={
        "username": username,
        "password": password
    })
    
    if login_response.status_code == 200:
        print("✅ 登录成功，开始测试删除")
        
        # 测试1: 错误确认文本
        delete_url = 'http://localhost:5000/api/user/delete-account'
        response = session.delete(delete_url, json={
            "confirmation": "错误确认",
            "password": password
        })
        print(f"📊 错误确认文本 - 状态码: {response.status_code}")
        print(f"📄 响应: {response.text}")
        
        # 测试2: 错误密码
        response = session.delete(delete_url, json={
            "confirmation": "删除我的账户",
            "password": "wrong_password"
        })
        print(f"📊 错误密码 - 状态码: {response.status_code}")
        print(f"📄 响应: {response.text}")
        
        # 测试3: 正确删除（但不实际执行，只验证）
        print("📊 正确删除条件验证 - 跳过实际删除")
        print("✅ 删除账户功能测试完成")
    else:
        print(f"❌ 登录失败: {login_response.text}")

if __name__ == '__main__':
    test_login()
