import { NextResponse } from "next/server";

import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";

export async function GET(request: Request) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = getRepository();
  const shipments = await repo.listShipments();

  return NextResponse.json({
    data: shipments,
    meta: {
      count: shipments.length,
    },
  });
}
