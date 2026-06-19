const PREFIX = 'link:';

function getKV(env) {
  if (env && env.SHORTURL_KV) return env.SHORTURL_KV;
  if (typeof SHORTURL_KV !== 'undefined') return SHORTURL_KV;
  return null;
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const kv = getKV(env);
  const code = params.code;
  
  if (code === 'api' || code === 'index.html' || code.endsWith('.js') || code.endsWith('.css')) {
    return new Response('Not Found', { status: 404 });
  }
  
  if (!kv) {
    return new Response('KV 未绑定', { status: 500 });
  }
  
  const data = await kv.get(PREFIX + code, { type: 'json' });
  
  if (!data) {
    return new Response(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>404</title>
<style>body{background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;}
.box{padding:40px;} h1{font-size:72px;margin:0;color:#ef4444;} p{color:#94a3b8;}</style></head>
<body><div class="box"><h1>404</h1><p>短码 "${code}" 不存在或已过期</p></div></body></html>`, 
    { status: 404, headers: { 'Content-Type': 'text/html' } });
  }
  
  if (data.expireAt && new Date(data.expireAt) < new Date()) {
    return new Response(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>已过期</title>
<style>body{background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;}
.box{padding:40px;} h1{color:#ef4444;} p{color:#94a3b8;}</style></head>
<body><div class="box"><h1>⏰ 链接已过期</h1><p>该短码已超过有效期</p></div></body></html>`, 
    { status: 410, headers: { 'Content-Type': 'text/html' } });
  }
  
  data.visits = (data.visits || 0) + 1;
  context.waitUntil(kv.put(PREFIX + code, JSON.stringify(data)));
  
  if (data.type === 'url') {
    return new Response(null, {
      status: 302,
      headers: { 'Location': data.content }
    });
  } else {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>文本分享 - ${code}</title>
<style>
:root {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-card: #ffffff;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
  --accent-green: #059669;
  --accent-blue: #2563eb;
  --accent-gray: #475569;
  --content-bg: #f1f5f9;
  --content-text: #334155;
}
[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-card: #1e293b;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border-color: #334155;
  --accent-green: #34d399;
  --accent-blue: #60a5fa;
  --accent-gray: #cbd5e1;
  --content-bg: #1e293b;
  --content-text: #cbd5e1;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg-primary);color:var(--text-primary);min-height:100vh;padding:20px;transition:background 0.3s,color 0.3s}
.container{max-width:800px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border-color)}
.header h1{font-size:20px;color:var(--text-secondary)}
.badge{background:rgba(5,150,105,0.1);color:var(--accent-green);padding:4px 12px;border-radius:12px;font-size:12px}
.content-box{background:var(--content-bg);border-radius:12px;padding:24px;margin-bottom:20px;border:1px solid var(--border-color);transition:all 0.3s}
.content{font-family:'Courier New',monospace;white-space:pre-wrap;word-break:break-all;line-height:1.8;color:var(--content-text);font-size:15px}
.actions{display:flex;gap:12px;flex-wrap:wrap}
button{padding:10px 20px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;transition:opacity 0.2s}
button:hover{opacity:0.9}
.btn-copy{background:var(--accent-blue);color:#fff}
.btn-back{background:var(--accent-gray);color:#fff}
.btn-theme{width:40px;height:40px;border-radius:50%;background:var(--content-bg);border:1px solid var(--border-color);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;padding:0;color:var(--text-primary)}
.btn-theme:hover{opacity:0.8}
.meta{margin-top:20px;padding-top:16px;border-top:1px solid var(--border-color);font-size:12px;color:var(--text-muted)}
.toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;background:var(--accent-green);color:#fff;border-radius:8px;transform:translateY(100px);opacity:0;transition:all 0.3s}
.toast.show{transform:translateY(0);opacity:1}
</style>
</head>
<body>
<div class="container">
<div class="header">
  <h1>📝 文本分享</h1>
  <div style="display:flex;gap:10px;align-items:center;">
    <span class="badge">短码: ${code}</span>
    <button class="btn-theme" onclick="toggleTheme()" id="themeBtn" title="切换主题">🌞</button>
  </div>
</div>
<div class="content-box"><div class="content" id="textContent">${escapeHtml(data.content)}</div></div>
<div class="actions">
<button class="btn-copy" onclick="copyText()">📋 复制内容</button>
<button class="btn-back" onclick="window.location.href='/'">↩ 返回</button>
</div>
<div class="meta">创建于 ${formatDate(data.createdAt)} · 已访问 ${data.visits || 1} 次${data.expireAt ? ` · 过期于 ${formatDate(data.expireAt)}` : ''}</div>
</div>
<div class="toast" id="toast">已复制到剪贴板</div>
<script>
function copyText(){
const text=document.getElementById('textContent').textContent;
navigator.clipboard.writeText(text).then(()=>{
const toast=document.getElementById('toast');
toast.classList.add('show');
setTimeout(()=>toast.classList.remove('show'),2000);
});
}
function toggleTheme(){
const html=document.documentElement;
const btn=document.getElementById('themeBtn');
if(html.getAttribute('data-theme')==='dark'){
html.removeAttribute('data-theme');
btn.textContent='🌞';
localStorage.setItem('shorturl_theme','light');
}else{
html.setAttribute('data-theme','dark');
btn.textContent='🌙';
localStorage.setItem('shorturl_theme','dark');
}
}
(function initTheme(){
const saved=localStorage.getItem('shorturl_theme');
if(saved==='dark'){
document.documentElement.setAttribute('data-theme','dark');
document.getElementById('themeBtn').textContent='🌙';
}else{
document.documentElement.removeAttribute('data-theme');
document.getElementById('themeBtn').textContent='🌞';
if(!saved)localStorage.setItem('shorturl_theme','light');
}
})();
<\/script>
</body>
</html>`;
        return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function formatDate(iso) {
  const d=new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
