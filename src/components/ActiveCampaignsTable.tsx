"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

interface Campaign {
  id: string;
  contactCount: number;
  scheduledCount: number;
}

interface ActiveCampaignsTableProps {
  campaigns: Campaign[];
}

export function ActiveCampaignsTable({ campaigns }: ActiveCampaignsTableProps) {
  const router = useRouter();

  if (campaigns.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        No active campaigns yet
      </div>
    );
  }

  const handleRowClick = (campaignId: string) => {
    router.push(`/campaigns/${campaignId}`);
  };

  return (
    <div className="rounded-md border h-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign ID</TableHead>
            <TableHead className="text-right">Contacts</TableHead>
            <TableHead className="text-right">Scheduled</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow
              key={campaign.id}
              onClick={() => handleRowClick(campaign.id)}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <TableCell className="font-mono">{campaign.id}</TableCell>
              <TableCell className="text-right">{campaign.contactCount}</TableCell>
              <TableCell className="text-right">{campaign.scheduledCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
