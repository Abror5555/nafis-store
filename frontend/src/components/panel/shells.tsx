"use client";

import {
  BoxIcon,
  BuildingIcon,
  ChartIcon,
  ChatIcon,
  HeadsetIcon,
  ReceiptIcon,
  UploadIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";

import PanelShell, { type NavItem } from "./PanelShell";

const BOSS_NAV: NavItem[] = [
  { href: "/boss", label: "Overview", icon: ChartIcon },
  { href: "/boss/users", label: "Users", icon: UsersIcon },
  { href: "/boss/firms", label: "Firms", icon: BuildingIcon },
  { href: "/boss/operators", label: "Operators", icon: HeadsetIcon },
  { href: "/boss/editors", label: "Content team", icon: UploadIcon },
  { href: "/boss/orders", label: "Orders", icon: ReceiptIcon },
  { href: "/boss/products", label: "Products", icon: BoxIcon },
];

const OPERATOR_NAV: NavItem[] = [
  { href: "/operator", label: "Chats", icon: ChatIcon },
  { href: "/operator/products", label: "Product facts", icon: BoxIcon },
  { href: "/operator/profile", label: "My profile", icon: UserIcon },
];

const EDITOR_NAV: NavItem[] = [
  { href: "/editor", label: "My work", icon: ChartIcon },
  { href: "/editor/new", label: "Add a product", icon: UploadIcon },
  { href: "/editor/products", label: "My products", icon: BoxIcon },
];

const FIRM_NAV: NavItem[] = [
  { href: "/firm", label: "Dashboard", icon: ChartIcon },
  { href: "/firm/products", label: "Products", icon: BoxIcon },
  { href: "/firm/profile", label: "Company profile", icon: BuildingIcon },
];

export function BossShell({ children }: { children: React.ReactNode }) {
  return (
    <PanelShell role="boss" title="Owner panel" nav={BOSS_NAV} root="/boss">
      {children}
    </PanelShell>
  );
}

export function OperatorShell({ children }: { children: React.ReactNode }) {
  return (
    <PanelShell role="operator" title="Operator desk" nav={OPERATOR_NAV} root="/operator">
      {children}
    </PanelShell>
  );
}

export function EditorShell({ children }: { children: React.ReactNode }) {
  return (
    <PanelShell role="editor" title="Content desk" nav={EDITOR_NAV} root="/editor">
      {children}
    </PanelShell>
  );
}

export function FirmShell({ children }: { children: React.ReactNode }) {
  return (
    <PanelShell role="firm" title="Seller centre" nav={FIRM_NAV} root="/firm">
      {children}
    </PanelShell>
  );
}
