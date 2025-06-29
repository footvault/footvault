export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <div className="space-y-4 text-gray-700 text-base">
        <p>Welcome to FootVault! By using our service, you agree to the following terms:</p>
        <ul className="list-disc pl-6">
          <li>You must be at least 18 years old or have parental consent.</li>
          <li>Do not misuse our platform or attempt to disrupt service.</li>
          <li>All sales and inventory data are your responsibility.</li>
          <li>We reserve the right to update these terms at any time.</li>
        </ul>
        <p>For full details, please contact support.</p>
      </div>
    </main>
  );
}
