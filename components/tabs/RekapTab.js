'use client';
import { Fragment, useState } from 'react';
import { motion } from 'motion/react';
import { Icon } from '@/lib/icons';
import { hitungStatus } from '@/lib/target';
import { BarFill } from '@/components/BarFill';
import { rp, rpSingkat, targetSebenarnya, ddmmyyyyToIso, isoToDdmmyyyy } from '@/lib/format';

export function RekapTab({ p }) {
  const {
    rekap, loadRekap, kelasList, rekapKelasFilter, setRekapKelasFilter,
    kelasDetailPilih, setKelasDetailPilih, cariSiswaDetail, setCariSiswaDetail,
    loadingDetail, kelasDetail, varianFilter, setVarianFilter,
    tanggalBayarFilter, setTanggalBayarFilter,
  } = p;

  const [cariPiutang, setCariPiutang] = useState('');
  const [hanya30, setHanya30] = useState(false);
  const [itemDetailFilter, setItemDetailFilter] = useState('');

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
  const totalTerkumpul = rekap ? rekap.perItem.reduce((s, i) => s + i.nominal, 0) : 0;
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

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title"><span className="ic-badge"><Icon name="list" size={14} /></span> Data Siswa per Kelas</div>
            <div className="panel-desc">Status pembayaran tiap siswa, per item</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="no-print" style={{ width: 'auto', margin: 0 }} value={kelasDetailPilih} onChange={e => setKelasDetailPilih(e.target.value)}>
              {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            {kelasDetail && (
              <select className="no-print" style={{ width: 'auto', margin: 0 }} value={itemDetailFilter} onChange={e => setItemDetailFilter(e.target.value)}>
                <option value="">Semua Item</option>
                {kelasDetail.items.map(it => <option key={it.kolom} value={it.kolom}>{it.nama}</option>)}
              </select>
            )}
            {kelasDetail && <button className="secondary action-btn btn-icon no-print" onClick={() => downloadCsvSiswa(kelasDetail.items.filter(it => !itemDetailFilter || String(it.kolom) === itemDetailFilter))}><Icon name="list" size={14} /> Export Excel (CSV)</button>}
            <button className="secondary action-btn btn-icon no-print" onClick={() => window.print()}><Icon name="receipt" size={14} /> Download PDF</button>
          </div>
        </div>

        <div className="search-box no-print" style={{ marginBottom: 12, maxWidth: 320 }}>
          <span className="search-ic"><Icon name="search" size={15} /></span>
          <input value={cariSiswaDetail} onChange={e => setCariSiswaDetail(e.target.value)} placeholder="cari nama siswa..." />
        </div>

        {loadingDetail && <div className="empty-state"><span className="spinner" />Memuat...</div>}
        {!loadingDetail && kelasDetail && (() => {
          const itemsShown = kelasDetail.items.filter(it => !itemDetailFilter || String(it.kolom) === itemDetailFilter);
          return (
          <div className="table-wrap">
            <div className="print-only print-kop">
              <img src="/logo-mi.png" alt="" className="print-kop-logo" />
              <div>
                <div className="print-kop-sekolah">MI Unwanul Huda 1</div>
                <div className="print-kop-judul">Rekap Status Pembayaran — {kelasDetailPilih}{itemDetailFilter ? ` — ${itemsShown[0]?.nama || ''}` : ''}</div>
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
                      return (
                        <td key={it.kolom} title={tooltip}>
                          <span className={`status-chip ${status}`}>
                            {status === 'lunas' ? '✓' : status === 'cicil' ? rpSingkat(val) : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                {rekap?.perItem.map(i => (
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
