"use client";

import { STAGES, Stage } from "@/lib/types";
import { Check, Circle } from "lucide-react";

interface StageStepperProps {
  currentStage: Stage;
  onStageChange?: (stage: Stage) => void;
  readonly?: boolean;
}

export default function StageStepper({ currentStage, onStageChange, readonly }: StageStepperProps) {
  const currentIdx = STAGES.indexOf(currentStage);

  return (
    <div className="flex items-center justify-between w-full relative">
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
      
      {STAGES.map((stage, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isPending = idx > currentIdx;

        return (
          <div key={stage} className="relative z-10 flex flex-col items-center group">
            <button
              onClick={() => !readonly && onStageChange?.(stage)}
              disabled={readonly}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-4 ${
                isCompleted 
                  ? "bg-emerald-500 border-white text-white shadow-emerald-100 shadow-lg" 
                  : isCurrent 
                    ? "bg-blue-600 border-blue-50 text-white shadow-blue-100 shadow-lg ring-4 ring-blue-50"
                    : "bg-white border-gray-100 text-gray-300 shadow-sm"
              } ${!readonly && !isCurrent ? "hover:scale-110 active:scale-95" : ""}`}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">{idx + 1}</span>}
            </button>
            <div className="absolute top-12 flex flex-col items-center">
              <span className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors duration-300 ${
                isCompleted ? "text-emerald-600" : isCurrent ? "text-blue-700" : "text-gray-400"
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
