export default async function onRequest(context) {
    const { request, env } = context;
    
    // 只处理POST请求
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({
            success: false,
            error: 'Method not allowed'
        }), {
            status: 405,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            }
        });
    }

    try {
        const { content, customCode, expiration, rawDisplay } = await request.json();

        if (!content || content.trim().length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: '内容不能为空'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let shortCode = customCode?.trim();

        // 如果没有自定义短码，则生成随机短码
        if (!shortCode) {
            shortCode = generateShortCode();
            // 确保生成的短码不重复
            let attempts = 0;
            while (await LINKS_KV.get(shortCode) && attempts < 10) {
                shortCode = generateShortCode();
                attempts++;
            }
        } else {
            // 检查自定义短码是否已存在
            const existing = await LINKS_KV.get(shortCode);
            if (existing) {
                return new Response(JSON.stringify({
                    success: false,
                    error: '此短码已被占用，请选择其他短码'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
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

        // 计算TTL
        const expirationTtl = expiresAt ? Math.floor((new Date(expiresAt).getTime() - new Date().getTime()) / 1000) : undefined;

        await LINKS_KV.put(shortCode, JSON.stringify(linkData), {
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
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('创建链接错误:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '服务器错误: ' + error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
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

// 添加短码到索引
async function addToIndex(env, shortCode) {
    try {
        // 获取现有索引
        let index = await LINKS_KV.get('__index__', 'json');
        if (!index) {
            index = [];
        }
        
        // 如果短码不在索引中，则添加
        if (!index.includes(shortCode)) {
            index.push(shortCode);
            await LINKS_KV.put('__index__', JSON.stringify(index));
        }
    } catch (error) {
        console.error('添加索引失败:', error);
    }
}