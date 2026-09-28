export function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}})};
export function bad(message,status=400,extra={}){return json({ok:false,error:message,...extra},status)};
export function requireAdmin(request,env){
  const expected=env.ADMIN_TOKEN;
  if(!expected) return false;
  const auth=request.headers.get('Authorization')||'';
  return auth===`Bearer ${expected}`;
}
export function corsHeaders(request){
  const origin=request.headers.get('Origin')||'';
  const allowed=origin.endsWith('draydania.com')||origin.includes('workers.dev')?origin:'https://draydania.com';
  return {'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS','Vary':'Origin'};
}