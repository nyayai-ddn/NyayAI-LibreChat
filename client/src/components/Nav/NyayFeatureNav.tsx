/**
 * NyayFeatureNav (v2 — fixed)
 * ───────────────────────────
 * The LibreChat API (/api/endpoints) returns endpoint objects keyed by name
 * but does NOT expose the `group:` field from librechat.yaml.
 *
 * Fix: the nav hierarchy is defined here as a static config that mirrors your
 * librechat.yaml structure. Each entry references an endpoint `name` exactly
 * as it appears in librechat.yaml. The component confirms the endpoint exists
 * in the live API response before rendering it — so if an endpoint is removed
 * from the yaml, it disappears from the nav automatically.
 */

import { useState, useCallback, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGetEndpointsQuery } from '~/data-provider';
import {
  NYAY_NAV_CONFIG,
  type NavItem,
  type NavSection,
} from '~/features/agents/shared/nyayAgentRegistry';
import { useNewConvo } from '~/hooks';
import { cn } from '~/utils';

function loadOpenGroups(): Record<string, boolean> {
  try {
    const v = localStorage.getItem('nyay_nav_groups');
    return v ? JSON.parse(v) : {};
  } catch {
    return {};
  }
}

function saveOpenGroups(state: Record<string, boolean>) {
  try {
    localStorage.setItem('nyay_nav_groups', JSON.stringify(state));
  } catch {
    // ignore quota failures
  }
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={cn('flex-shrink-0 transition-transform duration-150', open && 'rotate-90')}
      aria-hidden="true"
    >
      <path
        d="M4 2.5L7.5 6L4 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SectionIcon({ path, active }: { path: string; active: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn(
        'flex-shrink-0 transition-colors duration-150',
        active ? 'text-text-primary' : 'text-text-secondary',
      )}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const GroupDivider = memo(function GroupDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 pb-0.5 pt-2">
      <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </span>
    </div>
  );
});

const SubItem = memo(function SubItem({
  item,
  onSelect,
  isActive,
}: {
  item: NavItem;
  onSelect: (item: NavItem) => void;
  isActive: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        'flex w-full items-center rounded-md py-1.5 pl-10 pr-3 text-left text-sm',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring-primary',
        isActive
          ? 'font-medium text-text-primary'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
      )}
    >
      {isActive && (
        <span className="mr-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-text-primary" />
      )}
      <span className="truncate">{item.label}</span>
    </button>
  );
});

const SectionHeader = memo(function SectionHeader({
  section,
  isOpen,
  isActive,
  onToggle,
}: {
  section: NavSection;
  isOpen: boolean;
  isActive: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left',
        'text-sm font-medium text-text-primary',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring-primary',
        isActive ? 'bg-surface-hover' : 'hover:bg-surface-hover',
      )}
    >
      <SectionIcon path={section.iconPath} active={isActive} />
      <span className="flex-1 truncate">{section.sectionLabel}</span>
      <ChevronIcon open={isOpen} />
    </button>
  );
});

export default function NyayFeatureNav() {
  const navigate = useNavigate();
  const { newConversation } = useNewConvo();
  const { data: endpointsConfig } = useGetEndpointsQuery();
  const [searchParams] = useSearchParams();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(loadOpenGroups);
  const activeEndpoint = searchParams.get('endpoint') ?? '';

  const toggleGroup = useCallback((label: string) => {
    setOpenGroups((prev) => {
      const isCurrentlyOpen = prev[label] ?? true;
      const next = { ...prev, [label]: !isCurrentlyOpen };
      saveOpenGroups(next);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (item: NavItem) => {
      newConversation({
        template: {
          endpoint: item.endpointName as never,
          model: item.model,
        },
      });

      const nextSearchParams = new URLSearchParams();
      nextSearchParams.set('endpoint', item.endpointName);
      nextSearchParams.set('model', item.model);
      navigate(`/c/new?${nextSearchParams.toString()}`, { state: { focusChat: true } });
    },
    [newConversation, navigate],
  );

  const visibleSections = NYAY_NAV_CONFIG.map((section) => {
    // Keep dividers as-is; filter non-divider items by live endpoint presence.
    const filtered = section.items.filter(
      (item) =>
        item.divider ||
        (endpointsConfig && (endpointsConfig as Record<string, unknown>)[item.endpointName]),
    );
    // Remove dividers that have no real items following them (dangling headers).
    const cleaned = filtered.filter((item, idx) => {
      if (!item.divider) return true;
      // Keep the divider only if a non-divider item appears after it.
      return filtered.slice(idx + 1).some((next) => !next.divider);
    });
    return { ...section, items: cleaned };
  }).filter((section) => section.items.some((item) => !item.divider));

  if (visibleSections.length === 0) {
    return null;
  }

  return (
    <div className="nyay-feature-nav mb-1 flex flex-col gap-0.5 px-0">
      {visibleSections.map((section) => {
        const { sectionLabel, items } = section;
        const isOpen = openGroups[sectionLabel] ?? true;
        const isSectionActive = items.some((item) => item.endpointName === activeEndpoint);
        return (
          <div key={sectionLabel} className="nyay-group">
            <SectionHeader
              section={section}
              isOpen={isOpen}
              isActive={isSectionActive}
              onToggle={() => toggleGroup(sectionLabel)}
            />
            {isOpen && (
              <div className="mb-0.5 flex flex-col gap-0.5">
                {items.map((item, idx) =>
                  item.divider ? (
                    <GroupDivider key={`divider-${idx}`} label={item.label} />
                  ) : (
                    <SubItem
                      key={item.endpointName}
                      item={item}
                      onSelect={handleSelect}
                      isActive={item.endpointName === activeEndpoint}
                    />
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="mx-2 my-1.5 border-t border-border-light" />
    </div>
  );
}
