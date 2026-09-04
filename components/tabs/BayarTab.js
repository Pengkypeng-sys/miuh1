'use client';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Icon } from '@/lib/icons';
import { hitungStatus } from '@/lib/target';
import { BarFill } from '@/components/BarFill';
import {
  rp, rpSigned, rpSingkat, formatRibuan, targetSebenarnya,
  BULAN_LIST, BUKU_KELAS_MAP, PPDB_HARGA_ACUAN, BUKU_HARGA_ACUAN,
} from '@/lib/format';

export function BayarTab({ p }) {
  const {
    kelas, setKelas, kelasList, siswa, setSiswa, siswaList,
    ppdbOn, setPpdbOn, ppdbGel, setPpdbGel, ppdbGender, setPpdbGender, ppdbNominal, setPpdbNominal,
    bukuOn, setBukuOn, bukuKelasPilih, setBukuKelasPilih, bukuNominal, setBukuNominal,
    sppOn, setSppOn, sppBulan, setSppBulan, sppNominal, setSppNominal, tabunganOn, setTabunganOn, tabunganNominal, setTabunganNominal,
    sppBulananStatus,
    itemList, checkedItems, toggleCheckedItem, nominalPerItem, setNominalPerItem, modePerItem, setModePerItem,
    role, metodeBayar, setMetodeBayar, loadingBtn, submitData, statusBayar, kwitansi,
    itemValues, loadingRingkasan, kolom, setKolom,
    showPindah, setShowPindah, pindahKeKolom, setPindahKeKolom, pindahNominal, setPindahNominal, loadingPindah, pindahPembayaran, hapusData,
    kelasDetail, loadingDetail, bulanDetailPilih, setBulanDetailPilih, tahunDetailPilih, setTahunDetailPilih,
  } = p;
  const [tampilkanLunas, setTampilkanLunas] = useState(true);
  const [bukaKunci, setBukaKunci] = useState(new Set()); // kolom yang dibuka manual sama admin buat koreksi
  const [cariSiswaGuru, setCariSiswaGuru] = useState('');

  // Wali kelas (role guru): akun read-only, cuma pilih kelas terus liat tabel semua siswa x status
  // lunas/belum lunas sekaligus — gak perlu klik satu-satu, gak ada akses input/edit pembayaran.
  if (role === 'guru') {
    const siswaCocok = kelasDetail?.siswa.filter(s => s.nama.toLowerCase().includes(cariSiswaGuru.toLowerCase())) || [];
    return (
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title"><span className="ic-badge"><Icon name="students" size={14} /></span> Status Pembayaran Siswa — {kelas}</div>
            <div className="panel-desc">Semua siswa sekelas, status lunas/belum lunas per item</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ width: 'auto', margin: 0 }} value={kelas} onChange={e => setKelas(e.target.value)}>
              {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <select style={{ width: 'auto', margin: 0 }} value={bulanDetailPilih} onChange={e => setBulanDetailPilih(e.target.value === 'semua' ? 'semua' : Number(e.target.value))} title="Bulan SPP yang ditampilin">
              {BULAN_LIST.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
              <option value="semua">Semua Bulan</option>
            </select>
            <input type="number" style={{ width: 90, margin: 0 }} value={tahunDetailPilih} onChange={e => setTahunDetailPilih(Number(e.target.value))} title="Tahun SPP yang ditampilin" />
          </div>
        </div>

        <div className="search-box" style={{ margin: '12px 0' }}>
          <span className="search-ic"><Icon name="search" size={15} /></span>
          <input value={cariSiswaGuru} onChange={e => setCariSiswaGuru(e.target.value)} placeholder="cari nama siswa..." />
        </div>

        {loadingDetail && <div className="hint-text">Memuat...</div>}
        {!loadingDetail && kelasDetail && (
          <div className="table-wrap">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>Nama Siswa</th>
                  {kelasDetail.items.map(it => <th key={it.kolom}>{it.nama}</th>)}
                </tr>
              </thead>
              <tbody>
                {siswaCocok.length === 0 && (
                  <tr><td colSpan={kelasDetail.items.length + 1} style={{ textAlign: 'center', color: 'var(--muted)' }}>Tidak ada siswa yang cocok</td></tr>
                )}
                {siswaCocok.map(s => (
                  <tr key={s.nama}>
                    <td>{s.nama}</td>
                    {kelasDetail.items.map(it => {
                      const val = Number(s.values[it.kolom]) || 0;
                      const ket = s.keterangan?.[it.kolom];
                      const target = targetSebenarnya(it.nama, ket, it.target);
                      const status = hitungStatus(val, target);
                      const sisa = target ? target - val : null;
                      const ketSuffix = ket ? ` (${ket})` : '';
                      const tooltip = status === 'lunas'
                        ? `Lunas${ketSuffix} — ${rp(val)}`
                        : status === 'cicil'
                        ? `Sudah masuk${ketSuffix} ${rp(val)}${target ? `, sisa ${rp(sisa)}` : ''}`
                        : target ? `Belum bayar${ketSuffix} — target ${rp(target)}` : `Belum bayar${ketSuffix}`;
                      const teks = status === 'lunas' ? 'Lunas'
                        : status === 'cicil' ? `${rpSingkat(val)}/${rpSingkat(target)}`
                        : target > 0 ? `-${rpSingkat(target)}` : 'Belum';
                      return (
                        <td key={it.kolom} title={tooltip}>
                          <span className={`status-chip ${status}`}>{teks}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bayar-grid">
      <div className="panel">
        <div className="panel-title"><span className="ic-badge"><Icon name="edit" size={14} /></span> Input Pembayaran</div>
        <div className="panel-desc">Centang item yang dibayar (bisa lebih dari 1), isi nominalnya, pilih metode</div>

        <label>Pilih Kelas</label>
        <select value={kelas} onChange={e => setKelas(e.target.value)}>
          {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        <label>Nama Siswa</label>
        <input
          list="daftar-siswa-bayar"
          value={siswa}
          onChange={e => setSiswa(e.target.value)}
          placeholder={siswaList.length === 0 ? 'Belum ada siswa di kelas ini' : 'ketik atau pilih nama siswa...'}
        />
        <datalist id="daftar-siswa-bayar">
          {siswaList.map(s => <option key={s} value={s} />)}
        </datalist>

        <hr className="field-divider" />

        <label>Item yang Dibayar <span style={{ fontWeight: 'normal', color: 'var(--muted)' }}>(nominal &lt;1000 otomatis dikali 1000)</span></label>
        <div className="checkout-list">
          <div className="checkout-row">
            <label className="checkout-check">
              <input type="checkbox" checked={ppdbOn} onChange={e => { setPpdbOn(e.target.checked); if (!e.target.checked) { setPpdbGel(''); setPpdbGender(''); setPpdbNominal(''); } }} />
              <span className="nm">PPDB</span>
            </label>
            {ppdbOn && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%', marginTop: 6 }}>
                <select value={ppdbGel} onChange={e => setPpdbGel(e.target.value)}>
                  <option value="">Pilih Gelombang</option>
                  <option value="1">Gel.1</option>
                  <option value="2">Gel.2</option>
                  <option value="3">Gel.3</option>
                </select>
                <select value={ppdbGender} onChange={e => setPpdbGender(e.target.value)}>
                  <option value="">Pilih Jenis Kelamin</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
                {ppdbGel && ppdbGender && (
                  <>
                    <input
                      type="text" inputMode="numeric" className="checkout-nominal"
                      placeholder="nominal PPDB"
                      value={ppdbNominal}
                      onChange={e => setPpdbNominal(formatRibuan(e.target.value))}
                    />
                    <div className="hint-text" style={{ width: '100%' }}>Harga acuan: Rp {PPDB_HARGA_ACUAN[`${ppdbGel}-${ppdbGender}`].toLocaleString('id-ID')} — bisa diubah kalau beda</div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="checkout-row">
            <label className="checkout-check">
              <input type="checkbox" checked={bukuOn} onChange={e => { setBukuOn(e.target.checked); if (!e.target.checked) { setBukuKelasPilih(''); setBukuNominal(''); } }} />
              <span className="nm">BUKU</span>
            </label>
            {bukuOn && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%', marginTop: 6 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, width: '100%' }}>
                  {Object.keys(BUKU_KELAS_MAP).map(k => {
                    const item = itemList.find(i => i.nama === BUKU_KELAS_MAP[k]);
                    const val = Number(itemValues[item?.kolom]) || 0;
                    const lunas = item && item.target > 0 && hitungStatus(val, item.target) === 'lunas';
                    const kunciKey = `buku-${k}`;
                    const terkunci = lunas && !bukaKunci.has(kunciKey);
                    return (
                      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 400, whiteSpace: 'nowrap', opacity: terkunci ? 0.55 : 1 }} title={terkunci ? 'Udah lunas, gak bisa disetor lagi' : ''}>
                        <input type="checkbox" checked={bukuKelasPilih === k} disabled={terkunci} onChange={() => setBukuKelasPilih(bukuKelasPilih === k ? '' : k)} />
                        {k}
                        {lunas && <span className="status-chip lunas" style={{ fontSize: 9, padding: '0 5px' }}>Lunas</span>}
                        {lunas && role === 'admin' && (
                          <button type="button" onClick={e => { e.preventDefault(); setBukaKunci(prev => terkunci ? new Set(prev).add(kunciKey) : (() => { const n = new Set(prev); n.delete(kunciKey); return n; })()); }}
                            style={{ fontSize: 9, padding: '0 5px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>
                            {terkunci ? 'Buka kunci' : 'Kunci lagi'}
                          </button>
                        )}
                      </label>
                    );
                  })}
                </div>
                {bukuKelasPilih && (
                  <>
                    <input
                      type="text" inputMode="numeric" className="checkout-nominal"
                      placeholder={`nominal ${BUKU_KELAS_MAP[bukuKelasPilih]}`}
                      value={bukuNominal}
                      onChange={e => setBukuNominal(formatRibuan(e.target.value))}
                    />
                    <div className="hint-text" style={{ width: '100%' }}>Harga acuan: Rp {BUKU_HARGA_ACUAN[bukuKelasPilih].toLocaleString('id-ID')} — bisa diubah kalau beda</div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="checkout-row">
            <label className="checkout-check">
              <input type="checkbox" checked={sppOn} onChange={e => { setSppOn(e.target.checked); if (!e.target.checked) { setSppBulan([]); setSppNominal(''); setTabunganOn(false); setTabunganNominal(''); } }} />
              <span className="nm">SPP</span>
            </label>
            {sppOn && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%', marginTop: 6 }}>
                {sppBulananStatus.yatim && <div className="hint-text" style={{ width: '100%' }}>Siswa yatim — SPP gratis, semua bulan otomatis lunas</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%' }}>
                  {BULAN_LIST.map((b, i) => {
                    const nominalBulan = sppBulananStatus.perBulan[i + 1] || 0;
                    const lunas = sppBulananStatus.target > 0 && nominalBulan >= sppBulananStatus.target;
                    const kunciKey = `spp-${b}`;
                    const terkunci = lunas && !bukaKunci.has(kunciKey);
                    return (
                      <label key={b} style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 400, opacity: terkunci ? 0.55 : 1 }} title={terkunci ? `Lunas — ${b} udah disetor penuh` : nominalBulan > 0 ? `Nyicil, udah masuk Rp ${nominalBulan.toLocaleString('id-ID')}` : ''}>
                        <input
                          type="checkbox"
                          checked={sppBulan.includes(b)}
                          disabled={terkunci}
                          onChange={e => setSppBulan(prev => e.target.checked ? [...prev, b] : prev.filter(x => x !== b))}
                        />
                        {b}
                        {lunas && <span className="status-chip lunas" style={{ fontSize: 9, padding: '0 5px' }}>{sppBulananStatus.yatim ? 'Gratis' : 'Lunas'}</span>}
                        {!lunas && nominalBulan > 0 && <span className="status-chip cicil" style={{ fontSize: 9, padding: '0 5px' }}>Nyicil</span>}
                        {lunas && role === 'admin' && !sppBulananStatus.yatim && (
                          <button type="button" onClick={e => { e.preventDefault(); setBukaKunci(prev => terkunci ? new Set(prev).add(kunciKey) : (() => { const n = new Set(prev); n.delete(kunciKey); return n; })()); }}
                            style={{ fontSize: 9, padding: '0 5px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>
                            {terkunci ? 'Buka kunci' : 'Kunci lagi'}
                          </button>
                        )}
                      </label>
                    );
                  })}
                </div>
                <input
                  type="text" inputMode="numeric" className="checkout-nominal"
                  placeholder="nominal SPP"
                  value={sppNominal}
                  onChange={e => setSppNominal(formatRibuan(e.target.value))}
                />
                <label className="mode-toggle" style={{ width: '100%' }}>
                  <input type="checkbox" checked={tabunganOn} onChange={e => { setTabunganOn(e.target.checked); if (!e.target.checked) setTabunganNominal(''); }} />
                  Sertakan Tabungan Wajib <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(dicatat terpisah, laporan sendiri)</span>
                </label>
                {tabunganOn && (
                  <input
                    type="text" inputMode="numeric" className="checkout-nominal"
                    placeholder="nominal Tabungan Wajib"
                    value={tabunganNominal}
                    onChange={e => setTabunganNominal(formatRibuan(e.target.value))}
                  />
                )}
              </div>
            )}
          </div>

          <div className="checkout-grid">
          {itemList.filter(i => !i.nama.startsWith('PPDB') && !i.nama.startsWith('BUKU') && i.nama !== 'SPP' && i.nama !== 'TABUNGAN WAJIB').map(i => {
            const checked = checkedItems.has(i.kolom);
            const val = Number(itemValues[i.kolom]) || 0;
            const status = hitungStatus(val, i.target);
            // Item yang beneran udah lunas (target asli, bukan "tanpa target") dikunci — staf gak bisa
            // nyetor lagi ke item yang udah kelar. Admin bisa buka manual per item buat koreksi.
            const lunas = i.target > 0 && status === 'lunas';
            const kunciKey = `item-${i.kolom}`;
            const terkunci = lunas && !bukaKunci.has(kunciKey);
            return (
              <div key={i.kolom} className={`checkout-row ${checked ? 'checked full' : ''}`} style={terkunci ? { opacity: 0.55 } : undefined}>
                <label className="checkout-check" title={terkunci ? 'Udah lunas, gak bisa disetor lagi' : ''}>
                  <input type="checkbox" checked={checked} disabled={terkunci} onChange={() => toggleCheckedItem(i.kolom)} />
                  <Icon name={i.icon || 'receipt'} size={13} />
                  <span className="nm">{i.nama}</span>
                  {status !== 'belum' && (
                    <span className={`status-chip ${status}`} style={{ fontSize: 10 }}>{status === 'lunas' ? '✓ Lunas' : 'Nyicil'}</span>
                  )}
                  {lunas && role === 'admin' && (
                    <button type="button" onClick={e => { e.preventDefault(); setBukaKunci(prev => terkunci ? new Set(prev).add(kunciKey) : (() => { const n = new Set(prev); n.delete(kunciKey); return n; })()); }}
                      style={{ fontSize: 9, padding: '0 5px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>
                      {terkunci ? 'Buka kunci' : 'Kunci lagi'}
                    </button>
                  )}
                </label>
                {checked && (
                  <>
                    <input
                      type="text" inputMode="numeric" className="checkout-nominal"
                      placeholder={modePerItem[i.kolom] === 'set' ? 'nilai total yang benar' : 'nominal setoran'}
                      value={nominalPerItem[i.kolom] || ''}
                      onChange={e => setNominalPerItem(prev => ({ ...prev, [i.kolom]: formatRibuan(e.target.value) }))}
                    />
                    {role === 'admin' && (
                      <label className="mode-toggle">
                        <input
                          type="checkbox"
                          checked={modePerItem[i.kolom] === 'set'}
                          onChange={e => setModePerItem(prev => ({ ...prev, [i.kolom]: e.target.checked ? 'set' : 'tambah' }))}
                        />
                        Timpa nilai langsung (koreksi salah input, bukan nambah)
                      </label>
                    )}
                  </>
                )}
              </div>
            );
          })}
          </div>
        </div>

        <label>Metode Pembayaran</label>
        <select value={metodeBayar} onChange={e => setMetodeBayar(e.target.value)}>
          <option value="Cash">💵 Cash</option>
          <option value="Transfer">🏦 Transfer</option>
          <option value="QRIS">📱 QRIS</option>
        </select>

        <button disabled={loadingBtn} onClick={submitData} className="btn-icon">
          {loadingBtn ? <span className="spinner" /> : <Icon name="save" size={16} />} Simpan {checkedItems.size > 0 ? `(${checkedItems.size} item)` : ''}
        </button>
        {statusBayar && <div className={`status ${statusBayar.sukses ? 'sukses' : 'gagal'}`}>{statusBayar.pesan}</div>}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title"><span className="ic-badge"><Icon name="list" size={14} /></span> Ringkasan Pembayaran Siswa</div>
            <div className="panel-desc">Item yang belum lunas / masih nyicil — yang udah lunas otomatis disembunyiin</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 400, whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={tampilkanLunas} onChange={e => setTampilkanLunas(e.target.checked)} /> Tampilkan yang lunas
          </label>
        </div>

        {siswa && (
          <div className="siswa-card">
            <div className="avatar">{siswa.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div>
              <div className="nm">{siswa}</div>
              <div className="kl">{kelas}</div>
            </div>
          </div>
        )}

        {loadingRingkasan && (
          <div className="item-status-list">
            {[0, 1, 2].map(k => <div key={k} className="skeleton-row" />)}
          </div>
        )}
        {!loadingRingkasan && <motion.div className="item-status-list" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.035 } } }}>
          {itemList.filter(i => {
            // Item varian PPDB/BUKU (6+3 kemungkinan) cuma ditampilin kalau siswa ini emang punya
            // catatan bayar di varian itu — kalau semua ditampilin defaultnya numpuk 9 baris "belum bayar".
            const isVarian = i.nama.startsWith('PPDB') || i.nama.startsWith('BUKU');
            if (isVarian && !(Number(itemValues[i.kolom]) > 0)) return false;
            if (tampilkanLunas) return true;
            const ket = itemValues.__keterangan?.[i.kolom];
            const target = targetSebenarnya(i.nama, ket, i.target);
            return hitungStatus(Number(itemValues[i.kolom]) || 0, target) !== 'lunas';
          }).map(i => {
            const val = Number(itemValues[i.kolom]) || 0;
            const ket = itemValues.__keterangan?.[i.kolom];
            const target = targetSebenarnya(i.nama, ket, i.target);
            const status = hitungStatus(val, target);
            const pct = target ? Math.min(100, Math.round((val / target) * 100)) : (val ? 100 : 0);
            const sisa = target ? val - target : null;
            return (
              <motion.div
                key={i.kolom} className={`item-status-row ${String(i.kolom) === String(kolom) ? 'selected' : ''}`} onClick={() => setKolom(i.kolom)}
                variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                whileTap={{ scale: 0.985 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="nm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{i.nama}{ket ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> ({ket})</span> : ''}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {status !== 'belum' && <span className={`status-chip ${status}`}>{status === 'lunas' ? 'Lunas' : 'Nyicil'}</span>}
                      <span className={`val ${status === 'lunas' ? 'paid' : 'unpaid'}`}>
                        {val ? rp(val) : 'Belum bayar'}{target ? `${val ? ' / ' : ' / '}${rp(target)}` : ''}
                      </span>
                    </span>
                  </div>
                  {status === 'cicil' && (
                    <>
                      <div style={{ marginTop: 6, height: 6 }}>
                        <BarFill pct={pct} color="var(--gold)" />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginTop: 4, textAlign: 'right' }}>
                        Sisa {rpSigned(sisa)}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>}

        {role === 'admin' && siswa && kolom && Number(itemValues[kolom]) > 0 && (
          <div className="fix-actions">
            <button className="secondary btn-icon" style={{ width: 'auto' }} onClick={() => setShowPindah(v => !v)}>
              <Icon name="refresh" size={13} /> Salah pilih item? Pindahkan
            </button>

            {showPindah && (
              <div className="pindah-box">
                <div className="hint-text" style={{ marginTop: 0, marginBottom: 8 }}>
                  Pindahkan dari "<b>{itemList.find(i => String(i.kolom) === String(kolom))?.nama}</b>" ke item lain
                </div>
                <select value={pindahKeKolom} onChange={e => setPindahKeKolom(e.target.value)}>
                  <option value="">Pilih item tujuan...</option>
                  {itemList.filter(i => String(i.kolom) !== String(kolom)).map(i => (
                    <option key={i.kolom} value={i.kolom}>{i.nama}</option>
                  ))}
                </select>
                <input
                  type="text" inputMode="numeric"
                  placeholder={`nominal (kosongin = pindah semua Rp ${rp(itemValues[kolom])})`}
                  value={pindahNominal}
                  onChange={e => setPindahNominal(formatRibuan(e.target.value))}
                />
                <button disabled={loadingPindah} onClick={pindahPembayaran} className="btn-icon">
                  {loadingPindah ? <span className="spinner" /> : <Icon name="refresh" size={14} />} Pindahkan Sekarang
                </button>
              </div>
            )}
          </div>
        )}

        {role === 'admin' && siswa && kolom && (
          <button
            className="ghost-danger btn-icon"
            style={{ marginTop: 10 }}
            disabled={loadingBtn}
            onClick={hapusData}
          >
            <Icon name="trash" size={13} /> Hapus data "{itemList.find(i => String(i.kolom) === String(kolom))?.nama}" milik {siswa}
          </button>
        )}
      </div>

      {kwitansi && (
        <div className="panel panel-print" style={{ gridColumn: 2 }}>
          <div className="panel-header no-print">
            <div>
              <div className="panel-title"><span className="ic-badge"><Icon name="receipt" size={14} /></span> Kwitansi Terakhir</div>
              <div className="panel-desc">{kwitansi.siswa} — {kwitansi.kelas}</div>
            </div>
            <button className="secondary action-btn btn-icon" onClick={() => window.print()}><Icon name="receipt" size={14} /> Cetak Kwitansi</button>
          </div>

          <div className="print-only print-kop">
            <img src="/logo-mi.png" alt="" className="print-kop-logo" />
            <div>
              <div className="print-kop-sekolah">MI Unwanul Huda 1</div>
              <div className="print-kop-judul">Kwitansi Pembayaran</div>
              <div className="print-kop-tanggal">{kwitansi.waktu}</div>
            </div>
          </div>

          <div style={{ padding: '4px 2px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 4 }}><span>Nama Siswa</span><b>{kwitansi.siswa}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 4 }}><span>Kelas</span><b>{kwitansi.kelas}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 4 }}><span>Metode</span><b>{kwitansi.metode}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 10 }}><span>Diterima Oleh</span><b>{kwitansi.petugas}</b></div>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th className="num">Nominal</th></tr></thead>
              <tbody>
                {kwitansi.items.map((it, i) => <tr key={i}><td>{it.nama}</td><td className="num">{rp(it.nominal)}</td></tr>)}
              </tbody>
              <tfoot>
                <tr><td style={{ fontWeight: 700 }}>Total</td><td className="num" style={{ fontWeight: 700 }}>{rp(kwitansi.total)}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
