import { Link } from "wouter";
import { HeartHandshake, Instagram, Twitter, Linkedin, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-foreground text-white py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          
          {/* Brand Col */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2.5 inline-block">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-white">
                MBC <span className="text-primary-foreground/80">Matchmaking</span>
              </span>
            </Link>
            <p className="text-white/60 leading-relaxed max-w-xs text-sm">
              Dedicated to finding your perfect match through meaningful connections, curated introductions, and professional guidance.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-primary hover:text-white transition-all duration-300">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-primary hover:text-white transition-all duration-300">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-primary hover:text-white transition-all duration-300">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links Col 1 */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-6">Services</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm">Professional Matchmaking</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm">Date Coaching</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm">Profile Consultation</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm">Exclusive Events</a></li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-6">Company</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm">About Us</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm">Success Stories</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm">Our Team</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-sm">Contact</a></li>
            </ul>
          </div>

          {/* Newsletter Col */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-6">Stay Updated</h4>
            <p className="text-white/60 text-sm mb-4">
              Subscribe to our newsletter for dating tips and exclusive event invites.
            </p>
            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <button type="submit" className="w-full py-3 h-auto bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity">Subscribe</button>
            </form>
          </div>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} MBC Matchmaking. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-white/40 hover:text-white text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-white/40 hover:text-white text-sm transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
