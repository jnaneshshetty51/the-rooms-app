"use client";

import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { cn } from "../lib/utils";
import { X, RotateCcw, Check } from "lucide-react";

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onClear?: () => void;
  className?: string;
  disabled?: boolean;
}

export function SignaturePad({ onSave, onClear, className, disabled }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Resize canvas correctly when container size changes
  useEffect(() => {
    const handleResize = () => {
      if (sigCanvas.current) {
        // we can't easily resize react-signature-canvas without clearing it,
        // but we can ensure it mounts correctly
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
      if (onClear) onClear();
    }
  };

  const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
      onSave(dataUrl);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className={cn(
        "relative rounded-lg border-2 bg-white overflow-hidden",
        disabled ? "opacity-50 pointer-events-none border-gray-200" : "border-gray-300"
      )}>
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            className: "w-full h-48 cursor-crosshair touch-none",
            style: { width: '100%', height: '192px' }
          }}
          onBegin={() => setIsEmpty(false)}
        />
        
        {/* Placeholder text if empty */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-sm font-medium">Sign here</span>
          </div>
        )}
      </div>

      {!disabled && (
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Clear
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            <Check className="w-4 h-4" /> Save Signature
          </button>
        </div>
      )}
    </div>
  );
}
