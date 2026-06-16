import { NextResponse } from "next/server";

import { getRepository } from "@/lib/data";
import type { ProductStatus } from "@/lib/types";

export async function GET(request: Request) {
  const repo = getRepository();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";

  const data = await repo.listProducts({
    query: query || undefined,
    category: category || undefined,
    status: status ? (status as ProductStatus) : undefined,
  });

  return NextResponse.json({
    data,
    meta: {
      count: data.length,
      query,
      category: category || null,
      status: status || null,
    },
  });
}
