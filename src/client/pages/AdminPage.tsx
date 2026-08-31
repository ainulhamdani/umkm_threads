import { useEffect, useState } from "react";
import { listAdminProducts, listAdminSellers, type AdminProduct, type AdminSeller } from "../api";
import { adminErrorMessage } from "../admin-utils";
import { AdminPageLayout } from "../components/AdminPageLayout";
import { Icon } from "../components/Icon";
import { ui } from "../../shared/i18n";

export function AdminPage() {
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listAdminSellers(), listAdminProducts()])
      .then(([sellerResult, productResult]) => {
        setSellers(sellerResult.items);
        setProducts(productResult.items);
      })
      .catch((reason: unknown) => {
        const message = adminErrorMessage(reason);
        if (message) setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state">{ui.loading}</div>;
  if (error && sellers.length === 0 && products.length === 0) return <div className="error-state" role="alert"><h1>Konsol superadmin tidak tersedia</h1><p>{error}</p><a className="button button-primary" href="/admin/login" data-nav="true">{ui.login}</a></div>;

  const visibleShopCount = sellers.filter((seller) => seller.shop?.visibilityStatus === "PUBLISHED").length;
  const visibleProductCount = products.filter((product) => product.visibilityStatus === "PUBLISHED" && product.available).length;
  return (
    <AdminPageLayout activeSection="overview" title={ui.adminConsole} description="Lihat ringkasan dan buka area pengelolaan platform.">
      {error ? <div className="error-state" role="alert">{error}</div> : null}
      <div className="admin-stat-grid" aria-label="Ringkasan platform"><article className="admin-stat"><Icon name="users" size={20} /><strong>{sellers.length}</strong><span>Total penjual</span></article><article className="admin-stat"><Icon name="store" size={20} /><strong>{visibleShopCount}</strong><span>Toko aktif</span></article><article className="admin-stat"><Icon name="package" size={20} /><strong>{visibleProductCount}</strong><span>Produk aktif</span></article></div>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Kelola platform</h2><p>Pilih area yang ingin Anda kelola.</p></div><Icon name="arrow-right" size={21} /></div>
        <div className="admin-quick-links">
          <a className="seller-action-card" href="/admin/sellers" data-nav="true"><span className="seller-action-icon"><Icon name="users" size={19} /></span><span><strong>Penjual</strong><span>Lihat penjual dan atur ulang PIN.</span></span><Icon name="arrow-right" size={18} /></a>
          <a className="seller-action-card" href="/admin/shops" data-nav="true"><span className="seller-action-icon"><Icon name="store" size={19} /></span><span><strong>Toko</strong><span>Kelola visibilitas katalog toko.</span></span><Icon name="arrow-right" size={18} /></a>
          <a className="seller-action-card" href="/admin/products" data-nav="true"><span className="seller-action-icon"><Icon name="package" size={19} /></span><span><strong>Produk</strong><span>Moderasi produk yang dipublikasikan.</span></span><Icon name="arrow-right" size={18} /></a>
          <a className="seller-action-card" href="/admin/adsense" data-nav="true"><span className="seller-action-icon"><Icon name="settings" size={19} /></span><span><strong>AdSense</strong><span>Atur penempatan iklan platform.</span></span><Icon name="arrow-right" size={18} /></a>
          <a className="seller-action-card" href="/admin/activity" data-nav="true"><span className="seller-action-icon"><Icon name="activity" size={19} /></span><span><strong>Log aktivitas</strong><span>Tinjau aktivitas terbaru.</span></span><Icon name="arrow-right" size={18} /></a>
        </div>
      </section>
    </AdminPageLayout>
  );
}
