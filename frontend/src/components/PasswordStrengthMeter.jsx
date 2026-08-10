import { estimatePasswordStrength } from '../lib/passwordStrength';

const LEVEL_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

export default function PasswordStrengthMeter({ password }) {
  if (!password) return null;

  const { score, label, percent } = estimatePasswordStrength(password);
  const color = LEVEL_COLORS[score];

  return (
    <div className="strength-meter">
      <div className="strength-bar-track">
        <div className="strength-bar-fill" style={{ width: `${percent}%`, background: color }} />
      </div>
      <div className="strength-label" style={{ color }}>{label}</div>
    </div>
  );
}
