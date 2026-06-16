import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusPill } from "@/components/status-pill";
import { requireAdminPage } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";
import { formatDate } from "@/lib/utils";

type PromotionEditPageProps = {
  params: Promise<{
    promotionId: string;
  }>;
};

const promotionTypes = ["percent", "fixed_amount", "bundle", "bogo", "free_shipping"] as const;
const promotionStatuses = ["draft", "active", "scheduled", "ended"] as const;

export default async function PromotionEditPage({ params }: PromotionEditPageProps) {
  await requireAdminPage("/admin/promotions");

  const { promotionId } = await params;
  const repo = getRepository();
  const promotion = await repo.getPromotionById(promotionId);

  if (!promotion) {
    notFound();
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Edit promotion</span>
        <h1>{promotion.name}</h1>
        <p>Tune the offer copy and its lifecycle without changing the rest of the catalog.</p>
        <div className="hero__actions">
          <StatusPill status={promotion.status} />
          <span className="chip">{formatDate(promotion.validThrough)}</span>
        </div>
      </section>

      <section className="panel">
        <form className="form-grid" action={`/api/v1/admin/promotions/${promotion.id}`} method="post">
          <input type="hidden" name="action" value="update" />

          <div className="field">
            <span>Name</span>
            <input name="name" defaultValue={promotion.name} required />
          </div>

          <div className="field">
            <span>Description</span>
            <textarea name="description" rows={4} defaultValue={promotion.description} required />
          </div>

          <div className="field">
            <span>Code</span>
            <input name="code" defaultValue={promotion.code ?? ""} />
          </div>

          <div className="field">
            <span>Type</span>
            <select name="type" defaultValue={promotion.type}>
              {promotionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span>Status</span>
            <select name="status" defaultValue={promotion.status}>
              {promotionStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span>Discount summary</span>
            <input name="discountSummary" defaultValue={promotion.discountSummary} required />
          </div>

          <div className="field">
            <span>Applies to</span>
            <input name="appliesTo" defaultValue={promotion.appliesTo} required />
          </div>

          <div className="field">
            <span>Valid through</span>
            <input name="validThrough" type="date" defaultValue={promotion.validThrough} required />
          </div>

          <div className="hero__actions">
            <button className="button button-primary" type="submit">
              Save changes
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="hero__actions" style={{ justifyContent: "space-between" }}>
          <Link className="button button-secondary" href="/admin/promotions">
            Back to promotions
          </Link>
          <form action={`/api/v1/admin/promotions/${promotion.id}`} method="post">
            <input type="hidden" name="action" value="delete" />
            <button className="button button-secondary" type="submit">
              Delete promotion
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
