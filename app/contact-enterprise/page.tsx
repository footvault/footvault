export default function ContactEnterprisePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4 py-16">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 border border-gray-200 text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-900">Enterprise Inventory Limit Reached</h1>
        <p className="text-gray-700 mb-6 text-lg">
          You have reached the maximum allowed inventory (10,000 variants/products) for standard accounts.<br />
          For larger needs, please contact us to discuss an enterprise solution tailored for your business.
        </p>
        <div className="mb-6">
          <a href="mailto:support@yourdomain.com" className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-lg transition">
            Contact Sales
          </a>
        </div>
        <p className="text-gray-500 text-sm">
          Need immediate help? Email <a href="mailto:support@yourdomain.com" className="underline">support@yourdomain.com</a>
        </p>
      </div>
    </div>
  );
}
