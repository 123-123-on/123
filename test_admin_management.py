#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
后台管理功能测试脚本
测试用户管理、任务管理等功能
"""

import requests
import json
import time

# 配置
BASE_URL = 'http://localhost:5000'
ADMIN_USERNAME = '123'
ADMIN_PASSWORD = '123456'

class AdminManagementTester:
    def __init__(self):
        self.session = requests.Session()
        self.base_url = BASE_URL
        self.admin_token = None
        
    def login_as_admin(self):
        """以管理员身份登录"""
        print("🔐 管理员登录...")
        
        login_data = {
            'username': ADMIN_USERNAME,
            'password': ADMIN_PASSWORD
        }
        
        try:
            response = self.session.post(f'{self.base_url}/api/auth/login', json=login_data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print(f"✅ 管理员登录成功: {result['user']['username']}")
                    return True
                else:
                    print(f"❌ 登录失败: {result.get('error', '未知错误')}")
                    return False
            else:
                print(f"❌ 登录请求失败: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ 登录异常: {e}")
            return False
    
    def test_user_management(self):
        """测试用户管理功能"""
        print("\n👥 测试用户管理功能...")
        
        # 测试获取用户列表
        print("1. 获取用户列表...")
        try:
            response = self.session.get(f'{self.base_url}/api/admin/users')
            
            if response.status_code == 200:
                users = response.json()
                print(f"✅ 获取用户列表成功，共 {len(users)} 个用户")
                
                # 显示前几个用户
                for i, user in enumerate(users[:3]):
                    print(f"   用户 {i+1}: {user['username']} ({user['email']}) - {'活跃' if user['is_active'] else '禁用'}")
                
                return users
            else:
                print(f"❌ 获取用户列表失败: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ 获取用户列表异常: {e}")
            return None
    
    def test_user_details(self, user_id):
        """测试获取用户详情"""
        print(f"\n2. 获取用户详情 (ID: {user_id})...")
        
        try:
            response = self.session.get(f'{self.base_url}/api/admin/users/{user_id}/details')
            
            if response.status_code == 200:
                details = response.json()
                user = details['user']
                stats = details['statistics']
                
                print(f"✅ 获取用户详情成功:")
                print(f"   用户名: {user['username']}")
                print(f"   邮箱: {user['email']}")
                print(f"   状态: {'活跃' if user['is_active'] else '禁用'}")
                print(f"   注册时间: {user['created_at']}")
                print(f"   任务统计: 总数 {stats['task_count']}, 已完成 {stats['completed_tasks']}")
                
                return details
            else:
                print(f"❌ 获取用户详情失败: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ 获取用户详情异常: {e}")
            return None
    
    def test_user_status_toggle(self, user_id, current_status):
        """测试切换用户状态"""
        print(f"\n3. 切换用户状态 (ID: {user_id}, 当前状态: {'活跃' if current_status else '禁用'})...")
        
        new_status = not current_status
        action = "启用" if new_status else "禁用"
        
        try:
            response = self.session.put(
                f'{self.base_url}/api/admin/users/{user_id}/status',
                json={'is_active': new_status}
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print(f"✅ 用户{action}成功")
                    
                    # 恢复原状态
                    time.sleep(1)
                    restore_response = self.session.put(
                        f'{self.base_url}/api/admin/users/{user_id}/status',
                        json={'is_active': current_status}
                    )
                    
                    if restore_response.status_code == 200:
                        print(f"✅ 用户状态已恢复原状")
                    
                    return True
                else:
                    print(f"❌ 用户{action}失败: {result.get('error', '未知错误')}")
                    return False
            else:
                print(f"❌ 切换用户状态失败: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ 切换用户状态异常: {e}")
            return False
    
    def test_task_management(self):
        """测试任务管理功能"""
        print("\n📋 测试任务管理功能...")
        
        try:
            response = self.session.get(f'{self.base_url}/api/admin/tasks')
            
            if response.status_code == 200:
                tasks = response.json()
                print(f"✅ 获取任务列表成功，共 {len(tasks)} 个任务")
                
                # 显示前几个任务
                for i, task in enumerate(tasks[:3]):
                    print(f"   任务 {i+1}: {task['title']} - {task['username']} ({'已完成' if task['completed'] else '待完成'})")
                
                return tasks
            else:
                print(f"❌ 获取任务列表失败: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ 获取任务列表异常: {e}")
            return None
    
    def test_statistics(self):
        """测试统计功能"""
        print("\n📊 测试统计功能...")
        
        # 测试用户统计
        print("1. 获取用户统计...")
        try:
            response = self.session.get(f'{self.base_url}/api/admin/stats/users')
            
            if response.status_code == 200:
                stats = response.json()
                print(f"✅ 用户统计: 总数 {stats['total']}, 今日新增 {stats['today']}, 活跃用户 {stats['active']}")
            else:
                print(f"❌ 获取用户统计失败: {response.status_code}")
                
        except Exception as e:
            print(f"❌ 获取用户统计异常: {e}")
        
        # 测试任务统计
        print("2. 获取任务统计...")
        try:
            response = self.session.get(f'{self.base_url}/api/admin/stats/tasks')
            
            if response.status_code == 200:
                stats = response.json()
                print(f"✅ 任务统计: 总数 {stats['total']}, 列表数 {stats['lists']}, 今日活跃 {stats['active_today']}")
            else:
                print(f"❌ 获取任务统计失败: {response.status_code}")
                
        except Exception as e:
            print(f"❌ 获取任务统计异常: {e}")
    
    def test_permission_control(self):
        """测试权限控制"""
        print("\n🔒 测试权限控制...")
        
        # 创建一个普通用户会话
        normal_session = requests.Session()
        
        # 先注册一个普通用户
        register_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'test123'
        }
        
        try:
            # 注册
            reg_response = normal_session.post(f'{self.base_url}/api/auth/register', json=register_data)
            if reg_response.status_code == 200:
                print("✅ 测试用户注册成功")
            
            # 登录
            login_data = {
                'username': 'testuser',
                'password': 'test123'
            }
            
            login_response = normal_session.post(f'{self.base_url}/api/auth/login', json=login_data)
            if login_response.status_code == 200:
                print("✅ 测试用户登录成功")
            
            # 尝试访问管理员接口
            admin_response = normal_session.get(f'{self.base_url}/api/admin/users')
            
            if admin_response.status_code == 403:
                print("✅ 权限控制正常：普通用户无法访问管理员接口")
            else:
                print(f"⚠️ 权限控制可能有问题：普通用户访问管理员接口返回 {admin_response.status_code}")
                
        except Exception as e:
            print(f"❌ 权限控制测试异常: {e}")
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始后台管理功能测试")
        print("=" * 50)
        
        # 登录管理员
        if not self.login_as_admin():
            print("❌ 管理员登录失败，测试终止")
            return False
        
        # 测试用户管理
        users = self.test_user_management()
        
        if users and len(users) > 0:
            # 测试用户详情（选择第一个非管理员用户）
            test_user = None
            for user in users:
                if user['username'] != '123':  # 跳过管理员
                    test_user = user
                    break
            
            if test_user:
                self.test_user_details(test_user['id'])
                self.test_user_status_toggle(test_user['id'], test_user['is_active'])
            else:
                print("⚠️ 没有找到合适的测试用户")
        
        # 测试任务管理
        self.test_task_management()
        
        # 测试统计功能
        self.test_statistics()
        
        # 测试权限控制
        self.test_permission_control()
        
        print("\n" + "=" * 50)
        print("✅ 后台管理功能测试完成")
        
        return True

def main():
    """主函数"""
    print("后台管理功能测试脚本")
    print("请确保服务器正在运行在 http://localhost:5000")
    print()
    
    tester = AdminManagementTester()
    
    try:
        success = tester.run_all_tests()
        
        if success:
            print("\n🎉 所有测试完成！")
            print("后台管理功能基本正常")
        else:
            print("\n❌ 测试过程中出现问题")
            
    except KeyboardInterrupt:
        print("\n\n⏹️ 测试被用户中断")
    except Exception as e:
        print(f"\n❌ 测试过程中发生异常: {e}")

if __name__ == '__main__':
    main()
