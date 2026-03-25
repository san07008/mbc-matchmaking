import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  Heart,
  CheckCircle2,
  CalendarHeart
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

// Animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export default function LandingPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    toast({
      title: "Welcome to the club!",
      description: "We've added you to our priority waitlist. We'll be in touch soon.",
    });
    setEmail("");
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/60 blur-[100px]" />
          </div>

          <div className="container mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              
              <motion.div 
                className="max-w-2xl"
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
              >
                <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-primary-foreground/90 font-medium text-sm mb-6 border border-primary/10 text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span>Redefining modern romance</span>
                </motion.div>
                
                <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 text-foreground">
                  Find a connection that truly <span className="text-gradient">matters.</span>
                </motion.h1>
                
                <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-lg">
                  MBC Matchmaking curates exclusive introductions for discerning professionals seeking meaningful, long-term relationships.
                </motion.p>
                
                <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="group">
                    Start Your Journey
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button size="lg" variant="outline">
                    Learn How It Works
                  </Button>
                </motion.div>
                
                <motion.div variants={fadeUp} className="mt-10 flex items-center gap-4 text-sm text-muted-foreground font-medium">
                  <div className="flex -space-x-3">
                    {/* landing page hero diverse professional people avatars */}
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop" alt="Member" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                    <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop" alt="Member" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                    <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop" alt="Member" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                  </div>
                  <p>Join 2,000+ verified members</p>
                </motion.div>
              </motion.div>

              <motion.div 
                className="relative lg:ml-auto w-full max-w-lg"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              >
                <div className="aspect-[4/5] md:aspect-square relative rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 border border-white/50 bg-secondary/30">
                  <img 
                    src={`${import.meta.env.BASE_URL}images/hero-abstract.png`}
                    alt="Abstract connection" 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Floating Elements to add depth */}
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="absolute top-8 -left-6 glass-card rounded-2xl p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">100% Verified</p>
                      <p className="text-[10px] text-muted-foreground">Background checked</p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-12 -right-6 glass-card rounded-2xl p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Heart className="w-5 h-5 fill-primary/20" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Perfect Match</p>
                      <p className="text-[10px] text-muted-foreground">Found in 2 weeks</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-24 bg-white relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">The Process</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How MBC Matchmaking Works</h3>
              <p className="text-muted-foreground text-lg">
                We take the guesswork out of dating. Our bespoke process is designed to understand you deeply and find your ideal counterpart.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connecting line for desktop */}
              <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 z-0" />

              {/* Step 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5 }}
                className="relative z-10 flex flex-col items-center text-center group"
              >
                <div className="w-20 h-20 rounded-2xl bg-white shadow-xl shadow-black/5 border border-border flex items-center justify-center mb-6 group-hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-white font-bold text-sm mb-4">1</div>
                <h4 className="text-xl font-bold text-foreground mb-2">Create Your Profile</h4>
                <p className="text-muted-foreground text-sm leading-relaxed px-4">
                  Meet with our expert matchmakers for a deep-dive interview to uncover your values, goals, and relationship vision.
                </p>
              </motion.div>

              {/* Step 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative z-10 flex flex-col items-center text-center group"
              >
                <div className="w-20 h-20 rounded-2xl bg-white shadow-xl shadow-black/5 border border-border flex items-center justify-center mb-6 group-hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Heart className="w-6 h-6" />
                  </div>
                </div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-white font-bold text-sm mb-4">2</div>
                <h4 className="text-xl font-bold text-foreground mb-2">Get Matched</h4>
                <p className="text-muted-foreground text-sm leading-relaxed px-4">
                  We hand-select highly compatible matches from our curated, background-checked network based on your unique criteria.
                </p>
              </motion.div>

              {/* Step 3 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="relative z-10 flex flex-col items-center text-center group"
              >
                <div className="w-20 h-20 rounded-2xl bg-white shadow-xl shadow-black/5 border border-border flex items-center justify-center mb-6 group-hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary">
                    <CalendarHeart className="w-6 h-6" />
                  </div>
                </div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-white font-bold text-sm mb-4">3</div>
                <h4 className="text-xl font-bold text-foreground mb-2">Connect & Date</h4>
                <p className="text-muted-foreground text-sm leading-relaxed px-4">
                  We arrange the details of your date. You just show up, enjoy the experience, and let us know how it went for feedback.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FEATURES/BENEFITS */}
        <section className="py-24 bg-secondary/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                  {/* landing page features happy couple walking */}
                  <img 
                    src="https://pixabay.com/get/gd4c87a98a8749fa7ebdc6666463000c3397c1e3fc44f5f4dcca15880d52f7d79fa609b3b26990eaf13d4b396dd8d8138e95b5531979a34c025c7e8f7bf0da264_1280.jpg" 
                    alt="Happy couple" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                    <div className="glass-card rounded-xl p-4 w-full text-white bg-black/30 border-white/10 backdrop-blur-md">
                      <p className="font-display font-semibold text-lg">"MBC changed my life."</p>
                      <p className="text-sm text-white/80">— Sarah & James, Matched in 2023</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Why Choose MBC Matchmaking?</h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Swiping is exhausting. Our high-touch service brings the human element back to dating, saving you time while increasing your chances of finding true compatibility.
                </p>

                <div className="space-y-6">
                  {[
                    { title: "Vetted & Verified", desc: "Every member undergoes a comprehensive screening process to ensure authenticity and safety." },
                    { title: "Personalized Coaching", desc: "Receive feedback and guidance from experts to put your best foot forward on every date." },
                    { title: "Exclusive Network", desc: "Access a private pool of successful, relationship-minded singles you won't find on apps." }
                  ].map((feature, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-foreground">{feature.title}</h4>
                        <p className="text-muted-foreground text-sm mt-1">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-24 relative overflow-hidden">
          {/* Background image with overlay */}
          <div className="absolute inset-0 z-0">
            {/* landing page cta elegant warm lighting interior */}
            <img 
              src="https://images.unsplash.com/photo-1542384701-c0e46e0eda04?w=1920&h=800&fit=crop" 
              alt="Elegant interior" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-foreground/90 backdrop-blur-sm" />
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-3xl mx-auto bg-white/5 border border-white/10 p-8 md:p-12 rounded-3xl backdrop-blur-md shadow-2xl text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to meet your match?</h2>
              <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">
                Stop leaving your love life to chance. Join our exclusive network and let our expert matchmakers find the one you've been looking for.
              </p>
              
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address" 
                  className="flex-1 h-14 bg-white/10 border border-white/20 rounded-xl px-5 text-white placeholder:text-white/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <Button size="lg" type="submit" className="h-14 px-8 shadow-primary/30">
                  Request Invite
                </Button>
              </form>
              <p className="mt-4 text-xs text-white/40">
                Membership is subject to approval to maintain network quality.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
