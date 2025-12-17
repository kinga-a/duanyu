export default function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;
  
    // 获取DOMAIN环境变量，如果未设置则使用默认路径/u
    const domainPath = env?.DOMAIN || '/u';
  
    // 重定向到配置的首页路径
    if (path === '/') {
        return Response.redirect(domainPath, 302);
    }
    
    // 检查请求路径是否匹配配置的域路径
    if (path === domainPath || path === domainPath + '/' || path.startsWith(domainPath + '/')) {
        // 将请求代理到 u.js 的逻辑
        return handleURequest(context, domainPath);
    }
    
    // 处理根路径下的短链接访问 (例如 /abc123)
    if (path !== '/' && path.split('/').length === 2 && path.length > 1) {
        // 提取短码（去掉开头的斜杠）
        const shortCode = path.substring(1);
        return handleRootShortLink(context, shortCode);
    }
  
    return new Response('未找到页面', { status: 404 });
}

// 处理根路径下的短链接访问
async function handleRootShortLink(context, shortCode) {
    const { request, env } = context;
    
    try {
        // 使用EdgeOne KV存储
        const linkDataStr = await LINKS_KV.get(shortCode);

        if (!linkDataStr) {
            return new Response('短链接未找到', { status: 404 });
        }

        const linkData = JSON.parse(linkDataStr);

        // 检查链接是否已过期
        if (linkData.expiresAt && new Date(linkData.expiresAt) < new Date()) {
            // 删除过期的链接
            await LINKS_KV.delete(shortCode);
            await removeFromIndex(env, shortCode); // 同时从索引中移除
            return new Response('此链接已过期并被移除', { status: 410 });
        }

        // 增加点击计数
        linkData.clicks = (linkData.clicks || 0) + 1;
        // 计算剩余TTL
        const expirationTtl = linkData.expiresAt ? Math.floor((new Date(linkData.expiresAt).getTime() - new Date().getTime()) / 1000) : undefined;
        await LINKS_KV.put(shortCode, JSON.stringify(linkData), {
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

// 代理 u.js 的逻辑
function handleURequest(context, domainPath) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理首页 - 显示创建页面
    if (path === domainPath || path === domainPath + '/') {
        return handleHomePage(domainPath);
    }

    // 处理配置路径下的短链接访问 (例如 /a/abc123)
    if (path.length > domainPath.length + 1) {
        const shortCode = path.substring(domainPath.length + 1); // 去掉配置的路径前缀
        return handleShortLink(request, env, shortCode);
    }

    return new Response('未找到页面', { status: 404 });
}

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

// 处理首页
function handleHomePage(domainPath) {
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
                    <label for="rawDisplay" style="margin: 0; cursor: pointer;">url是否以文本显示</label>
                </div>
                <small style="display: block; color: #666; margin-left: 24px;">
                    启用后，url内容将以纯文本形式显示；文本内容不需要勾选
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
        
        <script>
            // 使用传递的domainPath参数
            const domainPath = "${domainPath}";
        </script>
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

// 处理短链接访问
async function handleShortLink(request, env, shortCode) {
    try {
        // 使用EdgeOne KV存储
        const linkDataStr = await LINKS_KV.get(shortCode);

        if (!linkDataStr) {
            return new Response('短链接未找到', { status: 404 });
        }

        const linkData = JSON.parse(linkDataStr);

        // 检查链接是否已过期
        if (linkData.expiresAt && new Date(linkData.expiresAt) < new Date()) {
            // 删除过期的链接
            await LINKS_KV.delete(shortCode);
            await removeFromIndex(env, shortCode); // 同时从索引中移除
            return new Response('此链接已过期并被移除', { status: 410 });
        }

        // 增加点击计数
        linkData.clicks = (linkData.clicks || 0) + 1;
        // 计算剩余TTL
        const expirationTtl = linkData.expiresAt ? Math.floor((new Date(linkData.expiresAt).getTime() - new Date().getTime()) / 1000) : undefined;
        await LINKS_KV.put(shortCode, JSON.stringify(linkData), {
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
            <a href="/u" class="btn">创建新短链接</a>
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

// 从索引中移除短码
async function removeFromIndex(env, shortCode) {
    try {
        // 获取现有索引
        let index = await LINKS_KV.get('__index__', 'json');
        if (!index) {
            index = [];
        }
        
        // 移除指定短码
        index = index.filter(code => code !== shortCode);
        await LINKS_KV.put('__index__', JSON.stringify(index));
    } catch (error) {
        console.error('移除索引失败:', error);
    }
}
