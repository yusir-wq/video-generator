"use client";

import { useState, useRef, useCallback } from "react";

interface ImageUploaderProps {
  mode: "fl2va" | "ref2va";
  images: string[];
  onChange: (images: string[]) => void;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10 MiB

export default function ImageUploader({ mode, images, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const maxImages = mode === "fl2va" ? 2 : 9;
  const labels =
    mode === "fl2va"
      ? ["首帧（可选）", "尾帧（可选）"]
      : Array.from({ length: 9 }, (_, i) => `参考图 ${i + 1}`);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError("");

      const remaining = maxImages - images.length;
      const toAdd: File[] = Array.from(files).slice(0, remaining);

      Promise.all(
        toAdd.map((file) => {
          if (file.size > MAX_SIZE) {
            throw new Error(`${file.name} 超过 10MB 限制`);
          }
          return fileToDataUrl(file);
        })
      )
        .then((dataUrls) => {
          onChange([...images, ...dataUrls]);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "图片处理失败");
        });
    },
    [images, maxImages, onChange]
  );

  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    onChange(next);
    setError("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {/* 已上传的图片预览 */}
        {images.map((img, i) => (
          <div
            key={i}
            className="relative group w-24 h-24 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt={labels[i] || `图片 ${i + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 text-center">
              {labels[i] || `图片 ${i + 1}`}
            </div>
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}

        {/* 上传按钮 */}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-24 h-24 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
          >
            <span className="text-2xl">+</span>
            <span className="text-[10px]">上传图片</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={mode === "ref2va"}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <p className="text-xs text-zinc-400">
        {mode === "fl2va"
          ? "上传首帧和/或尾帧图片（可选），不上传则为纯文生视频。支持 JPEG / PNG / WebP，单张 ≤ 10MB"
          : "上传 1~9 张参考图，在 Prompt 中用 <Picture 1>、<Picture 2> 引用。支持 JPEG / PNG / WebP，单张 ≤ 10MB"}
      </p>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
