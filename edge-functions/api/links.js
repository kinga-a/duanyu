const PREFIX = 'link:';
const CODE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// 获取 KV 实例的辅助函数 - 尝试多种方式
function getKV(env) {
  // 方式1: 通过 env.SHORTURL_KV
  if (env && env.SHORTURL_KV) return env.SHORTURL_KV;
  // 方式2: 全局变量（文档示例直接用 my_kv）
  if (typeof SHORTURL_KV !== 'undefined') return SHORTURL_KV;
  return null;
}

export async function onRequest(context) {
  const { request } = context;
  
  const auth = await verifyAuth(context);
  if (!auth.ok) return auth.response;

  if (request.method === 'GET') return listLinks(context);
  if (request.method === 'POST') return createLink(context);
  if (request.method === 'PUT') return updateLink(context);
  if (request.method === 'DELETE') return deleteLink(context);
  
  return new Response('Method Not Allowed', { status: 405 });
}

async function verifyAuth(context) {
  const { request } = context;
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    return { 
      ok: false, 
      response: new Response(JSON.stringify({ error: '未授权' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }) 
    };
  }
  
  return { ok: true };
}

async function listLinks(context) {
  const { env } = context;
  const kv = getKV(env);

  if (!kv) {
    const envKeys = env ? Object.keys(env).join(', ') : 'env is undefined';
    return new Response(JSON.stringify({ 
      error: 'KV 未绑定，请检查 SHORTURL_KV 变量',
      debug: { envKeys }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const links = [];
    let cursor = null;

    do {
      const options = { prefix: PREFIX, limit: 256 };
      if (cursor) options.cursor = cursor;

      const result = await kv.list(options);

      for (const keyObj of result.keys) {
        const data = await kv.get(keyObj.key, { type: 'json' });
        if (data) {
          const code = keyObj.key.replace(PREFIX, '');
          const expired = data.expireAt && new Date(data.expireAt) < new Date();
          links.push({
            code,
            type: data.type,
            content: data.content,
            visits: data.visits || 0,
            createdAt: data.createdAt,
            expireAt: data.expireAt,
            expired,
            expireHours: data.expireHours,
            remark: data.remark || ''
          });
        }
      }

      cursor = result.cursor;
      if (result.complete) break;
    } while (cursor);

    links.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return new Response(JSON.stringify(links), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'KV 读取失败: ' + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function createLink(context) {
  const { request, env } = context;
  const kv = getKV(env);
  
  if (!kv) {
    const envKeys = env ? Object.keys(env).join(', ') : 'env is undefined';
    return new Response(JSON.stringify({ 
      error: 'KV 未绑定，请检查 SHORTURL_KV 变量',
      debug: { envKeys }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: '请求体 JSON 解析失败' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  let code = body.customCode;
  
  if (code) {
    if (code.length < 2) {
      return new Response(JSON.stringify({ error: '短码最少2位' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      return new Response(JSON.stringify({ error: '短码只能包含字母、数字、下划线和横线' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    const exists = await kv.get(PREFIX + code);
    if (exists) {
      return new Response(JSON.stringify({ error: '短码已被占用' }), { 
        status: 409, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
  } else {
    code = await generateUniqueCode(kv);
  }
  
  const now = new Date().toISOString();
  const expireHours = parseInt(body.expireHours) || 0;
  const expireAt = expireHours > 0 
    ? new Date(Date.now() + expireHours * 3600 * 1000).toISOString() 
    : null;
  
  const data = {
    type: body.type,
    content: body.content,
    visits: 0,
    createdAt: now,
    expireAt,
    expireHours,
    remark: body.remark || ''
  };
  
  try {
    await kv.put(PREFIX + code, JSON.stringify(data));
  } catch (e) {
    return new Response(JSON.stringify({ error: 'KV 写入失败: ' + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ 
    code, 
    shortUrl: `${new URL(request.url).origin}/${code}` 
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function updateLink(context) {
  const { request, env } = context;
  const kv = getKV(env);
  
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV 未绑定' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const body = await request.json();
  const code = body.code;
  
  if (!code) {
    return new Response(JSON.stringify({ error: '缺少短码' }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
  
  const existing = await kv.get(PREFIX + code, { type: 'json' });
  if (!existing) {
    return new Response(JSON.stringify({ error: '短码不存在' }), { 
      status: 404, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
  
  const expireHours = parseInt(body.expireHours) || 0;
  const expireAt = expireHours > 0 
    ? new Date(Date.now() + expireHours * 3600 * 1000).toISOString() 
    : null;
  
  const data = {
    ...existing,
    content: body.content,
    expireAt,
    expireHours,
    remark: body.remark || existing.remark
  };
  
  await kv.put(PREFIX + code, JSON.stringify(data));
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function deleteLink(context) {
  const { request, env } = context;
  const kv = getKV(env);
  
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV 未绑定' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const body = await request.json();
  const code = body.code;
  
  if (!code) {
    return new Response(JSON.stringify({ error: '缺少短码' }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
  
  await kv.delete(PREFIX + code);
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function generateUniqueCode(kv) {
  let attempts = 0;
  while (attempts < 10) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    const exists = await kv.get(PREFIX + code);
    if (!exists) return code;
    attempts++;
  }
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}
