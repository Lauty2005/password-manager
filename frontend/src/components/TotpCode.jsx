import { useState, useEffect } from 'react';
import { FiCopy } from 'react-icons/fi';
import { generateTOTP, secondsRemaining, TOTP_PERIOD } from '../lib/totp';

export default function TotpCode({ secret }) {
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(TOTP_PERIOD);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const newCode = await generateTOTP(secret);
        if (!cancelled) {
          setCode(newCode);
          setInvalid(false);
        }
      } catch {
        if (!cancelled) setInvalid(true);
      }
      if (!cancelled) setRemaining(secondsRemaining());
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [secret]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Idem copyPassword: puede fallar en contextos no seguros, no es crítico.
    }
  };

  if (invalid) {
    return <span className="totp-error">Código 2FA inválido</span>;
  }

  return (
    <div className="totp-block">
      <code className="totp-code">{code.slice(0, 3)} {code.slice(3)}</code>
      <div className="totp-bar-track">
        <div
          className="totp-bar-fill"
          style={{
            width: `${(remaining / TOTP_PERIOD) * 100}%`,
            background: remaining <= 5 ? '#ef4444' : 'var(--accent)'
          }}
        />
      </div>
      <button type="button" onClick={copyCode} title="Copiar código">
        <FiCopy className="icon-inline" />
      </button>
    </div>
  );
}
