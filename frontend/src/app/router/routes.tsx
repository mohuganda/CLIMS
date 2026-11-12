/* eslint-disable react-refresh/only-export-components -- a route table, not a component module: there is no state here for fast refresh to preserve */
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
import { lazy } from 'react';

import type { NavGroup } from './navigation';
import { HOME_PATH } from './paths';

/*
 * Pages are split into their own chunks so the sign-in screen does not pay for
 * charts, maps and tables it never shows.
 */
const MohDashboardPage = lazy(() => import('@/features/dashboards/MohDashboardPage'));
const StockDashboardPage = lazy(() => import('@/features/dashboards/StockDashboardPage'));
const OrdersDashboardPage = lazy(() => import('@/features/dashboards/OrdersDashboardPage'));
const UsersPage = lazy(() => import('@/features/users/UsersPage'));
const CondomsPage = lazy(() => import('@/features/condoms/CondomsPage'));
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage'));
const HotspotsPage = lazy(() => import('@/features/hotspots/HotspotsPage'));
const HotspotMapPage = lazy(() => import('@/features/hotspots/HotspotMapPage'));
const OrdersPage = lazy(() => import('@/features/orders/OrdersPage'));
const DistributionPage = lazy(() => import('@/features/orders/DistributionPage'));
const SupplierStatusPage = lazy(() => import('@/features/orders/SupplierStatusPage'));
const EvidencePage = lazy(() => import('@/features/evidence/EvidencePage'));
const ProcurementPage = lazy(() => import('@/features/procurement/ProcurementPage'));

/**
 * Every signed-in screen, grouped by the organisation or role that works in it.
 * This one table drives both the sidebar and the router, so a screen cannot be
 * routable but missing from navigation, or the reverse.
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
        element: <MohDashboardPage />,
      },
      { label: 'Users', path: '/moh/users', title: 'User management', element: <UsersPage /> },
      {
        label: 'Distribution',
        path: '/moh/distribution',
        title: 'Condom distribution',
        element: <DistributionPage />,
      },
      {
        label: 'Procurement',
        path: '/moh/procurement',
        title: 'Procurement',
        element: <ProcurementPage />,
      },
      {
        label: 'Hotspot map',
        path: '/moh/hotspot-map',
        title: 'Hotspot map',
        element: <HotspotMapPage />,
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
        element: <StockDashboardPage />,
      },
      {
        label: 'Condom items',
        path: '/dcfp/condoms',
        title: 'Condom items',
        element: <CondomsPage />,
      },
      {
        label: 'Condom stock',
        path: '/dcfp/stock',
        title: 'Condom stock',
        element: <InventoryPage />,
      },
      { label: 'Orders', path: '/dcfp/orders', title: 'Orders', element: <OrdersPage /> },
      { label: 'Evidence', path: '/dcfp/evidence', title: 'Evidence', element: <EvidencePage /> },
      { label: 'Hotspots', path: '/dcfp/hotspots', title: 'Hotspots', element: <HotspotsPage /> },
      {
        label: 'Hotspot map',
        path: '/dcfp/hotspot-map',
        title: 'Hotspot map',
        element: <HotspotMapPage />,
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
        element: <OrdersDashboardPage />,
      },
      { label: 'Orders', path: '/jms/orders', title: 'JMS orders', element: <OrdersPage /> },
      {
        label: 'Condom items',
        path: '/jms/condoms',
        title: 'Condom items',
        element: <CondomsPage />,
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
        element: <OrdersDashboardPage />,
      },
      { label: 'Orders', path: '/nms/orders', title: 'NMS orders', element: <OrdersPage /> },
      {
        label: 'Condom items',
        path: '/nms/condoms',
        title: 'Condom items',
        element: <CondomsPage />,
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
        element: <StockDashboardPage />,
      },
      { label: 'Orders', path: '/store/orders', title: 'Orders', element: <OrdersPage /> },
      { label: 'Evidence', path: '/store/evidence', title: 'Evidence', element: <EvidencePage /> },
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
        element: <OrdersDashboardPage />,
      },
      {
        label: 'Status check',
        path: '/suppliers/status',
        title: 'Submission status',
        element: <SupplierStatusPage />,
      },
      {
        label: 'Condom items',
        path: '/suppliers/condoms',
        title: 'Condom items',
        element: <CondomsPage />,
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
        element: <StockDashboardPage />,
      },
      {
        label: 'Orders',
        path: '/hotspot-manager/orders',
        title: 'Orders',
        element: <OrdersPage />,
      },
      {
        label: 'Evidence',
        path: '/hotspot-manager/evidence',
        title: 'Evidence',
        element: <EvidencePage />,
      },
    ],
  },
  {
    id: 'delivery',
    label: 'Delivery agent',
    icon: Truck,
    items: [
      { label: 'Condom items', path: '/delivery', title: 'Condom items', element: <CondomsPage /> },
      { label: 'Orders', path: '/delivery/orders', title: 'Orders', element: <OrdersPage /> },
      {
        label: 'Evidence',
        path: '/delivery/evidence',
        title: 'Evidence',
        element: <EvidencePage />,
      },
    ],
  },
];
