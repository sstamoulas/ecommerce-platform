import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { requireAdminPage } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";
import { formatDate } from "@/lib/utils";

const promotionTypes = ["percent", "fixed_amount", "bundle", "bogo", "free_shipping"] as const;
const promotionStatuses = ["draft", "active", "scheduled", "ended"] as const;

export default async function AdminPromotionsPage() {
  await requireAdminPage("/admin/promotions");

  const repo = getRepository();
  const promotions = await repo.listPromotions();

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Promotions</span>
        <h1>Create and tune textile offers.</h1>
        <p>Keep discount rules visible so sales and operations know what is active and what is next.</p>
      </section>

      <section className="panel">
        <div className="panel__heading">
          <div>
            <span className="eyebrow">Create promotion</span>
            <h2>Launch a new discount or shipping offer</h2>
          </div>
        </div>

        <form className="form-grid" action="/api/v1/admin/promotions" method="post">
          <input type="hidden" name="action" value="create" />

          <div className="field">
            <span>Name</span>
            <input name="name" required />
          </div>

          <div className="field">
            <span>Description</span>
            <textarea name="description" rows={4} required />
          </div>

          <div className="field">
            <span>Code</span>
            <input name="code" />
          </div>

          <div className="field">
            <span>Type</span>
            <select name="type" defaultValue="percent">
              {promotionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span>Status</span>
            <select name="status" defaultValue="draft">
              {promotionStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span>Discount summary</span>
            <input name="discountSummary" required />
          </div>

          <div className="field">
            <span>Applies to</span>
            <input name="appliesTo" required />
          </div>

          <div className="field">
            <span>Valid through</span>
            <input name="validThrough" type="date" required />
          </div>

          <button className="button button-primary" type="submit">
            Create promotion
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel__heading">
          <div>
            <span className="eyebrow">Active and scheduled</span>
            <h2>Offer table</h2>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Promotion</th>
                <th>Status</th>
                <th>Type</th>
                <th>Through</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {promotions.map((promotion) => (
                <tr key={promotion.id}>
                  <td>
                    <strong>{promotion.name}</strong>
                    <p>{promotion.discountSummary}</p>
                  </td>
                  <td>
                    <StatusPill status={promotion.status} />
                  </td>
                  <td>{promotion.type}</td>
                  <td>{formatDate(promotion.validThrough)}</td>
                  <td>
                    <Link className="button button-secondary button-small" href={`/admin/promotions/${promotion.id}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
