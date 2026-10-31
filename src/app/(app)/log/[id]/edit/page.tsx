import EditTrade from "@/components/EditTrade";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditTrade id={id} />;
}
