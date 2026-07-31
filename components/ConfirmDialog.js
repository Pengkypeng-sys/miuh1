'use client';
import { Icon } from '@/lib/icons';

export function ConfirmDialog({ confirmDialog, setConfirmDialog }) {
  if (!confirmDialog) return null;
  return (
    <div className="confirm-backdrop" onClick={() => setConfirmDialog(null)}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon"><Icon name="trash" size={22} /></div>
        <h3>{confirmDialog.title}</h3>
        <p>{confirmDialog.message}</p>
        <div className="confirm-actions">
          <button className="secondary" onClick={() => setConfirmDialog(null)}>Batal</button>
          <button className="danger" onClick={confirmDialog.onConfirm}>Ya, Hapus</button>
        </div>
      </div>
    </div>
  );
}
