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

    // 获取DOMAIN环境变量，如果未设置则使用默认路径/u
    const domainPath = env?.DOMAIN || '/u';
    
    // 清除验证cookie
    const headers = new Headers();
    headers.append('Location', domainPath);
    headers.append('Set-Cookie', 'validated=; Max-Age=0; Path=/; HttpOnly; Secure');
    
    return new Response(JSON.stringify({
        success: true
    }), {
        status: 302,
        headers: headers
    });
}