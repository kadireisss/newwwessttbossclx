import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Database, RefreshCw, Loader2, Save, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Settings from backend
  const { data: settings = {}, isLoading } = useQuery<Record<string, string>>({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    }
  });

  // Local settings state
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const updateLocalSetting = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (entries: Record<string, string>) => {
      return apiRequest('/api/settings', { method: 'PUT', body: JSON.stringify(entries) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      setHasChanges(false);
      toast({ title: "Ayarlar kaydedildi", description: "Tüm değişiklikler başarıyla uygulandı." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ayarlar kaydedilemedi.", variant: "destructive" });
    }
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Şifre değiştirildi", description: "Yeni şifreniz aktif." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Şifre değiştirilemedi.", variant: "destructive" });
    }
  });

  // Clear old logs mutation
  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/logs/old?days=30', { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      toast({ title: "Loglar temizlendi", description: "30 günden eski loglar silindi." });
    }
  });

  // Reset stats mutation
  const resetStatsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/stats/reset', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stats/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      toast({ title: "İstatistikler sıfırlandı", description: "Tüm sayaçlar ve loglar temizlendi." });
    }
  });

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Hata", description: "Tüm alanları doldurun.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Hata", description: "Yeni şifreler eşleşmiyor.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Hata", description: "Yeni şifre en az 6 karakter olmalı.", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(localSettings);
  };

  const getBoolSetting = (key: string, defaultVal = false): boolean => {
    return (localSettings[key] || String(defaultVal)) === 'true';
  };

  const toggleSetting = (key: string) => {
    const current = getBoolSetting(key);
    updateLocalSetting(key, String(!current));
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-bold glow-text">Ayarlar</h2>
            <p className="text-muted-foreground">Sistem yapılandırması ve tercihler</p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="outline" className="gap-1.5 border-yellow-500/50 text-yellow-400">
                <AlertTriangle className="w-3 h-3" />
                Kaydedilmemiş değişiklikler
              </Badge>
            )}
            <Button 
              onClick={handleSaveSettings} 
              disabled={!hasChanges || saveSettingsMutation.isPending}
              className="gap-2"
            >
              {saveSettingsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Ayarları Kaydet
            </Button>
          </div>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Şifre Değiştir
            </CardTitle>
            <CardDescription>Admin hesabınızın şifresini güncelleyin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Mevcut Şifre</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Yeni Şifre</Label>
                <Input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                />
              </div>
              <div className="grid gap-2">
                <Label>Yeni Şifre Tekrar</Label>
                <Input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Tekrar girin"
                />
              </div>
            </div>
            <Button 
              onClick={handlePasswordChange} 
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
              className="w-full sm:w-auto"
            >
              {changePasswordMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Değiştiriliyor...</>
              ) : "Şifreyi Değiştir"}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Güvenlik Ayarları
            </CardTitle>
            <CardDescription>Global tespit ve engelleme ayarları</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-black/20">
              <div>
                <h4 className="font-medium">Strict Mode</h4>
                <p className="text-xs text-muted-foreground">Bilinmeyen User-Agent'ları otomatik engelle</p>
              </div>
              <Switch 
                checked={getBoolSetting('strict_mode')} 
                onCheckedChange={() => toggleSetting('strict_mode')} 
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-black/20">
              <div>
                <h4 className="font-medium">VPN/Proxy Tespit</h4>
                <p className="text-xs text-muted-foreground">Ticari VPN kullanan ziyaretçileri filtrele</p>
              </div>
              <Switch 
                checked={getBoolSetting('vpn_detection', true)} 
                onCheckedChange={() => toggleSetting('vpn_detection')} 
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-black/20">
              <div>
                <h4 className="font-medium">Otomatik Engelleme</h4>
                <p className="text-xs text-muted-foreground">Şüpheli IP'leri otomatik blacklist'e ekle</p>
              </div>
              <Switch 
                checked={getBoolSetting('auto_block', true)} 
                onCheckedChange={() => toggleSetting('auto_block')} 
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-black/20">
              <div>
                <h4 className="font-medium">Bakım Modu</h4>
                <p className="text-xs text-muted-foreground">Ana sayfada bakım ekranı göster (giriş yapmayanlara)</p>
              </div>
              <Switch 
                checked={getBoolSetting('maintenance_mode', true)} 
                onCheckedChange={() => toggleSetting('maintenance_mode')} 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Veri Yönetimi
            </CardTitle>
            <CardDescription>Veritabanı temizlik işlemleri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-black/20">
              <div>
                <h4 className="font-medium">Eski Logları Temizle</h4>
                <p className="text-xs text-muted-foreground">30 günden eski logları kalıcı olarak sil</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (window.confirm("30 günden eski tüm loglar silinecek. Emin misiniz?")) {
                    clearLogsMutation.mutate();
                  }
                }}
                disabled={clearLogsMutation.isPending}
              >
                {clearLogsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Temizle
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-black/20">
              <div>
                <h4 className="font-medium">İstatistikleri Sıfırla</h4>
                <p className="text-xs text-muted-foreground">Tüm loglar, rate limitler ve challenge token'ları silinir</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (window.confirm("TÜM istatistikler ve loglar sıfırlanacak. Bu işlem geri alınamaz!")) {
                    resetStatsMutation.mutate();
                  }
                }}
                disabled={resetStatsMutation.isPending}
              >
                {resetStatsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Sıfırla
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
