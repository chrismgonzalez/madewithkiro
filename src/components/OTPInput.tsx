import { useRef, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { Input } from "@/components/ui/input";

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export default function OTPInput({
  value,
  onChange,
  disabled = false,
  error = false,
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  useEffect(() => {
    // Auto-focus first input on mount
    if (inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  const handleChange = (index: number, digit: string) => {
    // Only allow numeric input
    if (digit && !/^\d$/.test(digit)) {
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = digit;
    const newValue = newDigits.join("").trim();
    onChange(newValue);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace") {
      if (!digits[index] || digits[index] === " ") {
        // If current input is empty, move to previous input
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
      } else {
        // Clear current input
        const newDigits = [...digits];
        newDigits[index] = " ";
        const newValue = newDigits.join("").trim();
        onChange(newValue);
      }
    }

    // Handle arrow keys
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain");

    // Extract only digits from pasted content
    const pastedDigits = pastedData.replace(/\D/g, "").slice(0, 6);

    if (pastedDigits.length > 0) {
      onChange(pastedDigits);

      // Focus the next empty input or the last input
      const nextIndex = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {digits.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digit === " " ? "" : digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`
            w-12 h-12 sm:w-14 sm:h-14 text-center text-xl sm:text-2xl font-semibold
            min-h-[44px] min-w-[44px]
            ${error ? "border-destructive focus-visible:ring-destructive" : ""}
          `}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
