import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/components/data-table/DataTable';
import { RowActions } from '@/components/data-table/RowActions';
import { ExportButton } from '@/components/ExportButton';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { lookupName, useUnitsOfMeasure } from '@/features/reference/queries';

import { condomLabel, type Condom } from './api';
import { CondomFormDialog } from './CondomFormDialog';
import { useCondoms, useDeleteCondom } from './queries';

type DialogState = { condom: Condom | null } | null;

export default function CondomsPage() {
  const condoms = useCondoms();
  const units = useUnitsOfMeasure();
  const deleteCondom = useDeleteCondom();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [condomToDelete, setCondomToDelete] = useState<Condom | null>(null);

  const columns = useMemo<DataTableColumn<Condom>[]>(
    () => [
      { id: 'brand', header: 'Brand', value: (condom) => condom.brand },
      { id: 'category', header: 'Category', value: (condom) => condom.category },
      { id: 'type', header: 'Type', value: (condom) => condom.type },
      {
        id: 'unit',
        header: 'Unit of measure',
        value: (condom) => lookupName(units.data, condom.unit_of_measure_id),
      },
    ],
    [units.data],
  );

  const addButton = (
    <Button
      onClick={() => {
        setDialog({ condom: null });
      }}
    >
      <Plus data-icon="inline-start" />
      Add item
    </Button>
  );

  return (
    <>
      <PageHeader
        description="The condom products that can be stocked, ordered and distributed."
        actions={
          <>
            <ExportButton name="Condom items" columns={columns} rows={condoms.data} />
            {addButton}
          </>
        }
      />

      <DataTable
        label="Condom items"
        columns={columns}
        rows={condoms.data}
        getRowId={(condom) => condom.id}
        isLoading={condoms.isPending}
        error={condoms.error}
        onRetry={() => void condoms.refetch()}
        isRetrying={condoms.isRefetching}
        searchPlaceholder="Search condom items…"
        emptyTitle="No condom items yet"
        emptyDescription="Add the products you stock so they can be received and distributed."
        emptyAction={addButton}
        rowActions={(condom) => (
          <RowActions
            label={`Actions for ${condomLabel(condom)}`}
            actions={[
              {
                label: 'Edit',
                icon: Pencil,
                onSelect: () => {
                  setDialog({ condom });
                },
              },
              {
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                onSelect: () => {
                  setCondomToDelete(condom);
                },
              },
            ]}
          />
        )}
      />

      {dialog ? (
        <CondomFormDialog
          key={dialog.condom?.id ?? 'new'}
          condom={dialog.condom}
          units={units.data}
          isLoadingUnits={units.isPending}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={condomToDelete !== null}
        onOpenChange={(open) => {
          if (open) return;
          setCondomToDelete(null);
          deleteCondom.reset();
        }}
        title={condomToDelete ? `Delete ${condomLabel(condomToDelete)}?` : 'Delete condom item?'}
        description="This item will be removed from the catalogue. This cannot be undone."
        confirmLabel="Delete item"
        isPending={deleteCondom.isPending}
        error={deleteCondom.error}
        onConfirm={() => {
          if (!condomToDelete) return;
          deleteCondom.mutate(condomToDelete.id, {
            onSuccess: () => {
              setCondomToDelete(null);
            },
          });
        }}
      />
    </>
  );
}
