import { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/** Input visible grande — autofill iOS/Android fiable */
export function OtpInput({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 150);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <input
      ref={inputRef}
      className="input otp-input"
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      enterKeyHint="done"
      pattern="[0-9]*"
      maxLength={6}
      value={value}
      disabled={disabled}
      aria-label="Código de verificación de 6 dígitos"
      placeholder="000000"
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      onPaste={(e) => {
        e.preventDefault();
        onChange(e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6));
      }}
    />
  );
}
