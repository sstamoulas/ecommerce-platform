import { createFirestoreRepository } from "@/lib/data/backends/firestoreRepository";
import { createMockRepository } from "@/lib/data/backends/mockRepository";
import { createPostgresRepository } from "@/lib/data/backends/postgresRepository";
import type { DataBackend, EcommerceRepository } from "@/lib/data/repository";

function resolveBackend(value: string | undefined): DataBackend {
  const backend = value?.trim().toLowerCase();

  if (!backend) {
    return process.env.DATABASE_URL?.trim() ? "postgres" : "mock";
  }

  if (backend === "mock" || backend === "firestore" || backend === "postgres") {
    return backend;
  }

  throw new Error(`Unsupported DATA_BACKEND value: ${value}`);
}

export function getRepository(backendOverride?: DataBackend): EcommerceRepository {
  const backend = backendOverride ?? resolveBackend(process.env.DATA_BACKEND);

  if (backend === "mock") return createMockRepository();
  if (backend === "firestore") return createFirestoreRepository();
  return createPostgresRepository();
}
