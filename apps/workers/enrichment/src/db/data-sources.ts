import { ObjectId, type Db } from "mongodb";
import type { DataSourceDoc } from "../types";

const COLLECTION = "datasources";

/**
 * Fetch all DataSource documents.
 * Used by Stage 1 (classify) to build Fuse.js index for fuzzy matching.
 * The full collection (~2,368 entries) fits easily in memory.
 */
export async function getAllDataSources(db: Db): Promise<DataSourceDoc[]> {
  const collection = db.collection<DataSourceDoc>(COLLECTION);
  return collection.find({ status: "active" }).toArray();
}

/**
 * Find a single DataSource by exact name.
 */
export async function getDataSourceByName(
  db: Db,
  name: string
): Promise<DataSourceDoc | null> {
  const collection = db.collection<DataSourceDoc>(COLLECTION);
  return collection.findOne({ name });
}

/**
 * Find a single DataSource by _id.
 * Used by Stage 2 to look up the linked DataSource for a buyer.
 */
export async function getDataSourceById(
  db: Db,
  id: ObjectId
): Promise<DataSourceDoc | null> {
  const collection = db.collection<DataSourceDoc>(COLLECTION);
  return collection.findOne({ _id: id });
}
