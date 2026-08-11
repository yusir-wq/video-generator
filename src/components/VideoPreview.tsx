"use client";

import { getDownloadUrl } from "@/lib/api";

interface VideoPreviewProps {
  taskId: string;
}

export default function VideoPreview({ taskId }: VideoPreviewProps) {
  const downloadUrl = getDownloadUrl(taskId);

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden bg-black">
        <video
          src={downloadUrl}
          controls
          autoPlay
          className="w-full max-h-[480px] object-contain"
        />
      </div>
      <a
        href={downloadUrl}
        download={`video_${taskId}.mp4`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
          />
        </svg>
        下载视频
      </a>
    </div>
  );
}
