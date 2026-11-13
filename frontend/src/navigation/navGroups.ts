import {
  Building2,
  HeartPulse,
  Landmark,
  MapPinned,
  PackageSearch,
  Store,
  Truck,
  Warehouse,
} from 'lucide-react';

import type { NavGroup } from './navigation';
import { HOME_PATH } from './paths';

/**
 * Every signed-in screen, grouped by the organisation or role that works in it.
 * This table drives the sidebar, the page header and each page's title. The
 * screens themselves are the `page.tsx` files under `src/app/(app)`; a page
 * that is missing from this table fails the build, and a test fails if the
 * table names a path that has no page.
 *
 * Several workspaces reuse the same page component (orders, evidence, condom
 * items): the task is the same, only the workspace differs.
 */
export const navGroups: readonly NavGroup[] = [
  {
    id: 'moh',
    label: 'Ministry of Health',
    icon: Landmark,
    items: [
      {
        label: 'Dashboard',
        path: HOME_PATH,
        title: 'MOH dashboard',
      },
      { label: 'Users', path: '/moh/users', title: 'User management' },
      {
        label: 'Distribution',
        path: '/moh/distribution',
        title: 'Condom distribution',
      },
      {
        label: 'Procurement',
        path: '/moh/procurement',
        title: 'Procurement',
      },
      {
        label: 'Hotspot map',
        path: '/moh/hotspot-map',
        title: 'Hotspot map',
      },
    ],
  },
  {
    id: 'dcfp',
    label: 'District focal person',
    icon: HeartPulse,
    items: [
      {
        label: 'Dashboard',
        path: '/dcfp',
        title: 'District dashboard',
      },
      {
        label: 'Condom items',
        path: '/dcfp/condoms',
        title: 'Condom items',
      },
      {
        label: 'Condom stock',
        path: '/dcfp/stock',
        title: 'Condom stock',
      },
      { label: 'Orders', path: '/dcfp/orders', title: 'Orders' },
      { label: 'Evidence', path: '/dcfp/evidence', title: 'Evidence' },
      { label: 'Hotspots', path: '/dcfp/hotspots', title: 'Hotspots' },
      {
        label: 'Hotspot map',
        path: '/dcfp/hotspot-map',
        title: 'Hotspot map',
      },
    ],
  },
  {
    id: 'jms',
    label: 'JMS',
    icon: Warehouse,
    items: [
      {
        label: 'Dashboard',
        path: '/jms',
        title: 'JMS dashboard',
      },
      { label: 'Orders', path: '/jms/orders', title: 'JMS orders' },
      {
        label: 'Condom items',
        path: '/jms/condoms',
        title: 'Condom items',
      },
    ],
  },
  {
    id: 'nms',
    label: 'NMS',
    icon: Building2,
    items: [
      {
        label: 'Dashboard',
        path: '/nms',
        title: 'NMS dashboard',
      },
      { label: 'Orders', path: '/nms/orders', title: 'NMS orders' },
      {
        label: 'Condom items',
        path: '/nms/condoms',
        title: 'Condom items',
      },
    ],
  },
  {
    id: 'store',
    label: 'Store in charge',
    icon: Store,
    items: [
      {
        label: 'Dashboard',
        path: '/store',
        title: 'Store dashboard',
      },
      { label: 'Orders', path: '/store/orders', title: 'Orders' },
      { label: 'Evidence', path: '/store/evidence', title: 'Evidence' },
    ],
  },
  {
    id: 'suppliers',
    label: 'Other suppliers',
    icon: PackageSearch,
    items: [
      {
        label: 'Dashboard',
        path: '/suppliers',
        title: 'Supplier dashboard',
      },
      {
        label: 'Status check',
        path: '/suppliers/status',
        title: 'Submission status',
      },
      {
        label: 'Condom items',
        path: '/suppliers/condoms',
        title: 'Condom items',
      },
    ],
  },
  {
    id: 'hotspot-manager',
    label: 'Hotspot manager',
    icon: MapPinned,
    items: [
      {
        label: 'Dashboard',
        path: '/hotspot-manager',
        title: 'Hotspot dashboard',
      },
      {
        label: 'Orders',
        path: '/hotspot-manager/orders',
        title: 'Orders',
      },
      {
        label: 'Evidence',
        path: '/hotspot-manager/evidence',
        title: 'Evidence',
      },
    ],
  },
  {
    id: 'delivery',
    label: 'Delivery agent',
    icon: Truck,
    items: [
      { label: 'Condom items', path: '/delivery', title: 'Condom items' },
      { label: 'Orders', path: '/delivery/orders', title: 'Orders' },
      {
        label: 'Evidence',
        path: '/delivery/evidence',
        title: 'Evidence',
      },
    ],
  },
];
