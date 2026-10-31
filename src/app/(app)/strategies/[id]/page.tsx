import StrategyEditor from "@/components/StrategyEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StrategyEditor id={id} />;
}
