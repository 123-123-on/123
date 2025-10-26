#!/usr/bin/env python3
"""
测试删除账户功能
"""

import requests
import json

def test_delete_account():
    """测试删除账户API"""
    base_url = "http://localhost:5000"
    
    # 测试数据
    test_data = {
        "password": "wrong_password"  # 错误密码测试
    }
    
    try:
        print("🧪 测试删除账户功能...")
        print(f"📡 发送请求到: {base_url}/api/user/delete-account")
        print(f"📋 测试数据: {json.dumps(test_data, indent=2)}")
        
        response = requests.delete(
            f"{base_url}/api/user/delete-account",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📊 响应状态码: {response.status_code}")
        print(f"📄 响应内容: {response.text}")
        
        if response.status_code == 401:
            print("✅ 密码验证正常工作")
        elif response.status_code == 200:
            print("⚠️  账户删除成功（请检查是否使用了测试账户）")
        else:
            print(f"❌ 意外的响应状态码: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到服务器，请确保应用正在运行")
    except Exception as e:
        print(f"❌ 测试失败: {e}")

def test_correct_password():
    """测试正确密码（需要先创建测试用户）"""
    base_url = "http://localhost:5000"
    
    # 正确的测试数据（需要根据实际测试用户调整）
    test_data = {
        "password": "test123"  # 需要替换为实际的测试密码
    }
    
    try:
        print("\n🧪 测试正确密码删除...")
        response = requests.delete(
            f"{base_url}/api/user/delete-account",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📊 响应状态码: {response.status_code}")
        print(f"📄 响应内容: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print("✅ 账户删除成功")
            else:
                print(f"❌ 删除失败: {result.get('error')}")
        else:
            print(f"❌ 删除失败，状态码: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("🔧 删除账户功能测试")
    print("=" * 50)
    
    test_delete_account()
    test_correct_password()
    
    print("\n" + "=" * 50)
    print("📝 测试说明:")
    print("1. 确保应用正在运行在 http://localhost:5000")
    print("2. 错误密码测试应该返回401状态码")
    print("3. 正确密码测试需要有效的测试用户")
    print("4. 前端验证需要输入'删除我的账户'确认文本")
    print("=" * 50)
