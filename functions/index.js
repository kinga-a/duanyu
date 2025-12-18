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
  
    return new Response('未找到页面', { status: 404 });
}
