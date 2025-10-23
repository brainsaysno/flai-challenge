export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold">Campaign #{id}</h1>
    </div>
  );
}
