import { Delete02Icon, StarIcon } from '@hugeicons/core-free-icons';
import { ActionForm, ConfirmAction, Submit } from '@/components/client';
import { Icon } from '@/components/ui';
import { deleteProduct, setFeatured } from '@/actions/shop';

/** Ürün başlığındaki işlemler: yıldızla + sil */
export function ProductActions({ id, name, featured }: { id: string; name: string; featured: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {featured ? null : (
        <ActionForm action={setFeatured}>
          <input type="hidden" name="id" value={id} />
          <Submit className="btn btn-secondary btn-sm" pending="…"><Icon icon={StarIcon} size={17} />Yıldız ürün yap</Submit>
        </ActionForm>
      )}
      <ConfirmAction
        action={deleteProduct} fields={{ id }} title={`${name} silinsin mi?`}
        message={featured ? 'Yıldız ürün silinemez. Önce başka bir ürünü yıldızla.' : 'Ürün ve görselleri kalıcı olarak silinir. Uygulamadan da kalkar.'}
        confirmLabel="Sil" redirectTo="/magaza"
        trigger={{ label: `${name} sil`, icon: Delete02Icon, iconOnly: true, className: 'btn btn-quiet btn-sm btn-icon danger-hover' }}
      />
    </div>
  );
}
