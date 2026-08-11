import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MINIMAX_API_KEY;
const BASE_URL = process.env.MINIMAX_BASE_URL || "https://mzsjai.com/v1";

/**
 * 将 base64 Data URL 图片上传到图床，返回 HTTPS URL。
 * MiniMax API 要求图片必须是 HTTPS URL，不支持 data URL。
 * 优先使用 uguu.se，失败则回退到 tmpfiles.org。
 */
async function uploadImageToHost(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/);
  if (!match) {
    throw new Error("图片数据格式无效");
  }

  const mimeType = match[1];
  const ext = match[2] === "jpeg" ? "jpg" : match[2];
  const buffer = Buffer.from(match[3], "base64");
  const blob = new Blob([buffer], { type: mimeType });

  // 尝试 uguu.se
  try {
    const formData = new FormData();
    formData.append("files[]", blob, `image.${ext}`);

    const res = await fetch("https://uguu.se/upload.php", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.files?.[0]?.url) {
        return data.files[0].url as string;
      }
    }
  } catch {
    // uguu.se 失败，尝试下一个
  }

  // 回退到 tmpfiles.org
  try {
    const formData = new FormData();
    formData.append("file", blob, `image.${ext}`);

    const res = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.data?.url) {
        // tmpfiles.org 返回页面 URL，需转换为直接图片 URL
        // https://tmpfiles.org/xxxxx/file.png -> https://tmpfiles.org/d/xxxxx/file.png
        const pageUrl = data.data.url as string;
        const directUrl = pageUrl.replace(
          "tmpfiles.org/",
          "tmpfiles.org/d/"
        );
        return directUrl;
      }
    }
  } catch {
    // tmpfiles.org 也失败
  }

  throw new Error("所有图床服务均不可用，请稍后重试");
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
