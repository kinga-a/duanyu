export default async function onRequest(context) {
    const { request, env } = context;
    
    // 只处理POST请求
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({
            success: false,
            error: 'Method not allowed'
        }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { password } = await request.json();
        
        // 从环境变量获取密码哈希值，如果未设置则使用默认值
        const expectedHash = env.PASSWORD || '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
        
        const isValid = await verifyPassword(password, expectedHash);
        
        if (isValid) {
            // 设置验证cookie，有效期1小时
            const headers = new Headers();
            headers.append('Location', '/stats');
            headers.append('Set-Cookie', 'validated=true; Max-Age=3600; Path=/; HttpOnly; Secure');
            
            return new Response(JSON.stringify({
                success: true
            }), {
                status: 302,
                headers: headers
            });
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: '密码错误'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('验证错误:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '服务器错误'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 密码哈希比较函数
async function verifyPassword(inputPassword, expectedHash) {
    // 使用SHA-256哈希算法
    const encoder = new TextEncoder();
    const data = encoder.encode(inputPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex === expectedHash;
}
