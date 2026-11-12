import { PackagePlus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/components/data-table/DataTable';
import { RowActions } from '@/components/data-table/RowActions';
import { ExportButton } from '@/components/ExportButton';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks';
import { condomLabel } from '@/features/condoms/api';
import { useCondoms } from '@/features/condoms/queries';
import { lookupName, useOrganizationUnits, useUnitsOfMeasure } from '@/features/reference/queries';
import { formatDate, formatNumber } from '@/lib/format';

import { AdjustStockDialog } from './AdjustStockDialog';
import type { InventoryRecord } from './api';
import { DeliveryFormDialog } from './DeliveryFormDialog';
import { useDeleteInventory, useInventory } from './queries';

const recordLabel = (record: InventoryRecord) =>
  record.batch_number ? `batch ${record.batch_number}` : `record #${record.id}`;

export default function InventoryPage() {
  const inventory = useInventory();
  const condoms = useCondoms();
  const units = useUnitsOfMeasure();
  const organizationUnits = useOrganizationUnits();
  const currentUser = useCurrentUser();
  const deleteInventory = useDeleteInventory();
  const [isRecordingDelivery, setIsRecordingDelivery] = useState(false);
  const [recordToAdjust, setRecordToAdjust] = useState<InventoryRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<InventoryRecord | null>(null);

  const columns = useMemo<DataTableColumn<InventoryRecord>[]>(
    () => [
      {
        id: 'condom',
        header: 'Condom item',
        value: (record) => {
          if (record.condom_id === null) return null;
          const condom = condoms.data?.find((candidate) => candidate.id === record.condom_id);
          return condom ? condomLabel(condom) : `#${record.condom_id}`;
        },
      },
      { id: 'batch', header: 'Batch number', value: (record) => record.batch_number },
      {
        id: 'quantity',
        header: 'In stock',
        numeric: true,
        value: (record) => record.quantity_in_stock,
        cell: (record) => formatNumber(record.quantity_in_stock),
      },
      {
        id: 'unit',
        header: 'Unit',
        value: (record) => lookupName(units.data, record.unit_of_measure_id),
      },
      {
        id: 'unitCost',
        header: 'Unit cost',
        numeric: true,
        value: (record) => record.condom_unit_cost,
        cell: (record) => formatNumber(record.condom_unit_cost),
      },
      {
        id: 'delivered',
        header: 'Delivered',
        value: (record) => record.date_of_delivery,
        cell: (record) => formatDate(record.date_of_delivery),
      },
      {
        id: 'organization',
        header: 'Organisation unit',
        value: (record) => lookupName(organizationUnits.data, record.organization_unit_id),
      },
    ],
    [condoms.data, units.data, organizationUnits.data],
  );

  const condomOptions = useMemo(
    () => ({
      options: (condoms.data ?? []).map((condom) => ({
        value: String(condom.id),
        label: condomLabel(condom),
      })),
      isLoading: condoms.isPending,
    }),
    [condoms.data, condoms.isPending],
  );
  const unitOptions = useMemo(
    () => ({
      options: (units.data ?? []).map((unit) => ({
        value: String(unit.id),
        label: unit.name ?? `#${unit.id}`,
      })),
      isLoading: units.isPending,
    }),
    [units.data, units.isPending],
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

  const recordButton = (
    <Button
      onClick={() => {
        setIsRecordingDelivery(true);
      }}
    >
      <PackagePlus data-icon="inline-start" />
      Record delivery
    </Button>
  );

  return (
    <>
      <PageHeader
        description="Batches of condoms held in stock, and what has been received or distributed."
        actions={
          <>
            <ExportButton name="Condom stock" columns={columns} rows={inventory.data} />
            {recordButton}
          </>
        }
      />

      <DataTable
        label="Stock"
        columns={columns}
        rows={inventory.data}
        getRowId={(record) => record.id}
        isLoading={inventory.isPending}
        error={inventory.error}
        onRetry={() => void inventory.refetch()}
        isRetrying={inventory.isRefetching}
        searchPlaceholder="Search stock…"
        emptyTitle="No stock recorded yet"
        emptyDescription="Record a delivery when a batch of condoms arrives."
        emptyAction={recordButton}
        rowActions={(record) => (
          <RowActions
            label={`Actions for ${recordLabel(record)}`}
            actions={[
              {
                label: 'Adjust stock',
                icon: SlidersHorizontal,
                onSelect: () => {
                  setRecordToAdjust(record);
                },
              },
              {
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                onSelect: () => {
                  setRecordToDelete(record);
                },
              },
            ]}
          />
        )}
      />

      {isRecordingDelivery && currentUser ? (
        <DeliveryFormDialog
          userId={currentUser.id}
          condoms={condomOptions}
          units={unitOptions}
          organizationUnits={organizationOptions}
          onClose={() => {
            setIsRecordingDelivery(false);
          }}
        />
      ) : null}

      {recordToAdjust ? (
        <AdjustStockDialog
          key={recordToAdjust.id}
          record={recordToAdjust}
          recordLabel={recordLabel(recordToAdjust)}
          units={unitOptions}
          organizationUnits={organizationOptions}
          onClose={() => {
            setRecordToAdjust(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={recordToDelete !== null}
        onOpenChange={(open) => {
          if (open) return;
          setRecordToDelete(null);
          deleteInventory.reset();
        }}
        title={recordToDelete ? `Delete ${recordLabel(recordToDelete)}?` : 'Delete stock record?'}
        description="This stock record and its quantity will be removed. This cannot be undone."
        confirmLabel="Delete record"
        isPending={deleteInventory.isPending}
        error={deleteInventory.error}
        onConfirm={() => {
          if (!recordToDelete) return;
          deleteInventory.mutate(recordToDelete.id, {
            onSuccess: () => {
              setRecordToDelete(null);
            },
          });
        }}
      />
    </>
  );
}
