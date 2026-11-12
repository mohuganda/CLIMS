import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';

import type { NavGroup } from '@/app/router/navigation';
import { HOME_PATH } from '@/app/router/paths';
import { Brand } from '@/components/layout/Brand';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface NavGroupSectionProps {
  group: NavGroup;
  pathname: string;
}

function NavGroupSection({ group, pathname }: NavGroupSectionProps) {
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar();
  const isActive = group.items.some((item) => item.path === pathname);
  const [isExpanded, setIsExpanded] = useState(isActive);

  // Navigating into a group (by link, back button or redirect) reveals it.
  const [wasActive, setWasActive] = useState(isActive);
  if (isActive !== wasActive) {
    setWasActive(isActive);
    if (isActive) setIsExpanded(true);
  }

  const Icon = group.icon;
  const isCollapsedToIcons = state === 'collapsed' && !isMobile;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} asChild>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={group.label}
            onClick={() => {
              // In icon mode the sub-links are hidden, so open the sidebar to show them.
              if (isCollapsedToIcons) {
                setOpen(true);
                setIsExpanded(true);
              }
            }}
            className={cn(
              'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground h-10 gap-3 rounded-lg px-3 font-medium',
              isActive && 'text-sidebar-foreground',
            )}
          >
            <Icon className={cn('size-5!', isActive && 'text-success')} aria-hidden="true" />
            <span>{group.label}</span>
            <ChevronRight
              className={cn(
                'ml-auto size-4! transition-transform duration-200',
                isExpanded && 'rotate-90',
              )}
              aria-hidden="true"
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 ml-5.5 gap-0.5 pr-0">
            {group.items.map((item) => {
              const isCurrent = item.path === pathname;
              return (
                <SidebarMenuSubItem key={item.path}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isCurrent}
                    className={cn(
                      'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground relative h-8 rounded-lg px-3',
                      // The reference design's active marker: a short green bar on the leading edge.
                      isCurrent &&
                        'text-sidebar-foreground before:bg-primary font-medium before:absolute before:top-1/2 before:-left-px before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full',
                    )}
                  >
                    <Link
                      to={item.path}
                      aria-current={isCurrent ? 'page' : undefined}
                      onClick={() => {
                        setOpenMobile(false);
                      }}
                    >
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

interface AppSidebarProps {
  groups: readonly NavGroup[];
}

/** The primary navigation: one collapsible section per workspace. */
export function AppSidebar({ groups }: AppSidebarProps) {
  const { pathname } = useLocation();
  const { state, toggleSidebar, isMobile } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center border-b px-4 group-data-[collapsible=icon]:px-1.5">
        <Link
          to={HOME_PATH}
          className="focus-visible:ring-sidebar-ring rounded-lg outline-none focus-visible:ring-2"
        >
          <Brand compact={isCollapsed} />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3 py-4 group-data-[collapsible=icon]:px-2">
          <nav aria-label="Main">
            <SidebarMenu className="gap-1">
              {groups.map((group) => (
                <NavGroupSection key={group.id} group={group} pathname={pathname} />
              ))}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="hidden border-t p-3 group-data-[collapsible=icon]:p-2 md:flex">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip="Expand sidebar"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground h-9 justify-center gap-2 rounded-lg"
            >
              <ChevronLeft
                className={cn(
                  'size-5! transition-transform duration-200',
                  isCollapsed && 'rotate-180',
                )}
                aria-hidden="true"
              />
              <span>Collapse</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
