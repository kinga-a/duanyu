export async function onRequestPost(context) {
  const { request, env } = context;
  
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: '请求格式错误' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const correctCode = env.ACCESS_CODE;
  
  if (!correctCode) {
    return new Response(JSON.stringify({ error: '服务器未配置 ACCESS_CODE 环境变量' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (body.code === correctCode) {
    const token = btoa(`${Date.now()}:${await hashCode(body.code + (env.ACCESS_CODE_SALT || 'salt'))}`);
    return new Response(JSON.stringify({ token }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: '访问码错误' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function hashCode(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
