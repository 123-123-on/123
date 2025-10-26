#!/usr/bin/env python3
"""
HTTPS测试服务器 - 用于测试PWA安装功能
PWA需要HTTPS环境才能正常工作
"""

import os
import sys
import ssl
import http.server
import socketserver
from pathlib import Path

# 生成自签名证书
def generate_self_signed_cert():
    """生成自签名SSL证书"""
    try:
        from OpenSSL import crypto, SSL
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        import datetime
        import ipaddress
        
        # 生成私钥
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        
        # 创建证书
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "CN"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Beijing"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "Beijing"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Microsoft To Do"),
            x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.DNSName("127.0.0.1"),
                x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                x509.IPAddress(ipaddress.IPv4Address("0.0.0.0")),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())
        
        # 保存证书和私钥
        with open("server.crt", "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
        
        with open("server.key", "wb") as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))
        
        print("✅ 自签名证书已生成: server.crt, server.key")
        return True
        
    except ImportError:
        print("❌ 需要安装 cryptography 和 pyopenssl 库")
        print("请运行: pip install cryptography pyopenssl")
        return False
    except Exception as e:
        print(f"❌ 生成证书失败: {e}")
        return False

class PWAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义HTTP请求处理器，支持PWA"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)
    
    def end_headers(self):
        """添加PWA相关的HTTP头"""
        # 设置CORS头
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        
        # 设置PWA相关头
        self.send_header('Service-Worker-Allowed', '/')
        self.send_header('Vary', 'Accept-Encoding')
        
        # 设置缓存策略
        if self.path.endswith(('.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg')):
            self.send_header('Cache-Control', 'public, max-age=31536000')  # 1年
        elif self.path.endswith('.json'):
            self.send_header('Cache-Control', 'public, max-age=86400')  # 1天
        else:
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        
        super().end_headers()
    
    def do_OPTIONS(self):
        """处理OPTIONS请求（CORS预检）"""
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"📝 {format % args}")

def start_https_server(port=8443):
    """启动HTTPS服务器"""
    
    # 检查证书文件
    cert_file = "server.crt"
    key_file = "server.key"
    
    if not os.path.exists(cert_file) or not os.path.exists(key_file):
        print("🔐 生成SSL证书...")
        if not generate_self_signed_cert():
            return False
    
    try:
        # 创建SSL上下文
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain(certfile=cert_file, keyfile=key_file)
        
        # 创建服务器
        with socketserver.TCPServer(("", port), PWAHTTPRequestHandler) as httpd:
            # 包装SSL
            httpsd = http.server.HTTPServer(("", port), PWAHTTPRequestHandler)
            httpsd.socket = ssl_context.wrap_socket(httpd.socket, server_side=True)
            
            print(f"🚀 HTTPS服务器已启动")
            print(f"📱 访问地址: https://localhost:{port}")
            print(f"📱 或访问: https://127.0.0.1:{port}")
            print(f"⚠️  请接受浏览器安全警告（自签名证书）")
            print(f"🔧 按Ctrl+C停止服务器")
            print("-" * 50)
            
            # 启动Flask应用在后台
            import subprocess
            import threading
            
            def run_flask():
                """运行Flask应用"""
                env = os.environ.copy()
                env['FLASK_ENV'] = 'development'
                env['FLASK_DEBUG'] = '1'
                
                try:
                    process = subprocess.Popen([
                        sys.executable, 'app.py'
                    ], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
                    
                    for line in iter(process.stdout.readline, ''):
                        if line.strip():
                            print(f"🐍 Flask: {line.strip()}")
                            
                except Exception as e:
                    print(f"❌ Flask启动失败: {e}")
            
            # 在单独线程中启动Flask
            flask_thread = threading.Thread(target=run_flask, daemon=True)
            flask_thread.start()
            
            # 等待Flask启动
            import time
            time.sleep(2)
            
            # 启动HTTPS代理
            def proxy_handler(self):
                """代理请求到Flask应用"""
                try:
                    import urllib.request
                    import urllib.error
                    
                    # 转发请求到Flask
                    flask_url = f"http://localhost:5000{self.path}"
                    if self.command == 'POST':
                        content_length = int(self.headers.get('Content-Length', 0))
                        post_data = self.rfile.read(content_length)
                        
                        req = urllib.request.Request(flask_url, data=post_data, method='POST')
                        for header, value in self.headers.items():
                            if header.lower() not in ['host', 'content-length']:
                                req.add_header(header, value)
                    else:
                        req = urllib.request.Request(flask_url, method=self.command)
                        for header, value in self.headers.items():
                            if header.lower() != 'host':
                                req.add_header(header, value)
                    
                    response = urllib.request.urlopen(req)
                    
                    # 发送响应
                    self.send_response(response.getcode())
                    for header, value in response.headers.items():
                        if header.lower() not in ['server', 'date']:
                            self.send_header(header, value)
                    self.end_headers()
                    
                    self.wfile.write(response.read())
                    
                except urllib.error.HTTPError as e:
                    self.send_response(e.code)
                    self.end_headers()
                    self.wfile.write(e.read().decode())
                except Exception as e:
                    print(f"❌ 代理错误: {e}")
                    self.send_response(500)
                    self.end_headers()
                    self.wfile.write(b"Internal Server Error")
            
            # 替换处理器
            httpsd.RequestHandlerClass = type('ProxyHandler', (PWAHTTPRequestHandler,), {
                'do_GET': proxy_handler,
                'do_POST': proxy_handler,
                'do_PUT': proxy_handler,
                'do_DELETE': proxy_handler,
            })
            
            httpsd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 服务器已停止")
        return True
    except Exception as e:
        print(f"❌ 服务器启动失败: {e}")
        return False

def main():
    """主函数"""
    print("🔧 Microsoft To Do HTTPS测试服务器")
    print("=" * 50)
    
    # 检查端口
    port = 8443
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("❌ 端口号必须是数字")
            return
    
    # 检查Flask应用
    if not os.path.exists('app.py'):
        print("❌ 找不到app.py文件")
        return
    
    # 启动服务器
    start_https_server(port)

if __name__ == "__main__":
    main()
