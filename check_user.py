import sqlite3

conn = sqlite3.connect('settings.db')
cursor = conn.cursor()

cursor.execute('SELECT id, username, email, password_hash FROM users')
users = cursor.fetchall()

print("用户列表:")
for user in users:
    print(f"ID: {user[0]}, 用户名: {user[1]}, 邮箱: {user[2]}")

# 测试密码验证
import bcrypt
if users:
    stored_hash = users[0][3]
    print(f"\n存储的密码哈希: {stored_hash}")
    
    # 测试不同密码
    test_passwords = ['admin123', 'admin', 'password', '123456']
    for pwd in test_passwords:
        try:
            result = bcrypt.checkpw(pwd.encode('utf-8'), stored_hash.encode('utf-8'))
            print(f"密码 '{pwd}': {'✓ 正确' if result else '✗ 错误'}")
        except Exception as e:
            print(f"密码 '{pwd}': 验证失败 - {e}")

conn.close()
