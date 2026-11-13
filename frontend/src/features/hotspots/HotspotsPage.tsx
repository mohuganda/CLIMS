'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/components/data-table/DataTable';
import { RowActions } from '@/components/data-table/RowActions';
import { ExportButton } from '@/components/ExportButton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { lookupName, useOrganizationUnits } from '@/features/reference/queries';

import type { Hotspot } from './api';
import { hotspotLabel } from './hotspotForm';
import { HotspotFormDialog } from './HotspotFormDialog';
import { useDeleteHotspot, useHotspots } from './queries';

type DialogState = { hotspot: Hotspot | null } | null;

export default function HotspotsPage() {
  const hotspots = useHotspots();
  const organizationUnits = useOrganizationUnits();
  const deleteHotspot = useDeleteHotspot();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [hotspotToDelete, setHotspotToDelete] = useState<Hotspot | null>(null);

  const columns = useMemo<DataTableColumn<Hotspot>[]>(
    () => [
      { id: 'name', header: 'Hotspot', value: (hotspot) => hotspot.hotspot_name },
      { id: 'contact', header: 'Contact person', value: (hotspot) => hotspot.contact_person_name },
      {
        id: 'phone',
        header: 'Contact phone',
        value: (hotspot) => hotspot.contact_person_telephone,
      },
      {
        id: 'organization',
        header: 'Organisation unit',
        value: (hotspot) => lookupName(organizationUnits.data, hotspot.organization_unit_id),
      },
      {
        id: 'status',
        header: 'Status',
        value: (hotspot) => hotspot.hotspot_status,
        cell: (hotspot) => <StatusBadge status={hotspot.hotspot_status} />,
      },
    ],
    [organizationUnits.data],
  );

  const organizationOptions = useMemo(
    () => ({
      options: (organizationUnits.data ?? []).map((unit) => ({
        value: String(unit.id),
        label: unit.name ?? `#${unit.id}`,
      })),
      isLoading: organizationUnits.isPending,
    }),
    [organizationUnits.data, organizationUnits.isPending],
  );

  const addButton = (
    <Button
      onClick={() => {
        setDialog({ hotspot: null });
      }}
    >
      <Plus data-icon="inline-start" />
      Add hotspot
    </Button>
  );

  return (
    <>
      <PageHeader
        description="Places where condoms are distributed, and who to contact at each."
        actions={
          <>
            <ExportButton name="Hotspots" columns={columns} rows={hotspots.data} />
            {addButton}
          </>
        }
      />

      <DataTable
        label="Hotspots"
        columns={columns}
        rows={hotspots.data}
        getRowId={(hotspot) => hotspot.id}
        isLoading={hotspots.isPending}
        error={hotspots.error}
        onRetry={() => void hotspots.refetch()}
        isRetrying={hotspots.isRefetching}
        searchPlaceholder="Search hotspots…"
        emptyTitle="No hotspots yet"
        emptyDescription="Add a hotspot so stock can be sent to it and it appears on the map."
        emptyAction={addButton}
        rowActions={(hotspot) => (
          <RowActions
            label={`Actions for ${hotspotLabel(hotspot)}`}
            actions={[
              {
                label: 'Edit',
                icon: Pencil,
                onSelect: () => {
                  setDialog({ hotspot });
                },
              },
              {
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                onSelect: () => {
                  setHotspotToDelete(hotspot);
                },
              },
            ]}
          />
        )}
      />

      {dialog ? (
        <HotspotFormDialog
          key={dialog.hotspot?.id ?? 'new'}
          hotspot={dialog.hotspot}
          organizationUnits={organizationOptions}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={hotspotToDelete !== null}
        onOpenChange={(open) => {
          if (open) return;
          setHotspotToDelete(null);
          deleteHotspot.reset();
        }}
        title={hotspotToDelete ? `Delete ${hotspotLabel(hotspotToDelete)}?` : 'Delete hotspot?'}
        description="This hotspot will be removed from the list and the map. This cannot be undone."
        confirmLabel="Delete hotspot"
        isPending={deleteHotspot.isPending}
        error={deleteHotspot.error}
        onConfirm={() => {
          if (!hotspotToDelete) return;
          deleteHotspot.mutate(hotspotToDelete.id, {
            onSuccess: () => {
              setHotspotToDelete(null);
            },
          });
        }}
      />
    </>
  );
}
