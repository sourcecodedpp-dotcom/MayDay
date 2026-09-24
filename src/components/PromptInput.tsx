import React, { useState, useRef, useEffect } from "react";

export interface PromptInputProps {
  onSubmit?: (
    value: string,
    meta: { effort: string }
  ) => void;
  placeholder?: string;
  className?: string;
  efforts?: string[];
}

function MorphingText({ text }: { text: string }) {
  const [width, setWidth] = useState<number | "auto">("auto");
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (spanRef.current) {
      setWidth(spanRef.current.offsetWidth);
    }
  }, [text]);

  return (
    <span
      className="relative inline-flex items-center justify-center overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
      style={{ width }}
    >
      <span ref={spanRef} className="invisible whitespace-nowrap px-0.5">
        {text}
      </span>
      <span
        key={text}
        className="absolute inset-0 flex items-center justify-center whitespace-nowrap animate-in fade-in zoom-in-95 duration-200"
      >
        {text}
      </span>
    </span>
  );
}

function DynamicBarsIcon({ level }: { level: string }) {
  const isMax = level === "Max Mode";
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="shrink-0">
      <rect
        x="1.5"
        y={isMax ? "7" : "8"}
        width="2.5"
        height={isMax ? "5.5" : "4.5"}
        rx="1"
        fill="currentColor"
        className="transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
        opacity={1}
      />
      <rect
        x="5.75"
        y={isMax ? "4" : "5"}
        width="2.5"
        height={isMax ? "8.5" : "7.5"}
        rx="1"
        fill="currentColor"
        className="transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
        opacity={1}
      />
      <rect
        x="10"
        y={isMax ? "2" : "3"}
        width="2.5"
        height={isMax ? "10.5" : "9.5"}
        rx="1"
        fill="currentColor"
        className="transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
        opacity={isMax ? 1 : 0.25}
      />
    </svg>
  );
}

export function PromptInput({
  onSubmit,
  placeholder = "Ask anything",
  className = "",
  efforts = ["Efficiency", "Max Mode"],
}: PromptInputProps) {
  const [value, setValue] = useState("");
  const [effortIndex, setEffortIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasValue = value.trim() !== "";

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.max(68, Math.min(el.scrollHeight, 240));
    el.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  };

  const handleSubmit = () => {
    if (!hasValue) return;
    onSubmit?.(value, {
      effort: efforts[effortIndex],
    });
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "68px";
    }
  };

  const cycleEffort = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEffortIndex((prev) => (prev + 1) % efforts.length);
  };

  return (
    <div className={`relative w-full text-zinc-200 ${className}`}>
      <div className="relative w-full rounded-[24px] border border-white/[0.06] bg-[#131316] p-4 shadow-xl transition-all duration-300 focus-within:border-white/[0.12] flex flex-col justify-between">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          aria-label="Prompt"
          autoFocus
          rows={2}
          style={{ minHeight: "68px", maxHeight: "240px" }}
          className="relative z-10 w-full resize-none bg-transparent px-1 pt-1 pb-2 text-[15px] leading-[24px] text-[#f4f4f5] outline-none placeholder:text-[#63636e] placeholder:font-normal cursor-text selection:bg-[#27272a] overflow-y-auto prompt-scrollbar"
        />

        {/* Bottom Toolbar Row */}
        <div className="relative z-20 flex items-center justify-between pt-3 mt-1">
          {/* Mode toggle */}
          <button
            type="button"
            onClick={cycleEffort}
            className="group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[#9d9da6] transition-all duration-200 hover:bg-[#1f1f25] hover:text-[#f4f4f5] active:scale-95 outline-none cursor-pointer bg-[#18181c] border border-white/[0.06]"
          >
            <DynamicBarsIcon level={efforts[effortIndex]} />
            <span className="text-[12px] font-medium tracking-tight select-none">
              <MorphingText text={efforts[effortIndex]} />
            </span>
          </button>

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            aria-label="Send"
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] outline-none cursor-pointer active:scale-90 ${
              hasValue 
                ? "bg-[#f4f4f5] text-[#09090b] shadow-[0_2px_12px_rgba(255,255,255,0.25)] hover:bg-[#ffffff] hover:scale-105" 
                : "bg-[#18181c] text-[#71717a] hover:bg-[#222228] hover:text-[#f4f4f5] border border-white/[0.06]"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 12V2M7 2L2.5 6.5M7 2L11.5 6.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
export default PromptInput;
