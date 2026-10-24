// Generated wrappers: see unwrap.ts. Import these (not lib/actions) from client components.
import { unwrapAction } from "./unwrap";
import {
  createFolder as createFolderRaw,
  createFormulation as createFormulationRaw,
  deleteFolder as deleteFolderRaw,
  deleteFormulation as deleteFormulationRaw,
  updateFormulation as updateFormulationRaw,
} from "@/lib/actions/formulation-actions";

export const createFolder = unwrapAction(createFolderRaw);
export const createFormulation = unwrapAction(createFormulationRaw);
export const deleteFolder = unwrapAction(deleteFolderRaw);
export const deleteFormulation = unwrapAction(deleteFormulationRaw);
export const updateFormulation = unwrapAction(updateFormulationRaw);
