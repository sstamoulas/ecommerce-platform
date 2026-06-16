import { NextResponse } from "next/server";

import { getRepository } from "@/lib/data";
import type { PromotionStatus } from "@/lib/types";

export async function GET(request: Request) {
  const repo = getRepository();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const data = await repo.listPromotions(
    status ? { status: status as PromotionStatus } : { status: "active" }
  );

  return NextResponse.json({
    data,
    meta: {
      count: data.length,
      status: status ?? "active",
    },
  });
}
