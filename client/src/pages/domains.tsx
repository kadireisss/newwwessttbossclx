import Layout from "@/components/layout";
import { useDomains, useCreateDomain, useUpdateDomain, useDeleteDomain, useLandingPages } from "@/hooks/use-cloaker";
import { Button } from "@/components/ui/button";
import { Plus, Link as LinkIcon, Edit2, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Shield, Ban, Globe, Clock, Smartphone, Monitor, Zap, Lock } from "lucide-react";
import { insertDomainSchema } from "@shared/schema";
import { format } from "date-fns";

// Available ad platforms
const AD_PLATFORMS = [
  { id: 'google', name: 'Google Ads', icon: 'G' },
  { id: 'facebook', name: 'Facebook/Meta', icon: 'F' },
  { id: 'bing', name: 'Bing/Microsoft', icon: 'B' },
  { id: 'tiktok', name: 'TikTok', icon: 'T' },
  { id: 'twitter', name: 'Twitter/X', icon: 'X' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'L' },
];

// Days of the week
const DAYS_OF_WEEK = [
  { id: '1', name: 'Pzt' },
  { id: '2', name: 'Sal' },
  { id: '3', name: 'Çar' },
  { id: '4', name: 'Per' },
  { id: '5', name: 'Cum' },
  { id: '6', name: 'Cmt' },
  { id: '7', name: 'Paz' },
];

// Schema for form
const formSchema = insertDomainSchema.extend({
  landingPageId: z.coerce.number().min(1, "Select a landing page"),
  detectionLevel: z.string().optional().default("high"),
  status: z.string().optional().default("active"),
  redirectEnabled: z.boolean().optional().default(true),
  blockDirectAccess: z.boolean().optional().default(false),
  blockedPlatforms: z.string().optional().default("google,facebook,bing,tiktok"),
  jsChallenge: z.boolean().optional().default(false),
  redirectMode: z.string().optional().default("302"),
  activeHours: z.string().optional().nullable(),
  activeDays: z.string().optional().nullable(),
  maxClicksPerIp: z.coerce.number().optional().default(0),
  rateLimitWindow: z.coerce.number().optional().default(3600),
  allowMobile: z.boolean().optional().default(true),
  allowDesktop: z.boolean().optional().default(true),
});

