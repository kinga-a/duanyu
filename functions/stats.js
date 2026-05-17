export default async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理首页 - 显示创建页面
    if (path === '/u' || path === '/u/') {
        return handleHomePage();
    }

    // 处理短链接访问
    if (path.length > 2 && path.startsWith('/u/')) {
        const shortCode = path.substring(3); // 去掉 '/u/' 前缀
        return handleShortLink(request, env, shortCode);
    }

    // 处理统计页面
    if (path === '/stats' || path === '/stats/') {
        return onRequestStats(context); // 调用验证逻辑
    }

    // 处理验证请求
    if (path === '/validate') {
        return handleValidation(request, env);
    }

    // 处理登出
    if (path === '/logout') {
        return handleLogout();
    }

    // 处理删除 API
    if (path.startsWith('/api/delete/')) {
        const shortCode = path.substring('/api/delete/'.length);
        return handleDelete(request, env, shortCode);
    }

    // 新增：处理编辑 API
    if (path.startsWith('/api/edit/')) {
        const shortCode = path.substring('/api/edit/'.length);
        return handleEdit(request, env, shortCode);
    }

    // 处理创建 API
    if (path === '/api/create') {
        return handleCreate(request, env);
    }

    return new Response('未找到页面', { status: 404 });
}


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
        let index = await env.LINKS_KV.get('__index__', 'json');
        if (!index) {
            index = [];
        }

        // 过滤掉不存在的链接并收集链接数据
        const links = [];
        const processedIndex = [];
        
        for (const shortCode of index) {
            const linkDataStr = await env.LINKS_KV.get(shortCode);
            if (linkDataStr) {
                const linkData = JSON.parse(linkDataStr);
                
                // 检查链接是否已过期
                if (linkData.expiresAt && new Date(linkData.expiresAt) < new Date()) {
                    await env.LINKS_KV.delete(shortCode);
                    continue;
                }
                
                links.push({
                    shortCode: shortCode,
                    content: linkData.content,
                    isUrl: linkData.isUrl,
                    rawDisplay: linkData.rawDisplay || false,
                    clicks: linkData.clicks || 0,
                    createdAt: linkData.createdAt,
                    expiresAt: linkData.expiresAt
                });
                processedIndex.push(shortCode);
            }
        }
        
        // 更新索引
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
            max-width: 1200px;
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
            margin-bottom: 20px;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .search-box {
            flex: 1;
            min-width: 250px;
            position: relative;
        }
        
        .search-box input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        .search-box input:focus {
            outline: none;
            border-color: #667eea;
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
        
        .logout-btn {
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
        }
        
        .stats-info {
            margin-bottom: 15px;
            color: #666;
            font-size: 14px;
        }
        
        .table-container {
            overflow-x: auto;
            border-radius: 10px;
            margin-top: 20px;
        }
        
        table {
            width: 100%;
            min-width: 800px;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: #f5f5f5;
            font-weight: 600;
            position: sticky;
            top: 0;
        }
        
        tr:hover {
            background-color: #f9f9f9;
        }
        
        .short-code {
            font-family: monospace;
            background: #e3f2fd;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .content-preview {
            max-width: 250px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            cursor: pointer;
            color: #667eea;
            text-decoration: underline;
        }
        
        .content-preview:hover {
            color: #764ba2;
        }
        
        .action-btns {
            display: flex;
            gap: 5px;
            flex-wrap: nowrap;
        }
        
        .edit-btn {
            background: #2196F3;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .edit-btn:hover {
            background: #1976D2;
        }
        
        .delete-btn {
            background: #f44336;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .delete-btn:hover {
            background: #d32f2f;
        }
        
        .empty-message {
            text-align: center;
            padding: 40px;
            color: #666;
            font-style: italic;
        }
        
        .back-link {
            text-align: center;
            margin-top: 20px;
        }
        
        .back-link a {
            color: #667eea;
            text-decoration: none;
        }
        
        /* 模态框样式 */
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .modal-overlay.show {
            display: flex;
        }
        
        .modal {
            background: white;
            border-radius: 20px;
            padding: 30px;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        
        .modal h2 {
            margin-bottom: 20px;
            color: #333;
        }
        
        .modal .form-group {
            margin-bottom: 20px;
        }
        
        .modal label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
        }
        
        .modal textarea, .modal input[type="text"], .modal select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            font-family: inherit;
        }
        
        .modal textarea {
            min-height: 120px;
            resize: vertical;
        }
        
        .modal textarea:focus, .modal input:focus, .modal select:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .modal-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
        }
        
        .modal .btn-secondary {
            background: #6c757d;
        }
        
        .type-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .type-url {
            background: #e3f2fd;
            color: #1976d2;
        }
        
        .type-text {
            background: #f3e5f5;
            color: #7b1fa2;
        }
        
        .hidden {
            display: none !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 所有链接统计</h1>
        
        <div class="controls">
            <div class="search-box">
                <input type="text" id="searchInput" placeholder="🔍 搜索短码、内容..." oninput="filterLinks()">
            </div>
            <button class="btn" onclick="loadLinks()">刷新数据</button>
            <button class="btn logout-btn" onclick="logout()">退出验证</button>
        </div>
        
        <div class="stats-info" id="statsInfo">
            共 <strong>${links.length}</strong> 条链接
        </div>
        
        <div class="table-container">
        ${links.length === 0 ? 
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
                ${links.map(link => {
                    const expiresAt = link.expiresAt ? new Date(link.expiresAt).toLocaleString('zh-CN', { 
                      timeZone: 'Asia/Shanghai',
                      year: 'numeric', month: '2-digit', day: '2-digit', 
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                      hour12: false 
                    }) : '永不';
                    const createdAt = new Date(link.createdAt).toLocaleString('zh-CN', { 
                      timeZone: 'Asia/Shanghai',
                      year: 'numeric', month: '2-digit', day: '2-digit', 
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                      hour12: false 
                    });
                    
                    return `<tr data-shortcode="${link.shortCode}" data-content="${link.content.replace(/"/g, '&quot;')}">
                        <td><span class="short-code">${link.shortCode}</span></td>
                        <td>
                            <div class="content-preview" onclick="viewContent('${link.shortCode}')" title="点击查看完整内容">
                                ${link.content.substring(0, 50)}${link.content.length > 50 ? '...' : ''}
                            </div>
                        </td>
                        <td><span class="type-badge ${link.isUrl ? 'type-url' : 'type-text'}">${link.isUrl ? '网址' : '文本'}</span></td>
                        <td>${link.clicks}</td>
                        <td>${createdAt}</td>
                        <td>${expiresAt}</td>
                        <td>
                            <div class="action-btns">
                                <button class="edit-btn" onclick="editLink('${link.shortCode}')">编辑</button>
                                <button class="delete-btn" onclick="deleteLink('${link.shortCode}', event)">删除</button>
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`}
        </div>
        
        <div class="back-link">
            <a href="/u" id="backToGenerator">← 返回生成器</a>
        </div>
    </div>

    <!-- 编辑模态框 -->
    <div class="modal-overlay" id="editModal">
        <div class="modal">
            <h2>✏️ 编辑链接内容</h2>
            <div class="form-group">
                <label>短码：</label>
                <input type="text" id="editShortCode" readonly style="background: #f5f5f5;">
            </div>
            <div class="form-group">
                <label for="editContent">内容：</label>
                <textarea id="editContent" placeholder="输入新的内容..."></textarea>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="editRawDisplay" style="width: auto; margin-right: 8px;">
                    以文本显示（raw）
                </label>
            </div>
            <div class="form-group">
                <label for="editExpiration">更新有效期：</label>
                <select id="editExpiration">
                    <option value="keep">保持不变</option>
                    <option value="never">永不过期</option>
                    <option value="10m">10分钟</option>
                    <option value="30m">30分钟</option>
                    <option value="1h">1小时</option>
                    <option value="24h">24小时</option>
                    <option value="7d">7天</option>
                    <option value="30d">30天</option>
                </select>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn" onclick="saveEdit()">保存修改</button>
            </div>
        </div>
    </div>

    <!-- 查看内容模态框 -->
    <div class="modal-overlay" id="viewModal">
        <div class="modal">
            <h2>📄 完整内容</h2>
            <div class="form-group">
                <label>短码：<span id="viewShortCode" class="short-code"></span></label>
            </div>
            <div class="form-group">
                <textarea id="viewContent" readonly style="min-height: 200px; background: #f8f9fa;"></textarea>
            </div>
            <div class="modal-actions">
                <button class="btn" onclick="closeViewModal()">关闭</button>
                <button class="btn" onclick="copyViewContent()" style="background: #4caf50;">复制内容</button>
            </div>
        </div>
    </div>

    <script>
        const domainPath = window.location.pathname.split('/')[1] || 'u';
        document.getElementById('backToGenerator').href = '/' + domainPath;
        
        let currentEditShortCode = null;
        let allLinksData = ${JSON.stringify(links)};
        
        // 搜索过滤功能
        function filterLinks() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
            const rows = document.querySelectorAll('#linksList tr');
            let visibleCount = 0;
            
            rows.forEach(row => {
                const shortCode = row.getAttribute('data-shortcode').toLowerCase();
                const content = row.getAttribute('data-content').toLowerCase();
                
                if (shortCode.includes(searchTerm) || content.includes(searchTerm)) {
                    row.classList.remove('hidden');
                    visibleCount++;
                } else {
                    row.classList.add('hidden');
                }
            });
            
            document.getElementById('statsInfo').innerHTML = 
                '共 <strong>' + allLinksData.length + '</strong> 条链接' + 
                (searchTerm ? '，显示 <strong>' + visibleCount + '</strong> 条' : '');
        }
        
        // 查看完整内容
        function viewContent(shortCode) {
            const link = allLinksData.find(l => l.shortCode === shortCode);
            if (!link) return;
            
            document.getElementById('viewShortCode').textContent = shortCode;
            document.getElementById('viewContent').value = link.content;
            document.getElementById('viewModal').classList.add('show');
        }
        
        function closeViewModal() {
            document.getElementById('viewModal').classList.remove('show');
        }
        
        function copyViewContent() {
            const content = document.getElementById('viewContent').value;
            navigator.clipboard.writeText(content).then(() => {
                alert('内容已复制！');
            });
        }
        
        // 编辑功能
        function editLink(shortCode) {
            const link = allLinksData.find(l => l.shortCode === shortCode);
            if (!link) return;
            
            currentEditShortCode = shortCode;
            document.getElementById('editShortCode').value = shortCode;
            document.getElementById('editContent').value = link.content;
            document.getElementById('editRawDisplay').checked = link.rawDisplay || false;
            document.getElementById('editExpiration').value = 'keep';
            document.getElementById('editModal').classList.add('show');
        }
        
        function closeModal() {
            document.getElementById('editModal').classList.remove('show');
            currentEditShortCode = null;
        }
        
        async function saveEdit() {
            if (!currentEditShortCode) return;
            
            const content = document.getElementById('editContent').value.trim();
            const rawDisplay = document.getElementById('editRawDisplay').checked;
            const expiration = document.getElementById('editExpiration').value;
            
            if (!content) {
                alert('内容不能为空！');
                return;
            }
            
            try {
                const response = await fetch('/api/edit/' + currentEditShortCode, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: content,
                        rawDisplay: rawDisplay,
                        expiration: expiration
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('修改成功！');
                    window.location.reload();
                } else {
                    alert('修改失败：' + (data.error || '未知错误'));
                }
            } catch (error) {
                alert('网络错误：' + error.message);
            }
        }
        
        // 删除功能
        async function deleteLink(shortCode, event) {
            event.stopPropagation();
            if (!confirm('确定要删除短码「' + shortCode + '」吗？此操作不可恢复！')) {
                return;
            }
            
            const btn = event.target;
            btn.disabled = true;
            btn.textContent = '删除中...';
            
            try {
                const response = await fetch('/api/delete/' + shortCode, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('删除成功！');
                    window.location.reload();
                } else {
                    throw new Error(data.error || '删除失败');
                }
            } catch (error) {
                alert('删除失败：' + error.message);
                btn.disabled = false;
                btn.textContent = '删除';
            }
        }
        
        function loadLinks() {
            window.location.reload();
        }
        
        async function logout() {
            if (!confirm('确定要退出验证吗？')) return;
            
            try {
                await fetch('/logout', { method: 'POST' });
            } catch (e) {}
            
            document.cookie = 'validated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/' + domainPath;
        }
        
        // 点击模态框外部关闭
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('show');
                }
            });
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
            }
        });
    </script>
