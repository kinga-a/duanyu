export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
  
        // 处理首页 - 显示创建页面
        if (path === '/u') {
            return handleHomePage();
        }
  
        // 处理统计页面 - 显示所有链接信息（需要验证）
        if (path === '/stats') {
            // 检查是否有验证状态
            const cookies = request.headers.get('Cookie') || '';
            const hasValidated = cookies.includes('validated=true');
            
            if (hasValidated) {
                return handleStatsPage(env);
            } else {
                return showValidationPage();
            }
        }
  
        // 处理验证提交
        if (path === '/validate' && request.method === 'POST') {
            return handleValidation(request);
        }
  
        // 处理退出验证
        if (path === '/logout' && request.method === 'POST') {
            return handleLogout();
        }
  
        // 处理API路由
        if (path.startsWith('/api/')) {
            return handleAPI(request, env, path);
        }
  
        // 处理短链接访问
        if (path.length > 1) {
            return handleShortLink(request, env, path.substring(1));
        }
  
        return new Response('未找到页面', { status: 404 });
    }
  };
  
  // 生成随机短码
  function generateShortCode(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  // 检查字符串是否为有效URL
  function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
  }
  
  // 密码哈希比较函数
  async function verifyPassword(inputPassword, expectedHash) {
    // 使用SHA-256哈希算法
    const encoder = new TextEncoder();
    const data = encoder.encode(inputPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex === expectedHash;
  }
  
  // 处理首页
  function handleHomePage() {
    const html = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔗短链接生成器</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 100%;
        }
        
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 2.5em;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
        }
        
        textarea, input[type="text"], select, input[type="password"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        input[type="checkbox"] {
            width: auto;
            padding: 0;
            margin: 0;
        }
        
        textarea {
            min-height: 120px;
            resize: vertical;
        }
        
        textarea:focus, input[type="text"]:focus, select:focus, input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
            transition: transform 0.2s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .result {
            margin-top: 20px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            display: none;
        }
        
        .result.show {
            display: block;
        }
        
        .short-link {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            word-break: break-all;
            font-family: monospace;
        }
        
        .copy-btn {
            background: #4caf50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            margin-left: 10px;
        }
        
        .loading {
            display: none;
            text-align: center;
            margin-top: 10px;
        }
    </style>
  </head>
  <body>
    <div class="container">
        <h1>🔗 短链接生成器</h1>
        <form id="linkForm">
            <div class="form-group">
                <label for="content">输入长链接或任意文本内容：</label>
                <textarea id="content" placeholder="请输入要缩短的URL或文本内容..." required></textarea>
            </div>
            
            <div class="form-group">
                <label for="customCode">自定义短码（可选）：</label>
                <input type="text" id="customCode" placeholder="留空则自动生成" maxlength="20">
            </div>
            
            <div class="form-group">
                <label for="expiration">链接有效期：</label>
                <select id="expiration">
                    <option value="never">永不过期</option>
                    <option value="10m">10分钟</option>
                    <option value="30m">30分钟</option>
                    <option value="1h">1小时</option>
                    <option value="24h">24小时</option>
                    <option value="7d">7天</option>
                    <option value="30d">30天</option>
                </select>
            </div>
            
            <div class="form-group">
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <input type="checkbox" id="rawDisplay" style="margin-right: 8px;">
                    <label for="rawDisplay" style="margin: 0; cursor: pointer;">显示原始内容</label>
                </div>
                <small style="display: block; color: #666; margin-left: 24px;">
                    启用后，文本内容将以纯文本形式显示，而不是格式化页面
                </small>
            </div>
            
            <button type="submit" class="btn">生成短链接</button>
            
            <div class="loading">
                <p>正在生成...</p>
            </div>
        </form>
        
        <div id="result" class="result">
            <h3>生成成功！</h3>
            <div class="short-link">
                <span id="shortUrl"></span>
                <button class="copy-btn" onclick="copyToClipboard()">复制</button>
            </div>
            <p>点击短链接访问原始内容</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <a href="/stats" style="color: #667eea; text-decoration: none;">📊 查看所有链接统计</a>
        </div>
    </div>
  
    <script>
        document.getElementById('linkForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const content = document.getElementById('content').value;
            const customCode = document.getElementById('customCode').value;
            const expiration = document.getElementById('expiration').value;
            const rawDisplay = document.getElementById('rawDisplay').checked;
            const loading = document.querySelector('.loading');
            const result = document.getElementById('result');
            
            loading.style.display = 'block';
            result.classList.remove('show');
            
            try {
                const response = await fetch('/api/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        content: content,
                        customCode: customCode,
                        expiration: expiration,
                        rawDisplay: rawDisplay
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('shortUrl').textContent = data.shortUrl;
                    result.classList.add('show');
                } else {
                    alert('生成失败：' + data.error);
                }
            } catch (error) {
                alert('网络错误：' + error.message);
            } finally {
                loading.style.display = 'none';
            }
        });
        
        function copyToClipboard() {
            const shortUrl = document.getElementById('shortUrl').textContent;
            navigator.clipboard.writeText(shortUrl).then(function() {
                alert('已复制到剪贴板！');
            });
        }
    </script>
  </body>
  </html>`;
  
    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  // 显示验证页面
  function showValidationPage() {
    const html = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>验证访问权限</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        
        h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 2.5em;
        }
        
        p {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
            line-height: 1.6;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
        }
        
        input[type="password"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
            transition: transform 0.2s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .error-message {
            color: #f44336;
            margin-top: 10px;
            display: none;
        }
        
        .back-link {
            margin-top: 20px;
        }
        
        .back-link a {
            color: #667eea;
            text-decoration: none;
        }
        
        .back-link a:hover {
            text-decoration: underline;
        }
    </style>
  </head>
  <body>
    <div class="container">
        <h1>🔒 验证访问权限</h1>
        <p>请输入验证密码以查看统计信息</p>       
        <form id="validationForm">
            <div class="form-group">
                <label for="password">验证密码：</label>
                <input type="password" id="password" placeholder="请输入验证密码" required>
            </div>
            
            <button type="submit" class="btn">验证并进入</button>
            
            <div id="errorMessage" class="error-message">
                验证失败，请重新输入正确的密码
            </div>
        </form>
        
        <div class="back-link">
            <a href="/u">← 返回首页</a>
        </div>
    </div>
  
    <script>
        document.getElementById('validationForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('errorMessage');
            
            errorMessage.style.display = 'none';
            
            try {
                const response = await fetch('/validate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ password: password })
                });
                
                if (response.status === 200) {
                    // 验证成功，重定向到统计页面
                    window.location.href = '/stats';
                } else if (response.status === 401) {
                    // 验证失败，显示错误信息
                    errorMessage.style.display = 'block';
                    document.getElementById('password').value = '';
                    document.getElementById('password').focus();
                } else {
                    // 其他错误
                    errorMessage.textContent = '网络错误，请重试';
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                errorMessage.textContent = '网络错误：' + error.message;
                errorMessage.style.display = 'block';
            }
        });
    </script>
  </body>
  </html>`;
  
    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  // 处理验证请求
  async function handleValidation(request) {
    try {
        const { password } = await request.json();
        
        // 这里使用预计算的哈希值（对应原始密码 "修改下面值"）
        const expectedHash = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
        
        const isValid = await verifyPassword(password, expectedHash);
        
        if (isValid) {
            // 设置验证cookie，有效期1小时
            const headers = new Headers();
            headers.append('Location', '/stats');
            headers.append('Set-Cookie', 'validated=true; Max-Age=3600; Path=/; HttpOnly; Secure');
            
            return new Response(JSON.stringify({
                success: true
            }), {
                status: 302,
                headers: headers
            });
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: '密码错误'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('验证错误:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '服务器错误'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
  }
  
  // 处理退出验证请求
  async function handleLogout() {
    // 清除验证cookie
    const headers = new Headers();
    headers.append('Location', '/');
    headers.append('Set-Cookie', 'validated=; Max-Age=0; Path=/; HttpOnly; Secure');
    
    return new Response(JSON.stringify({
        success: true
    }), {
        status: 302,
        headers: headers
    });
  }
  
  // 处理统计页面 - 显示所有链接信息
  async function handleStatsPage(env) {
    try {
        // 获取索引列表
        let index = await env.LINKS_KV.get('__index__', 'json');
        if (!index) {
            index = [];
        }
  
        // 过滤掉不存在的链接并收集链接数据
        const links = [];
        const processedIndex = []; // 用于过滤不存在的链接
        
        for (const shortCode of index) {
            const linkDataStr = await env.LINKS_KV.get(shortCode);
            if (linkDataStr) {
                const linkData = JSON.parse(linkDataStr);
                
                // 检查链接是否已过期
                if (linkData.expiresAt && new Date(linkData.expiresAt) < new Date()) {
                    // 删除过期的链接
                    await env.LINKS_KV.delete(shortCode);
                    continue; // 跳过此链接
                }
                
                links.push({
                    shortCode: shortCode,
                    content: linkData.content,
                    isUrl: linkData.isUrl,
                    clicks: linkData.clicks || 0,
                    createdAt: linkData.createdAt,
                    expiresAt: linkData.expiresAt
                });
                processedIndex.push(shortCode);
            }
        }
        
        // 更新索引，移除不存在的链接
        await env.LINKS_KV.put('__index__', JSON.stringify(processedIndex));
  
        const html = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>所有链接统计</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 2.5em;
        }
        
        .controls {
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        /* 新增：限制表格容器 */
        .table-container {
            overflow-x: auto; /* 关键：允许水平滚动 */
            border-radius: 10px; /* 保持圆角 */
            margin-top: 20px; /* 与上方控件间距 */
        }
        
        table {
            width: 100%; /* 表格宽度占满容器 */
            min-width: 600px; /* 设置最小宽度，确保在内容多时不会压缩太小 */
            border-collapse: collapse;
        }
        
        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: #f5f5f5;
            font-weight: 600;
        }
        
        tr:hover {
            background-color: #f9f9f9;
        }
        
        .delete-btn {
            background: #f44336;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 5px;
            cursor: pointer;
        }
        
        .delete-btn:hover {
            background: #d32f2f;
        }
        
        .loading {
            text-align: center;
            padding: 20px;
            display: none;
        }
        
        .back-link {
            text-align: center;
            margin-top: 20px;
        }
        
        .back-link a {
            color: #667eea;
            text-decoration: none;
        }
        
        .back-link a:hover {
            text-decoration: underline;
        }
        
        .empty-message {
            text-align: center;
            padding: 40px;
            color: #666;
            font-style: italic;
        }
        
        .full-url {
            word-break: break-all;
            max-width: 300px;
            display: inline-block;
        }
        
        .logout-btn {
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .logout-btn:hover {
            transform: translateY(-2px);
        }
    </style>
  </head>
  <body>
    <div class="container">
        <h1>📊 所有链接统计</h1>
        
        <div class="controls">
            <button class="btn" onclick="loadLinks()">刷新数据</button>
            <button class="logout-btn" onclick="logout()">退出验证</button>
        </div>
        
        <div class="loading" id="loading">
            <p>正在加载链接...</p>
        </div>
        
        <!-- 将表格包装在一个容器中 -->
        <div class="table-container">
        ` + (links.length === 0 ? 
        `<div class="empty-message">暂无链接数据</div>` : 
        `<table id="linksTable">
            <thead>
                <tr>
                    <th>短码</th>
                    <th>内容预览</th>
                    <th>类型</th>
                    <th>点击次数</th>
                    <th>创建时间</th>
                    <th>过期时间</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody id="linksList">
                ` + links.map(link => {
                    // 使用 toLocaleString 并指定时区
                    const expiresAt = link.expiresAt ? new Date(link.expiresAt).toLocaleString('zh-CN', { 
                      timeZone: 'Asia/Shanghai',
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit',
                      hour12: false 
                    }) : '永不';
                    const createdAt = new Date(link.createdAt).toLocaleString('zh-CN', { 
                      timeZone: 'Asia/Shanghai',
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit',
                      hour12: false 
                    });
                    const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
                    const expiredClass = isExpired ? 'style="color: red;"' : '';
                    
                    return `<tr>
                        <td>${link.shortCode}</td>
                        <td title="${link.content.replace(/"/g, '&quot;')}">
                            <div class="full-url">${link.content.substring(0, 50) + (link.content.length > 50 ? '...' : '')}</div>
                        </td>
                        <td>${link.isUrl ? '网址' : '文本'}</td>
                        <td>${link.clicks}</td>
                        <td>${createdAt}</td>
                        <td ${expiredClass}>${expiresAt}</td>
                        <td>
                            <button class="delete-btn" onclick="deleteLink('${link.shortCode}')">删除</button>
                        </td>
                    </tr>`;
                }).join('') + `
            </tbody>
        </table>`) + `
        </div> <!-- 结束 table-container -->
        
        <div class="back-link">
            <a href="/u">← 返回生成器</a>
        </div>
    </div>
  
    <script>
        async function loadLinks() {
            window.location.reload();
        }
        
        async function deleteLink(shortCode) {
            if (!confirm('您确定要删除此链接吗？')) {
                return;
            }
            
            try {
                const response = await fetch('/api/delete/' + shortCode, {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('链接删除成功');
                    loadLinks(); // 刷新页面
                } else {
                    alert('删除链接失败：' + data.error);
                }
            } catch (error) {
                console.error('删除链接错误:', error);
                alert('删除链接错误：' + error.message);
            }
        }
        
        async function logout() {
            if (confirm('您确定要退出验证吗？下次访问统计页面需要重新验证。')) {
                try {
                    const response = await fetch('/logout', {
                        method: 'POST'
                    });
                    
                    if (response.status === 302) {
                        // 重定向到首页
                        window.location.href = '/';
                    } else {
                        alert('退出验证，请刷新页面');
                    }
                } catch (error) {
                    console.error('退出验证错误:', error);
                    alert('退出验证错误：' + error.message);
                }
            }
        }
    </script>
  </body>
  </html>`;
  
        return new Response(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    } catch (error) {
        console.error('统计页面错误:', error);
        return new Response('服务器错误', { status: 500 });
    }
  }
  
  // 处理API请求
  async function handleAPI(request, env, path) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
  
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
  
    if (path === '/api/create' && request.method === 'POST') {
        return handleCreateLink(request, env, corsHeaders);
    }
  
    if (path.startsWith('/api/delete/') && request.method === 'DELETE') {
        const shortCode = path.substring('/api/delete/'.length);
        return handleDeleteLink(env, shortCode, corsHeaders);
    }
  
    return new Response('API未找到', { status: 404, headers: corsHeaders });
  }
  
  // 创建短链接
  async function handleCreateLink(request, env, corsHeaders) {
    try {
        const { content, customCode, expiration, rawDisplay } = await request.json();
  
        if (!content || content.trim().length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: '内容不能为空'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
  
        let shortCode = customCode?.trim();
  
        // 如果没有自定义短码，则生成随机短码
        if (!shortCode) {
            shortCode = generateShortCode();
            // 确保生成的短码不重复
            let attempts = 0;
            while (await env.LINKS_KV.get(shortCode) && attempts < 10) {
                shortCode = generateShortCode();
                attempts++;
            }
        } else {
            // 检查自定义短码是否已存在
            const existing = await env.LINKS_KV.get(shortCode);
            if (existing) {
                return new Response(JSON.stringify({
                    success: false,
                    error: '此短码已被占用，请选择其他短码'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }
  
        // 计算过期时间
        let expiresAt = null;
        if (expiration && expiration !== 'never') {
            const now = new Date();
            switch (expiration) {
                case '10m':
                    now.setMinutes(now.getMinutes() + 10);
                    break;
                case '30m':
                    now.setMinutes(now.getMinutes() + 30);
                    break;
                case '1h':
                    now.setHours(now.getHours() + 1);
                    break;
                case '24h':
                    now.setDate(now.getDate() + 1);
                    break;
                case '7d':
                    now.setDate(now.getDate() + 7);
                    break;
                case '30d':
                    now.setDate(now.getDate() + 30);
                    break;
                default:
                    break;
            }
            // 修正：使用 getTime() 进行数值计算
            expiresAt = new Date(now.getTime()).toISOString();
        }
  
        // 存储链接数据
        const linkData = {
            content: content.trim(),
            isUrl: isValidURL(content.trim()),
            rawDisplay: rawDisplay || false,
            createdAt: new Date().toISOString(),
            clicks: 0,
            expiresAt: expiresAt
        };
  
        // 修正：使用 getTime() 进行数值计算
        const expirationTtl = expiresAt ? Math.floor((new Date(expiresAt).getTime() - new Date().getTime()) / 1000) : undefined;
  
        await env.LINKS_KV.put(shortCode, JSON.stringify(linkData), {
            expirationTtl: expirationTtl
        });
  
        // 将短码添加到索引列表
        await addToIndex(env, shortCode);
  
        const shortUrl = `${new URL(request.url).origin}/${shortCode}`;
  
        return new Response(JSON.stringify({
            success: true,
            shortUrl: shortUrl,
            shortCode: shortCode
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
  
    } catch (error) {
        console.error('创建链接错误:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '服务器错误: ' + error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  }
  
  // 添加短码到索引
  async function addToIndex(env, shortCode) {
    try {
        // 获取现有索引
        let index = await env.LINKS_KV.get('__index__', 'json');
        if (!index) {
            index = [];
        }
        
        // 如果短码不在索引中，则添加
        if (!index.includes(shortCode)) {
            index.push(shortCode);
            await env.LINKS_KV.put('__index__', JSON.stringify(index));
        }
    } catch (error) {
        console.error('添加索引失败:', error);
    }
  }
  
  // 从索引中移除短码
  async function removeFromIndex(env, shortCode) {
    try {
        // 获取现有索引
        let index = await env.LINKS_KV.get('__index__', 'json');
        if (!index) {
            index = [];
        }
        
        // 移除指定短码
        index = index.filter(code => code !== shortCode);
        await env.LINKS_KV.put('__index__', JSON.stringify(index));
    } catch (error) {
        console.error('移除索引失败:', error);
    }
  }
  
  // 删除特定链接
  async function handleDeleteLink(env, shortCode, corsHeaders) {
    try {
        const linkDataStr = await env.LINKS_KV.get(shortCode);
  
        if (!linkDataStr) {
            return new Response(JSON.stringify({
                success: false,
                error: '短链接未找到'
            }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
  
        await env.LINKS_KV.delete(shortCode);
        await removeFromIndex(env, shortCode); // 同时从索引中移除
  
        return new Response(JSON.stringify({
            success: true,
            message: '链接删除成功'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
  
    } catch (error) {
        console.error('删除链接错误:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '服务器错误: ' + error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  }
  
  // 处理短链接访问
  async function handleShortLink(request, env, shortCode) {
    try {
        const linkDataStr = await env.LINKS_KV.get(shortCode);
  
        if (!linkDataStr) {
            return new Response('短链接未找到', { status: 404 });
        }
  
        const linkData = JSON.parse(linkDataStr);
  
        // 检查链接是否已过期
        if (linkData.expiresAt && new Date(linkData.expiresAt) < new Date()) {
            // 删除过期的链接
            await env.LINKS_KV.delete(shortCode);
            await removeFromIndex(env, shortCode); // 同时从索引中移除
            return new Response('此链接已过期并被移除', { status: 410 });
        }
  
        // 增加点击计数
        linkData.clicks = (linkData.clicks || 0) + 1;
        // 修正：使用 getTime() 进行数值计算
        const expirationTtl = linkData.expiresAt ? Math.floor((new Date(linkData.expiresAt).getTime() - new Date().getTime()) / 1000) : undefined;
        await env.LINKS_KV.put(shortCode, JSON.stringify(linkData), {
            expirationTtl: expirationTtl
        });
  
        // 如果是URL，则重定向
        if (linkData.isUrl && !linkData.rawDisplay) {
            return Response.redirect(linkData.content, 302);
        }
  
        // 如果是文本，检查显示模式
        if (linkData.rawDisplay) {
            // 显示原始内容
            return new Response(linkData.content, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        } else {
            // 显示格式化内容页面
            return handleTextContent(linkData.content, shortCode, linkData.clicks);
        }
  
    } catch (error) {
        console.error('处理短链接错误:', error);
        return new Response('服务器错误', { status: 500 });
    }
  }
  
  // 显示文本内容页面
  function handleTextContent(content, shortCode, clicks) {
    const html = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>短链接内容</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .short-code {
            background: #e3f2fd;
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
            font-family: monospace;
            color: #1976d2;
        }
        
        .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            margin: 20px 0;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 16px;
        }
        
        .stats {
            text-align: center;
            color: #666;
            margin-top: 20px;
        }
        
        .actions {
            text-align: center;
            margin-top: 30px;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 25px;
            display: inline-block;
            margin: 0 10px;
            transition: transform 0.2s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .copy-btn {
            background: #4caf50;
            border: none;
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            margin: 0 10px;
        }
    </style>
  </head>
  <body>
    <div class="container">
        <div class="header">
            <h1>📄 短链接内容</h1>
            <div class="short-code">${shortCode}</div>
        </div>
        
        <div class="content">${content}</div>
        
        <div class="stats">
            <p>👀 访问次数：${clicks}</p>
        </div>
        
        <div class="actions">
            <button class="copy-btn" onclick="copyContent()">复制内容</button>
            <a href="/" class="btn">创建新短链接</a>
            <a href="/stats" class="btn" style="background: #28a745;">查看所有链接统计</a>
        </div>
    </div>
  
    <script>
        function copyContent() {
            const content = \`${content.replace(/\\/g, '\\\\').replace(/\`/g, '\\`')}\`;
            navigator.clipboard.writeText(content).then(function() {
                alert('内容已复制到剪贴板！');
            });
        }
    </script>
  </body>
  </html>`;
  
    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }