import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Модальное окно подтверждения на нативном <dialog>: фокус и Esc браузер обрабатывает сам. */
export default function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onClose }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="confirm-title" onClose={onClose}>
      <h2 id="confirm-title" className="dialog__title">{title}</h2>
      {children && <div className="dialog__body">{children}</div>}
      <div className="dialog__actions">
        <button className="button" type="button" onClick={onClose}>Отмена</button>
        <button className="button button--danger" type="button" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
