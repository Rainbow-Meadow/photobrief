// Test-mode banner — automatically renders only when the publishable
// token is a sandbox key. Safe to include unconditionally in production.
const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;

  return (
    <div className="w-full border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs text-warning">
      Payments are in test mode. Use card{" "}
      <code className="font-mono font-semibold">4242 4242 4242 4242</code>, any future expiry,
      any CVC.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline-offset-4 hover:underline"
      >
        Read more
      </a>
    </div>
  );
}
