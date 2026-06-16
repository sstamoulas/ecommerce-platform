import { NextResponse } from "next/server";

import { getRepository } from "@/lib/data";

type RouteContext = {
  params: Promise<{
    shipmentId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const repo = getRepository();
  const { shipmentId } = await params;
  const shipment =
    (await repo.getShipmentById(shipmentId)) ?? (await repo.getShipmentByTrackingNumber(shipmentId));

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  return NextResponse.json({ data: shipment });
}
