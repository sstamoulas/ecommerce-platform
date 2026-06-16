import { NextResponse } from "next/server";

import { getFormBoolean, getFormCsv, getFormNumber, getFormOptionalNumber, getFormOptionalValue, getFormValue } from "@/lib/admin-form";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";

export async function POST(request: Request) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = getRepository();
  const formData = await request.formData();

  await repo.createProduct({
    slug: getFormValue(formData, "slug").trim(),
    name: getFormValue(formData, "name").trim(),
    description: getFormValue(formData, "description").trim(),
    categorySlug: getFormValue(formData, "categorySlug").trim(),
    material: getFormValue(formData, "material").trim(),
    weave: getFormValue(formData, "weave").trim(),
    color: getFormValue(formData, "color").trim(),
    width: getFormValue(formData, "width").trim(),
    unitType: getFormValue(formData, "unitType").trim() as "yard" | "meter" | "roll" | "bolt" | "piece" | "sample",
    unitIncrement: getFormNumber(formData, "unitIncrement", 1),
    price: getFormNumber(formData, "price", 0),
    compareAtPrice: getFormOptionalNumber(formData, "compareAtPrice"),
    stockQty: getFormNumber(formData, "stockQty", 0),
    minimumOrderQty: getFormNumber(formData, "minimumOrderQty", 1),
    badge: getFormValue(formData, "badge").trim(),
    shipbobReferenceId: getFormValue(formData, "shipbobReferenceId").trim(),
    visualTone: getFormValue(formData, "visualTone").trim() as "indigo" | "sand" | "sage" | "amber" | "ruby",
    status: getFormValue(formData, "status").trim() as "draft" | "active" | "archived",
    featured: getFormBoolean(formData, "featured"),
    specs: getFormCsv(formData, "specs"),
    dealNote: getFormOptionalValue(formData, "dealNote"),
  });

  return NextResponse.redirect(new URL("/admin/products", request.url), { status: 303 });
}
