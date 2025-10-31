// This file exports the pricing tiers for use in the pricing page and elsewhere
export const pricingTiers = [
  {
    name: "Free",
    planType: "free",
    subtitle: "Perfect for casual resellers",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      { label: "Track available shoes" },
      { label: "Track sold shoes" },
      { label: "Manage your inventory and sales" },
      { label: "Up to 30 available variants" },
      {
        label: "Community support",
        tooltip: "Access community forums and resources for help."
      }
    ],
    buttonText: "Get Started"
  },
  {
    name: "Individual",
    planType: "individual",
    subtitle: "For serious solo resellers",
    monthlyPrice: 10,
    yearlyPrice: 100,
    features: [
      { label: "Everything in Free Tier" },
      { label: "Up to 500 available variants" },
      {
        label: "export via CSV",
        tooltip: "Easily download your inventory using CSV files."
      },
      {
        label: "QR code printing for each pair",
        tooltip: "Generate QR codes for shoes to simplify physical inventory management."
      }
    ],
    buttonText: "Upgrade to Individual"
  },
  {
    name: "Team",
    planType: "team",
    subtitle: "For small reseller teams",
    monthlyPrice: 14,
    yearlyPrice: 140,
    features: [
      { label: "All Individual features" },
      { label: "Up to 1,500 available variants" },
      {
        label: "5 Team member avatars",
        tooltip: "Able to split profits with team members using avatars."
      },
      {
        label: "Priority email support",
        tooltip: "Faster email support response time."
      }
    ],
    buttonText: "Upgrade to Team"
  },
  {
    name: "Store",
    planType: "store",
    subtitle: "For full-scale sneaker stores",
    monthlyPrice: 20,
    yearlyPrice: 200,
    features: [
      { label: "All Team features" },
      { label: "Up to 5,000 available variants" },
      {
        label: "Unlimited team avatars",
        tooltip: "Add as many team members as needed."
      },
      {
        label: "Dedicated customer support",
        tooltip: "Get 1-on-1 help from a support manager."
      }
    ],
    buttonText: "Upgrade to Store"
  }
];
