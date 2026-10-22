import { SkPanel } from '@/components/Skeleton';

/** Кабінет забудовника: та сама вузька колонка, що й у сторінки. */
export default function DeveloperLoading() {
  return (
    <div className="wrap" style={{ padding: '32px 32px 60px', maxWidth: 900 }}>
      <SkPanel n={3} />
    </div>
  );
}
