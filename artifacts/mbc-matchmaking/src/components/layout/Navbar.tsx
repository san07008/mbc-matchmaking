import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { HeartHandshake, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled 
          ? "bg-white/80 backdrop-blur-lg shadow-sm py-4 border-b border-border/50" 
          : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              {/* Fallback icon if logo image fails, but we try logo first */}
              <img 
                src={`${import.meta.env.BASE_URL}images/logo-mark.png`} 
                alt="MBC Logo" 
                className="absolute inset-0 w-full h-full object-contain p-1.5 drop-shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
              <HeartHandshake className="w-5 h-5 hidden" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              MBC <span className="text-primary">Matchmaking</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">How it Works</a>
            <a href="#success-stories" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Success Stories</a>
            <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About Us</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" className="font-medium">Sign In</Button>
            <Button>Get Started</Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-border overflow-hidden"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
              <a 
                href="#how-it-works" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-foreground py-2 border-b border-border/50"
              >
                How it Works
              </a>
              <a 
                href="#success-stories" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-foreground py-2 border-b border-border/50"
              >
                Success Stories
              </a>
              <a 
                href="#about" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-foreground py-2 border-b border-border/50"
              >
                About Us
              </a>
              <div className="flex flex-col gap-3 mt-4">
                <Button variant="outline" className="w-full justify-center">Sign In</Button>
                <Button className="w-full justify-center">Get Started</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
