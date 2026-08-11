import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MINIMAX_API_KEY;
const BASE_URL = process.env.MINIMAX_BASE_URL || "https://mzsjai.com/v1";

export async function GET(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "服务器未配置 API Key" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json(
      { error: "缺少 taskId 参数" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${BASE_URL}/videos/${encodeURIComponent(taskId)}`, {
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
      },
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
      { error: `查询失败: ${message}` },
      { status: 500 }
    );
  }
}
