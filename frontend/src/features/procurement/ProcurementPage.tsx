'use client';

import { PendingTable } from '@/components/data-table/PendingTable';
import { PageHeader } from '@/components/PageHeader';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const CHANNELS = [
  { id: 'nms', name: 'NMS' },
  { id: 'jms', name: 'JMS' },
  { id: 'public', name: 'Public sector' },
] as const;

/** Procured condom stock, by supply channel. No endpoint yet, so each channel shows as empty. */
export default function ProcurementPage() {
  return (
    <>
      <PageHeader description="Condom stock procured through each supply channel." />
      <Accordion
        type="single"
        collapsible
        defaultValue="nms"
        className="bg-card rounded-xl border px-5"
      >
        {CHANNELS.map((channel) => (
          <AccordionItem key={channel.id} value={channel.id}>
            <AccordionTrigger className="text-base font-semibold">
              Condom inventory: {channel.name}
            </AccordionTrigger>
            <AccordionContent className="pb-5">
              <PendingTable
                label={`${channel.name} procured stock`}
                columns={['Condom item', 'Batch number', 'Quantity', 'Delivered']}
                emptyTitle={`No ${channel.name} stock recorded yet`}
                emptyDescription="Procured stock will be listed here once this screen is connected to the server."
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}
