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

// 处理首页 - 全端自适应美化（修复二维码溢出）
function handleHomePage() {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>🔗短链接生成器</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <style>
        :root {
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --primary: #667eea;
            --success: #4caf50;
            --secondary: #6c757d;
            --text-dark: #2d3748;
            --text-gray: #718096;
            --border-light: #e2e8f0;
            --bg-card: #ffffff;
            --bg-light: #f7fafc;
            --bg-blue-light: #e3f2fd;
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            background: var(--primary-gradient);
            min-height: 100vh;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: clamp(12px, 3vw, 24px);
        }
        
        .container {
            background: var(--bg-card);
            border-radius: var(--radius-lg);
            padding: clamp(20px, 4vw, 40px);
            box-shadow: var(--shadow-lg);
            max-width: 640px;
            width: 100%;
            margin-top: clamp(10px, 2vh, 40px);
        }
        
        h1 {
            text-align: center;
            color: var(--text-dark);
            margin-bottom: clamp(20px, 4vw, 30px);
            font-size: clamp(1.8em, 6vw, 2.5em);
            font-weight: 600;
        }
        
        .form-group {
            margin-bottom: clamp(16px, 3vw, 20px);
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: #4a5568;
            font-weight: 500;
            font-size: 15px;
        }
        
        textarea, input[type="text"], select {
            width: 100%;
            padding: clamp(14px, 3vw, 16px);
            border: 2px solid var(--border-light);
            border-radius: var(--radius-md);
            font-size: 16px;
            transition: var(--transition);
            background: #fbfcfe;
        }
        
        textarea:focus, input[type="text"]:focus, select:focus {
            outline: none;
            border-color: var(--primary);
            background: #fff;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
        }
        
        textarea {
            min-height: clamp(100px, 20vh, 120px);
            resize: vertical;
        }
        
        .checkbox-row {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        input[type="checkbox"] {
            width: auto;
            transform: scale(1.1);
            cursor: pointer;
        }
        .checkbox-desc {
            font-size: 13px;
            color: var(--text-gray);
            margin-left: 26px;
            margin-top: 4px;
            line-height: 1.5;
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
        .btn:active { transform: translateY(0); }
        
        .loading {
            display: none;
            text-align: center;
            margin-top: 10px;
            color: var(--text-gray);
        }

        .result {
            margin-top: 24px;
            padding: clamp(16px, 3vw, 24px);
            background: var(--bg-light);
            border-radius: var(--radius-md);
            display: none;
        }
        .result.show { display: block; }
        .result h3 {
            color: var(--success);
            margin-bottom: 12px;
            font-size: 1.2em;
        }
        
        .short-link {
            background: var(--bg-blue-light);
            padding: clamp(12px, 2vw, 15px);
            border-radius: var(--radius-sm);
            margin: 10px 0;
            word-break: break-all;
            font-family: ui-monospace, SFMono-Regular, monospace;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .copy-btn {
            background: var(--success);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            white-space: nowrap;
            font-size: 14px;
            transition: var(--transition);
            min-height: 36px;
        }
        .copy-btn:hover { background: #388e3c; }

        /* 二维码区域 修复溢出 */
        .qr-section {
            margin-top: 20px;
            text-align: center;
            padding: clamp(16px, 3vw, 20px);
            background: white;
            border-radius: var(--radius-md);
            border: 2px dashed var(--border-light);
        }
        .qr-section h4 {
            color: #4a5568;
            margin-bottom: 15px;
            font-size: clamp(1em, 3vw, 1.1em);
        }
        #qrcode {
            display: inline-block;
            padding: 10px;
            background: white;
            max-width: 100%;
        }
        #qrcode canvas, #qrcode img {
            display: block;
            margin: 0 auto;
            max-width: calc(100% - 20px);
            height: auto !important;
        }
        
        .qr-actions {
            margin-top: 15px;
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .qr-btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 10px 18px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-size: 14px;
            transition: var(--transition);
            display: inline-flex;
            align-items: center;
            gap: 5px;
            min-height: 40px;
        }
        .qr-btn:hover { background: #5a6fd6; transform: translateY(-1px); }
        .qr-btn.secondary { background: var(--secondary); }
        .qr-btn.secondary:hover { background: #5a6268; }

        .tip-text {
            text-align: center;
            color: var(--text-gray);
            margin-top: 15px;
            font-size: 14px;
        }
        
        .footer-links {
            text-align: center;
            margin-top: 24px;
            display: flex;
            gap: 16px;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
        }
        .footer-links a {
            color: var(--primary);
            text-decoration: none;
            font-size: 15px;
            transition: var(--transition);
            display: inline-flex;
            align-items: center;
            gap:4px;
        }
        .footer-links a.github { color: #24292f; }
        .footer-links a:hover { text-decoration: underline; }

        /* 移动端小屏适配 */
        @media (max-width: 640px) {
            body { padding: 10px; }
            .container { border-radius: 16px; }
            .qr-actions { gap:8px; }
            .qr-btn { flex:1; max-width:140px; }
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
                <div class="checkbox-row">
                    <input type="checkbox" id="rawDisplay">
                    <label for="rawDisplay" style="margin:0; cursor:pointer;">以文本显示</label>
                </div>
                <div class="checkbox-desc">URL内容或者html/js代码勾选后直接展示文本，普通跳转链接可不勾选</div>
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
            
            <div class="qr-section">
                <h4>📱 扫码访问</h4>
                <div id="qrcode"></div>
                <div class="qr-actions">
                    <button class="qr-btn" onclick="downloadQRCode()">⬇️ 下载二维码</button>
                    <button class="qr-btn secondary" onclick="copyQRCode()">📋 复制图片</button>
                </div>
            </div>
            
            <p class="tip-text">点击短链接访问原始内容</p>
        </div>
        
        <div class="footer-links">
            <a href="/stats">📊 查看所有链接统计</a>
            <a href="https://github.com/kinga-a/duanyu" class="github">
                <svg height="16" viewBox="0 0 16 16" version="1.1" width="16" aria-hidden="true" fill="currentColor">
                <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                </svg> Github
            </a>
        </div>

        <script>
            const domainPath = window.location.pathname.split('/')[1] || 'u';
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
            
            const qrContainer = document.getElementById('qrcode');
            qrContainer.innerHTML = '';
            currentQRCode = null;
            
            try {
                const response = await fetch('/api/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, customCode, expiration, rawDisplay })
                });
                const data = await response.json();
                if (data.success) {
                    document.getElementById('shortUrl').textContent = data.shortUrl;
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
            navigator.clipboard.writeText(shortUrl).then(() => alert('已复制到剪贴板！'));
        }
        
        // 自适应二维码尺寸
        function generateQRCode(url) {
            const qrContainer = document.getElementById('qrcode');
            qrContainer.innerHTML = '';
            const qrSize = window.innerWidth > 640 ? 200 : 160;
            currentQRCode = new QRCode(qrContainer, {
                text: url,
                width: qrSize,
                height: qrSize,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        }
        
        function downloadQRCode() {
            const qrCanvas = document.querySelector('#qrcode canvas');
            if (!qrCanvas) return alert('请先生成二维码');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 240;
            canvas.width = size; canvas.height = size;
            ctx.fillStyle = '#fff';
            ctx.fillRect(0,0,size,size);
            ctx.drawImage(qrCanvas,20,20);
            const link = document.createElement('a');
            link.download = 'qrcode.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
        
        async function copyQRCode() {
            const qrCanvas = document.querySelector('#qrcode canvas');
            if (!qrCanvas) return alert('请先生成二维码');
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const size = 240;
                canvas.width = size; canvas.height = size;
                ctx.fillStyle = '#fff';
                ctx.fillRect(0,0,size,size);
                ctx.drawImage(qrCanvas,20,20);
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                if (navigator.clipboard && window.ClipboardItem) {
                    await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
                    alert('二维码已复制到剪贴板！');
                } else {
                    const link = document.createElement('a');
                    link.download = 'qrcode.png';
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }
            } catch (err) {
                alert('复制失败，请使用下载功能');
            }
        }

        // 横竖屏切换重绘二维码
        window.addEventListener('resize', () => {
            if(currentQRCode && document.getElementById('shortUrl').textContent) {
                generateQRCode(document.getElementById('shortUrl').textContent);
            }
        });
    </script>
</body>
</html>`;
    
    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

// 处理短链接访问（已修复expirationTtl undefined报错）
async function handleShortLink(request, env, shortCode) {
    try {
        const linkDataStr = await LINKS_KV.get(shortCode);
        if (!linkDataStr) return new Response('短链接未找到', { status: 404 });
        const linkData = JSON.parse(linkDataStr);

        if (linkData.expiresAt && new Date(linkData.expiresAt) < new Date()) {
            await LINKS_KV.delete(shortCode);
            await removeFromIndex(env, shortCode);
            return new Response('此链接已过期并被移除', { status: 410 });
        }

        linkData.clicks = (linkData.clicks || 0) + 1;

        // ========== 修复关键点：不再传undefined给expirationTtl ==========
        await LINKS_KV.put(shortCode, JSON.stringify(linkData));

        if (linkData.isUrl && !linkData.rawDisplay) {
            return Response.redirect(linkData.content, 302);
        }
        if (linkData.rawDisplay) {
            return new Response(linkData.content, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        } else {
            return handleTextContent(linkData.content, shortCode, linkData.clicks);
        }
    } catch (error) {
        console.error('处理短链接错误:', error);
        return new Response('服务器错误', { status: 500 });
    }
}

// 文本展示页面 自适应优化
function handleTextContent(content, shortCode, clicks) {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>短链接内容</title>
    <style>
        :root {
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --primary: #667eea;
            --success: #4caf50;
            --green-btn: #28a745;
            --text-dark: #2d3748;
            --text-gray: #718096;
            --bg-card: #ffffff;
            --bg-light: #f7fafc;
            --bg-blue-light: #e3f2fd;
            --blue-text: #1976d2;
            --shadow-lg: 0 20px 40px rgba(0,0,0,0.12);
            --radius-lg: 20px;
            --radius-md: 15px;
            --radius-pill: 999px;
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
            max-width: 840px;
            margin: 0 auto;
            background: var(--bg-card);
            border-radius: var(--radius-lg);
            padding: clamp(20px, 4vw, 40px);
            box-shadow: var(--shadow-lg);
        }
        .header {
            text-align: center;
            margin-bottom: clamp(20px, 4vw, 30px);
        }
        .header h1 {
            color: var(--text-dark);
            margin-bottom: 10px;
            font-size: clamp(1.6em, 5vw, 2em);
        }
        .short-code {
            background: var(--bg-blue-light);
            padding: 8px 20px;
            border-radius: var(--radius-pill);
            display: inline-block;
            font-family: ui-monospace, monospace;
            color: var(--blue-text);
            font-size: clamp(14px, 2.5vw, 16px);
        }
        .content {
            background: var(--bg-light);
            padding: clamp(20px, 3vw, 30px);
            border-radius: var(--radius-md);
            margin: clamp(16px, 3vw, 20px) 0;
            line-height: 1.7;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: clamp(15px, 2.5vw, 16px);
            color: var(--text-dark);
        }
        .stats {
            text-align: center;
            color: var(--text-gray);
            margin-top: 10px;
            font-size: 15px;
        }
        .actions {
            text-align: center;
            margin-top: clamp(20px, 4vw, 30px);
            display: flex;
            gap: clamp(8px, 2vw, 12px);
            justify-content: center;
            flex-wrap: wrap;
        }
        .btn, .copy-btn {
            border: none;
            padding: clamp(12px, 2vw, 14px) clamp(20px, 3vw, 24px);
            border-radius: var(--radius-pill);
            font-size: clamp(14px, 2.5vw, 16px);
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
            min-height: 46px;
            flex: 1;
            max-width: 220px;
        }
        .btn {
            background: var(--primary-gradient);
            color: white;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .btn.green { background: var(--green-btn); }
        .copy-btn {
            background: var(--success);
            color: white;
        }
        .btn:hover, .copy-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }
        .btn:active, .copy-btn:active { transform: translateY(0); }

        @media (max-width: 640px) {
            body { padding:10px; }
            .container { border-radius:16px; }
            .actions { gap:8px; }
            .btn, .copy-btn { flex:1 1 110px; max-width:unset; }
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
            <a href="/stats" class="btn green">查看链接统计</a>
        </div>
    </div>

    <script>
        function copyContent() {
            const rawContent = \`${content.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\`;
            navigator.clipboard.writeText(rawContent).then(() => alert('内容已复制到剪贴板！'));
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
        let index = await LINKS_KV.get('__index__', 'json');
        if (!index) index = [];
        index = index.filter(code => code !== shortCode);
        await LINKS_KV.put('__index__', JSON.stringify(index));
    } catch (error) {
        console.error('移除索引失败:', error);
    }
}
