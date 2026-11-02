import Icon from './Icon';

/** Значок «перевірено» з підписом для підказки й читалки екрана — сама іконка aria-hidden. */
export default function VerifiedBadge({ label, size = 20 }: { label: string; size?: number }) {
  return (
    <span className="vbadge" role="img" aria-label={label} title={label}>
      <Icon name="verified" size={size} className="ico ico--ok" />
    </span>
  );
}
