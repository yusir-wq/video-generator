"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ImageUploader from "@/components/ImageUploader";
import VideoPreview from "@/components/VideoPreview";
import {
  submitTask,
  queryStatus,
  type VideoModel,
  type TaskStatus,
  type GenerateRequest,
  type Quality,
  type Ratio,
  getSizeForRatio,
} from "@/lib/api";

type Mode = "fl2va" | "ref2va";

const MODE_CONFIG: Record<
  Mode,
  { label: string; model: VideoModel; desc: string }
> = {
  fl2va: {
    label: "文生视频",
    model: "minimax/minimax-h3-fl2va",
    desc: "输入文字描述生成视频，可选择性上传首帧/尾帧图片",
  },
  ref2va: {
    label: "参考图生视频",
    model: "minimax/minimax-h3-ref2va",
    desc: "上传参考图片，在 Prompt 中用 <Picture 1> 引用，生成视频",
  },
};

const STATUS_TEXT: Record<TaskStatus, string> = {
  queued: "排队中...",
  in_progress: "生成中...",
  completed: "生成完成",
  failed: "生成失败",
};

const QUALITIES: { value: Quality; label: string; desc: string }[] = [
  { value: "standard", label: "标准", desc: "生成更快，适合预览" },
  { value: "hd", label: "高清", desc: "画质更高，细节更丰富" },
];

const RATIOS: { value: Ratio; label: string }[] = [
  { value: "16:9", label: "16:9 横屏" },
  { value: "9:16", label: "9:16 竖屏" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "1:1", label: "1:1 正方" },
  { value: "21:9", label: "21:9 超宽" },
];

export default function Home() {
  const [mode, setMode] = useState<Mode>("fl2va");
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(5);
  const [quality, setQuality] = useState<Quality>("standard");
  const [ratio, setRatio] = useState<Ratio>("16:9");

  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 轮询任务状态
  const pollStatus = useCallback(async (id: string) => {
    try {
      const data = await queryStatus(id);
      setStatus(data.status);
      setProgress(data.progress || 0);

      if (data.status === "completed") {
        setLoading(false);
        return; // 停止轮询
      }

      if (data.status === "failed") {
        setLoading(false);
        setError(data.error?.message || "生成失败");
        return; // 停止轮询
      }

      // 继续轮询
      pollRef.current = setTimeout(() => pollStatus(id), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "查询状态失败");
      setLoading(false);
    }
  }, []);

  // 清理轮询定时器
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    // 校验
    if (!prompt.trim()) {
      setError("请输入视频描述");
      return;
    }
    if (mode === "ref2va" && images.length === 0) {
      setError("参考图生视频需要至少上传 1 张图片");
      return;
    }

    setError(null);
    setLoading(true);
    setStatus(null);
    setTaskId(null);
    setProgress(0);

    // 清理之前的轮询
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }

    try {
      // 图生视频（有首尾帧图片）时比例由图片自动决定，使用默认 16:9 计算 size
      const effectiveRatio: Ratio =
        mode === "fl2va" && images.length > 0 ? "16:9" : ratio;

      const reqBody: GenerateRequest = {
        model: MODE_CONFIG[mode].model,
        prompt: prompt.trim(),
        seconds,
        size: getSizeForRatio(effectiveRatio, quality),
        ...(images.length > 0 ? { images } : {}),
      };

      const data = await submitTask(reqBody);
      setTaskId(data.task_id || data.id);
      setStatus(data.status);
      setProgress(data.progress || 0);

      // 开始轮询
      pollRef.current = setTimeout(
        () => pollStatus(data.task_id || data.id),
        3000
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交任务失败");
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    setTaskId(null);
    setStatus(null);
    setProgress(0);
    setError(null);
    setLoading(false);
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setImages([]);
    handleReset();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 标题 */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            MiniMax H3 视频生成工具
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            文生视频 / 参考图生视频 · 支持带音频的 MP4 输出
          </p>
        </header>

        {/* 模式切换 Tab */}
        <div className="flex gap-2 mb-6 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
          {(Object.keys(MODE_CONFIG) as Mode[]).map((key) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === key
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {MODE_CONFIG[key].label}
            </button>
          ))}
        </div>

        {/* 输入区 */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
          {/* 模式说明 */}
          <p className="text-xs text-zinc-400">
            {MODE_CONFIG[mode].desc}
          </p>

          {/* Prompt 输入 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              视频描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "fl2va"
                  ? "描述你想要的视频内容、动作、镜头和音频..."
                  : "描述视频内容，用 <Picture 1> 引用第一张图片，<Picture 2> 引用第二张..."
              }
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 图片上传 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {mode === "fl2va" ? "首尾帧图片（可选）" : "参考图片"}
              {mode === "ref2va" && <span className="text-red-500"> *</span>}
            </label>
            <ImageUploader
              mode={mode}
              images={images}
              onChange={setImages}
            />
          </div>

          {/* 画质选择 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              画质
            </label>
            <div className="flex gap-2">
              {QUALITIES.map((q) => (
                <button
                  key={q.value}
                  type="button"
                  onClick={() => setQuality(q.value)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    quality === q.value
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  <div>{q.label}</div>
                  <div className={`text-[10px] mt-0.5 ${quality === q.value ? "text-blue-100" : "text-zinc-400"}`}>
                    {q.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 画面比例选择（文生视频无图片时显示，或参考图生视频时显示） */}
          {(mode === "fl2va" && images.length === 0) || mode === "ref2va" ? (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                画面比例
                <span className="ml-2 text-xs text-zinc-400">
                  输出尺寸：{getSizeForRatio(ratio, quality)}
                </span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {RATIOS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRatio(r.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      ratio === r.value
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 图生视频有图片时显示当前画质对应的尺寸 */
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                画面比例
                <span className="ml-2 text-xs text-zinc-400">（上传图片后自动适配）</span>
              </label>
              <p className="text-xs text-zinc-400">
                当前画质输出尺寸：{getSizeForRatio("16:9", quality)}
              </p>
            </div>
          )}

          {/* 时长选择 */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              <span>视频时长</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {seconds} 秒
              </span>
            </label>
            <input
              type="range"
              min={4}
              max={15}
              value={seconds}
              onChange={(e) => setSeconds(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-1">
              <span>4s</span>
              <span>15s</span>
            </div>
          </div>

          {/* 生成按钮 */}
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`flex-1 px-6 py-3 rounded-xl font-medium text-white transition-all ${
                loading
                  ? "bg-zinc-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
              }`}
            >
              {loading ? "生成中..." : "生成视频"}
            </button>
            {(taskId || error) && (
              <button
                onClick={handleReset}
                className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                重置
              </button>
            )}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* 任务状态 */}
        {taskId && status && (
          <div className="mt-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-2">
              {status !== "completed" && status !== "failed" && (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {STATUS_TEXT[status]}
              </span>
              {status === "in_progress" && (
                <span className="text-sm text-zinc-400">{progress}%</span>
              )}
            </div>
            {/* 进度条 */}
            {status === "in_progress" && (
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {/* 任务 ID */}
            <p className="mt-2 text-xs text-zinc-400 font-mono">
              Task ID: {taskId}
            </p>
          </div>
        )}

        {/* 视频预览 */}
        {taskId && status === "completed" && (
          <div className="mt-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              生成结果
            </h2>
            <VideoPreview taskId={taskId} />
          </div>
        )}
      </div>
    </div>
  );
}
