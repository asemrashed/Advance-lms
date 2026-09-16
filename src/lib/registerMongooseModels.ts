import mongoose from "mongoose";
import Chapter from "@/models/Chapter";
import User from "@/models/User";

/**
 * Registers mongoose models required for RoutineSlot.populate() and similar refs.
 */
export function ensureMongooseModelsRegistered(): void {
  const required = [Chapter, User] as const;
  for (const model of required) {
    const name = model.modelName;
    if (!mongoose.models[name]) {
      throw new Error(
        `Mongoose model "${name}" is not registered. Check model imports.`,
      );
    }
  }
}
