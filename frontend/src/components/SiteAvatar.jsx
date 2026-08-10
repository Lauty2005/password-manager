import { getAvatarColor, getAvatarInitial } from '../lib/avatar';
import { findBrandIcon } from '../lib/brandIcons';

export default function SiteAvatar({ site, size = 36 }) {
  const brand = findBrandIcon(site);

  if (brand) {
    const { Icon, color } = brand;
    return (
      <div className="site-avatar site-avatar-brand" style={{ width: size, height: size }}>
        <Icon size={Math.round(size * 0.55)} color={color} />
      </div>
    );
  }

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
