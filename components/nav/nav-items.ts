import type { UserRole } from "@/app/generated/prisma/client";
import {
  LayoutDashboard,
  CalendarCheck2,
  ClipboardCheck,
  ClipboardX,
  SprayCan,
  LayoutGrid,
  History,
  Wrench,
  Images,
  CalendarDays,
  ListChecks,
  FileBarChart,
  BarChart3,
  ShieldCheck,
  Factory,
  Users,
  Workflow,
  Settings,
  ListPlus,
  Gauge,
  Calculator,
  FlaskConical,
  TestTube,
  Beaker,
  Fan,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN"];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Today's Ops", href: "/today", icon: CalendarCheck2 },
      { label: "Pre-Start", href: "/pre-start", icon: ClipboardCheck },
      { label: "Line Clearance", href: "/line-clearance", icon: ClipboardX },
      { label: "Post-Op Cleaning", href: "/post-op", icon: SprayCan },
      { label: "5S Audits", href: "/five-s", icon: LayoutGrid },
      { label: "Production Staging", href: "/drying-room", icon: Fan },
    ],
  },
  {
    label: "Records",
    items: [
      { label: "Inspections", href: "/inspections", icon: History },
      { label: "Corrective Actions", href: "/corrective-actions", icon: Wrench },
      { label: "Evidence Gallery", href: "/evidence", icon: Images },
      { label: "Equipment Calibration", href: "/calibration", icon: Gauge },
      { label: "Manufacturing Reconciliation", href: "/mfg-reconciliation", icon: FlaskConical },
      {
        label: "Formulation Manager",
        href: "/formulations",
        icon: Beaker,
        // Master recipes + batch calculator is a QA/production-planning
        // concern, not a floor task -- same nav-visibility precedent as
        // QC Samples below.
        roles: ["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "QA", "MANAGEMENT", "VIEWER"],
      },
      {
        label: "QC Samples",
        href: "/qc-samples",
        icon: TestTube,
        // Operators/Team Leaders still hold qc.collect (they can reach the
        // page via a QR-scan deep link to perform the physical collection
        // step) -- this only keeps the module out of their sidebar.
        roles: ["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "QA", "MANAGEMENT", "VIEWER"],
      },
    ],
  },
  {
    label: "Planning",
    items: [
      { label: "Calendar", href: "/calendar", icon: CalendarDays },
      { label: "Checklists", href: "/checklists", icon: ListChecks },
      // Same roles as reports.view (Reports/Analytics/Audit Trail below) --
      // this is a production-planning calculator, not a floor task.
      { label: "Calculation", href: "/calculation", icon: Calculator, roles: ["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "QA", "SUPERVISOR"] },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Reports", href: "/reports", icon: FileBarChart, roles: ["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "QA", "SUPERVISOR"] },
      { label: "Analytics", href: "/analytics", icon: BarChart3, roles: ["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "QA", "SUPERVISOR"] },
      { label: "Audit Trail", href: "/audit", icon: ShieldCheck, roles: ["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "QA", "SUPERVISOR"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Areas & Equipment", href: "/admin/areas", icon: Factory, roles: ADMIN_ROLES },
      { label: "Checklist Builder", href: "/admin/checklists", icon: ListPlus, roles: ADMIN_ROLES },
      { label: "Users", href: "/admin/users", icon: Users, roles: ADMIN_ROLES },
      { label: "Verification Workflows", href: "/admin/workflows", icon: Workflow, roles: ADMIN_ROLES },
      { label: "System Settings", href: "/admin/settings", icon: Settings, roles: ADMIN_ROLES },
    ],
  },
];
