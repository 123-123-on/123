import requests
import json

# 测试用户偏好设置 API
def test_pwa_prompt():
    # 登录获取会话
    session = requests.Session()
    login_data = {
        "username": "123",
        "password": "123456"
    }
    
    login_response = session.post("http://localhost:5000/api/auth/login", json=login_data)
    if login_response.status_code == 200:
        print("✓ 登录成功")
        
        # 获取当前用户偏好
        prefs_response = session.get("http://localhost:5000/api/user_preferences")
        if prefs_response.status_code == 200:
            prefs = prefs_response.json()
            print(f"✓ 获取用户偏好成功")
            print(f"  - pwa_install_dismissed: {prefs.get('pwa_install_dismissed', False)}")
            
            # 测试更新偏好设置
            update_data = {
                "pwa_install_dismissed": True
            }
            update_response = session.put("http://localhost:5000/api/user_preferences", json=update_data)
            if update_response.status_code == 200:
                print("✓ 更新 pwa_install_dismissed 成功")
                
                # 再次获取偏好验证更新
                prefs_response2 = session.get("http://localhost:5000/api/user_preferences")
                if prefs_response2.status_code == 200:
                    prefs2 = prefs_response2.json()
                    print(f"✓ 验证更新成功")
                    print(f"  - 新的 pwa_install_dismissed: {prefs2.get('pwa_install_dismissed', False)}")
                else:
                    print("✗ 验证更新失败")
            else:
                print("✗ 更新偏好设置失败")
        else:
            print("✗ 获取用户偏好失败")
    else:
        print("✗ 登录失败")

if __name__ == "__main__":
    print("测试 PWA 安装提示功能...")
    test_pwa_prompt()
