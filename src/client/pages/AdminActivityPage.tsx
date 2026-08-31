import { useEffect, useState } from "react";
import { listAuditLogs, type AuditLog, type AuditLogPagination } from "../api";
import { adminErrorMessage } from "../admin-utils";
import { AdminPageLayout } from "../components/AdminPageLayout";
import { Icon } from "../components/Icon";
import { ui } from "../../shared/i18n";

function actionLabel(code: string): string {
  const labels: Record<string, string> = {
    SELLER_REGISTERED: "Penjual mendaftar",
    SELLER_LOGIN_SUCCEEDED: "Penjual masuk",
    SELLER_LOGIN_FAILED: "Percobaan masuk penjual gagal",
    SHOP_CREATED: "Toko dibuat",
    SHOP_UPDATED: "Profil toko diperbarui",
    PRODUCT_CREATED: "Produk dibuat",
    PRODUCT_UPDATED: "Produk diperbarui",
    PRODUCT_AVAILABILITY_CHANGED: "Ketersediaan produk diubah",
    SHOP_VISIBILITY_CHANGED: "Visibilitas toko diubah",
    PRODUCT_VISIBILITY_CHANGED: "Visibilitas produk diubah",
    SELLER_PIN_RESET: "PIN penjual diatur ulang",
    ADSENSE_SETTINGS_CHANGED: "Pengaturan iklan diubah",
    WHATSAPP_LINK_CREATED: "Tautan WhatsApp dibuat",
    seller_registered: "Penjual mendaftar",
    seller_login_success: "Penjual masuk",
    seller_login_failure: "Percobaan masuk penjual gagal",
    shop_created: "Toko dibuat",
    shop_updated: "Profil toko diperbarui",
    product_created: "Produk dibuat",
    product_updated: "Produk diperbarui",
    product_availability_changed: "Ketersediaan produk diubah",
    admin_visibility_changed: "Visibilitas konten diubah",
    seller_pin_reset: "PIN penjual diatur ulang",
    adsense_settings_changed: "Pengaturan iklan diubah",
    whatsapp_link_generated: "Tautan WhatsApp dibuat",
  };
  return labels[code] ?? "Aktivitas sistem";
}

export function AdminActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<AuditLogPagination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listAuditLogs(page)
      .then((result) => { setLogs(result.items); setPagination(result.pagination); })
      .catch((reason: unknown) => {
        setLogs([]);
        setPagination(null);
        const nextError = adminErrorMessage(reason);
        if (nextError) setError(nextError);
      })
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <div className="loading-state">{ui.loading}</div>;
  return (
    <AdminPageLayout activeSection="activity" title="Log aktivitas" description="Tinjau aktivitas platform untuk membantu pengawasan dan dukungan.">
      {error ? <div className="error-state" role="alert">{error}</div> : null}
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Aktivitas terbaru</h2><p>{pagination?.totalItems ?? logs.length} aktivitas</p></div><Icon name="activity" size={21} /></div><div className="admin-log-list">{logs.length === 0 ? <div className="empty-state">Belum ada aktivitas.</div> : logs.map((log) => <article className="admin-log-item" key={log.id}><span className="admin-log-icon"><Icon name="activity" size={15} /></span><div><strong>{actionLabel(log.actionCode)}</strong><span>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.createdAt))}</span></div></article>)}</div>{pagination && pagination.totalPages > 1 ? <nav className="admin-pagination" aria-label="Paginasi log aktivitas"><button className="button button-secondary" type="button" disabled={!pagination.hasPrevious || loading} onClick={() => setPage((current) => current - 1)}>Sebelumnya</button><span className="admin-pagination-status" aria-live="polite">Halaman {pagination.page} dari {pagination.totalPages}</span><button className="button button-secondary" type="button" disabled={!pagination.hasNext || loading} onClick={() => setPage((current) => current + 1)}>Berikutnya</button></nav> : null}</section>
    </AdminPageLayout>
  );
}
