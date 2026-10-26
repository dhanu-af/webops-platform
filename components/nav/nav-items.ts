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
  type LucideIcon, ShieldAlert, Printer, Zap, BookOpenCheck, Tablet, Nfc } from "lucide-react";

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

// Records and planning screens are kept out of the sidebar for Operators and
// Viewers. This only hides the menu entry: operators still reach the record
// they are filling in (Start / Continue opens it directly).
const NOT_OPERATOR_OR_VIEWER: UserRole[] = ["SUPER_ADMIN", "ADMIN", "TEAM_LEADER", "SUPERVISOR", "QA", "MANAGEMENT"];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Today's Ops", href: "/today", icon: CalendarCheck2 },
      { label: "Pre-Start", href: "/pre-start", icon: ClipboardCheck },
      { label: "Line Clearance", href: "/line-clearance", icon: ClipboardX },
      { label: "Allergen Changeover", href: "/allergen-changeover", icon: ShieldAlert },
      { label: "Post-Op Cleaning", href: "/post-op", icon: SprayCan },
      { label: "Facility & Generator", href: "/facility-generator", icon: Zap },
      { label: "Cleaning Schedule", href: "/cleaning-schedule", icon: BookOpenCheck },
      { label: "5S Audits", href: "/five-s", icon: LayoutGrid },
      { label: "Production Staging", href: "/drying-room", icon: Fan },
    ],
  },
  {
    label: "Records",
    items: [
      { label: "Paper Forms", href: "/forms", icon: Printer, roles: NOT_OPERATOR_OR_VIEWER },
      { label: "Inspections", href: "/inspections", icon: History, roles: NOT_OPERATOR_OR_VIEWER },
      { label: "Corrective Actions", href: "/corrective-actions", icon: Wrench },
      { label: "Evidence Gallery", href: "/evidence", icon: Images },
      { label: "Equipment Calibration", href: "/calibration", icon: Gauge, roles: NOT_OPERATOR_OR_VIEWER },
      { label: "Manufacturing Reconciliation", href: "/mfg-reconciliation", icon: FlaskConical, roles: NOT_OPERATOR_OR_VIEWER },
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
      { label: "Checklists", href: "/checklists", icon: ListChecks, roles: NOT_OPERATOR_OR_VIEWER },
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
      { label: "Shop-floor iPads", href: "/admin/kiosks", icon: Tablet, roles: ADMIN_ROLES },
      { label: "Machine tags", href: "/admin/tags", icon: Nfc, roles: ADMIN_ROLES },
      { label: "Verification Workflows", href: "/admin/workflows", icon: Workflow, roles: ADMIN_ROLES },
      { label: "System Settings", href: "/admin/settings", icon: Settings, roles: ADMIN_ROLES },
    ],
  },
];
