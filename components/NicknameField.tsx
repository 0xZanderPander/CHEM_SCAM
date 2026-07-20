"use client";

import { useState } from "react";
import { randomNickname } from "@/lib/names";

export function NicknameField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [custom, setCustom] = useState(false);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor="nickname" className="field-label">Anonymous nickname</label>
        <button
          type="button"
          className="text-xs font-bold text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-950"
          onClick={() => {
            setCustom(false);
            onChange(randomNickname());
          }}
        >
          Generate another
        </button>
      </div>
      <div className="flex gap-2">
        <input
          id="nickname"
          className="field-input flex-1"
          value={value}
          readOnly={!custom}
          onChange={(event) => onChange(event.target.value)}
          maxLength={50}
        />
        <button type="button" className="button-secondary shrink-0" onClick={() => setCustom((current) => !current)}>
          {custom ? "Use generated" : "Type my own"}
        </button>
      </div>
    </div>
  );
}

