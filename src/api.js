import KoaRouter from 'koa-router';

const api = KoaRouter();
export default api;

api.get('/healthz', function(ctx, next) {
  ctx.body = "OK";
  ctx.status = 200;
});
