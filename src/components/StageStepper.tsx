"use client";

import { STAGES, Stage } from "@/lib/types";
import { Check, Lock } from "lucide-react";

interface StageStepperProps {
  currentStage: Stage;
  onStageChange?: (stage: Stage) => void;
  readonly?: boolean;
}

export default function StageStepper({ currentStage, onStageChange, readonly }: StageStepperProps) {
  const currentIdx = STAGES.indexOf(currentStage);

  return (
    <div className="flex items-center justify-between w-full relative py-4">
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0" />

      {STAGES.map((stage, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isNext = idx === currentIdx + 1;
        const isClickable = !readonly && !isCurrent && (isNext || isCompleted);
        const isLocked = !readonly && !isCurrent && !isNext && !isCompleted;

        return (
          <div key={stage} className="relative z-10 flex flex-col items-center group">
            <button
              onClick={() => isClickable && onStageChange?.(stage)}
              disabled={!isClickable}
              title={isLocked ? "Complete prior stages first" : undefined}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition border-2 ${
                isCompleted
                  ? "bg-emerald-500 border-white text-white cursor-pointer hover:bg-emerald-600"
                  : isCurrent
                    ? "bg-blue-600 border-white text-white ring-2 ring-blue-200 cursor-default"
                    : isNext
                      ? "bg-white border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-500 cursor-pointer"
                      : "bg-slate-100 border-white text-slate-400 cursor-not-allowed"
              }`}
            >
              {isCompleted
                ? <Check className="w-4 h-4" />
                : isLocked
                  ? <Lock className="w-3 h-3" />
                  : <span className="text-xs font-semibold font-mono">{idx + 1}</span>
              }
            </button>
            <div className="absolute top-11 flex flex-col items-center">
              <span className={`text-xs font-medium whitespace-nowrap ${
                isCompleted ? "text-emerald-600" : isCurrent ? "text-blue-600" : isNext ? "text-slate-600" : "text-slate-400"
              }`}>
                {stage}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
