export default async function onRequest(context) {
    const { request, env } = context;
    
    // 检查是否有验证状态
    const cookies = request.headers.get('Cookie') || '';
    const hasValidated = cookies.includes('validated=true');
    
    if (hasValidated) {
        return handleStatsPage(env);
    } else {
        return showValidationPage();
    }
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
            <a href="/u" id="backToHome">← 返回首页</a>
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

// 处理统计页面 - 显示所有链接信息
async function handleStatsPage(env) {
    try {
        // 获取索引列表
        let index = await LINKS_KV.get('__index__', 'json');
        if (!index) {
            index = [];
        }

        // 过滤掉不存在的链接并收集链接数据
        const links = [];
        const processedIndex = []; // 用于过滤不存在的链接
        
        for (const shortCode of index) {
            const linkDataStr = await LINKS_KV.get(shortCode);
            if (linkDataStr) {
                const linkData = JSON.parse(linkDataStr);
                
                // 检查链接是否已过期
                if (linkData.expiresAt && new Date(linkData.expiresAt) < new Date()) {
                    // 删除过期的链接
                    await LINKS_KV.delete(shortCode);
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
        await LINKS_KV.put('__index__', JSON.stringify(processedIndex));

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
                            <button class="delete-btn" onclick="deleteLink('${link.shortCode}', event)">删除</button>
                        </td>
                    </tr>`;
                }).join('') + `
            </tbody>
        </table>`) + `
        </div> <!-- 结束 table-container -->
        
        <div class="back-link">
            <a href="/u" id="backToGenerator">← 返回生成器</a>
        </div>
    </div>

    <script>
        // 获取配置的域名路径
        const domainPath = window.location.pathname.split('/')[1] || 'u';
        
        // 设置返回首页的链接
        document.getElementById('backToHome').href = '/' + domainPath;
        document.getElementById('backToGenerator').href = '/' + domainPath;
        
        async function loadLinks() {
            window.location.reload();
        }
        
        async function deleteLink(shortCode, event) {
            // 阻止事件冒泡，防止在移动端触发其他行为
            event.stopPropagation();
            event.preventDefault();
            
            if (!confirm('您确定要删除此链接吗？')) {
                return;
            }
            
            // 显示加载状态
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = '删除中...';
            button.disabled = true;
            
            try {
                const response = await fetch('/api/delete/' + shortCode, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest' // 添加请求头标识
                    }
                });
                
                // 尝试获取响应数据
                let data;
                try {
                    data = await response.json();
                } catch (e) {
                    // 如果无法解析JSON，则创建默认响应对象
                    if (response.ok) {
                        data = { success: true };
                    } else {
                        data = { success: false, error: '服务器响应无效' };
                    }
                }
                
                if (data.success) {
                    // 删除成功，提示用户并刷新页面
                    alert('链接删除成功');
                    loadLinks(); // 刷新页面
                } else {
                    throw new Error(data.error || '未知错误');
                }
            } catch (error) {
                console.error('删除链接错误:', error);
                alert('删除链接失败：' + error.message);
            } finally {
                // 恢复按钮状态
                button.textContent = originalText;
                button.disabled = false;
            }
        }
        
        async function logout() {
            // 显示确认对话框
            if (!confirm('您确定要退出验证吗？下次访问统计页面需要重新验证。')) {
                return;
            }
            
            try {
                // 通过发送请求到服务器端点来清除cookie
                const response = await fetch('/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                // 如果服务器返回重定向状态，则手动重定向
                if (response.status === 302 || response.status === 200) {
                    // 重定向到首页
                    window.location.href = '/' + domainPath;
                } else {
                    // 如果响应不是预期的状态，尝试手动清除cookie并重定向
                    clearCookieAndRedirect();
                }
            } catch (error) {
                console.error('退出验证错误:', error);
                // 如果网络请求失败，仍然尝试手动清除cookie并重定向
                clearCookieAndRedirect();
            }
        }
        
        // 辅助函数：手动清除cookie并重定向
        function clearCookieAndRedirect() {
            // 手动清除验证cookie
            document.cookie = "validated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "validated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
            document.cookie = "validated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." + window.location.hostname;
            
            // 重定向到首页
            const domainPath = window.location.pathname.split('/')[1] || 'u';
            window.location.href = '/' + domainPath;
        }
        
        // 为所有删除按钮添加触摸事件处理，防止移动端误触
        document.addEventListener('DOMContentLoaded', function() {
            const deleteButtons = document.querySelectorAll('.delete-btn');
            deleteButtons.forEach(button => {
                // 添加触摸开始事件
                button.addEventListener('touchstart', function(e) {
                    // 防止默认的触摸行为
                    e.preventDefault();
                });
            });
        });
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
