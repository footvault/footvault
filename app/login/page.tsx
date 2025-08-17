import { LoginForm } from "../../components/login-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function Page() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          className="absolute top-0 left-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/footvaultlogin.mp4" type="video/mp4" />
          {/* Fallback gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
        </video>
        
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Gradient overlay for modern look */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
      </div>

      {/* Go Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Go Back</span>
        </Link>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <LoginForm />
      </div>
    </div>
  );
}
