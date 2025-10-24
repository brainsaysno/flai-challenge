"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCampaignFunnelStats, getCampaignContactsWithStats } from "~/app/actions";
import { CampaignContactsTable } from "~/components/CampaignContactsTable";

interface CampaignPageProps {
  params: Promise<{ id: string }>;
}

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

export default function CampaignPage({ params }: CampaignPageProps) {
  const [id, setId] = useState<string | null>(null);
  const [stats, setStats] = useState({ sent: 0, delivered: 0, scheduled: 0 });
  const [contacts, setContacts] = useState<ContactWithStats[]>([]);

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  const fetchStats = async () => {
    try {
      if (id) {
        const [statsData, contactsData] = await Promise.all([
          getCampaignFunnelStats(id),
          getCampaignContactsWithStats(id),
        ]);
        setStats(statsData);
        setContacts(contactsData);
      }
    } catch (error) {
      console.error("Failed to fetch campaign data:", error);
    }
  };

  useEffect(() => {
    if (!id) return;

    fetchStats();

    const interval = setInterval(() => {
      fetchStats();
    }, 2000);

    return () => clearInterval(interval);
  }, [id]);

  return (
    <div className="container mx-auto py-8 h-screen">
      <Link
        href="/"
        className="mb-2 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Back to Campaigns
      </Link>
      <h1 className="mb-8 text-3xl font-bold">Campaign #{id}</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Sent
          </h3>
          <p className="text-3xl font-bold">{stats.sent}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Campaign contacts
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Delivered
          </h3>
          <p className="text-3xl font-bold">{stats.delivered}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Campaign messages
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Scheduled
          </h3>
          <p className="text-3xl font-bold">{stats.scheduled}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Campaign appointments
          </p>
        </div>
      </div>

      <div className="mt-8 h-full">
        <CampaignContactsTable contacts={contacts} />
      </div>
    </div>
  );
}
