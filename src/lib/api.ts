// API 类型定义

export type VideoModel = "minimax/minimax-h3-fl2va" | "minimax/minimax-h3-ref2va";

export type TaskStatus = "queued" | "in_progress" | "completed" | "failed";

export interface GenerateRequest {
  model: VideoModel;
  prompt: string;
  seconds: number;
  images?: string[];
}

export interface GenerateResponse {
  id: string;
  task_id: string;
  object: string;
  model: string;
  status: TaskStatus;
  progress: number;
  created_at?: number;
}

export interface StatusResponse {
  id: string;
  task_id: string;
  object: string;
  model: string;
  status: TaskStatus;
  progress: number;
  content_url?: string;
  metadata?: {
    url?: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

// 前端调用的 API 封装

export async function submitTask(req: GenerateRequest): Promise<GenerateResponse> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "提交任务失败");
  }
  return data;
}

export async function queryStatus(taskId: string): Promise<StatusResponse> {
  const res = await fetch(`/api/status?taskId=${encodeURIComponent(taskId)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "查询状态失败");
  }
  return data;
}

export function getDownloadUrl(taskId: string): string {
  return `/api/download?taskId=${encodeURIComponent(taskId)}`;
}

// 工具函数：将 File 转为 Base64 Data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
