import Layout from "@/components/layout";
import { useLogs } from "@/hooks/use-cloaker";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import {
  Globe, ShieldAlert, CheckCircle2, Search, Filter, Eye,
  Ban, RefreshCw, Download, Tag, ArrowUpDown
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function LogsPage() {
  const { data: logs, isLoading, refetch } = useLogs();
  const { toast } = useToast();
  const [searchIp, setSearchIp] = useState("");
  const [filterType, setFilterType] = useState<"all" | "bot" | "user">("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [sortBy, setSortBy] = useState<"time" | "score">("time");

  const addToBlacklistMutation = useMutation({
    mutationFn: async (ip: string) => {
      return apiRequest('/api/blacklist/ip', {
        method: 'POST',
        body: JSON.stringify({ ip, reason: 'Loglardan manuel engelleme' })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blacklist/ip'] });
      toast({ title: "IP engellendi", description: "Blacklist'e eklendi." });
    }
  });

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    let result = logs.filter(log => {
      const matchesIp = !searchIp || log.ipAddress?.toLowerCase().includes(searchIp.toLowerCase());
      const matchesType = filterType === "all" ||
        (filterType === "bot" && log.isBot) ||
        (filterType === "user" && !log.isBot);
      return matchesIp && matchesType;
    });

    if (sortBy === "score") {
      result = [...result].sort((a, b) => (b.botScore || 0) - (a.botScore || 0));
    }

    return result;
  }, [logs, searchIp, filterType, sortBy]);

  const stats = useMemo(() => {
    if (!logs) return { total: 0, bots: 0, users: 0, withClickId: 0 };
    return {
      total: logs.length,
      bots: logs.filter(l => l.isBot).length,
      users: logs.filter(l => !l.isBot).length,
      withClickId: logs.filter(l => (l as any).clickId).length,
    };
  }, [logs]);

  const parseReasons = (reasonsJson: string | null) => {
    try { return JSON.parse(reasonsJson || '[]'); } catch { return []; }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-primary";
    if (score >= 80) return "text-red-500";
    if (score >= 50) return "text-orange-400";
    if (score >= 30) return "text-yellow-400";
    return "text-primary";
  };

  const exportLogs = () => {
    if (!filteredLogs.length) return;
    const csv = [
      ['Timestamp', 'IP', 'User Agent', 'Is Bot', 'Score', 'Destination', 'Click ID', 'Reasons'].join(','),
      ...filteredLogs.map(log => [
        log.createdAt,
        log.ipAddress,
        `"${(log.userAgent || '').replace(/"/g, '""')}"`,
        log.isBot,
        log.botScore,
        log.destination,
        (log as any).clickId || '',
        `"${parseReasons(log.botReasons).join('; ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boss-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold glow-text">Trafik Logları</h2>
            <p className="text-muted-foreground">Her isteğin detaylı incelemesi</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />Yenile
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs} disabled={!filteredLogs.length}>
              <Download className="w-4 h-4 mr-2" />CSV
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-panel">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Eye className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bot</p>
                  <p className="text-2xl font-bold text-destructive">{stats.bots}</p>
                </div>
                <ShieldAlert className="w-8 h-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Kullanıcı</p>
                  <p className="text-2xl font-bold text-primary">{stats.users}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Click ID</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.withClickId}</p>
                </div>
                <Tag className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="glass-panel">
          <CardHeader className="border-b border-white/5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />Filtreler
              </CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="IP ara..."
                    className="pl-9 w-[200px]"
                    value={searchIp}
                    onChange={(e) => setSearchIp(e.target.value)}
                  />
                </div>
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="bot">Bot</SelectItem>
                    <SelectItem value="user">Kullanıcı</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setSortBy(sortBy === "time" ? "score" : "time")}
                  className="gap-1.5"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  {sortBy === "time" ? "Zaman" : "Skor"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="w-[140px]">Zaman</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>User Agent</TableHead>
                    <TableHead>Tespit</TableHead>
                    <TableHead>Skor</TableHead>
                    <TableHead>Click ID</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {logs?.length === 0 ? "Henüz log yok." : "Filtreye uygun log bulunamadı."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.slice(0, 100).map((log) => (
                      <TableRow key={log.id} className="border-white/5 hover:bg-white/5 group">
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {log.createdAt && format(new Date(log.createdAt), "dd.MM HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-black/30">
                            {log.ipAddress}
                          </code>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="truncate text-xs text-muted-foreground" title={log.userAgent || ""}>
                            {log.userAgent || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={log.isBot ? "destructive" : "default"}
                            className="uppercase text-[10px] px-1.5"
                          >
                            {log.isBot ? "BOT" : "USER"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "w-6 h-1.5 rounded-full overflow-hidden bg-white/10"
                            )}>
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  (log.botScore || 0) >= 50 ? "bg-destructive" : "bg-primary"
                                )}
                                style={{ width: `${Math.min(log.botScore || 0, 100)}%` }}
                              />
                            </div>
                            <span className={cn("text-xs font-mono", getScoreColor(log.botScore || 0))}>
                              {log.botScore || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(log as any).clickId ? (
                            <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                              <Tag className="w-3 h-3 mr-1" />
                              {(log as any).clickId?.split('=')[0]}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="icon" variant="ghost" onClick={() => setSelectedLog(log)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="glass-panel border-white/10 max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>Log Detayı</DialogTitle></DialogHeader>
                                {selectedLog && (
                                  <div className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-xs text-muted-foreground">IP Adresi</label>
                                        <p className="font-mono">{selectedLog.ipAddress}</p>
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Zaman</label>
                                        <p className="text-sm">{selectedLog.createdAt && format(new Date(selectedLog.createdAt), "dd.MM.yyyy HH:mm:ss")}</p>
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Durum</label>
                                        <Badge variant={selectedLog.isBot ? "destructive" : "default"}>
                                          {selectedLog.isBot ? "BOT" : "USER"}
                                        </Badge>
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Bot Skoru</label>
                                        <p className={cn("font-mono font-bold", getScoreColor(selectedLog.botScore))}>{selectedLog.botScore || 0}</p>
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Hedef</label>
                                        <p className="text-sm">{selectedLog.destination}</p>
                                      </div>
                                      {selectedLog.clickId && (
                                        <div>
                                          <label className="text-xs text-muted-foreground">Click ID</label>
                                          <p className="text-sm font-mono text-blue-400">{selectedLog.clickId}</p>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted-foreground">User Agent</label>
                                      <p className="text-xs font-mono break-all bg-black/30 p-2 rounded mt-1">{selectedLog.userAgent || "-"}</p>
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted-foreground">Tespit Sebepleri</label>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {parseReasons(selectedLog.botReasons).map((reason: string, i: number) => (
                                          <Badge key={i} variant="outline" className="text-xs">{reason}</Badge>
                                        ))}
                                        {parseReasons(selectedLog.botReasons).length === 0 && (
                                          <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            <Button
                              size="icon" variant="ghost"
                              onClick={() => addToBlacklistMutation.mutate(log.ipAddress || "")}
                              disabled={addToBlacklistMutation.isPending}
                              title="IP'yi engelle"
                            >
                              <Ban className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredLogs.length > 100 && (
              <div className="p-4 text-center text-sm text-muted-foreground border-t border-white/5">
                {filteredLogs.length} kayıttan ilk 100 gösteriliyor
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
