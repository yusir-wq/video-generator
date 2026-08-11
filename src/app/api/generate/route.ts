import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MINIMAX_API_KEY;
const BASE_URL = process.env.MINIMAX_BASE_URL || "https://mzsjai.com/v1";

/**
 * 将 base64 Data URL 图片上传到 0x0.st 图床，返回 HTTPS URL。
 * MiniMax API 要求图片必须是 HTTPS URL，不支持 data URL。
 */
async function uploadImageToHost(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/);
  if (!match) {
    throw new Error("图片数据格式无效");
  }

  const mimeType = match[1];
  const ext = match[2] === "jpeg" ? "jpg" : match[2];
  const buffer = Buffer.from(match[3], "base64");

  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append("file", blob, `image.${ext}`);

  const res = await fetch("https://0x0.st", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`图床上传失败 (HTTP ${res.status})`);
  }

  const url = (await res.text()).trim();
  if (!url.startsWith("https://")) {
    throw new Error(`图床上传返回异常: ${url}`);
  }

  return url;
}

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "服务器未配置 API Key，请在 .env.local 中设置 MINIMAX_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // 如果 images 中包含 base64 Data URL，先上传到图床获取 HTTPS URL
    if (body.images && Array.isArray(body.images)) {
      const uploadedImages: string[] = [];
      for (const img of body.images) {
        if (typeof img === "string" && img.startsWith("data:")) {
          const httpsUrl = await uploadImageToHost(img);
          uploadedImages.push(httpsUrl);
        } else {
          uploadedImages.push(img);
        }
      }
      body.images = uploadedImages;
    }

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
