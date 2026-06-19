export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // 根路径返回 index.html
  if (url.pathname === '/' || url.pathname === '/index.html') {
    // 读取静态文件（EdgeOne Pages 会自动处理静态文件，这里兜底）
    return fetch(new URL('/index.html', request.url));
  }
  
  // 其他未匹配路由返回 404
  return new Response('Not Found', { status: 404 });
}
