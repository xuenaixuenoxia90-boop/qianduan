export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 获取请求路径
    let path = url.pathname;
    if (path === '/') path = '/login.html';
    
    // 尝试从 ASSETS 获取文件
    try {
      const asset = await env.ASSETS.fetch(new Request(path));
      if (asset.ok) {
        return asset;
      }
    } catch (e) {
      // 文件不存在
    }
    
    // 404
    return new Response('Not Found', { status: 404 });
  }
};
