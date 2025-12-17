export default async function onRequest(context) {
    const { request, env, params } = context;
    
    // 只处理DELETE请求
    if (request.method !== 'DELETE') {
        return new Response(JSON.stringify({
            success: false,
            error: 'Method not allowed'
        }), {
            status: 405,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
            }
        });
    }

    try {
        const shortCode = params.shortCode;

        if (!shortCode) {
            return new Response(JSON.stringify({
                success: false,
                error: '短码不能为空'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const linkDataStr = await LINKS_KV.get(shortCode);

        if (!linkDataStr) {
            return new Response(JSON.stringify({
                success: false,
                error: '短链接未找到'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await LINKS_KV.delete(shortCode);
        await removeFromIndex(env, shortCode); // 同时从索引中移除

        return new Response(JSON.stringify({
            success: true,
            message: '链接删除成功'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('删除链接错误:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '服务器错误: ' + error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
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