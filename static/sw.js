const CACHE_NAME = 'microsoft-todo-v1.0.0';
const STATIC_CACHE = 'static-cache-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-cache-v1.0.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/static/js/main.js',
  '/static/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 需要缓存的API响应
const CACHEABLE_PATTERNS = [
  /^\/api\/task_lists$/,
  /^\/api\/tasks/,
  /^\/api\/user_preferences$/,
  /^\/api\/stats$/,
  /^\/api\/search/,
  /^\/api\/calendar\/week/
];

// 安装Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// 激活Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 删除旧版本的缓存
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 跳过非HTTP请求
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // 处理API请求
  if (url.pathname.startsWith('/api/')) {
    return handleAPIRequest(event);
  }
  
  // 处理静态资源请求
  return handleStaticRequest(event);
});

// 处理API请求
function handleAPIRequest(event) {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只缓存GET请求的特定API
  if (request.method === 'GET' && 
      CACHEABLE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    
    event.respondWith(
      caches.open(DYNAMIC_CACHE)
        .then(cache => {
          return cache.match(request)
            .then(response => {
              if (response) {
                // 返回缓存的响应，同时在后台更新
                fetchAndCacheAPI(request, cache);
                return response;
              }
              
              // 网络请求
              return fetch(request)
                .then(response => {
                  if (response.ok) {
                    // 缓存成功的响应
                    cache.put(request, response.clone());
                  }
                  return response;
                })
                .catch(() => {
                  // 网络失败，尝试返回缓存的响应
                  return cache.match(request);
                });
            });
        })
    );
  } else {
    // 对于其他API请求，直接走网络
    event.respondWith(fetch(request));
  }
}

// 处理静态资源请求
function handleStaticRequest(event) {
  const { request } = event;
  
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        
        // 网络请求
        return fetch(request)
          .then(response => {
            // 检查是否是有效的响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 缓存新的静态资源
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // 对于HTML请求，返回离线页面
            if (request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
}

// 后台更新API缓存
function fetchAndCacheAPI(request, cache) {
  fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    })
    .catch(error => {
      console.log('Background API update failed:', error);
    });
}

// 监听消息事件
self.addEventListener('message', event => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches()
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
        .catch(error => {
          event.ports[0].postMessage({ success: false, error: error.message });
        });
      break;
      
    case 'SYNC_DATA':
      syncOfflineData()
        .then(result => {
          event.ports[0].postMessage({ success: true, result });
        })
        .catch(error => {
          event.ports[0].postMessage({ success: false, error: error.message });
        });
      break;
  }
});

// 清除所有缓存
function clearAllCaches() {
  return caches.keys()
    .then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    });
}

// 同步离线数据
function syncOfflineData() {
  // 这里可以实现离线数据同步逻辑
  // 例如：同步离线创建的任务、更新等
  return Promise.resolve({ synced: 0 });
}

// 后台同步
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// 推送通知
self.addEventListener('push', event => {
  const options = {
    body: '您有新的任务提醒',
    icon: '/static/icons/icon-192x192.png',
    badge: '/static/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看任务',
        icon: '/static/icons/checkmark.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/static/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Microsoft To Do', options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    // 打开应用并跳转到任务页面
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // 关闭通知
    event.notification.close();
  } else {
    // 默认行为：打开应用
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 网络状态变化监听
self.addEventListener('online', event => {
  console.log('App is now online');
  // 可以在这里触发数据同步
});

self.addEventListener('offline', event => {
  console.log('App is now offline');
  // 可以在这里显示离线提示
});

// 定期清理缓存
self.addEventListener('periodicsync', event => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupOldCache());
  }
});

function cleanupOldCache() {
  const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7天
  const now = Date.now();
  
  return caches.open(DYNAMIC_CACHE)
    .then(cache => {
      return cache.keys()
        .then(requests => {
          return Promise.all(
            requests.map(request => {
              return cache.match(request)
                .then(response => {
                  if (response) {
                    const dateHeader = response.headers.get('date');
                    if (dateHeader) {
                      const responseDate = new Date(dateHeader).getTime();
                      if (now - responseDate > MAX_AGE) {
                        return cache.delete(request);
                      }
                    }
                  }
                });
            })
          );
        });
    });
}
