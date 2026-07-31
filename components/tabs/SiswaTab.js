'use client';
import { Icon } from '@/lib/icons';
import { rp, formatRibuan, initials, ITEM_ICONS, ITEM_KATEGORI } from '@/lib/format';

export function SiswaTab({ p }) {
  const {
    kelasSiswa, setKelasSiswa, kelasList, namaBaru, setNamaBaru, tambahSiswa, loadingSiswa,
    siswaHapus, setSiswaHapus, siswaHapusList, hapusSiswa, statusSiswa,
    cariSiswaKelola, setCariSiswaKelola,
    namaItemBaru, setNamaItemBaru, targetItemBaru, setTargetItemBaru,
    iconItemBaru, setIconItemBaru, kategoriItemBaru, setKategoriItemBaru,
    kelasItemBaru, setKelasItemBaru, tambahItem, loadingItem, statusItem,
    itemList, editItemNama, setEditItemNama, editItemTargetVal, setEditItemTargetVal, simpanTargetItem,
    ubahItemMeta, pindahUrutanItem, loadingUrutan, hapusItem,
    role, kenaikanKelas, loadingKenaikan, statusKenaikan,
  } = p;

  return (
    <div className="bayar-grid">
      <div className="panel">
        <div className="panel-title"><span className="ic-badge"><Icon name="students" size={14} /></span> Kelola Siswa</div>
        <div className="panel-desc">Tambah atau hapus siswa dari kelas tertentu</div>

        <label>Pilih Kelas</label>
        <select value={kelasSiswa} onChange={e => setKelasSiswa(e.target.value)}>
          {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        <label>Tambah Nama Siswa Baru</label>
        <input value={namaBaru} onChange={e => setNamaBaru(e.target.value)} placeholder="Nama siswa baru" onKeyDown={e => e.key === 'Enter' && tambahSiswa()} />
        <button disabled={loadingSiswa} onClick={tambahSiswa} className="btn-icon">
          {loadingSiswa ? <span className="spinner" /> : <Icon name="plus" size={15} />} Tambah Siswa
        </button>

        <hr className="field-divider" />

        <label>Siswa Dipilih untuk Dihapus</label>
        <select value={siswaHapus} onChange={e => setSiswaHapus(e.target.value)}>
          {siswaHapusList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button disabled={loadingSiswa} className="ghost-danger btn-icon" style={{ width: '100%' }} onClick={hapusSiswa}>
          {loadingSiswa ? <span className="spinner" /> : <Icon name="trash" size={14} />} Hapus Siswa Ini
        </button>

        {statusSiswa && <div className={`status ${statusSiswa.sukses ? 'sukses' : 'gagal'}`}>{statusSiswa.pesan}</div>}
      </div>

      <div className="panel">
        <div className="panel-title"><span className="ic-badge"><Icon name="list" size={14} /></span> Daftar Siswa — {kelasSiswa}</div>
        <div className="panel-desc">{siswaHapusList.length} siswa terdaftar — klik untuk pilih target hapus</div>

        <div className="search-box" style={{ marginBottom: 12 }}>
          <span className="search-ic"><Icon name="search" size={15} /></span>
          <input value={cariSiswaKelola} onChange={e => setCariSiswaKelola(e.target.value)} placeholder="cari nama siswa..." />
        </div>

        <div className="siswa-list">
          {siswaHapusList.length === 0 && <div className="empty-state">Belum ada siswa di kelas ini</div>}
          {siswaHapusList.filter(s => s.toLowerCase().includes(cariSiswaKelola.toLowerCase())).map(s => (
            <div key={s} className={`siswa-list-row ${s === siswaHapus ? 'selected' : ''}`} onClick={() => setSiswaHapus(s)}>
              <div className="avatar-sm">{initials(s)}</div>
              <div className="nm">{s}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ gridColumn: '1 / -1' }}>
        <div className="panel-title"><span className="ic-badge"><Icon name="plus" size={14} /></span> Tambah Jenis Pembayaran Baru</div>
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

        <div className="subsection-title">Jenis Pembayaran Aktif ({itemList.length})</div>
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
                    {i.nama === 'PPDB' && (
                      <div className="hint-text" style={{ padding: '4px 0 2px 40px' }}>
                        Gel.1 L: Rp 940.000 &nbsp;·&nbsp; Gel.2 L: Rp 1.550.000 &nbsp;·&nbsp; Gel.3 L: Rp 1.175.000 &nbsp;·&nbsp;
                        Gel.1 P: Rp 1.035.000 &nbsp;·&nbsp; Gel.2 P: Rp 1.165.000 &nbsp;·&nbsp; Gel.3 P: Rp 1.295.000
                      </div>
                    )}
                    {i.nama === 'BUKU' && (
                      <div className="hint-text" style={{ padding: '4px 0 2px 40px' }}>
                        BUKU 1 (Kelas 1-2): Rp 400.000 &nbsp;·&nbsp; BUKU 2 (Kelas 3-4): Rp 480.000 &nbsp;·&nbsp; BUKU 3 (Kelas 5-6): Rp 475.000
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {role === 'admin' && (
        <div className="panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-title"><span className="ic-badge"><Icon name="up" size={14} /></span> Kenaikan Kelas Tahunan</div>
          <div className="panel-desc">
            Sekali klik pindahin SEMUA siswa: KELAS 1→2→3→4→5→6→ALUMNI. Data pembayaran (termasuk tunggakan) ikut pindah, gak dihapus.
            KELAS 1 jadi kosong, siap diisi siswa baru.
          </div>
          <button className="ghost-danger btn-icon" style={{ maxWidth: 300 }} disabled={loadingKenaikan} onClick={kenaikanKelas}>
            {loadingKenaikan ? <span className="spinner" /> : <Icon name="up" size={15} />} Jalankan Kenaikan Kelas
          </button>
          {statusKenaikan && (
            <div className={`status ${statusKenaikan.sukses ? 'sukses' : 'gagal'}`}>
              {statusKenaikan.pesan}
              {statusKenaikan.ringkasan?.map((r, i) => <div key={i} style={{ fontSize: 12, marginTop: 4 }}>{r}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
