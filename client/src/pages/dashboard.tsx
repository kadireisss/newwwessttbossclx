import { useDashboardStats } from "@/hooks/use-cloaker";
import { useLiveFeed } from "@/hooks/use-live-feed";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { StatsCard } from "@/components/ui/card-stats";
import { cn } from "@/lib/utils";
import {
  ShieldAlert, Users, Eye, Activity, Globe,
  Clock, CheckCircle2, XCircle, Zap,
  Shield, CalendarDays, Radio, Wifi, WifiOff, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import type { Domain } from "@shared/schema";

export default function DashboardPage() {
  const { data: stats, isLoading, refetch } = useDashboardStats();
  const { data: domains } = useQuery<Domain[]>({ queryKey: ['/api/domains'] });
  
  // Canlı akış sistemi
  const [liveEnabled, setLiveEnabled] = useState(true);
  const { 
    isConnected, 
    mode,
    liveLogs, 
    liveStats, 
    resetStats,
    clientCount 
  } = useLiveFeed({ 
    enabled: liveEnabled,
    maxLogs: 25,
  });

  // Son aktivite - canlı logları önce göster, sonra API'den gelenleri
  const combinedLogs = liveEnabled && liveLogs.length > 0 
    ? liveLogs 
    : (stats?.recentLogs || []);

  if (isLoading || !stats) {
    return (
      <Layout>
        <div className="animate-pulse space-y-8">
          <div className="h-8 w-48 bg-white/5 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-white/5 rounded-xl" />
        </div>
      </Layout>
    );
  }

  const pieData = [
    { name: "Gerçek Kullanıcı", value: stats.realVisits, color: "#10b981" },
    { name: "Bot Engellendi", value: stats.botVisits, color: "#ef4444" },
  ].filter(d => d.value > 0);

  const barData = [
    { name: "Kullanıcı", value: stats.realVisits, fill: "#10b981" },
    { name: "Bot", value: stats.botVisits, fill: "#ef4444" },
  ];

  const activeDomains = domains?.filter(d => d.status === "active")?.length || 0;
  const totalDomains = domains?.length || 0;
  const botPercentage = stats.totalVisits ? Math.round((stats.botVisits / stats.totalVisits) * 100) : 0;
  
  // Today stats
  const todayVisits = (stats as any).todayVisits || 0;
  const todayBots = (stats as any).todayBots || 0;
  const todayReal = (stats as any).todayReal || 0;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground glow-text">Kontrol Merkezi</h2>
            <p className="text-muted-foreground">Sistem durumu ve trafik genel bakışı</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Canlı Akış Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20 border border-white/10">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-primary animate-pulse" />
              ) : (
                <WifiOff className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">Canlı</span>
              <Switch 
                checked={liveEnabled} 
                onCheckedChange={setLiveEnabled}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-primary animate-pulse" : "bg-muted-foreground"
              )} />
              v3.0 {isConnected ? "Canlı" : "Aktif"}
            </Badge>
          </div>
        </div>

        {/* Live Status Banner */}
        {liveEnabled && (
          <Card className={cn(
            "glass-panel border transition-all duration-500",
            isConnected 
              ? "border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent" 
              : "border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-transparent"
          )}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isConnected ? "bg-primary/20" : "bg-yellow-500/20"
                  )}>
                    <Radio className={cn(
                      "w-5 h-5",
                      isConnected ? "text-primary animate-pulse" : "text-yellow-500"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {mode === 'polling' ? "🟢 Canlı Akış Aktif (Polling)" : isConnected ? "🟢 Canlı Akış Aktif" : "🟡 Bağlanıyor..."}
                      {isConnected && clientCount > 1 && (
                        <span className="text-xs text-muted-foreground">
                          ({clientCount} bağlı)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mode === 'polling'
                        ? "Veriler 5 saniyede bir güncelleniyor"
                        : isConnected 
                          ? "Veriler otomatik güncelleniyor" 
                          : "WebSocket bağlantısı kuruluyor..."
                      }
                    </p>
                  </div>
                </div>
                
                {/* Live Session Stats */}
                {isConnected && liveStats.liveTotal > 0 && (
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xl font-bold font-display text-primary animate-in fade-in">
                        +{liveStats.liveTotal}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Bu Oturum</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold font-display text-emerald-400">
                        +{liveStats.liveReal}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Kullanıcı</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold font-display text-red-400">
                        +{liveStats.liveBots}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Bot</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetStats}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Sıfırla
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Summary Banner */}
        <Card className="glass-panel border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Bugün</p>
                  <p className="text-xs text-muted-foreground">Son 24 saat özeti</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-2xl font-bold font-display">{todayVisits}</p>
                  <p className="text-xs text-muted-foreground">Toplam</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold font-display text-primary">{todayReal}</p>
                  <p className="text-xs text-muted-foreground">Kullanıcı</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold font-display text-destructive">{todayBots}</p>
                  <p className="text-xs text-muted-foreground">Bot</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== CANLI AKIŞ - ÜST BÖLÜM ===== */}
        <Card className={cn(
          "glass-panel transition-all duration-300",
          liveEnabled && isConnected && "ring-1 ring-primary/30"
        )}>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isConnected ? "bg-primary/20" : "bg-muted/20"
              )}>
                <Radio className={cn(
                  "w-5 h-5",
                  isConnected ? "text-primary animate-pulse" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <CardTitle className="font-display flex items-center gap-2">
                  Canlı Trafik Akışı
                  {liveEnabled && isConnected && (
                    <Badge variant="outline" className="text-[10px] border-primary/50 text-primary animate-pulse">
                      CANLI
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {mode === 'polling' ? "5 saniyede bir güncelleniyor" : isConnected ? "Anlık güncelleniyor" : "Bağlanıyor..."}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && liveStats.liveTotal > 0 && (
                <div className="hidden sm:flex items-center gap-4 mr-4 text-sm">
                  <span className="font-mono font-bold">+{liveStats.liveTotal}</span>
                  <span className="text-primary font-mono">{liveStats.liveReal} <span className="text-[10px] text-muted-foreground">user</span></span>
                  <span className="text-destructive font-mono">{liveStats.liveBots} <span className="text-[10px] text-muted-foreground">bot</span></span>
                  <Button variant="ghost" size="sm" onClick={resetStats} className="text-xs h-7 px-2">
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
              )}
              <Link href="/logs">
                <Button variant="ghost" size="sm">Tüm Loglar</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {combinedLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Henüz trafik yok. Domain ekleyip link paylaşınca burada canlı görünecek.</p>
                </div>
              ) : (
                combinedLogs.slice(0, 15).map((log, index) => {
                  const reasons = (() => {
                    try { return JSON.parse(log.botReasons || '[]'); } catch { return []; }
                  })();
                  const mainReason = reasons[0]?.replace(/_/g, ' ') || '';
                  const isNew = liveEnabled && index < liveStats.liveTotal;

                  return (
                    <div
                      key={log.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 transition-all duration-300",
                        isNew && "animate-in slide-in-from-top-2 fade-in border-primary/30 bg-primary/5"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0 transition-all",
                          log.isBot
                            ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                            : "bg-primary shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                          isNew && "animate-ping"
                        )} />
                        <div className="min-w-0">
                          <p className="text-sm font-mono font-medium">{log.ipAddress}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {log.isBot && mainReason ? mainReason : ((log as any).domain || log.userAgent?.substring(0, 50) || 'Bilinmiyor')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        {log.botScore != null && (
                          <span className={cn(
                            "text-[10px] font-mono hidden sm:inline",
                            log.botScore >= 50 ? "text-destructive" : "text-primary"
                          )}>
                            {log.botScore}pt
                          </span>
                        )}
                        <Badge
                          variant={log.isBot ? "destructive" : "default"}
                          className={cn(
                            "text-[10px] h-5 px-1.5 uppercase",
                            isNew && "animate-pulse"
                          )}
                        >
                          {log.isBot ? "BOT" : "USER"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground w-16 text-right">
                          {isNew ? (
                            <span className="text-primary">az önce</span>
                          ) : (
                            log.createdAt && formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            title="Toplam Trafik"
            value={stats.totalVisits.toLocaleString()}
            icon={Eye}
            description="Tüm gelen istekler"
          />
          <StatsCard
            title="Gerçek Kullanıcı"
            value={stats.realVisits.toLocaleString()}
            icon={Users}
            description="Hedefe yönlendirildi"
            className="border-primary/20 bg-primary/5"
          />
          <StatsCard
            title="Bot Engellendi"
            value={stats.botVisits.toLocaleString()}
            icon={ShieldAlert}
            description="Güvenli sayfaya yönlendirildi"
            className="border-destructive/20 bg-destructive/5"
          />
          <StatsCard
            title="Bot Oranı"
            value={`${botPercentage}%`}
            icon={Activity}
            description={botPercentage > 50 ? "⚠️ Yüksek bot trafiği" : "✅ Normal seviye"}
          />
          <StatsCard
            title="Aktif Domain"
            value={`${activeDomains}/${totalDomains}`}
            icon={Globe}
            description="Çalışan domain sayısı"
            className="border-blue-500/20 bg-blue-500/5"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 glass-panel">
            <CardHeader>
              <CardTitle className="font-display">Trafik Dağılımı</CardTitle>
              <CardDescription>Kullanıcı ve bot trafiği karşılaştırması</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" stroke="#666" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#999" fontSize={12} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#333', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{ fill: 'transparent' }}
                      formatter={(value: number) => [value.toLocaleString(), 'Ziyaret']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="font-display">Oran Grafiği</CardTitle>
              <CardDescription>Trafik dağılımı yüzdesi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                        formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#333', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Henüz veri yok
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Domain Performance */}
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="font-display">Domain Performansı</CardTitle>
              <CardDescription>Tıklama istatistikleri</CardDescription>
            </div>
            <Link href="/domains">
              <Button variant="ghost" size="sm">Yönet</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {!domains || domains.length === 0 ? (
                <div className="text-center py-8 col-span-full">
                  <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">Henüz domain eklenmemiş.</p>
                  <Link href="/domains">
                    <Button variant="outline" size="sm" className="mt-4">Domain Ekle</Button>
                  </Link>
                </div>
              ) : (
                domains.map((domain) => {
                  const total = (domain as any).totalClicks || 0;
                  const bots = (domain as any).botClicks || 0;
                  const real = (domain as any).realClicks || 0;
                  const botRate = total > 0 ? Math.round((bots / total) * 100) : 0;

                  return (
                    <div key={domain.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        {domain.redirectEnabled ? (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{domain.domain}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="text-primary">{real} kullanıcı</span>
                            <span className="text-destructive">{bots} bot</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-mono font-bold">{total}</span>
                        {botRate > 0 && (
                          <Badge variant={botRate > 60 ? "destructive" : "secondary"} className="text-[10px] h-5">
                            {botRate}% bot
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
