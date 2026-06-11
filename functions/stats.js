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

// 显示验证页面 - 优化自适应UI
function showValidationPage() {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>验证访问权限</title>
    <style>
        :root {
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --primary: #667eea;
            --danger: #f44336;
            --text-dark: #2d3748;
            --text-gray: #718096;
            --border-light: #e2e8f0;
            --shadow-lg: 0 20px 40px rgba(0,0,0,0.12);
            --radius-lg: 20px;
            --radius-md: 10px;
            --transition: all 0.24s ease;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            background: var(--primary-gradient);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        
        .container {
            background: #ffffff;
            border-radius: var(--radius-lg);
            padding: clamp(24px, 5vw, 40px);
            box-shadow: var(--shadow-lg);
            max-width: 520px;
            width: 100%;
            text-align: center;
        }
        
        h1 {
            color: var(--text-dark);
            margin-bottom: 16px;
            font-size: clamp(1.8em, 6vw, 2.5em);
            font-weight: 600;
        }
        
        .desc {
            color: var(--text-gray);
            margin-bottom: 28px;
            font-size: clamp(15px, 3vw, 16px);
            line-height: 1.7;
        }
        
        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: #4a5568;
            font-weight: 500;
            font-size: 15px;
        }
        
        input[type="password"] {
            width: 100%;
            padding: clamp(14px, 3vw, 16px);
            border: 2px solid var(--border-light);
            border-radius: var(--radius-md);
            font-size: 16px;
            transition: var(--transition);
            background: #fbfcfe;
        }
        
        input[type="password"]:focus {
            outline: none;
            border-color: var(--primary);
            background: #fff;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
        }
        
        .btn {
            background: var(--primary-gradient);
            color: white;
            border: none;
            padding: clamp(14px, 3vw, 16px);
            border-radius: var(--radius-md);
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            width: 100%;
            transition: var(--transition);
            min-height: 50px;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(102, 126, 234, 0.25);
        }
        .btn:active {
            transform: translateY(0);
        }
        
        .error-message {
            color: var(--danger);
            margin-top: 12px;
            display: none;
            font-size: 14px;
        }
        
        .back-link {
            margin-top: 24px;
        }
        
        .back-link a {
            color: var(--primary);
            text-decoration: none;
            font-size: 15px;
            transition: var(--transition);
        }
        
        .back-link a:hover {
            text-decoration: underline;
        }

        /* 平板/手机适配 */
        @media (max-width: 768px) {
            body { padding: 12px; }
            .container { border-radius: 16px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 验证访问权限</h1>
        <p class="desc">请输入验证密码以查看统计信息</p>       
        <form id="validationForm">
            <div class="form-group">
                <label for="password">验证密码：</label>
                <input type="password" id="password" placeholder="请输入验证密码" required autocomplete="off">
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
                    window.location.href = '/stats';
                } else if (response.status === 401) {
                    errorMessage.style.display = 'block';
                    document.getElementById('password').value = '';
                    document.getElementById('password').focus();
                } else {
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

// 处理统计页面 - 全端自适应优化版
async function handleStatsPage(env) {
    try {
        let index = await LINKS_KV.get('__index__', 'json');
        if (!index) index = [];

        const links = [];
        const processedIndex = [];
        
        for (const shortCode of index) {
            const linkDataStr = await LINKS_KV.get(shortCode);
            if (!linkDataStr) continue;
            const linkData = JSON.parse(linkDataStr);
            
            if (linkData.expiresAt && new Date(linkData.expiresAt) < new Date()) {
                await LINKS_KV.delete(shortCode);
                continue;
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
        
        await LINKS_KV.put('__index__', JSON.stringify(processedIndex));

        const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>所有链接统计</title>
    <style>
        :root {
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --primary: #667eea;
            --danger: #f44336;
            --warning-gradient: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
            --text-dark: #2d3748;
            --text-gray: #718096;
            --border-light: #e2e8f0;
            --bg-light: #f7fafc;
            --shadow-lg: 0 20px 40px rgba(0,0,0,0.12);
            --radius-lg: 20px;
            --radius-md: 10px;
            --radius-sm: 6px;
            --transition: all 0.24s ease;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--primary-gradient);
            min-height: 100vh;
            padding: clamp(12px, 3vw, 24px);
        }
        
        .container {
            max-width: 1100px;
            margin: 0 auto;
            background: white;
            border-radius: var(--radius-lg);
            padding: clamp(20px, 4vw, 40px);
            box-shadow: var(--shadow-lg);
        }
        
        h1 {
            text-align: center;
            color: var(--text-dark);
            margin-bottom: clamp(20px, 4vw, 30px);
            font-size: clamp(1.6em, 5vw, 2.5em);
            font-weight: 600;
        }
        
        .controls {
            display: flex;
            gap: 12px;
            margin-bottom: clamp(16px, 3vw, 30px);
            flex-wrap: wrap;
        }
        
        .btn, .logout-btn {
            color: white;
            border: none;
            padding: clamp(12px, 2.5vw, 14px) clamp(16px, 3vw, 22px);
            border-radius: var(--radius-md);
            font-size: clamp(15px, 2.5vw, 16px);
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
            min-height: 48px;
            flex: 1;
            max-width: 200px;
        }
        .btn { background: var(--primary-gradient); }
        .logout-btn { background: var(--warning-gradient); }
        
        .btn:hover, .logout-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 14px rgba(0,0,0,0.15);
        }
        .btn:active, .logout-btn:active { transform: translateY(0); }
        
        .table-container {
            overflow-x: auto;
            border-radius: var(--radius-md);
            margin-top: 10px;
            -webkit-overflow-scrolling: touch; /* 苹果平滑滚动 */
        }
        
        table {
            width: 100%;
            min-width: 720px;
            border-collapse: collapse;
        }
        
        th, td {
            padding: clamp(10px, 2vw, 15px);
            text-align: left;
            border-bottom: 1px solid var(--border-light);
            font-size: clamp(14px, 2vw, 15px);
        }
        
        th {
            background-color: var(--bg-light);
            font-weight: 600;
            color: var(--text-dark);
            white-space: nowrap;
        }
        
        tbody tr:hover {
            background-color: #f8f9fd;
        }
        
        .delete-btn {
            background: var(--danger);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-size: 14px;
            min-height: 36px;
            transition: var(--transition);
        }
        .delete-btn:hover { background: #d32f2f; }
        .delete-btn:active { transform: scale(0.96); }
        
        .loading {
            text-align: center;
            padding: 30px;
            color: var(--text-gray);
            display: none;
        }
        
        .empty-message {
            text-align: center;
            padding: 50px 20px;
            color: var(--text-gray);
            font-style: italic;
            font-size: 16px;
        }
        
        .full-url {
            word-break: break-all;
            max-width: 300px;
            display: inline-block;
        }
        
        .back-link {
            text-align: center;
            margin-top: 24px;
        }
        .back-link a {
            color: var(--primary);
            text-decoration: none;
            font-size: 15px;
        }
        .back-link a:hover { text-decoration: underline; }

        /* 手机小屏深度适配 */
        @media (max-width: 640px) {
            .controls { gap: 8px; }
            .btn, .logout-btn { flex: 1 1 120px; max-width: unset; }
            .container { border-radius: 16px; }
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
            <p>正在加载链接数据...</p>
        </div>
        
        <div class="table-container">
        ` + (links.length === 0 ? 
        `<div class="empty-message">暂无短链接数据</div>` : 
        `<table id="linksTable">
            <thead>
                <tr>
                    <th>短码</th>
                    <th>内容预览</th>
                    <th>类型</th>
                    <th>点击</th>
                    <th>创建时间</th>
                    <th>过期时间</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody id="linksList">
                ` + links.map(link => {
                    const expiresAt = link.expiresAt ? new Date(link.expiresAt).toLocaleString('zh-CN', { 
                      timeZone: 'Asia/Shanghai',
                      year: 'numeric', month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
                    }) : '永不';
                    const createdAt = new Date(link.createdAt).toLocaleString('zh-CN', { 
                      timeZone: 'Asia/Shanghai',
                      year: 'numeric', month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
                    });
                    const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
                    const expiredClass = isExpired ? 'style="color: #d32f2f; font-weight:500;"' : '';
                    const previewText = link.content.length > 50 ? link.content.substring(0, 50) + '...' : link.content;
                    
                    return `<tr>
                        <td>${link.shortCode}</td>
                        <td title="${link.content.replace(/"/g, '&quot;')}">
                            <div class="full-url">${previewText}</div>
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
        </div>
        
        <div class="back-link">
            <a href="/u" id="backToGenerator">← 返回生成器</a>
        </div>
    </div>

    <script>
        const domainPath = window.location.pathname.split('/')[1] || 'u';

        async function loadLinks() {
            const loadingEl = document.getElementById('loading');
            loadingEl.style.display = 'block';
            window.location.reload();
        }
        
        async function deleteLink(shortCode, event) {
            event.stopPropagation();
            event.preventDefault();
            
            if (!confirm('确定删除该短链接？删除后无法恢复')) return;
            
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = '删除中';
            button.disabled = true;
            
            try {
                const response = await fetch('/api/delete/' + shortCode, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                let data = { success: false };
                try { data = await response.json(); } catch {}
                if (response.ok && data.success !== false) {
                    alert('删除成功');
                    loadLinks();
                } else {
                    throw new Error(data.error || '服务器操作失败');
                }
            } catch (error) {
                console.error('删除失败:', error);
                alert('删除失败：' + error.message);
            } finally {
                button.textContent = originalText;
                button.disabled = false;
            }
        }
        
        async function logout() {
            if (!confirm('退出后需要重新输入密码验证，确认退出？')) return;
            
            try {
                const res = await fetch('/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                if (res.ok) {
                    window.location.href = '/' + domainPath;
                    return;
                }
            } catch (err) {
                console.warn('登出接口请求失败，手动清除Cookie');
            }
            clearCookieAndRedirect();
        }
        
        function clearCookieAndRedirect() {
            document.cookie = "validated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "validated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
            document.cookie = "validated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." + window.location.hostname;
            window.location.href = '/' + domainPath;
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            // 修复旧代码里不存在的backToHome元素赋值
            const generatorLink = document.getElementById('backToGenerator');
            if(generatorLink) generatorLink.href = '/' + domainPath;

            // 移动端触摸优化
            document.querySelectorAll('.delete-btn, .btn, .logout-btn').forEach(btn => {
                btn.addEventListener('touchstart', e => e.preventDefault(), { passive:false });
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
        return new Response('服务器内部错误', { status: 500 });
    }
}
