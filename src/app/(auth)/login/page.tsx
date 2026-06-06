import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return (
    <>
      <h1 className="text-6xl font-bold tracking-tight">Zenly.</h1>
      <LoginForm from={from} />
    </>
  );
}
