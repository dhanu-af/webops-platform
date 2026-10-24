// Generated wrappers: see unwrap.ts. Import these (not lib/actions) from client components.
import { unwrapAction } from "./unwrap";
import {
  createWorkflow as createWorkflowRaw,
  updateWorkflow as updateWorkflowRaw,
} from "@/lib/actions/workflows";

export const createWorkflow = unwrapAction(createWorkflowRaw);
export const updateWorkflow = unwrapAction(updateWorkflowRaw);
