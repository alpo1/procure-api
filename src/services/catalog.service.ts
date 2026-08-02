import { pipeline } from "stream/promises";
import { parse } from "csv-parse";
import { Readable } from "stream";
import { AppError } from "../errors/app-error";
import { findSupplierById } from "../repositories/supplier.repository";
import { insertCatalogItemsBatch } from "../repositories/catalog.repository";
import { catalogRowSchema, CatalogRowInput } from "../validators/catalog.validators";
import { recordAudit } from "./audit.service";

const BATCH_SIZE = 500;

export interface ImportSummary {
  imported: number;
  failed: number;
}

export async function importCatalogCsv(
  supplierId: number,
  fileStream: Readable,
  userId: number
): Promise<ImportSummary> {
  const supplier = await findSupplierById(supplierId);
  if (!supplier) {
    throw new AppError(404, "Supplier not found");
  }

  const parser = parse({
    columns: true,
    trim: true,
    skip_empty_lines: true,
  });

  let imported = 0;
  let failed = 0;
  let batchIndex = 0;

  // Sink stage: an async generator that never yields. `stream/promises`'s
  // `pipeline` explicitly supports async generator functions as any stage,
  // including the last — this is the documented Node idiom for "consume
  // everything, produce nothing" while still getting pipeline's backpressure
  // and error propagation. A plain (non-generator) async function as the
  // last stage is riskier: pipeline has no iteration protocol to rely on for
  // it, so it's easy to forget to actually drain `source`, which would hang
  // the pipeline (nothing reads from upstream, defeating backpressure)
  // rather than fail loudly.
  async function* sink(source: AsyncIterable<Record<string, string>>): AsyncGenerator<never> {
    let batch: CatalogRowInput[] = [];

    const flush = async (): Promise<void> => {
      if (batch.length === 0) {
        return;
      }
      const currentBatch = batch;
      const isFirstBatch = batchIndex === 0;
      batchIndex += 1;
      batch = [];

      try {
        const written = await insertCatalogItemsBatch(supplierId, currentBatch);
        imported += written.length;
        failed += currentBatch.length - written.length;
      } catch (err) {
        // A failure on the FIRST batch is treated as systemic (bad
        // connection, pool exhaustion, schema mismatch) rather than bad
        // data, so the whole import aborts loudly instead of silently
        // reporting a falsely-reassuring all-failed summary. A failure on
        // any LATER batch is far more likely isolated bad data slipping
        // past validation, so those rows are counted as failed and the
        // import continues — aborting entirely on one bad later batch would
        // contradict the point of returning a partial summary.
        if (isFirstBatch) {
          throw new AppError(500, "Catalog import failed: could not write to the database");
        }
        console.error("Catalog import: batch insert failed, counting rows as failed:", err);
        failed += currentBatch.length;
      }
    };

    for await (const rawRow of source) {
      const result = catalogRowSchema.safeParse(rawRow);
      if (!result.success) {
        // Invalid rows are counted as failed without ever reaching the DB —
        // no round trip is wasted on a row that can't possibly insert.
        failed += 1;
        continue;
      }
      batch.push(result.data);
      if (batch.length >= BATCH_SIZE) {
        await flush();
      }
    }
    await flush();
  }

  try {
    await pipeline(fileStream, parser, sink);
  } catch (err) {
    // Distinguish a malformed-CSV syntax error from csv-parse itself (the
    // client's fault, 400) from the systemic-DB-failure AppError(500)
    // already thrown and classified above — only wrap what isn't already
    // an AppError.
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(400, `Failed to parse CSV: ${(err as Error).message}`);
  }

  recordAudit({
    userId,
    action: "catalog.imported",
    entityType: "supplier",
    entityId: supplierId,
    details: { imported, failed },
  });

  return { imported, failed };
}
