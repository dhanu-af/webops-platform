// Generated wrappers: see unwrap.ts. Import these (not lib/actions) from client components.
import { unwrapAction } from "./unwrap";
import {
  attachQcSampleFile as attachQcSampleFileRaw,
  deleteQcSampleAttachment as deleteQcSampleAttachmentRaw,
} from "@/lib/actions/qc-attachment-actions";

export const attachQcSampleFile = unwrapAction(attachQcSampleFileRaw);
export const deleteQcSampleAttachment = unwrapAction(deleteQcSampleAttachmentRaw);
