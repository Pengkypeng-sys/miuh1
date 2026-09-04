'use client';
import { Fragment, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Icon } from '@/lib/icons';
import { hitungStatus } from '@/lib/target';
import { BarFill } from '@/components/BarFill';
import { rp, rpSingkat, targetSebenarnya, ddmmyyyyToIso, isoToDdmmyyyy, BULAN_LIST } from '@/lib/format';

export function RekapTab({ p }) {
  const {
    rekap, loadRekap, kelasList, rekapKelasFilter, setRekapKelasFilter,
    kelasDetailPilih, setKelasDetailPilih, cariSiswaDetail, setCariSiswaDetail,
    loadingDetail, kelasDetail, varianFilter, setVarianFilter,
    tanggalBayarFilter, setTanggalBayarFilter,
    bulanDetailPilih, setBulanDetailPilih, tahunDetailPilih, setTahunDetailPilih,
  } = p;

  const [cariPiutang, setCariPiutang] = useState('');
  const [hanya30, setHanya30] = useState(false);
  const [itemDetailFilter, setItemDetailFilter] = useState([]); // [] = semua item; array of kolom (string)
  const [showItemFilter, setShowItemFilter] = useState(false);
  const [printModeSiswa, setPrintModeSiswa] = useState(false);
  const [siswaDicetak, setSiswaDicetak] = useState([]); // [] = ikut hasil search; kalau diisi, cetak cuma nama ini
  const [showSiswaFilter, setShowSiswaFilter] = useState(false);
  useEffect(() => {
    const reset = () => setPrintModeSiswa(false);
    window.addEventListener('afterprint', reset);
    return () => window.removeEventListener('afterprint', reset);
  }, []);
  function cetakPerSiswa() {
    setPrintModeSiswa(true);
    setTimeout(() => window.print(), 50); // kasih waktu React render dulu sebelum print
  }
  function toggleSiswaDicetak(nama) {
    setSiswaDicetak(cur => cur.includes(nama) ? cur.filter(x => x !== nama) : [...cur, nama]);
  }
  function toggleItemDetail(kolom) {
    const k = String(kolom);
    setItemDetailFilter(cur => cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k]);
  }

  // ===== Rincian per Item & Bulan (drill-down: item -> bulan -> per kelas -> per siswa) =====
  const VARIAN_ITEMS = ['PPDB', 'BUKU'];
  const namaDasarItem = nama => VARIAN_ITEMS.find(v => nama.startsWith(v)) || nama;
  const daftarItemDrilldown = [...new Set((rekap?.perItem || []).map(i => namaDasarItem(i.nama)))];
  const now = new Date();
  const [itemDrilldown, setItemDrilldown] = useState('');
  const [bulanDrilldown, setBulanDrilldown] = useState(now.getMonth() + 1);
  const [tahunDrilldown, setTahunDrilldown] = useState(now.getFullYear());
  const [hasilDrilldown, setHasilDrilldown] = useState(null);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);
  const [kelasDibuka, setKelasDibuka] = useState(null);
  async function cariRincianItemBulan() {
    if (!itemDrilldown) return;
    setLoadingDrilldown(true);
    setKelasDibuka(null);
    const res = await fetch(`/api/rekap-item-bulan?item=${encodeURIComponent(itemDrilldown)}&tahun=${tahunDrilldown}&bulan=${bulanDrilldown}`).then(r => r.json());
    setHasilDrilldown(res.sukses ? res : null);
    setLoadingDrilldown(false);
  }

  function downloadCsvSiswa(items) {
    const header = ['Nama Siswa', ...items.map(it => it.nama)].join(',') + '\n';
    const rows = kelasDetail.siswa.map(s => [s.nama, ...items.map(it => Number(s.values[it.kolom]) || 0)].join(',')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `data-siswa-${kelasDetailPilih}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const itemTabungan = rekap?.perItem.find(i => i.nama === 'TABUNGAN WAJIB');
  const totalTerkumpul = rekap ? rekap.perItem.filter(i => i.nama !== 'TABUNGAN WAJIB').reduce((s, i) => s + i.nominal, 0) : 0;
  const totalSiswaSemua = rekap ? rekap.perKelas.reduce((s, k) => s + k.totalSiswa, 0) : 0;
  const rataPersenLunas = rekap && rekap.perKelas.length
    ? Math.round(rekap.perKelas.reduce((s, k) => s + k.persenLunas, 0) / rekap.perKelas.length)
    : 0;

  return (
    <>
      <motion.div className="stat-grid" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.07 } } }}>
        {[
          { icon: 'case', theme: 'blue', label: 'Total Kelas', value: rekap?.perKelas.length ?? '—' },
          { icon: 'students', theme: 'amber', label: 'Total Siswa', value: totalSiswaSemua || '—' },
          { icon: 'money', theme: 'green', label: 'Total Terkumpul', value: rp(totalTerkumpul), money: true },
          { icon: 'check', theme: 'rose', label: 'Rata² % Lunas', value: `${rataPersenLunas}%` },
        ].map(s => (
          <motion.div
            key={s.label} className={`stat-tile stat-tile-${s.theme}`}
            variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
          >
            <div className="stat-tile-icon"><Icon name={s.icon} size={22} /></div>
            <div><div className="label">{s.label}</div><div className={`value ${s.money ? 'value-money' : ''}`}>{s.value}</div></div>
          </motion.div>
        ))}
      </motion.div>

      {rekap?.trendBulanan && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title"><span className="ic-badge"><Icon name="chart" size={14} /></span> Total Terkumpul per Bulan</div>
              <div className="panel-desc">Trend pembayaran masuk 6 bulan terakhir</div>
            </div>
          </div>
          <div className="trend-sparkline" style={{ height: 90 }}>
            {(() => {
              const max = Math.max(1, ...rekap.trendBulanan.map(b => b.total));
              return rekap.trendBulanan.map((b, i) => (
                <div key={i} className="trend-bar-col" title={`${b.bulan}: ${rp(b.total)}`}>
                  <div className="trend-bar in" style={{ height: `${Math.max(4, (b.total / max) * 74)}px` }} />
                  <div className="trend-bar-label">{b.bulan}</div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      <div className="panel no-print">
        <div className="panel-title"><span className="ic-badge"><Icon name="search" size={14} /></span> Rincian per Item & Bulan</div>
        <div className="panel-desc">Pilih item + bulan, lihat total + siapa aja yang bayar per kelas</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select style={{ width: 'auto', margin: 0 }} value={itemDrilldown} onChange={e => setItemDrilldown(e.target.value)}>
            <option value="">Pilih item...</option>
            {daftarItemDrilldown.map(it => <option key={it} value={it}>{it}</option>)}
          </select>
          <select style={{ width: 'auto', margin: 0 }} value={bulanDrilldown} onChange={e => setBulanDrilldown(Number(e.target.value))}>
            {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((b, i) => (
              <option key={b} value={i + 1}>{b}</option>
            ))}
          </select>
          <input type="number" style={{ width: 100, margin: 0 }} value={tahunDrilldown} onChange={e => setTahunDrilldown(Number(e.target.value))} />
          <button className="secondary action-btn btn-icon" disabled={!itemDrilldown || loadingDrilldown} onClick={cariRincianItemBulan}>
            {loadingDrilldown ? <span className="spinner" /> : <Icon name="search" size={14} />} Cari
          </button>
        </div>

        {hasilDrilldown && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, marginBottom: 10 }}>
              Total <b>{hasilDrilldown.item}</b> bulan ini: <b style={{ color: 'var(--primary)' }}>{rp(hasilDrilldown.total)}</b>
            </div>
            {hasilDrilldown.perKelas.length === 0 && <div className="empty-state">Belum ada pemasukan {hasilDrilldown.item} bulan ini</div>}
            {hasilDrilldown.perKelas.map(k => (
              <div key={k.kelas} className="item-manage-row" style={{ flexDirection: 'column', alignItems: 'stretch', marginBottom: 4 }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '6px 4px' }}
                  onClick={() => setKelasDibuka(v => v === k.kelas ? null : k.kelas)}
                >
                  <span style={{ fontWeight: 600 }}>
                    <Icon name={kelasDibuka === k.kelas ? 'down' : 'up'} size={11} /> {k.kelas} <span className="hint-text" style={{ marginLeft: 4 }}>({k.siswa.length} siswa)</span>
                  </span>
                  <b>{rp(k.total)}</b>
                </div>
                {kelasDibuka === k.kelas && (
                  <div className="table-wrap" style={{ marginTop: 6 }}>
                    <table>
                      <thead><tr><th>Nama Siswa</th><th>Tanggal Terakhir</th><th className="num">Total</th></tr></thead>
                      <tbody>
                        {k.siswa.map(s => (
                          <tr key={s.nama}><td>{s.nama}</td><td>{s.tanggal}</td><td className="num">{rp(s.total)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {rekap?.totalPerTahunAjaran?.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title"><span className="ic-badge"><Icon name="chart" size={14} /></span> Total Pemasukan per Tahun Ajaran</div>
              <div className="panel-desc">Rekap tahunan (Juli–Juni) — buat laporan ke yayasan</div>
            </div>
          </div>
          <div className="trend-sparkline" style={{ height: 90 }}>
            {(() => {
              const max = Math.max(1, ...rekap.totalPerTahunAjaran.map(b => b.total));
              return rekap.totalPerTahunAjaran.map((b, i) => (
                <div key={i} className="trend-bar-col" title={`${b.tahunAjaran}: ${rp(b.total)}`}>
                  <div className="trend-bar in" style={{ height: `${Math.max(4, (b.total / max) * 74)}px` }} />
                  <div className="trend-bar-label">{b.tahunAjaran}</div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {rekap?.riwayatSiswa?.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title"><span className="ic-badge"><Icon name="students" size={14} /></span> Jumlah Siswa per Tahun Ajaran</div>
              <div className="panel-desc">Snapshot diambil tiap kali Kenaikan Kelas dijalankan</div>
            </div>
          </div>
          <div className="trend-sparkline" style={{ height: 90 }}>
            {(() => {
              const max = Math.max(1, ...rekap.riwayatSiswa.map(r => r.total_siswa));
              return rekap.riwayatSiswa.map((r, i) => (
                <div key={i} className="trend-bar-col" title={`${r.tahun}: ${r.total_siswa} siswa`}>
                  <div className="trend-bar in" style={{ height: `${Math.max(4, (r.total_siswa / max) * 74)}px` }} />
                  <div className="trend-bar-label">{r.tahun}</div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title"><span className="ic-badge"><Icon name="chart" size={14} /></span> % Lunas per Kelas</div>
            <div className="panel-desc">Persentase siswa yang sudah membayar semua item</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="no-print" style={{ width: 'auto', margin: 0 }} value={rekapKelasFilter} onChange={e => setRekapKelasFilter(e.target.value)}>
              <option value="">Semua Kelas</option>
              {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <button className="secondary action-btn btn-icon no-print" onClick={loadRekap}><Icon name="refresh" size={14} /> Refresh</button>
          </div>
        </div>
        {rekap?.perKelas.map(k => (
          <div className="bar-row" key={k.kelas}>
            <div className="name" title={k.kelas}>{k.kelas}</div>
            <BarFill pct={k.persenLunas} />
            <div className="pct">{k.persenLunas}%</div>
          </div>
        ))}
      </div>

      {itemTabungan && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title"><span className="ic-badge"><Icon name="wallet" size={14} /></span> Tabungan Wajib</div>
              <div className="panel-desc">Laporan terpisah — gak digabung ke SPP/rekap pembayaran lain</div>
            </div>
            <button
              className="secondary action-btn btn-icon no-print"
              onClick={() => { setItemDetailFilter([String(itemTabungan.kolom)]); setShowItemFilter(false); document.getElementById('panel-data-siswa')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              <Icon name="list" size={14} /> Lihat per Siswa
            </button>
          </div>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="stat-tile stat-tile-green">
              <div className="stat-tile-icon"><Icon name="money" size={22} /></div>
              <div><div className="label">Total Terkumpul</div><div className="value value-money">{rp(itemTabungan.nominal)}</div></div>
            </div>
            <div className="stat-tile stat-tile-amber">
              <div className="stat-tile-icon"><Icon name="students" size={22} /></div>
              <div><div className="label">Siswa Terisi</div><div className="value">{itemTabungan.terisi}</div></div>
            </div>
          </div>
        </div>
      )}

      <div className="panel" id="panel-data-siswa">
        <div className="panel-header">
          <div>
            <div className="panel-title"><span className="ic-badge"><Icon name="list" size={14} /></span> Data Siswa per Kelas</div>
            <div className="panel-desc">Status pembayaran tiap siswa, per item</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="no-print" style={{ width: 'auto', margin: 0 }} value={kelasDetailPilih} onChange={e => setKelasDetailPilih(e.target.value)}>
              {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <select className="no-print" style={{ width: 'auto', margin: 0 }} value={bulanDetailPilih} onChange={e => setBulanDetailPilih(e.target.value === 'semua' ? 'semua' : Number(e.target.value))} title="Bulan SPP yang ditampilin">
              {BULAN_LIST.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
              <option value="semua">Semua Bulan</option>
            </select>
            <input type="number" className="no-print" style={{ width: 90, margin: 0 }} value={tahunDetailPilih} onChange={e => setTahunDetailPilih(Number(e.target.value))} title="Tahun SPP yang ditampilin" />
            {kelasDetail && (
              <button
                className="secondary action-btn btn-icon"
                onClick={() => setShowItemFilter(v => !v)}
              >
                <Icon name="filter" size={14} /> {itemDetailFilter.length === 0 ? 'Semua Item' : `${itemDetailFilter.length} item dipilih`}
              </button>
            )}
            {kelasDetail && <button className="secondary action-btn btn-icon no-print" onClick={() => downloadCsvSiswa(kelasDetail.items.filter(it => itemDetailFilter.length === 0 || itemDetailFilter.includes(String(it.kolom))))}><Icon name="list" size={14} /> Export Excel (CSV)</button>}
            <button className="secondary action-btn btn-icon no-print" onClick={() => window.print()}><Icon name="receipt" size={14} /> Download PDF</button>
            {kelasDetail && (
              <button className="secondary action-btn btn-icon no-print" onClick={() => setShowSiswaFilter(v => !v)}>
                <Icon name="userPlus" size={14} /> {siswaDicetak.length === 0 ? 'Pilih Siswa' : `${siswaDicetak.length} siswa dipilih`}
              </button>
            )}
            {kelasDetail && <button className="secondary action-btn btn-icon no-print" onClick={cetakPerSiswa}><Icon name="receipt" size={14} /> Cetak per Siswa (1 lembar/siswa)</button>}
          </div>
        </div>

        {kelasDetail && showItemFilter && (
          <div className="no-print" style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--bg-soft, #f8faf9)', border: '1px solid var(--border, #e2e8e5)', borderRadius: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '4px 8px' }}>
              {kelasDetail.items.map(it => (
                <label key={it.kolom} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <input type="checkbox" style={{ flexShrink: 0 }} checked={itemDetailFilter.includes(String(it.kolom))} onChange={() => toggleItemDetail(it.kolom)} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.nama}</span>
                </label>
              ))}
            </div>
            {itemDetailFilter.length > 0 && (
              <button className="secondary action-btn" style={{ fontSize: 12, padding: '3px 10px', marginTop: 8 }} onClick={() => setItemDetailFilter([])}>Reset</button>
            )}
          </div>
        )}

        {kelasDetail && showSiswaFilter && (
          <div className="no-print" style={{ padding: '10px 12px', marginBottom: 12, maxHeight: 260, overflowY: 'auto', background: 'var(--bg-soft, #f8faf9)', border: '1px solid var(--border, #e2e8e5)', borderRadius: 8 }}>
            <div className="hint-text" style={{ marginTop: 0, marginBottom: 8 }}>Centang siswa yang mau dicetak (kosongin = ikut hasil pencarian di bawah)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '4px 8px' }}>
              {kelasDetail.siswa.map(s => (
                <label key={s.nama} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <input type="checkbox" style={{ flexShrink: 0 }} checked={siswaDicetak.includes(s.nama)} onChange={() => toggleSiswaDicetak(s.nama)} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nama}</span>
                </label>
              ))}
            </div>
            {siswaDicetak.length > 0 && (
              <button className="secondary action-btn" style={{ fontSize: 12, padding: '3px 10px', marginTop: 8 }} onClick={() => setSiswaDicetak([])}>Reset</button>
            )}
          </div>
        )}

        <div className="search-box no-print" style={{ marginBottom: 12, maxWidth: 320 }}>
          <span className="search-ic"><Icon name="search" size={15} /></span>
          <input value={cariSiswaDetail} onChange={e => setCariSiswaDetail(e.target.value)} placeholder="cari nama siswa..." />
        </div>

        {loadingDetail && <div className="empty-state"><span className="spinner" />Memuat...</div>}
        {!loadingDetail && kelasDetail && (() => {
          const itemsShown = kelasDetail.items.filter(it => itemDetailFilter.length === 0 || itemDetailFilter.includes(String(it.kolom)));
          const siswaCocok = siswaDicetak.length > 0
            ? kelasDetail.siswa.filter(s => siswaDicetak.includes(s.nama))
            : kelasDetail.siswa.filter(s => s.nama.toLowerCase().includes(cariSiswaDetail.toLowerCase()));
          return (
          <>
          <div className={`table-wrap ${printModeSiswa ? 'hide-in-print' : ''}`}>
            <div className="print-only print-kop">
              <img src="/logo-mi.png" alt="" className="print-kop-logo" />
              <div>
                <div className="print-kop-sekolah">MI Unwanul Huda 1</div>
                <div className="print-kop-judul">Rekap Status Pembayaran — {kelasDetailPilih}{itemDetailFilter.length > 0 ? ` — ${itemsShown.map(it => it.nama).join(', ')}` : ''}</div>
                <div className="print-kop-tanggal">Dicetak {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>Nama Siswa</th>
                  {itemsShown.map(it => <th key={it.kolom}>{it.nama}</th>)}
                </tr>
              </thead>
              <tbody>
                {kelasDetail.siswa.filter(s => s.nama.toLowerCase().includes(cariSiswaDetail.toLowerCase())).length === 0 && (
                  <tr><td colSpan={itemsShown.length + 1} style={{ textAlign: 'center', color: 'var(--muted)' }}>Tidak ada siswa yang cocok</td></tr>
                )}
                {kelasDetail.siswa.filter(s => s.nama.toLowerCase().includes(cariSiswaDetail.toLowerCase())).map(s => (
                  <tr key={s.nama}>
                    <td>{s.nama}</td>
                    {itemsShown.map(it => {
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
                        : target > 0 ? `-${rpSingkat(target)}` : '—';
                      return (
                        <td key={it.kolom} title={tooltip}>
                          <span className={`status-chip ${status}`}>{teks}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              {kelasDetail.siswa.length > 0 && (
                <tfoot>
                  <tr>
                    <td style={{ fontWeight: 700 }}>TOTAL</td>
                    {itemsShown.map(it => {
                      const totalItem = kelasDetail.siswa
                        .filter(s => s.nama.toLowerCase().includes(cariSiswaDetail.toLowerCase()))
                        .reduce((sum, s) => sum + (Number(s.values[it.kolom]) || 0), 0);
                      return <td key={it.kolom} className="num" style={{ fontWeight: 700 }} title={rp(totalItem)}>{rpSingkat(totalItem)}</td>;
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {printModeSiswa && (
            <div className="print-only-siswa">
              {siswaCocok.map((s, i) => (
                <div key={s.nama} className="siswa-print-card" style={{ pageBreakAfter: i < siswaCocok.length - 1 ? 'always' : 'auto' }}>
                  <div className="print-kop">
                    <img src="/logo-mi.png" alt="" className="print-kop-logo" />
                    <div>
                      <div className="print-kop-sekolah">MI Unwanul Huda 1</div>
                      <div className="print-kop-judul">Rekap Status Pembayaran Siswa</div>
                      <div className="print-kop-tanggal">Dicetak {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                  </div>
                  <div style={{ margin: '14px 0', fontSize: 13.5 }}>
                    <div><b>Nama</b>: {s.nama}</div>
                    <div><b>Kelas</b>: {kelasDetailPilih}</div>
                  </div>
                  <table>
                    <thead><tr><th>Item</th><th className="num">Status</th><th className="num">Nominal</th></tr></thead>
                    <tbody>
                      {itemsShown.map(it => {
                        const val = Number(s.values[it.kolom]) || 0;
                        const ket = s.keterangan?.[it.kolom];
                        const target = targetSebenarnya(it.nama, ket, it.target);
                        const status = hitungStatus(val, target);
                        const sisa = target ? target - val : null;
                        return (
                          <tr key={it.kolom}>
                            <td>{it.nama}{ket ? ` (${ket})` : ''}</td>
                            <td className="num">{status === 'lunas' ? 'Lunas' : status === 'cicil' ? `Nyicil (sisa ${rp(sisa)})` : 'Belum bayar'}</td>
                            <td className="num">{rp(val)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
          </>
          );
        })()}
      </div>

      <div className="two-col-panels">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title"><span className="ic-badge"><Icon name="receipt" size={14} /></span> Rekap per Item</div>
              <div className="panel-desc">Jumlah siswa terisi & total nominal per jenis pembayaran (PPDB/BUKU dipecah per gelombang & kelas)</div>
            </div>
            <select className="no-print" style={{ width: 'auto', margin: 0 }} value={rekapKelasFilter} onChange={e => setRekapKelasFilter(e.target.value)}>
              <option value="">Semua Kelas</option>
              {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="table-wrap">
            <table><thead><tr><th>Item</th><th className="num">Terisi</th><th className="num">Total Rp</th></tr></thead>
              <tbody>
                {rekap?.perItem.filter(i => i.nama !== 'TABUNGAN WAJIB').map(i => (
                  <Fragment key={i.kolom}>
                    <tr>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Icon name={i.nama === 'PPDB' ? 'layers' : i.nama === 'BUKU' ? 'book' : 'receipt'} size={13} />
                          {i.nama}
                        </span>
                      </td>
                      <td className="num">{i.terisi}</td>
                      <td className="num">{rp(i.nominal)}</td>
                    </tr>
                    {i.varian && i.varian.length > 0 && (
                      <tr className="no-print">
                        <td colSpan={3} style={{ paddingTop: 0, paddingBottom: 8 }}>
                          <select
                            style={{ width: 'auto', margin: '0 0 6px', fontSize: 12.5, padding: '4px 8px' }}
                            value={varianFilter[i.kolom] || ''}
                            onChange={e => setVarianFilter(v => ({ ...v, [i.kolom]: e.target.value }))}
                          >
                            <option value="">Semua varian {i.nama}</option>
                            {i.varian.map(v => <option key={v.label} value={v.label}>{v.label}</option>)}
                          </select>
                          {i.varian.filter(v => !varianFilter[i.kolom] || v.label === varianFilter[i.kolom]).map(v => (
                            <div key={v.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted)', padding: '3px 4px 3px 20px' }}>
                              <span><Icon name="filter" size={11} /> {v.label}</span>
                              <span>{v.terisi} siswa — {rp(v.nominal)}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title"><span className="ic-badge"><Icon name="clock" size={14} /></span> Bayar</div>
              <div className="panel-desc">Transaksi yang masuk tanggal terpilih</div>
            </div>
            <input
              type="date" className="no-print" style={{ width: 'auto' }}
              value={tanggalBayarFilter ? ddmmyyyyToIso(tanggalBayarFilter) : new Date().toISOString().slice(0, 10)}
              onChange={e => setTanggalBayarFilter(e.target.value ? isoToDdmmyyyy(e.target.value) : '')}
            />
          </div>
          <div className="table-wrap">
            <table><thead><tr><th>Kelas</th><th>Siswa</th><th>Item</th><th className="num">Rp</th></tr></thead>
              <tbody>
                {rekap && rekap.bayarHariIni.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>Belum ada transaksi tanggal ini</td></tr>}
                {rekap?.bayarHariIni.map((b, i) => <tr key={i}><td>{b.kelas}</td><td>{b.siswa}</td><td>{b.item}</td><td className="num">{rp(b.nominal)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title"><span className="ic-badge"><Icon name="money" size={14} /></span> Piutang per Siswa</div>
            <div className="panel-desc">Siswa yang belum lunas & sisa kekurangan bayar</div>
          </div>
          <div className="toolbar no-print">
            <select style={{ width: 'auto', margin: 0 }} value={rekapKelasFilter} onChange={e => setRekapKelasFilter(e.target.value)}>
              <option value="">Semua Kelas</option>
              {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <input style={{ width: 'auto' }} placeholder="cari nama siswa..." value={cariPiutang} onChange={e => setCariPiutang(e.target.value)} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={hanya30} onChange={e => setHanya30(e.target.checked)} /> {'>'}30 hari
            </label>
          </div>
        </div>
        <div className="table-wrap">
          <table><thead><tr><th>Siswa</th><th>Kelas</th><th>Kurang di Item</th><th className="num">Total Kurang</th></tr></thead>
            <tbody>
              {rekap && rekap.piutang.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>Semua siswa udah lunas</td></tr>}
              {rekap?.piutang.filter(pi => pi.siswa.toLowerCase().includes(cariPiutang.toLowerCase()) && (!hanya30 || pi.lewat30)).map((pi, i) => (
                <tr key={i}>
                  <td>{pi.siswa} {pi.lewat30 && <span className="status-chip belum" title="Terdaftar >30 hari, masih ada piutang">{'>'}30 hari</span>}</td>
                  <td>{pi.kelas}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{pi.items.map(it => it.nama).join(', ')}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{rp(pi.kurang)}</td>
                </tr>
              ))}
            </tbody>
            {rekap && rekap.piutang.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ fontWeight: 700 }}>Total Piutang</td>
                  <td className="num" style={{ fontWeight: 700 }}>{rp(rekap.piutang.reduce((s, pi) => s + pi.kurang, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}
