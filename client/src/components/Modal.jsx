import { useEffect } from 'react';

// Reusable Bootstrap-styled modal controlled by React state
export default function Modal({ show, title, onClose, children, footer, size = 'lg' }) {
  useEffect(() => {
    if (!show) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [show, onClose]);

  if (!show) return null;
  return (
    <div className="modal-backdrop-custom" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-dialog modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-content border-0 rounded-4 overflow-hidden">
          <div className="modal-header">
            <h5 className="modal-title fw-bold">{title}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body p-0">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
