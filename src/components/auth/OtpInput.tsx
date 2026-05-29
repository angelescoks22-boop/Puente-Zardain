import { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function OtpInput({ value, onChange, disabled }: Props) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const updateAt = (index: number, char: string) => {
    const next = value.split('');
    next[index] = char;
    onChange(next.join('').replace(/\s/g, '').slice(0, 6));
  };

  const handleChange = (index: number, raw: string) => {
    const char = raw.replace(/\D/g, '').slice(-1);
    if (!char) {
      updateAt(index, '');
      return;
    }
    updateAt(index, char);
    if (index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index]?.trim() && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) onChange(pasted);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="otp-input-grid" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          className="otp-digit"
          value={digit.trim()}
          disabled={disabled}
          aria-label={`Dígito ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}
