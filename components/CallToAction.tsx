'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface CallToActionProps {
  heading?: string;
  description?: string;
  image?: string;
  buttons?: {
    primary?: {
      text: string;
      url: string;
    };
  };
}

const CallToAction = ({
  heading = 'Ready to Transform Your Sneaker Business?',
  description = 'Join thousands of sneaker enthusiasts and resellers who trust FootVault to manage their inventory, track profits, and scale their business. Start your journey today!',
  image = '/images/dashboard.png',
  buttons = {
    primary: {
      text: 'Get Started',
      url: '/login',
    },
  },
}: CallToActionProps) => {
  return (
    <section className="w-full py-5 pb-20">
      <div className="container px-4 lg:px-8">
        <div className="flex flex-col-reverse lg:flex-row items-center gap-8 border rounded-xl p-6 sm:p-10 lg:p-14">
          {/* Text Section */}
          <div className="w-full lg:w-1/2 text-center lg:text-left">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 leading-tight">
              {heading}
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 lg:text-lg">
              {description}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mt-4 w-full sm:w-auto">
              {buttons.primary && (
                <Button className="w-full sm:w-auto px-8 py-3 text-lg" asChild>
                  <a href={buttons.primary.url}>{buttons.primary.text}</a>
                </Button>
              )}
            </div>
          </div>

          {/* Image Section */}
          <div className="w-full lg:w-1/2 aspect-video relative rounded-lg overflow-hidden border">
            <Image
              src={image}
              alt="Call to action image"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
