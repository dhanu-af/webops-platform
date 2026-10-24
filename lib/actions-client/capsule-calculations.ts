// Generated wrappers: see unwrap.ts. Import these (not lib/actions) from client components.
import { unwrapAction } from "./unwrap";
import {
  createCalculation as createCalculationRaw,
  createCalculationFolder as createCalculationFolderRaw,
  deleteCalculation as deleteCalculationRaw,
  deleteCalculationFolder as deleteCalculationFolderRaw,
  moveCalculationToFolder as moveCalculationToFolderRaw,
  updateCalculation as updateCalculationRaw,
} from "@/lib/actions/capsule-calculations";

export const createCalculation = unwrapAction(createCalculationRaw);
export const createCalculationFolder = unwrapAction(createCalculationFolderRaw);
export const deleteCalculation = unwrapAction(deleteCalculationRaw);
export const deleteCalculationFolder = unwrapAction(deleteCalculationFolderRaw);
export const moveCalculationToFolder = unwrapAction(moveCalculationToFolderRaw);
export const updateCalculation = unwrapAction(updateCalculationRaw);
