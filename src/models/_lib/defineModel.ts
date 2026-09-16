import mongoose, { type Schema } from "mongoose";

type DefineModelOptions = {
  /**
   * Paths that must exist on a cached hot-reload model.
   * Missing paths are added via `schema.add` — never `delete mongoose.models.X`.
   */
  ensurePaths?: Record<string, unknown>;
};

/**
 * Compile or reuse a mongoose model safely under Next.js HMR.
 * Prefer this over hand-rolled `delete mongoose.models.*` variants.
 *
 * Returns the same loose typing as `mongoose.models.X || mongoose.model(...)`
 * so existing lean()/query call sites keep compiling under mongoose 9.
 */
export function defineModel(
  name: string,
  schema: Schema,
  options?: DefineModelOptions,
) {
  const existing = mongoose.models[name];
  if (existing) {
    if (options?.ensurePaths) {
      const toAdd: Record<string, unknown> = {};
      for (const [key, def] of Object.entries(options.ensurePaths)) {
        if (!existing.schema.path(key)) {
          toAdd[key] = def;
        }
      }
      if (Object.keys(toAdd).length > 0) {
        existing.schema.add(toAdd);
      }
    }
    return existing;
  }
  return mongoose.model(name, schema);
}
