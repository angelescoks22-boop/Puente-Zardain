import { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/** Un solo input nativo (autofill iOS/Android) + cajas visuales — mismo comportamiento móvil y PC */
export function OtpInput({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(t);
  }, []);

  const handleChange = (raw: string) => {
    onChange(raw.replace(/\D/g, '').slice(0, 6));
  };

  return (
    <div
      className="otp-input-wrap"
      onClick={() => !disabled && inputRef.current?.focus()}
      role="group"
      aria-label="Código de 6 dígitos"
    >
      <input
        ref={inputRef}
        className="otp-input-native"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        enterKeyHint="done"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        disabled={disabled}
        aria-label="Código de verificación"
        onChange={(e) => handleChange(e.target.value)}
        onPaste={(e) => {
          e.preventDefault();
          handleChange(e.clipboardData.getData('text'));
        }}
      />
      <div className="otp-input-grid otp-input-grid--visual" aria-hidden>
        {digits.map((digit, i) => (
          <div
            key={i}
            className={`otp-digit-display ${value.length === i ? 'otp-digit-display--active' : ''} ${digit ? 'otp-digit-display--filled' : ''}`}
          >
            {digit}
          </div>
        ))}
      </div>
    </div>
  );
}
