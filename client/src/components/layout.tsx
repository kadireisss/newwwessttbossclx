import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Globe,
  FileCode,
  Activity,
  Settings,
  LogOut,
  ShieldCheck,
  Shield,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Kontrol Merkezi", href: "/", icon: LayoutDashboard },
    { name: "Domainler", href: "/domains", icon: Globe },
    { name: "Güvenli Sayfalar", href: "/landing-pages", icon: FileCode },
    { name: "Trafik Logları", href: "/logs", icon: Activity },
    { name: "Blacklist", href: "/blacklist", icon: Shield },
    { name: "Ayarlar", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground grid-bg relative overflow-x-hidden">
      {/* Mobile Menu Button */}
      <div className="lg:hidden p-4 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <span className="font-display font-bold text-lg">BOSS</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-xl pt-20 px-4"
          >
            <nav className="space-y-2">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href}>
                  <div 
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      location === item.href 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </div>
                </Link>
              ))}
              <div className="pt-8 border-t border-white/10 mt-8">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => logout()}
                >
                  <LogOut className="w-5 h-5" />
                  Çıkış Yap
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 border-r border-white/5 bg-card/30 backdrop-blur-sm z-30">
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl tracking-tight">BOSS</h1>
              <p className="text-xs text-muted-foreground font-mono">CLOAKER v3.2</p>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                    isActive 
                      ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(16,185,129,0.15)] border border-primary/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}>
                    <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {item.name}
                    {isActive && (
                      <motion.div layoutId="sidebar-active" className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-3 py-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-xs font-bold text-black">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.username || 'Admin'}</p>
                <p className="text-xs text-muted-foreground truncate">Yönetici</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-muted-foreground hover:text-white"
              onClick={() => logout()}
            >
              <LogOut className="w-4 h-4" />
              Çıkış Yap
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-64 min-w-0">
          <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10 animate-in fade-in duration-500 slide-in-from-bottom-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
