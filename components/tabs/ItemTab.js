'use client';
import { Icon } from '@/lib/icons';
import { rp, formatRibuan, ITEM_ICONS, ITEM_KATEGORI } from '@/lib/format';

export function ItemTab({ p }) {
  const {
    kelasList,
    namaItemBaru, setNamaItemBaru, targetItemBaru, setTargetItemBaru,
    iconItemBaru, setIconItemBaru, kategoriItemBaru, setKategoriItemBaru,
    kelasItemBaru, setKelasItemBaru, tambahItem, loadingItem, statusItem,
    itemList, editItemNama, setEditItemNama, editItemTargetVal, setEditItemTargetVal, simpanTargetItem,
    ubahItemMeta, pindahUrutanItem, loadingUrutan, hapusItem,
  } = p;

  return (
    <div className="bayar-grid">
      <div className="panel" style={{ gridColumn: '1 / -1' }}>
        <div className="panel-title"><span className="ic-badge"><Icon name="tag" size={14} /></span> Tambah Jenis Pembayaran Baru</div>
        <div className="panel-desc">Otomatis nambah kolom baru di semua sheet kelas — misal "SERAGAM" atau "STUDY TOUR 2"</div>

        <div className="form-grid">
          <div>
            <label>Nama Item</label>
            <input value={namaItemBaru} onChange={e => setNamaItemBaru(e.target.value)} placeholder="contoh: SERAGAM" />
          </div>
          <div>
            <label>Target Harga</label>
            <input type="text" inputMode="numeric" value={targetItemBaru} onChange={e => setTargetItemBaru(formatRibuan(e.target.value))} placeholder="contoh: 200.000" />
          </div>
          <div>
            <label>Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ITEM_ICONS.map(ic => (
                <button
                  key={ic} type="button"
                  onClick={() => setIconItemBaru(ic)}
                  className={iconItemBaru === ic ? 'icon-pick selected' : 'icon-pick'}
                  title={ic}
                >
                  <Icon name={ic} size={16} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label>Kategori</label>
            <select value={kategoriItemBaru} onChange={e => setKategoriItemBaru(e.target.value)}>
              {ITEM_KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Kelas (kosongkan = semua kelas)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 6 }}>
            {kelasList.map(k => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 400, whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={kelasItemBaru.includes(k)}
                  onChange={e => setKelasItemBaru(prev => e.target.checked ? [...prev, k] : prev.filter(x => x !== k))}
                />
                {k}
              </label>
            ))}
          </div>
        </div>
        <button disabled={loadingItem} onClick={tambahItem} className="btn-icon" style={{ maxWidth: 260 }}>
          {loadingItem ? <span className="spinner" /> : <Icon name="plus" size={15} />} Tambah Jenis Pembayaran
        </button>
        {statusItem && <div className={`status ${statusItem.sukses ? 'sukses' : 'gagal'}`}>{statusItem.pesan}</div>}
      </div>

      <div className="panel" style={{ gridColumn: '1 / -1' }}>
        <div className="panel-title"><span className="ic-badge"><Icon name="list" size={14} /></span> Jenis Pembayaran Aktif ({itemList.length})</div>
        <div className="panel-desc">Atur icon, kategori, urutan tampil, atau hapus jenis pembayaran</div>
        {ITEM_KATEGORI.filter(kat => itemList.some(i => (i.kategori || 'Lainnya') === kat)).map(kat => (
          <div key={kat} style={{ marginBottom: 14 }}>
            <div className="kategori-label">{kat}</div>
            <div className="item-manage-list">
              {itemList.filter(i => (i.kategori || 'Lainnya') === kat).map(i => {
                const idxFlat = itemList.findIndex(x => x.nama === i.nama);
                return (
                  <div key={i.kolom} className="item-manage-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8 }}>
                      <div className="reorder-btns">
                        <button type="button" className="reorder-btn" disabled={loadingUrutan || idxFlat === 0} onClick={() => pindahUrutanItem(i.nama, -1)} title="Naikkan urutan">
                          <Icon name="up" size={11} />
                        </button>
                        <button type="button" className="reorder-btn" disabled={loadingUrutan || idxFlat === itemList.length - 1} onClick={() => pindahUrutanItem(i.nama, 1)} title="Turunkan urutan">
                          <Icon name="down" size={11} />
                        </button>
                      </div>
                      <span className="ic-badge" style={{ width: 26, height: 26 }}><Icon name={i.icon || 'receipt'} size={13} /></span>
                      <span className="nm" style={{ flex: 1 }}>{i.nama}</span>
                      {editItemNama === i.nama ? (
                        <>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editItemTargetVal}
                            onChange={e => setEditItemTargetVal(formatRibuan(e.target.value))}
                            placeholder="Target harga"
                            style={{ width: 130 }}
                          />
                          <button className="btn-icon" style={{ width: 'auto', padding: '5px 10px' }} disabled={loadingItem} onClick={() => simpanTargetItem(i.nama)}>
                            <Icon name="check" size={12} />
                          </button>
                          <button className="secondary btn-icon" style={{ width: 'auto', padding: '5px 10px' }} disabled={loadingItem} onClick={() => setEditItemNama(null)}>
                            <Icon name="minus" size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <select
                            value={i.kategori || 'Lainnya'}
                            style={{ width: 'auto', margin: 0, fontSize: 12.5, padding: '4px 6px' }}
                            onChange={e => ubahItemMeta(i.nama, { kategori: e.target.value })}
                          >
                            {ITEM_KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                          <span className="target">{i.target ? rp(i.target) : 'tanpa target'}</span>
                          <button className="secondary btn-icon" style={{ width: 'auto', padding: '5px 10px' }} disabled={loadingItem} onClick={() => { setEditItemNama(i.nama); setEditItemTargetVal(i.target ? formatRibuan(String(i.target)) : ''); }}>
                            <Icon name="edit" size={12} />
                          </button>
                          <button className="ghost-danger btn-icon" style={{ width: 'auto', padding: '5px 10px' }} disabled={loadingItem} onClick={() => hapusItem(i.nama)}>
                            <Icon name="trash" size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
