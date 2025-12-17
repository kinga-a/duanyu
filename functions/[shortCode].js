export default async function onRequest(context) {
    const { request, params } = context;
    const shortCode = params.shortCode;
    
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
            await removeFromIndex(shortCode); // 同时从索引中移除
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
        return new Response('服务器错误: ' + error.message, { status: 500 });
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
async function removeFromIndex(shortCode) {
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