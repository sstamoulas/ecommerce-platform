import { NextResponse } from "next/server";

import { getRepository } from "@/lib/data";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const repo = getRepository();
  const { slug } = await params;
  const product = await repo.getProductBySlug(slug);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ data: product });
}
