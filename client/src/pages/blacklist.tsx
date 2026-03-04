import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { useState } from "react";
import { Ban, Plus, Trash2, Globe, Monitor, AlertTriangle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type IpBlacklistEntry = {
  id: number;
  ipAddress: string;
  reason: string | null;
  addedAt: string;
};

type UaBlacklistEntry = {
  id: number;
  pattern: string;
  reason: string | null;
  addedAt: string;
};

export default function BlacklistPage() {
  const { toast } = useToast();
  const [newIp, setNewIp] = useState("");
  const [newIpReason, setNewIpReason] = useState("");
  const [newUa, setNewUa] = useState("");
  const [newUaReason, setNewUaReason] = useState("");
  const [isIpDialogOpen, setIsIpDialogOpen] = useState(false);
  const [isUaDialogOpen, setIsUaDialogOpen] = useState(false);

  const { data: ipList = [], isLoading: ipLoading } = useQuery<IpBlacklistEntry[]>({
    queryKey: ['/api/blacklist/ip'],
  });

  const { data: uaList = [], isLoading: uaLoading } = useQuery<UaBlacklistEntry[]>({
    queryKey: ['/api/blacklist/ua'],
  });

  const addIpMutation = useMutation({
    mutationFn: async (data: { ip: string; reason: string }) => {
      return apiRequest('/api/blacklist/ip', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blacklist/ip'] });
      setNewIp("");
      setNewIpReason("");
      setIsIpDialogOpen(false);
      toast({ title: "IP adresi eklendi", description: "Blacklist güncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "IP eklenemedi.", variant: "destructive" });
    }
  });

  const removeIpMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/blacklist/ip/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blacklist/ip'] });
      toast({ title: "IP silindi" });
    }
  });

  const addUaMutation = useMutation({
    mutationFn: async (data: { pattern: string; reason: string }) => {
      return apiRequest('/api/blacklist/ua', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blacklist/ua'] });
      setNewUa("");
      setNewUaReason("");
      setIsUaDialogOpen(false);
      toast({ title: "User-Agent pattern eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Pattern eklenemedi.", variant: "destructive" });
    }
  });

  const removeUaMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/blacklist/ua/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blacklist/ua'] });
      toast({ title: "Pattern silindi" });
    }
  });

  const handleAddIp = () => {
    if (!newIp.trim()) return;
    addIpMutation.mutate({ ip: newIp.trim(), reason: newIpReason.trim() });
  };

  const handleAddUa = () => {
    if (!newUa.trim()) return;
    addUaMutation.mutate({ pattern: newUa.trim(), reason: newUaReason.trim() });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground glow-text flex items-center gap-3">
              <Shield className="w-8 h-8" />
              Blacklist Yönetimi
            </h2>
            <p className="text-muted-foreground mt-1">IP/CIDR adreslerini ve User-Agent imzalarını engelleyin</p>
          </div>
        </div>

        <Tabs defaultValue="ip" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="ip" className="flex items-center gap-2" data-testid="tab-ip-blacklist">
              <Globe className="w-4 h-4" />
              IP Blacklist ({ipList.length})
            </TabsTrigger>
            <TabsTrigger value="ua" className="flex items-center gap-2" data-testid="tab-ua-blacklist">
              <Monitor className="w-4 h-4" />
              UA Blacklist ({uaList.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ip" className="mt-6">
            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>IP Adresi Engelleme</CardTitle>
                  <CardDescription>Belirli IP adreslerini tamamen engelleyin</CardDescription>
                </div>
                <Dialog open={isIpDialogOpen} onOpenChange={setIsIpDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-ip">
                      <Plus className="w-4 h-4 mr-2" />
                      IP Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-panel border-white/10">
                    <DialogHeader>
                      <DialogTitle>Yeni IP Adresi Engelle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm text-muted-foreground">IP Adresi</label>
                        <Input 
                          placeholder="192.168.1.1 veya 192.168.1.0/24" 
                          value={newIp}
                          onChange={(e) => setNewIp(e.target.value)}
                          data-testid="input-new-ip"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Sebep (Opsiyonel)</label>
                        <Input 
                          placeholder="Engelleme sebebi..." 
                          value={newIpReason}
                          onChange={(e) => setNewIpReason(e.target.value)}
                          data-testid="input-ip-reason"
                        />
                      </div>
                      <Button 
                        onClick={handleAddIp} 
                        className="w-full"
                        disabled={addIpMutation.isPending || !newIp.trim()}
                        data-testid="button-submit-ip"
                      >
                        {addIpMutation.isPending ? "Ekleniyor..." : "IP Ekle"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {ipLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />)}
                  </div>
                ) : ipList.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Ban className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz engellenmiş IP yok</p>
                    <p className="text-sm">Yukarıdaki butona tıklayarak IP ekleyin</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-white/5">
                        <TableHead>IP Adresi</TableHead>
                        <TableHead>Sebep</TableHead>
                        <TableHead>Eklenme Tarihi</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ipList.map((entry) => (
                        <TableRow key={entry.id} className="border-white/5">
                          <TableCell>
                            <code className="px-2 py-1 rounded bg-black/30 text-primary font-mono text-sm">
                              {entry.ipAddress}
                            </code>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {entry.reason || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(entry.addedAt), "dd.MM.yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => removeIpMutation.mutate(entry.id)}
                              disabled={removeIpMutation.isPending}
                              data-testid={`button-remove-ip-${entry.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ua" className="mt-6">
            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>User-Agent Pattern Engelleme</CardTitle>
                  <CardDescription>Düz metin, wildcard (*, ?) ve eski regex girişleriyle bot imzalarını engelleyin</CardDescription>
                </div>
                <Dialog open={isUaDialogOpen} onOpenChange={setIsUaDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-ua">
                      <Plus className="w-4 h-4 mr-2" />
                      Pattern Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-panel border-white/10">
                    <DialogHeader>
                      <DialogTitle>Yeni User-Agent Pattern</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Pattern</label>
                        <Input 
                          placeholder="googlebot | adsbot | *headless*" 
                          value={newUa}
                          onChange={(e) => setNewUa(e.target.value)}
                          data-testid="input-new-ua"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Örnek: googlebot, adsbot|bingbot, *python-requests*</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Sebep (Opsiyonel)</label>
                        <Input 
                          placeholder="Engelleme sebebi..." 
                          value={newUaReason}
                          onChange={(e) => setNewUaReason(e.target.value)}
                          data-testid="input-ua-reason"
                        />
                      </div>
                      <Button 
                        onClick={handleAddUa} 
                        className="w-full"
                        disabled={addUaMutation.isPending || !newUa.trim()}
                        data-testid="button-submit-ua"
                      >
                        {addUaMutation.isPending ? "Ekleniyor..." : "Pattern Ekle"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {uaLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />)}
                  </div>
                ) : uaList.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz engellenmiş pattern yok</p>
                    <p className="text-sm">Özel bot imzalarını engellemek için pattern ekleyin</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-white/5">
                        <TableHead>Pattern</TableHead>
                        <TableHead>Sebep</TableHead>
                        <TableHead>Eklenme Tarihi</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uaList.map((entry) => (
                        <TableRow key={entry.id} className="border-white/5">
                          <TableCell>
                            <code className="px-2 py-1 rounded bg-black/30 text-yellow-400 font-mono text-sm break-all">
                              {entry.pattern}
                            </code>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {entry.reason || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(entry.addedAt), "dd.MM.yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => removeUaMutation.mutate(entry.id)}
                              disabled={removeUaMutation.isPending}
                              data-testid={`button-remove-ua-${entry.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="glass-panel mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Yaygın Bot Patternleri</CardTitle>
                <CardDescription>Hızlıca eklemek için tıklayın</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[
                    { pattern: "googlebot", label: "Googlebot" },
                    { pattern: "adsbot", label: "AdsBot" },
                    { pattern: "facebookexternalhit", label: "Facebook" },
                    { pattern: "bingbot", label: "Bingbot" },
                    { pattern: "headlesschrome", label: "Headless Chrome" },
                    { pattern: "phantomjs", label: "PhantomJS" },
                    { pattern: "selenium", label: "Selenium" },
                    { pattern: "curl", label: "cURL" },
                    { pattern: "wget", label: "Wget" },
                    { pattern: "python-requests", label: "Python Requests" },
                  ].map((item) => (
                    <Badge 
                      key={item.pattern}
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => {
                        setNewUa(item.pattern);
                        setNewUaReason(`${item.label} bot engelleme`);
                        setIsUaDialogOpen(true);
                      }}
                      data-testid={`quick-add-${item.label}`}
                    >
                      + {item.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
