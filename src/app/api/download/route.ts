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
    const res = await fetch(
      `${BASE_URL}/videos/${encodeURIComponent(taskId)}/content`,
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
        },
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.error?.message || `下载失败 (${res.status})` },
        { status: res.status }
      );
    }

    // 以流式响应返回视频文件
    const contentType = res.headers.get("content-type") || "video/mp4";
    const contentLength = res.headers.get("content-length");

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
    };
    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    return new NextResponse(res.body, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: `下载失败: ${message}` },
      { status: 500 }
    );
  }
}
