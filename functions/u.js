export default function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理首页 - 显示创建页面
    if (path === '/u' || path === '/u/') {
        return handleHomePage();
    }

    // 处理短链接访问
    if (path.length > 2) {
        const shortCode = path.substring(2); // 去掉 '/u/' 前缀
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
function handleHomePage() {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔗短链接生成器</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
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
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .copy-btn {
            background: #4caf50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            white-space: nowrap;
        }
        
        .loading {
            display: none;
            text-align: center;
            margin-top: 10px;
        }

        /* 二维码样式 */
        .qr-section {
            margin-top: 20px;
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 10px;
            border: 2px dashed #e1e5e9;
        }

        .qr-section h4 {
            color: #555;
            margin-bottom: 15px;
            font-size: 1.1em;
        }

        #qrcode {
            display: inline-block;
            padding: 10px;
            background: white;
        }

        #qrcode img {
            display: block;
            margin: 0 auto;
        }

        .qr-actions {
            margin-top: 15px;
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .qr-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }

        .qr-btn:hover {
            background: #5a6fd6;
            transform: translateY(-1px);
        }

        .qr-btn.secondary {
            background: #6c757d;
        }

        .qr-btn.secondary:hover {
            background: #5a6268;
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
                    <label for="rawDisplay" style="margin: 0; cursor: pointer;">以文本显示</label>
                </div>
                <small style="display: block; color: #666; margin-left: 24px;">
                   （文本内容可不勾选***url内容或者html/js代码以文本显示可勾选）
                </small>
            </div>
            
            <button type="submit" class="btn">生成短链接</button>
            
            <div class="loading">
                <p>正在生成...</p>
            </div>
        </form>
        
        <div id="result" class="result">
            <h3>✅ 生成成功！</h3>
            <div class="short-link">
                <span id="shortUrl"></span>
                <button class="copy-btn" onclick="copyToClipboard()">复制链接</button>
            </div>
            
            <!-- 二维码区域 -->
            <div class="qr-section">
                <h4>📱 扫码访问</h4>
                <div id="qrcode"></div>
                <div class="qr-actions">
                    <button class="qr-btn" onclick="downloadQRCode()">⬇️ 下载二维码</button>
                    <button class="qr-btn secondary" onclick="copyQRCode()">📋 复制图片</button>
                </div>
            </div>
            
            <p style="text-align: center; color: #666; margin-top: 15px; font-size: 14px;">
                点击短链接访问原始内容
            </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <a href="/stats" style="color: #667eea; text-decoration: none;">📊 查看所有链接统计</a>

            <a href="https://github.com/kinga-a/duanyu" style="margin-left: 15px; color: #333;">
            <svg height="16" viewBox="0 0 16 16" version="1.1" width="16" aria-hidden="true" fill="currentColor">
            <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            </a>
        </div>

          
        <script>
            // 获取配置的域名路径
            const domainPath = window.location.pathname.split('/')[1] || 'u';
            
            // 存储二维码实例
            let currentQRCode = null;
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
            
            // 清除之前的二维码
            const qrContainer = document.getElementById('qrcode');
            qrContainer.innerHTML = '';
            currentQRCode = null;
            
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
                    
                    // 生成二维码
                    generateQRCode(data.shortUrl);
                    
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
        
        // 生成二维码
        function generateQRCode(url) {
            const qrContainer = document.getElementById('qrcode');
            qrContainer.innerHTML = '';
            
            currentQRCode = new QRCode(qrContainer, {
                text: url,
                width: 200,
                height: 200,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        }
        
        // 下载二维码
        function downloadQRCode() {
            const qrCanvas = document.querySelector('#qrcode canvas');
            if (!qrCanvas) {
                alert('请先生成二维码');
                return;
            }
            
            // 创建白色背景的画布
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 240; // 包含边距
            canvas.width = size;
            canvas.height = size;
            
            // 填充白色背景
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            
            // 绘制二维码（居中，带20px边距）
            ctx.drawImage(qrCanvas, 20, 20);
            
            // 下载
            const link = document.createElement('a');
            link.download = 'qrcode.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
        
        // 复制二维码图片到剪贴板
        async function copyQRCode() {
            const qrCanvas = document.querySelector('#qrcode canvas');
            if (!qrCanvas) {
                alert('请先生成二维码');
                return;
            }
            
            try {
                // 创建带白色背景的画布
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const size = 240;
                canvas.width = size;
                canvas.height = size;
                
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);
                ctx.drawImage(qrCanvas, 20, 20);
                
                // 转换为 blob
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                
                if (navigator.clipboard && window.ClipboardItem) {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    alert('二维码已复制到剪贴板！');
                } else {
                    // 降级方案：下载
                    const link = document.createElement('a');
                    link.download = 'qrcode.png';
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }
            } catch (err) {
                console.error('复制失败:', err);
                alert('复制失败，请使用下载功能');
            }
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
        await env.LINKS_KV.put('__index__', JSON.stringify(index));
    } catch (error) {
        console.error('移除索引失败:', error);
    }
}
