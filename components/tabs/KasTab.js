'use client';
import { Icon } from '@/lib/icons';
import { rp, rpSigned, formatRibuan, ddmmyyyyToIso, isoToDdmmyyyy, KATEGORI_PENGELUARAN } from '@/lib/format';

export function KasTab({ p }) {
  const {
    tanggalKas, setTanggalKas, kas, loadingKas, loadKas,
    role, ketPengeluaran, setKetPengeluaran, nominalPengeluaran, setNominalPengeluaran,
    kategoriPengeluaran, setKategoriPengeluaran,
    loadingPengeluaran, tambahPengeluaran, statusKas,
  } = p;

  return (
    <div className="bayar-grid">
      <div className="panel panel-print">
        <div className="panel-header">
          <div>
            <div className="panel-title"><span className="ic-badge"><Icon name="wallet" size={14} /></span> {tanggalKas === 'semua' ? 'Kas Semua Tanggal' : 'Kas Hari Ini'}</div>
            <div className="panel-desc">{kas ? kas.tanggal : '—'}</div>
          </div>
          <div className="toolbar no-print">
            <input
              type="date"
              value={tanggalKas && tanggalKas !== 'semua' ? ddmmyyyyToIso(tanggalKas) : ''}
              onChange={e => setTanggalKas(e.target.value ? isoToDdmmyyyy(e.target.value) : '')}
            />
            <button className={`secondary action-btn btn-icon ${tanggalKas === 'semua' ? 'active-toggle' : ''}`} onClick={() => setTanggalKas(tanggalKas === 'semua' ? '' : 'semua')}>
              <Icon name="list" size={14} /> {tanggalKas === 'semua' ? 'Kembali ke Hari Ini' : 'Lihat Semua'}
            </button>
            <button className="secondary action-btn btn-icon" onClick={loadKas}><Icon name="refresh" size={14} /> Refresh</button>
            <button className="secondary action-btn btn-icon" onClick={() => window.print()}><Icon name="receipt" size={14} /> Download PDF</button>
          </div>
        </div>

        {loadingKas && <div className="empty-state"><span className="spinner" />Memuat...</div>}
        {!loadingKas && kas && (
          <>
            <div className="print-only print-kop">
              <img src="/logo-mi.png" alt="Logo" className="print-kop-logo" />
              <div>
                <div className="print-kop-sekolah">MI Unwanul Huda 1</div>
                <div className="print-kop-judul">Laporan Kas — {kas.tanggal}</div>
                <div className="print-kop-tanggal">Dicetak {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
              </div>
            </div>

            {kas.trend7hari && kas.trend7hari.length > 0 && (
              <div className="no-print" style={{ marginBottom: 20 }}>
                <div className="subsection-title">Trend Saldo 7 Hari Terakhir</div>
                <div className="trend-sparkline">
                  {(() => {
                    const max = Math.max(1, ...kas.trend7hari.map(t => Math.abs(t.saldo)));
                    return kas.trend7hari.map((t, i) => (
                      <div key={i} className="trend-bar-col" title={`${t.tanggal}: ${rpSigned(t.saldo)}`}>
                        <div className={`trend-bar ${t.saldo >= 0 ? 'in' : 'out'}`} style={{ height: `${Math.max(4, (Math.abs(t.saldo) / max) * 48)}px` }} />
                        <div className="trend-bar-label">{t.tanggal}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            <div className="stat-grid" style={{ marginBottom: 20 }}>
              <div className="stat-tile stat-tile-green">
                <div className="stat-tile-icon"><Icon name="down" size={22} /></div>
                <div><div className="label">Uang Masuk</div><div className="value value-money">{rp(kas.masuk)}</div></div>
              </div>
              <div className="stat-tile stat-tile-rose">
                <div className="stat-tile-icon"><Icon name="up" size={22} /></div>
                <div><div className="label">Uang Keluar</div><div className="value value-money">{rp(kas.keluar)}</div></div>
              </div>
              <div className={`stat-tile ${kas.saldo >= 0 ? 'stat-tile-blue' : 'stat-tile-rose'}`}>
                <div className="stat-tile-icon"><Icon name="case" size={22} /></div>
                <div><div className="label">Saldo Hari Ini</div><div className="value value-money">{rpSigned(kas.saldo)}</div></div>
              </div>
            </div>

            {(kas.masuk > 0 || kas.keluar > 0) && (
              <div className="cashflow-bar-wrap" style={{ marginBottom: 24 }}>
                <div className="cashflow-bar">
                  {kas.masuk > 0 && <div className="cashflow-seg in" style={{ width: `${(kas.masuk / (kas.masuk + kas.keluar)) * 100}%` }} />}
                  {kas.keluar > 0 && <div className="cashflow-seg out" style={{ width: `${(kas.keluar / (kas.masuk + kas.keluar)) * 100}%` }} />}
                </div>
                <div className="cashflow-legend">
                  <span><i className="dot in" /> Masuk {Math.round((kas.masuk / (kas.masuk + kas.keluar || 1)) * 100)}%</span>
                  <span><i className="dot out" /> Keluar {Math.round((kas.keluar / (kas.masuk + kas.keluar || 1)) * 100)}%</span>
                </div>
              </div>
            )}

            <div className="subsection-title">Rekap Setoran per Item</div>
            <div className="table-wrap" style={{ marginBottom: 20 }}>
              <table>
                <thead><tr><th>Item</th><th className="num">Jumlah Orang</th><th className="num">Total Rp</th><th className="num">%</th></tr></thead>
                <tbody>
                  {kas.rekapPerItem.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>Belum ada setoran hari ini</td></tr>}
                  {kas.rekapPerItem.map((r, i) => (
                    <tr key={i}>
                      <td>{r.item}</td><td className="num">{r.orang}</td><td className="num">{rp(r.total)}</td>
                      <td className="num" style={{ color: 'var(--muted)' }}>{kas.masuk ? Math.round((r.total / kas.masuk) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
                {kas.rekapPerItem.length > 0 && (
                  <tfoot>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Total</td>
                      <td className="num" style={{ fontWeight: 700 }}>{kas.rekapPerItem.reduce((s, r) => s + r.orang, 0)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>{rp(kas.masuk)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>100%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {kas.rekapPerKategori && kas.rekapPerKategori.length > 0 && (
              <>
                <div className="subsection-title">Rekap Pengeluaran per Kategori</div>
                <div className="table-wrap" style={{ marginBottom: 20 }}>
                  <table>
                    <thead><tr><th>Kategori</th><th className="num">Jumlah Transaksi</th><th className="num">Total Rp</th></tr></thead>
                    <tbody>
                      {kas.rekapPerKategori.map((r, i) => (
                        <tr key={i}><td>{r.kategori}</td><td className="num">{r.jumlah}</td><td className="num">{rp(r.total)}</td></tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ fontWeight: 700 }}>Total</td>
                        <td className="num" style={{ fontWeight: 700 }}>{kas.rekapPerKategori.reduce((s, r) => s + r.jumlah, 0)}</td>
                        <td className="num" style={{ fontWeight: 700 }}>{rp(kas.keluar)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            <details className="collapsible" style={{ marginBottom: 12 }}>
              <summary>Detail Transaksi Masuk ({kas.transaksiMasuk.length})</summary>
              <div className="table-wrap">
                <table>
                  <thead><tr>{kas.semua && <th>Tanggal</th>}<th>Jam</th><th>Siswa</th><th>Item</th><th className="num">Rp</th></tr></thead>
                  <tbody>
                    {kas.transaksiMasuk.length === 0 && <tr><td colSpan={kas.semua ? 5 : 4} style={{ textAlign: 'center', color: 'var(--muted)' }}>Belum ada setoran</td></tr>}
                    {kas.transaksiMasuk.map((t, i) => (
                      <tr key={i}>{kas.semua && <td>{t.tanggal}</td>}<td>{t.jam}</td><td>{t.siswa} <span style={{ color: 'var(--muted)' }}>({t.kelas})</span></td><td>{t.item}</td><td className="num">{rp(t.nominal)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <details className="collapsible">
              <summary>Detail Pengeluaran ({kas.transaksiKeluar.length})</summary>
              <div className="table-wrap">
                <table>
                  <thead><tr>{kas.semua && <th>Tanggal</th>}<th>Keterangan</th><th>Kategori</th><th>Dicatat</th><th className="num">Rp</th></tr></thead>
                  <tbody>
                    {kas.transaksiKeluar.length === 0 && <tr><td colSpan={kas.semua ? 5 : 4} style={{ textAlign: 'center', color: 'var(--muted)' }}>Belum ada pengeluaran</td></tr>}
                    {kas.transaksiKeluar.map((t, i) => (
                      <tr key={i}>{kas.semua && <td>{t.tanggal}</td>}<td>{t.keterangan}</td><td>{t.kategori}</td><td>{t.user}</td><td className="num">{rp(t.nominal)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>

      {role === 'admin' && (
        <div className="panel no-print">
          <div className="panel-title"><span className="ic-badge"><Icon name="minus" size={14} /></span> Catat Pengeluaran</div>
          <div className="panel-desc">Tercatat otomatis tanggal hari ini</div>

          <label>Keterangan</label>
          <input value={ketPengeluaran} onChange={e => setKetPengeluaran(e.target.value)} placeholder="contoh: Beli ATK kantor" />

          <label>Kategori</label>
          <select value={kategoriPengeluaran} onChange={e => setKategoriPengeluaran(e.target.value)}>
            {KATEGORI_PENGELUARAN.map(k => <option key={k} value={k}>{k}</option>)}
          </select>

          <label>Nominal</label>
          <input type="text" inputMode="numeric" value={nominalPengeluaran} onChange={e => setNominalPengeluaran(formatRibuan(e.target.value))} placeholder="contoh: 150.000" />

          <button disabled={loadingPengeluaran} className="danger btn-icon" onClick={tambahPengeluaran}>
            {loadingPengeluaran ? <span className="spinner" /> : <Icon name="minus" size={15} />} Catat Pengeluaran
          </button>
          {statusKas && <div className={`status ${statusKas.sukses ? 'sukses' : 'gagal'}`}>{statusKas.pesan}</div>}
        </div>
      )}
    </div>
  );
}
