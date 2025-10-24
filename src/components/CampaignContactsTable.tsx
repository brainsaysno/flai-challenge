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

interface ContactWithStats {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  recallCode: string;
  recallDesc: string;
  messageCount: number;
  lastMessageAt: number | null;
  appointmentScheduledAt: Date | null;
}

interface CampaignContactsTableProps {
  contacts: ContactWithStats[];
}

function formatDateTime(timestamp: number | Date | null): string {
  if (!timestamp) return "—";
  const date = typeof timestamp === "number" ? new Date(timestamp * 1000) : timestamp;
  return date.toLocaleString();
}

export function CampaignContactsTable({ contacts }: CampaignContactsTableProps) {
  const router = useRouter();

  if (contacts.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        No contacts found for this campaign
      </div>
    );
  }

  const handleRowClick = (contactId: string) => {
    router.push(`/sms?contactId=${contactId}`);
  };

  return (
    <div className="rounded-md border h-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Recall Code</TableHead>
            <TableHead>Recall Description</TableHead>
            <TableHead className="text-right">Messages</TableHead>
            <TableHead>Last Message</TableHead>
            <TableHead>Appointment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              onClick={() => handleRowClick(contact.id)}
              className={`cursor-pointer transition-colors ${contact.appointmentScheduledAt
                ? "bg-green-300/50 hover:bg-green-300"
                : "hover:bg-muted/50"
                }`}
            >
              <TableCell>{contact.firstName}</TableCell>
              <TableCell>{contact.lastName}</TableCell>
              <TableCell>{contact.phone}</TableCell>
              <TableCell>{contact.recallCode}</TableCell>
              <TableCell className="max-w-xs truncate">{contact.recallDesc}</TableCell>
              <TableCell className="text-right">{contact.messageCount}</TableCell>
              <TableCell>{formatDateTime(contact.lastMessageAt)}</TableCell>
              <TableCell>
                {contact.appointmentScheduledAt
                  ? formatDateTime(contact.appointmentScheduledAt)
                  : "Not scheduled"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