export default function DomainsPage() {
  const { data: domains, isLoading } = useDomains();
  const { data: landingPages } = useLandingPages();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<any>(null);

  const createMutation = useCreateDomain();
  const updateMutation = useUpdateDomain();
  const deleteMutation = useDeleteDomain();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      domain: "",
      targetUrl: "",
      landingPageId: undefined,
      redirectEnabled: true,
      detectionLevel: "high",
      status: "active",
      blockDirectAccess: false,
      blockedPlatforms: "google,facebook,bing,tiktok",
      jsChallenge: false,
      redirectMode: "302",
      activeHours: null,
      activeDays: null,
      maxClicksPerIp: 0,
      rateLimitWindow: 3600,
      allowMobile: true,
      allowDesktop: true,
    },
  });

  // Handle Create
  const onSubmitCreate = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        setIsCreateOpen(false);
        form.reset();
      }
    });
  };

  // Handle Edit
  const onEditClick = (domain: any) => {
    setEditingDomain(domain);
    form.reset({
      domain: domain.domain,
      targetUrl: domain.targetUrl,
      landingPageId: domain.landingPageId,
      redirectEnabled: domain.redirectEnabled ?? true,
      detectionLevel: domain.detectionLevel ?? "high",
      status: domain.status ?? "active",
      blockDirectAccess: domain.blockDirectAccess ?? false,
      blockedPlatforms: domain.blockedPlatforms ?? "google,facebook,bing,tiktok",
      jsChallenge: domain.jsChallenge ?? false,
      redirectMode: domain.redirectMode ?? "302",
      activeHours: domain.activeHours ?? null,
      activeDays: domain.activeDays ?? null,
      maxClicksPerIp: domain.maxClicksPerIp ?? 0,
      rateLimitWindow: domain.rateLimitWindow ?? 3600,
      allowMobile: domain.allowMobile ?? true,
      allowDesktop: domain.allowDesktop ?? true,
    });
  };

  // Toggle platform in blocked list
  const togglePlatform = (platformId: string) => {
    const current = form.getValues("blockedPlatforms") || "";
    const platforms = current.split(",").filter(p => p.trim());
    const index = platforms.indexOf(platformId);
    if (index >= 0) {
      platforms.splice(index, 1);
    } else {
      platforms.push(platformId);
    }
    form.setValue("blockedPlatforms", platforms.join(","));
  };

  // Check if platform is blocked
  const isPlatformBlocked = (platformId: string) => {
    const current = form.watch("blockedPlatforms") || "";
    return current.split(",").includes(platformId);
  };

  // Toggle day in active days list
  const toggleDay = (dayId: string) => {
    const current = form.getValues("activeDays") || "";
    const days = current.split(",").filter(d => d.trim());
    const index = days.indexOf(dayId);
    if (index >= 0) {
      days.splice(index, 1);
    } else {
      days.push(dayId);
    }
    form.setValue("activeDays", days.length > 0 ? days.join(",") : null);
  };

  // Check if day is active
  const isDayActive = (dayId: string) => {
    const current = form.watch("activeDays") || "";
    return current.split(",").includes(dayId);
  };

  const onSubmitEdit = (values: z.infer<typeof formSchema>) => {
    if (!editingDomain) return;
    updateMutation.mutate({ id: editingDomain.id, ...values }, {
      onSuccess: () => {
        setEditingDomain(null);
        form.reset();
      }
    });
  };

  // Handle Delete
  const handleDelete = (id: number) => {
    if (confirm("Bu linki silmek istediğinize emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold glow-text">Domainler</h2>
            <p className="text-muted-foreground">Cloaked link ve kampanyalarınızı yönetin</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20" data-testid="button-new-link">
                <Plus className="w-4 h-4 mr-2" /> Yeni Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] glass-panel border-white/10">
              <DialogHeader>
                <DialogTitle>Yeni Link Oluştur</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanımlayıcı / Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="promo-2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hedef URL (Para Sayfası)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://money-site.com/offer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="landingPageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Güvenli Sayfa</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(Number(val))} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Güvenli sayfa seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {landingPages?.map(page => (
                              <SelectItem key={page.id} value={page.id.toString()}>
                                {page.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                     <FormField
                      control={form.control}
                      name="detectionLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bot Filtresi</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "high"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seviye seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Düşük</SelectItem>
                              <SelectItem value="medium">Orta</SelectItem>
                              <SelectItem value="high">Yüksek</SelectItem>
                              <SelectItem value="paranoid">Paranoid</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="redirectEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3 shadow-sm bg-black/20">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Aktif</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="blockDirectAccess"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3 shadow-sm bg-black/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm flex items-center gap-2">
                            <Ban className="w-4 h-4" />
                            Direkt Erişimi Engelle
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">Referer olmadan URL'ye doğrudan erişenleri engelle</p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <FormLabel className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Engellenen Reklam Platformları
                    </FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {AD_PLATFORMS.map(platform => (
                        <div 
                          key={platform.id}
                          onClick={() => togglePlatform(platform.id)}
                          className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                            isPlatformBlocked(platform.id) 
                              ? 'border-primary bg-primary/10 text-primary' 
                              : 'border-white/10 bg-black/20 text-muted-foreground'
                          }`}
                          data-testid={`platform-toggle-${platform.id}`}
                        >
                          <div className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold ${
                            isPlatformBlocked(platform.id) ? 'bg-primary text-primary-foreground' : 'bg-white/10'
                          }`}>
                            {platform.icon}
                          </div>
                          <span className="text-xs">{platform.name}</span>
                        </div>
                      ))}
                    </div>
                    <input type="hidden" {...form.register("blockedPlatforms")} />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-create-link">
                    {createMutation.isPending ? "Oluşturuluyor..." : "Link Oluştur"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={!!editingDomain} onOpenChange={(open) => !open && setEditingDomain(null)}>
            <DialogContent className="sm:max-w-[600px] glass-panel border-white/10 max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Link Düzenle: {editingDomain?.domain}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4 mt-4">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-4">
                      <TabsTrigger value="basic" data-testid="tab-basic">Temel</TabsTrigger>
                      <TabsTrigger value="security" data-testid="tab-security">Güvenlik</TabsTrigger>
                      <TabsTrigger value="targeting" data-testid="tab-targeting">Hedefleme</TabsTrigger>
                      <TabsTrigger value="limits" data-testid="tab-limits">Limitler</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="targetUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hedef URL</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-target-url" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="landingPageId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Güvenli Sayfa</FormLabel>
                            <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger data-testid="select-landing-page">
                                  <SelectValue placeholder="Güvenli sayfa seçin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {landingPages?.map(page => (
                                  <SelectItem key={page.id} value={page.id.toString()}>{page.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="detectionLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bot Filtresi</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "high"}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-detection-level">
                                    <SelectValue placeholder="Seviye seçin" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Düşük</SelectItem>
                                  <SelectItem value="medium">Orta</SelectItem>
                                  <SelectItem value="high">Yüksek</SelectItem>
                                  <SelectItem value="paranoid">Paranoid</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="redirectMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Yönlendirme Modu</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "302"}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-redirect-mode">
                                    <SelectValue placeholder="Mod seçin" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="302">302 Yönlendirme</SelectItem>
                                  <SelectItem value="meta">Meta Yenileme</SelectItem>
                                  <SelectItem value="js">JavaScript</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="redirectEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3 shadow-sm bg-black/20">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Cloaking Sistemi
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                {field.value 
                                  ? "AÇIK: Gerçek kullanıcılar hedefe yönlendirilir, botlar güvenli sayfayı görür" 
                                  : "KAPALI: Herkes güvenli sayfayı görür (ısınma modu)"}
                              </p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="security" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="jsChallenge"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3 shadow-sm bg-black/20">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                JavaScript Doğrulaması
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                {field.value 
                                  ? "AÇIK: Tarayıcı JS çalıştırabilmeli (headless botları engeller)" 
                                  : "KAPALI: JS doğrulaması yapılmaz"}
                              </p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-js-challenge" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="blockDirectAccess"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3 shadow-sm bg-black/20">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm flex items-center gap-2">
                                <Ban className="w-4 h-4" />
                                Referrer Zorunlu
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                {field.value 
                                  ? "AÇIK: Referrer olmadan gelenler güvenli sayfayı görür" 
                                  : "KAPALI: Referrer olmadan gelenler de hedefe yönlendirilir"}
                              </p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-block-direct" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="space-y-3">
                        <FormLabel className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Engellenen Reklam Platformları
                        </FormLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {AD_PLATFORMS.map(platform => (
                            <div 
                              key={platform.id}
                              onClick={() => togglePlatform(platform.id)}
                              className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                                isPlatformBlocked(platform.id) 
                                  ? 'border-primary bg-primary/10 text-primary' 
                                  : 'border-white/10 bg-black/20 text-muted-foreground'
                              }`}
                              data-testid={`edit-platform-toggle-${platform.id}`}
                            >
                              <div className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold ${
                                isPlatformBlocked(platform.id) ? 'bg-primary text-primary-foreground' : 'bg-white/10'
                              }`}>
                                {platform.icon}
                              </div>
                              <span className="text-xs">{platform.name}</span>
                            </div>
                          ))}
                        </div>
                        <input type="hidden" {...form.register("blockedPlatforms")} />
                      </div>
                    </TabsContent>

                    <TabsContent value="targeting" className="space-y-4">
                      <div className="space-y-3">
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Aktif Saatler
                        </FormLabel>
                        <FormField
                          control={form.control}
                          name="activeHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="Örn: 09:00-18:00 (7/24 için boş bırakın)" 
                                  {...field} 
                                  value={field.value || ""} 
                                  data-testid="input-active-hours"
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">Format: SS:DD-SS:DD (sunucu saat dilimi)</p>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="space-y-3">
                        <FormLabel>Aktif Günler</FormLabel>
                        <div className="flex gap-2 flex-wrap">
                          {DAYS_OF_WEEK.map(day => (
                            <div 
                              key={day.id}
                              onClick={() => toggleDay(day.id)}
                              className={`px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
                                isDayActive(day.id) 
                                  ? 'border-primary bg-primary/10 text-primary' 
                                  : 'border-white/10 bg-black/20 text-muted-foreground'
                              }`}
                              data-testid={`day-toggle-${day.id}`}
                            >
                              <span className="text-sm">{day.name}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">Tüm günler için hiçbirini seçmeyin</p>
                        <input type="hidden" {...form.register("activeDays")} />
                      </div>
                      <div className="space-y-3">
                        <FormLabel className="flex items-center gap-2">Cihaz Hedefleme</FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="allowMobile"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3 bg-black/20">
                                <FormLabel className="text-sm flex items-center gap-2">
                                  <Smartphone className="w-4 h-4" />
                                  Mobil
                                </FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-allow-mobile" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="allowDesktop"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3 bg-black/20">
                                <FormLabel className="text-sm flex items-center gap-2">
                                  <Monitor className="w-4 h-4" />
                                  Desktop
                                </FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-allow-desktop" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="limits" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="maxClicksPerIp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IP Başına Maksimum Tıklama</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" placeholder="0 = sınırsız" {...field} data-testid="input-max-clicks" />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">0 = limitsiz. Limit aşıldığında ziyaretçi güvenli sayfayı görür.</p>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="rateLimitWindow"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rate Limit Penceresi (saniye)</FormLabel>
                            <FormControl>
                              <Input type="number" min="60" placeholder="3600" {...field} data-testid="input-rate-window" />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Tıklama limiti için zaman penceresi (varsayılan: 3600 = 1 saat)</p>
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                  
                  <Button type="submit" className="w-full" disabled={updateMutation.isPending} data-testid="button-save-changes">
                    {updateMutation.isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
             {[1,2,3].map(i => <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <Card className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead>Link</TableHead>
                    <TableHead>Hedef URL</TableHead>
                    <TableHead>Güvenli Sayfa</TableHead>
                    <TableHead>Güvenlik</TableHead>
                    <TableHead>Koruma</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Henüz link oluşturulmadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    domains?.map((domain) => (
                      <TableRow key={domain.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-mono font-medium">
                          <div className="flex flex-col gap-1">
                            <span className="text-primary">{domain.domain}</span>
                            <span className="text-xs text-muted-foreground">/r/{domain.slug}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={domain.targetUrl}>
                          {domain.targetUrl}
                        </TableCell>
                        <TableCell>
                          {landingPages?.find(p => p.id === domain.landingPageId)?.name || "Bilinmiyor"}
                        </TableCell>
                        <TableCell>
                           <Badge variant="outline" className="border-primary/20 text-primary">
                             {domain.detectionLevel === 'low' ? 'Düşük' : 
                              domain.detectionLevel === 'medium' ? 'Orta' : 
                              domain.detectionLevel === 'high' ? 'Yüksek' : 
                              domain.detectionLevel === 'paranoid' ? 'Paranoid' : domain.detectionLevel}
                           </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(domain.maxClicksPerIp ?? 0) > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {domain.maxClicksPerIp} tık/IP
                              </Badge>
                            )}
                            {domain.blockDirectAccess && (
                              <Badge variant="secondary" className="text-xs">
                                <Ban className="w-3 h-3 mr-1" />
                                Direkt Engel
                              </Badge>
                            )}
                            {domain.jsChallenge && (
                              <Badge variant="secondary" className="text-xs">
                                <Zap className="w-3 h-3 mr-1" />
                                JS
                              </Badge>
                            )}
                            {!(domain.maxClicksPerIp ?? 0) && !domain.blockDirectAccess && !domain.jsChallenge && (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${domain.redirectEnabled ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"}`} />
                            <span className="text-xs">{domain.redirectEnabled ? "Aktif" : "Duraklatıldı"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                             <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                               <a href={`/r/${domain.slug}`} target="_blank" rel="noopener noreferrer">
                                 <ExternalLink className="w-4 h-4" />
                               </a>
                             </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEditClick(domain)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(domain.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
