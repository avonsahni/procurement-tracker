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
    // Extra bottom padding to give the labels room below the connector line
    <div className="flex items-start justify-between w-full relative pt-3 pb-10">
      {/* Connector line — sits behind the circles */}
      <div className="absolute top-[30px] left-0 w-full h-0.5 bg-slate-200 z-0" />

      {STAGES.map((stage, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent   = idx === currentIdx;
        const isNext      = idx === currentIdx + 1;
        const isClickable = !readonly && !isCurrent && (isNext || isCompleted);
        const isLocked    = !readonly && !isCurrent && !isNext && !isCompleted;

        // Wrap the entire column in a button so both the circle AND label are clickable
        const Tag = isClickable ? "button" : "div";

        return (
          <Tag
            key={stage}
            // @ts-ignore — onClick is only set on button
            onClick={isClickable ? () => onStageChange?.(stage) : undefined}
            title={isLocked ? "Complete prior stages first" : isCurrent ? "Current stage" : undefined}
            className={`relative z-10 flex flex-col items-center gap-2 select-none
              ${isClickable ? "cursor-pointer group" : "cursor-default"}
            `}
          >
            {/* Circle — larger (w-11 h-11 = 44px) for easier tapping */}
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all
                ${isCompleted
                  ? "bg-emerald-500 border-white text-white group-hover:bg-emerald-600 group-hover:scale-110"
                  : isCurrent
                    ? "bg-blue-600 border-white text-white ring-2 ring-blue-200"
                    : isNext
                      ? "bg-white border-blue-400 text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-600 group-hover:scale-110"
                      : "bg-slate-100 border-white text-slate-400"
                }
              `}
            >
              {isCompleted
                ? <Check className="w-4 h-4" />
                : isLocked
                  ? <Lock className="w-3.5 h-3.5" />
                  : <span className="text-xs font-bold font-mono">{idx + 1}</span>
              }
            </div>

            {/* Label — inline now, part of the same button */}
            <span className={`text-xs font-medium whitespace-nowrap leading-tight text-center
              ${isCompleted
                ? "text-emerald-600"
                : isCurrent
                  ? "text-blue-600 font-semibold"
                  : isNext
                    ? "text-slate-700"
                    : "text-slate-400"
              }
            `}>
              {stage}
            </span>
          </Tag>
        );
      })}
    </div>
  );
}
