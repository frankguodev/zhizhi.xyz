import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "前台用户系统暂未开放。" }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: "前台用户系统暂未开放。" }, { status: 410 });
}
