import React from "react";
import { PromptInput } from "./components/PromptInput";

export const App: React.FC = () => {
  const handlePromptSubmit = (value: string, meta: { effort: string }) => {
    console.log("Submitted:", value, meta);
  };

  return (
    <div className="h-screen w-screen bg-[#0b0b0d] text-[#e4e4e7] flex items-center justify-center p-4 overflow-hidden selection:bg-[#27272a] selection:text-white">
      <div className="w-full max-w-[680px]">
        <PromptInput
          placeholder="Ask anything"
          onSubmit={handlePromptSubmit}
        />
      </div>
    </div>
  );
};

export default App;