</body>
</html>`;

  // 处理编辑链接
async function handleEdit(request, env, shortCode) {
    if (request.method !== 'PUT') {
        return new Response(JSON.stringify({ success: false, error: '方法不允许' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 检查链接是否存在
        const linkDataStr = await env.LINKS_KV.get(shortCode);
        if (!linkDataStr) {
            return new Response(JSON.stringify({ success: false, error: '短链接不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const linkData = JSON.parse(linkDataStr);
        const body = await request.json();
        const { content, rawDisplay, expiration } = body;

        if (!content || content.trim() === '') {
            return new Response(JSON.stringify({ success: false, error: '内容不能为空' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 更新内容
        linkData.content = content.trim();
        linkData.rawDisplay = rawDisplay || false;
        linkData.isUrl = isValidURL(content.trim());

        // 处理有效期更新
        if (expiration && expiration !== 'keep') {
            if (expiration === 'never') {
                linkData.expiresAt = null;
            } else {
                const now = new Date();
                let expiresAt = new Date(now);
                
                switch (expiration) {
                    case '10m': expiresAt.setMinutes(now.getMinutes() + 10); break;
                    case '30m': expiresAt.setMinutes(now.getMinutes() + 30); break;
                    case '1h': expiresAt.setHours(now.getHours() + 1); break;
                    case '24h': expiresAt.setHours(now.getHours() + 24); break;
                    case '7d': expiresAt.setDate(now.getDate() + 7); break;
                    case '30d': expiresAt.setDate(now.getDate() + 30); break;
                }
                
                linkData.expiresAt = expiresAt.toISOString();
            }
        }

        // 保存更新
        const expirationTtl = linkData.expiresAt ? 
            Math.floor((new Date(linkData.expiresAt).getTime() - new Date().getTime()) / 1000) : 
            undefined;

        await env.LINKS_KV.put(shortCode, JSON.stringify(linkData), {
            expirationTtl: expirationTtl
        });

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('编辑链接错误:', error);
        return new Response(JSON.stringify({ success: false, error: '服务器错误' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}  
    
        return new Response(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    } catch (error) {
        console.error('统计页面错误:', error);
        return new Response('服务器错误', { status: 500 });
    }
}
