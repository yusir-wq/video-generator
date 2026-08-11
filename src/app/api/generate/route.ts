import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MINIMAX_API_KEY;
const BASE_URL = process.env.MINIMAX_BASE_URL || "https://mzsjai.com/v1";

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "服务器未配置 API Key，请在 .env.local 中设置 MINIMAX_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const res = await fetch(`${BASE_URL}/videos`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || data.message || `API 返回错误 (${res.status})` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: `请求失败: ${message}` },
      { status: 500 }
    );
  }
}
