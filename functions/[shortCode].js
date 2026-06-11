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
        await LINKS_KV.put(shortCode, JSON.stringify(linkData));

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

// 显示文本内容页面（全新响应式美化页面）
function handleTextContent(content, shortCode, clicks) {
    // 安全转义HTML内容，防止XSS
    const safeContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    // JS内字符串安全转义
    const jsSafeContent = content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\n/g, '\\n');

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <!-- 标准移动端视口，禁止缩放 -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>短链接内容 - ${shortCode}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            /* 柔和渐变背景 */
            background: linear-gradient(145deg, #5b78e8 0%, #8057b9 100%);
            min-height: 100vh;
            padding: 16px;
            display: flex;
            justify-content: center;
            align-items: flex-start;
        }
        
        /* 主容器 响应式宽度 */
        .container {
            width: 100%;
            max-width: 820px;
            background: #ffffff;
            border-radius: 24px;
            padding: clamp(24px, 5vw, 48px);
            box-shadow: 0 12px 45px rgba(0, 0, 0, 0.12);
            transition: all 0.3s ease;
        }

        /* 头部区域 */
        .header {
            text-align: center;
            margin-bottom: clamp(20px, 4vw, 36px);
        }
        
        .header h1 {
            color: #1f2937;
            font-size: clamp(22px, 5vw, 32px);
            margin-bottom: 12px;
            font-weight: 600;
        }
        
        .short-code {
            background: #eff6ff;
            padding: 8px 20px;
            border-radius: 30px;
            display: inline-block;
            font-family: 'JetBrains Mono', Consolas, monospace;
            color: #2563eb;
            font-size: clamp(14px, 3vw, 16px);
            border: 1px solid #dbeafe;
        }
        
        /* 内容卡片 */
        .content {
            background: #f9fafb;
            padding: clamp(20px, 4vw, 32px);
            border-radius: 18px;
            margin: clamp(16px, 3vw, 24px) 0;
            line-height: 1.7;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: clamp(15px, 3vw, 17px);
            color: #374151;
            border: 1px solid #e5e7eb;
            /* 小屏横向滚动保护长行 */
            overflow-x: auto;
        }
        
        /* 统计信息 */
        .stats {
            text-align: center;
            color: #6b7280;
            margin-top: 12px;
            font-size: clamp(14px, 2.8vw, 16px);
        }
        
        /* 按钮操作区 自适应流式布局 */
        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
            margin-top: clamp(24px, 4vw, 36px);
        }
        
        .btn, .copy-btn {
            padding: clamp(10px, 2.5vw, 14px) clamp(20px, 4vw, 28px);
            border-radius: 32px;
            font-size: clamp(14px, 2.8vw, 16px);
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.25s ease;
            min-width: 130px;
            text-align: center;
            /* 移动端触控放大点击区域 */
            touch-action: manipulation;
        }
        
        .btn {
            background: linear-gradient(145deg, #5b78e8 0%, #8057b9 100%);
            color: white;
            text-decoration: none;
        }
        
        .btn-success {
            background: linear-gradient(145deg, #22c55e 0%, #16a34a 100%);
        }
        
        .copy-btn {
            background: linear-gradient(145deg, #4ade80 0%, #22c55e 100%);
            color: #ffffff;
        }
        
        /* 悬浮&点击动效 */
        .btn:hover, .copy-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.15);
        }
        .btn:active, .copy-btn:active {
            transform: translateY(0px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        /* Pad中等屏幕微调 */
        @media (max-width: 768px) {
            .actions {
                gap: 10px;
            }
        }
        /* 手机极小屏幕挤压适配 */
        @media (max-width: 480px) {
            .actions {
                flex-direction: column;
                align-items: stretch;
            }
            .btn, .copy-btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📄 短链接内容</h1>
            <div class="short-code">${shortCode}</div>
        </div>
        
        <div class="content">${safeContent}</div>
        
        <div class="stats">
            <p>👀 访问次数：${clicks}</p>
        </div>
        
        <div class="actions">
            <button class="copy-btn" onclick="copyContent()">复制内容</button>
            <a href="/u" class="btn">创建新短链接</a>
            <a href="/stats" class="btn btn-success">查看所有链接统计</a>
        </div>
    </div>

    <script>
        // 兼容剪贴板，增加成功反馈
        async function copyContent() {
            try {
                const text = \`${jsSafeContent}\`;
                await navigator.clipboard.writeText(text);
                alert('✅ 内容已成功复制到剪贴板！');
            } catch (err) {
                // 低版本浏览器降级提示
                alert('复制失败，请手动选中文字复制');
                console.warn('剪贴板复制异常:', err);
            }
        }
    </script>
</body>
</html>`;
    
    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

// 从索引中移除短码（逻辑完全原样保留）
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
