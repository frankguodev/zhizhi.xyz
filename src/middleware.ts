import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 把 admin.zhizhi.xyz 这个子域名独立给后台用：
// - 子域名根路径直接展示后台，前台页面跳回主站；
// - 主站上的后台 UI 页面（/admin）跳到子域名，隐藏后台入口。
//
// 注意：只重定向后台「页面」，不碰 /api/admin。AI 词条脚本用 Bearer Token
// 打主站 zhizhi.xyz/api/admin，跨域 307 会丢掉 Authorization 头（且若子域名加了
// Cloudflare Access 还会被边缘拦截）。API 由应用自身鉴权（requireAdmin*）保护，留在原 host。
const ADMIN_HOST = "admin.zhizhi.xyz";
const MAIN_HOST = "zhizhi.xyz";

function isAdminPage(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const { pathname, search } = request.nextUrl;

  // 本地开发和 *.workers.dev 预览不做 host 路由，整站（含 /admin）正常访问。
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".workers.dev")) {
    return NextResponse.next();
  }

  if (host === ADMIN_HOST) {
    // 子域名根路径 → 内部重写到后台首页（URL 仍是 admin.zhizhi.xyz/）。
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/admin", request.url));
    }
    // 后台页面与所有 API 放行（API 由应用鉴权 / Access 保护），其它前台页面跳回主站。
    if (isAdminPage(pathname) || pathname.startsWith("/api/")) {
      return NextResponse.next();
    }
    return NextResponse.redirect(`https://${MAIN_HOST}${pathname}${search}`, 307);
  }

  // 主站：后台 UI 页面跳到子域名访问（/api/admin 不动，留给脚本和应用鉴权）。
  if (isAdminPage(pathname)) {
    return NextResponse.redirect(`https://${ADMIN_HOST}${pathname}${search}`, 307);
  }

  return NextResponse.next();
}

export const config = {
  // 跳过 _next 资源、favicon 和带后缀的静态文件（如 /mediapipe/*.wasm）。
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
