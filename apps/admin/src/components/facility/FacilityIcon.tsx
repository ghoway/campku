"use client";

import React from "react";
import * as lucide from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";

function toPascalCase(name: string): string {
  return name
    .replace(/[-\s_]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

const iconCache = new Map<string, LucideIcon>();

export function resolveFacilityIcon(name?: string | null): LucideIcon {
  const key = (name ?? "").trim().toLowerCase();
  if (!key) return lucide.CircleHelp;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const pascal = toPascalCase(key);
  const candidate = (lucide as unknown as Record<string, unknown>)[pascal];
  const resolved = candidate != null ? (candidate as LucideIcon) : lucide.CircleHelp;
  iconCache.set(key, resolved);
  return resolved;
}

export function isValidIconName(name?: string | null): boolean {
  const key = (name ?? "").trim();
  if (!key) return true;
  return resolveFacilityIcon(key) !== lucide.CircleHelp;
}

export default function FacilityIcon({
  name,
  ...props
}: { name?: string | null } & LucideProps) {
  const Icon = resolveFacilityIcon(name);
  return React.createElement(Icon, { "aria-hidden": true, ...props });
}