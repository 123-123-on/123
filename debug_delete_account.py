#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json

def test_delete_account():
    """测试删除账户功能并查看详细错误信息"""
    
    url = 'http://localhost:5000/api/user/delete-account'
    
    print("=" * 60)
    print("🔧 调试删除账户功能")
    print("=" * 60)
    
    # 测试1: 未登录访问
    print("\n🧪 测试1: 未登录访问")
    try:
        response = requests.delete(url, json={})
        print(f"📊 状态码: {response.status_code}")
        print(f"📄 响应头: {dict(response.headers)}")
        print(f"📄 响应内容: {response.text}")
        
        try:
            response_json = response.json()
            print(f"📄 JSON解析: {response_json}")
        except:
            print("📄 无法解析为JSON")
    except Exception as e:
        print(f"❌ 请求失败: {e}")
    
    # 测试2: 带确认文本但未登录
    print("\n🧪 测试2: 带确认文本但未登录")
    try:
        data = {
            "confirmation": "删除我的账户",
            "password": "test_password"
        }
        response = requests.delete(url, json=data)
        print(f"📊 状态码: {response.status_code}")
        print(f"📄 响应内容: {response.text}")
        
        try:
            response_json = response.json()
            print(f"📄 JSON解析: {response_json}")
        except:
            print("📄 无法解析为JSON")
    except Exception as e:
        print(f"❌ 请求失败: {e}")
    
    # 测试3: 先登录再删除
    print("\n🧪 测试3: 先登录再删除")
    try:
        # 先登录
        login_url = 'http://localhost:5000/api/auth/login'
        login_data = {
            "username": "用户3",
            "password": "123456"
        }
        
        login_response = requests.post(login_url, json=login_data)
        print(f"🔐 登录状态码: {login_response.status_code}")
        
        if login_response.status_code == 200:
            # 获取session cookie
            session = requests.Session()
            session.post(login_url, json=login_data)
            
            # 使用session删除账户
            response = session.delete(url, json={
                "confirmation": "删除我的账户",
                "password": "admin123"
            })
            
            print(f"📊 删除状态码: {response.status_code}")
            print(f"📄 响应内容: {response.text}")
            
            try:
                response_json = response.json()
                print(f"📄 JSON解析: {response_json}")
            except:
                print("📄 无法解析为JSON")
        else:
            print(f"❌ 登录失败: {login_response.text}")
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")

if __name__ == '__main__':
    test_delete_account()
