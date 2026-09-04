'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/lib/icons';
import { rp, formatRibuan, ITEM_ICONS, ITEM_KATEGORI } from '@/lib/format';

function ItemRow({ i, idxFlat, itemList, editItemNama, setEditItemNama, editItemTargetVal, setEditItemTargetVal, simpanTargetItem, ubahItemMeta, pindahUrutanItem, loadingUrutan, loadingItem, hapusItem }) {
  return (
    <div className="item-manage-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
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
}

// Item varian (PPDB Gel.x, BUKU x) dikelompokin jadi 1 dropdown biar gak numpuk flat — daripada 9 baris
// nampang semua, tinggal 2 baris header yang bisa dibuka.
function VariantGroup({ label, icon, items, itemList, rowProps }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 2 }}>
      <div className="item-manage-row varian-group-header" onClick={() => setOpen(v => !v)}>
        <span className="ic-badge" style={{ width: 26, height: 26 }}><Icon name={icon} size={13} /></span>
        <span className="nm" style={{ flex: 1 }}>{label} <span className="hint-text" style={{ display: 'inline' }}>({items.length} varian)</span></span>
        <span style={{ display: 'flex', color: 'var(--muted)', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <Icon name="chevronDown" size={14} />
        </span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.16 }} style={{ overflow: 'hidden' }}>
            <div className="varian-group-body">
              {items.map(i => (
                <ItemRow key={i.kolom} i={i} idxFlat={itemList.findIndex(x => x.nama === i.nama)} itemList={itemList} {...rowProps} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Target SPP beda per kelas (bukan 1 angka flat kayak item lain) dan bisa ganti tiap tahun ajaran —
// disimpen di tabel spp_target sendiri, diedit di sini biar gak ilang kalau kode di-deploy ulang.
function SppTargetPanel({ kelasList }) {
  const [target, setTarget] = useState({});
  const [loading, setLoading] = useState(true);
  const [editKelas, setEditKelas] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('/api/spp-target').then(r => r.json()).then(data => { setTarget(data && !data.pesan ? data : {}); setLoading(false); });
  }, []);

  async function simpan(kelas) {
    const res = await fetch('/api/spp-target', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kelas, target: onlyDigitsSpp(editVal) }),
    }).then(r => r.json());
    setStatus(res);
    if (res.sukses) setTarget(prev => ({ ...prev, [kelas]: Number(onlyDigitsSpp(editVal)) || 0 }));
    setEditKelas(null);
  }
  function onlyDigitsSpp(v) { return String(v).replace(/\D/g, ''); }

  return (
    <div className="panel" style={{ gridColumn: '1 / -1' }}>
      <div className="panel-title"><span className="ic-badge"><Icon name="wallet" size={14} /></span> Target SPP per Kelas</div>
      <div className="panel-desc">Beda dari item lain — SPP bisa beda harga tiap kelas, dan bisa ganti tiap tahun ajaran</div>
      {loading && <div className="hint-text">Memuat...</div>}
      {!loading && (
        <div className="item-manage-list">
          {kelasList.map(k => (
            <div key={k} className="item-manage-row">
              <span className="nm" style={{ flex: 1 }}>{k}</span>
              {editKelas === k ? (
                <>
                  <input type="text" inputMode="numeric" value={editVal} onChange={e => setEditVal(formatRibuan(e.target.value))} style={{ width: 130 }} />
                  <button className="btn-icon" style={{ width: 'auto', padding: '5px 10px' }} onClick={() => simpan(k)}><Icon name="check" size={12} /></button>
                  <button className="secondary btn-icon" style={{ width: 'auto', padding: '5px 10px' }} onClick={() => setEditKelas(null)}><Icon name="minus" size={12} /></button>
                </>
              ) : (
                <>
                  <span className="target">{rp(target[k] || 0)}</span>
                  <button className="secondary btn-icon" style={{ width: 'auto', padding: '5px 10px' }} onClick={() => { setEditKelas(k); setEditVal(formatRibuan(String(target[k] || ''))); }}>
                    <Icon name="edit" size={12} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {status && <div className={`status ${status.sukses ? 'sukses' : 'gagal'}`}>{status.pesan}</div>}
    </div>
  );
}

export function ItemTab({ p }) {
  const {
    kelasList,
    namaItemBaru, setNamaItemBaru, targetItemBaru, setTargetItemBaru,
    iconItemBaru, setIconItemBaru, kategoriItemBaru, setKategoriItemBaru,
    kelasItemBaru, setKelasItemBaru, tambahItem, loadingItem, statusItem,
    itemList, editItemNama, setEditItemNama, editItemTargetVal, setEditItemTargetVal, simpanTargetItem,
    ubahItemMeta, pindahUrutanItem, loadingUrutan, hapusItem,
  } = p;

  const rowProps = { editItemNama, setEditItemNama, editItemTargetVal, setEditItemTargetVal, simpanTargetItem, ubahItemMeta, pindahUrutanItem, loadingUrutan, loadingItem, hapusItem };

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

      <SppTargetPanel kelasList={kelasList} />

      <div className="panel" style={{ gridColumn: '1 / -1' }}>
        <div className="panel-title"><span className="ic-badge"><Icon name="list" size={14} /></span> Jenis Pembayaran Aktif ({itemList.length})</div>
        <div className="panel-desc">Atur icon, kategori, urutan tampil, atau hapus jenis pembayaran</div>
        {ITEM_KATEGORI.filter(kat => itemList.some(i => i.nama !== 'SPP' && (i.kategori || 'Lainnya') === kat)).map(kat => {
          // SPP gak ditampilin di sini — targetnya diatur di panel "Target SPP per Kelas" di atas, bukan di sini.
          const itemsInKat = itemList.filter(i => i.nama !== 'SPP' && (i.kategori || 'Lainnya') === kat);
          const groupPpdb = itemsInKat.filter(i => i.nama.startsWith('PPDB'));
          const groupBuku = itemsInKat.filter(i => /^BUKU \d/.test(i.nama));
          const grouped = new Set([...groupPpdb, ...groupBuku]);
          const normalItems = itemsInKat.filter(i => !grouped.has(i));

          return (
            <div key={kat} style={{ marginBottom: 14 }}>
              <div className="kategori-label">{kat}</div>
              <div className="item-manage-list">
                {normalItems.map(i => (
                  <ItemRow key={i.kolom} i={i} idxFlat={itemList.findIndex(x => x.nama === i.nama)} itemList={itemList} {...rowProps} />
                ))}
                {groupPpdb.length > 0 && <VariantGroup label="PPDB" icon="layers" items={groupPpdb} itemList={itemList} rowProps={rowProps} />}
                {groupBuku.length > 0 && <VariantGroup label="BUKU" icon="book" items={groupBuku} itemList={itemList} rowProps={rowProps} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
