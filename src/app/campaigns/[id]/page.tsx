"use client";

import { useEffect, useState } from "react";
import { getCampaignFunnelStats } from "~/app/actions";

interface CampaignPageProps {
  params: Promise<{ id: string }>;
}

export default function CampaignPage({ params }: CampaignPageProps) {
  const [id, setId] = useState<string | null>(null);
  const [stats, setStats] = useState({ sent: 0, delivered: 0, scheduled: 0 });

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  const fetchStats = async () => {
    try {
      if (id) {
        const data = await getCampaignFunnelStats(id);
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch campaign stats:", error);
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
    <div className="container mx-auto py-8">
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
    </div>
  );
}
