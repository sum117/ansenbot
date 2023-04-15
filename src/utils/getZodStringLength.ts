import type { ZodString } from "zod";
import { ZodOptional } from "zod";

export default function getZodStringLength(zodKey: ZodString | ZodOptional<ZodString>): {
  min?: number;
  max?: number;
} {
  if (zodKey instanceof ZodOptional) {
    return {
      min: zodKey._def.innerType.minLength ?? undefined,
      max: zodKey._def.innerType.maxLength ?? undefined,
    };
  }
  return {
    min: zodKey.minLength ?? undefined,
    max: zodKey.maxLength ?? undefined,
  };
}
