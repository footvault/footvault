'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, MessageCircle, Building2, DollarSign, ExternalLink } from "lucide-react";
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function PHPricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user data from Supabase
  useEffect(() => {
    async function fetchUserData() {
      const supabase = createClient();
      
      // Get the current user
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Try to fetch additional profile data if you have a profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }
      }
    }
    
    fetchUserData();
  }, []);

  const plans = [
    {
      title: 'Free',
      priceMonthly: 0,
      priceYearly: 0,
      subtitle: 'Perfect for casual resellers',
      features: [
        'Track available shoes',
        'Track sold shoes', 
        'Manage your inventory and sales',
        'Up to 100 available variants',
        'Community support'
      ],
      popular: false,
    },
    {
      title: 'Individual',
      priceMonthly: 499,
      priceYearly: 4990,
      subtitle: 'For serious solo resellers',
      features: [
        'Everything in Free Tier',
        'Up to 500 available variants',
        'Export via CSV',
        'QR code printing for each pair'
      ],
      popular: false,
    },
    {
      title: 'Team',
      priceMonthly: 999,
      priceYearly: 9990,
      subtitle: 'For small reseller teams',
      features: [
        'All Individual features',
        'Up to 1,500 available variants',
        '5 Team member avatars',
        'Priority email support'
      ],
      popular: true,
    },
    {
      title: 'Store',
      priceMonthly: 1199,
      priceYearly: 11990,
      subtitle: 'For full-scale sneaker stores',
      features: [
        'All Team features',
        'Up to 5,000 available variants',
        'Unlimited team avatars',
        'Dedicated customer support'
      ],
      popular: false,
    },
  ];

  const paymentMethods = [
    { 
      name: 'GCash', 
      logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSU3hFvvnNeFYhsNG6n4Yz6BU4_xWbFM1dbA&s',
      description: 'Mobile wallet payment' 
    },
    { 
      name: 'PayPal', 
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.png',
      description: 'International payment' 
    },
    { 
      name: 'PayMaya', 
      logoUrl: 'https://play-lh.googleusercontent.com/fdQjxsIO8BTLaw796rQPZtLEnGEV8OJZJBJvl8dFfZLZcGf613W93z7y9dFAdDhvfqw',
      description: 'Digital wallet' 
    },
    { 
      name: 'Bank Transfer', 
      icon: Building2,
      description: 'Direct bank transfer' 
    },
  ];

  const handleContactSupport = (planTitle: string) => {
    setSelectedPlan(planTitle);
    
    // Get user information from Supabase
    const userEmail = user?.email || 'Not provided';
    const userName = userProfile?.full_name || userProfile?.username || user?.user_metadata?.full_name || 'Not provided';
    const userPhone = userProfile?.phone || user?.phone || 'Not provided';
    
    // Create message with user information
    const plan = plans.find(p => p.title === planTitle);
    const price = isYearly ? plan?.priceYearly : plan?.priceMonthly;
    const period = isYearly ? 'year' : 'month';
    
    const supportMessage = `Hi! I'm interested in the ${planTitle} plan (₱${price?.toLocaleString()}/${period}).
    
User Details:
- Name: ${userName}
- Email: ${userEmail}
- Phone: ${userPhone}

Please help me with the payment process. Thank you!`;
    
    // For Discord, we can't pre-fill messages, but we can include plan info in the URL or use a webhook
    window.open('https://discord.gg/Rh4xmpDBEZ', '_blank');
    
    // You could also log this information for your records
    console.log('Support contact initiated:', { planTitle, userEmail, userName, userPhone });
  };

  const handleContactViaMessenger = (planTitle: string) => {
    // Facebook Messenger link using your profile ID
    const facebookProfileId = '61579303066805';
    const plan = plans.find(p => p.title === planTitle);
    const price = isYearly ? plan?.priceYearly : plan?.priceMonthly;
    const period = isYearly ? 'year' : 'month';
    
    // Get user information from Supabase
    const userEmail = user?.email || 'Not provided';
    const userName = userProfile?.full_name || userProfile?.username || user?.user_metadata?.full_name || 'Not provided';
    const userPhone = userProfile?.phone || user?.phone || 'Not provided';
    
    const message = `Hi! I'm interested in the ${planTitle} plan (₱${price?.toLocaleString()}/${period}).

My Details:
Name: ${userName}
Email: ${userEmail}
Phone: ${userPhone}

Can you help me with the payment process? Thank you!`;
    
    const messengerUrl = `https://m.me/${facebookProfileId}?text=${encodeURIComponent(message)}`;
    window.open(messengerUrl, '_blank');
  };

  const handleContactViaInstagram = (planTitle: string) => {
    // Instagram doesn't support pre-filled messages, but you can direct to your Instagram profile
    window.open('https://www.instagram.com/footvault.dev/', '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
            pricing for resellers with manual payment processing for now.
          </p>
          
          {/* Special Offer Badge */}
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <DollarSign className="w-4 h-4" />
            Get your FREE Store Tier for your first month!
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-4 bg-muted rounded-lg p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                !isYearly 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                isYearly 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
            </button>
          </div>
          {isYearly && (
            <Badge variant="secondary" className="ml-4">
              Save up to ₱2,398
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative h-full flex flex-col ${
                plan.popular 
                  ? 'ring-2 ring-primary shadow-lg scale-105' 
                  : 'hover:shadow-lg transition-shadow'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="px-3 py-1">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{plan.title}</CardTitle>
                <CardDescription className="text-sm">{plan.subtitle}</CardDescription>
                
                <div className="mt-4">
                  <div className="text-3xl font-bold">
                    ₱{isYearly ? plan.priceYearly.toLocaleString() : plan.priceMonthly.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    / {isYearly ? 'year' : 'month'}
                  </div>
                  {isYearly && plan.priceMonthly > 0 && (
                    <div className="text-xs text-green-600 mt-1">
                      Save ₱{((plan.priceMonthly * 12) - plan.priceYearly).toLocaleString()}/year
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-3 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="pt-6">
                  <Button 
                    onClick={() => handleContactViaMessenger(plan.title)}
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-primary hover:bg-primary/90' 
                        : ''
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    Subscribe
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Methods Section */}
        <div className="bg-muted/30 rounded-lg p-6 md:p-8 mb-12">
          <h2 className="text-2xl font-bold text-center mb-6">Accepted Payment Methods</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {paymentMethods.map((method, index) => (
              <div key={index} className="flex flex-col items-center p-4 bg-background rounded-lg min-h-[120px] justify-center">
                {method.logoUrl ? (
                  <div className="w-16 h-12 relative mb-3">
                    <Image
                      src={method.logoUrl}
                      alt={`${method.name} logo`}
                      fill
                      className="object-contain"
                      sizes="64px"
                    />
                  </div>
                ) : method.icon && (
                  <method.icon className="w-8 h-8 text-primary mb-3" />
                )}
                <h3 className="font-medium text-center">{method.name}</h3>
                <p className="text-xs text-muted-foreground text-center mt-1">{method.description}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-muted-foreground text-sm">
            All payments are processed manually. Contact our support team to get started.
          </p>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-primary/5 rounded-lg p-6 md:p-8">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto text-sm md:text-base">
            Contact our customer support team to set up your subscription with manual payment processing. 
            We'll guide you through the process and activate your <strong>FREE Store Tier</strong> for the first month!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={() => handleContactSupport('General Inquiry')}
              size="lg"
              className="inline-flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Join Our Discord Support
            </Button>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => handleContactViaMessenger('General Inquiry')}
                variant="outline"
                size="lg"
                className="inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Messenger
              </Button>
              
              <Button 
                onClick={() => handleContactViaInstagram('General Inquiry')}
                variant="outline"
                size="lg"
                className="inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Instagram
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            Our support team is available to help you choose the right plan and payment method
          </p>
        </div>
      </div>
    </div>
  );
}
