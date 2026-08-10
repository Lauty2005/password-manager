import { getAvatarColor, getAvatarInitial } from '../lib/avatar';

export default function SiteAvatar({ site, size = 36 }) {
  const color = getAvatarColor(site);
  const initial = getAvatarInitial(site);

  return (
    <div
      className="site-avatar"
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.45) }}
    >
      {initial}
    </div>
  );
}
