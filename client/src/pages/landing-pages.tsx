import Layout from "@/components/layout";
import { useLandingPages, useCreateLandingPage, useUpdateLandingPage, useDeleteLandingPage } from "@/hooks/use-cloaker";
import { Button } from "@/components/ui/button";
import { Plus, Code, Calendar, Eye, Trash2, Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { insertLandingPageSchema, type LandingPage } from "@shared/schema";
import { format } from "date-fns";

const formSchema = insertLandingPageSchema;

export default function LandingPagesPage() {
  const { data: pages, isLoading } = useLandingPages();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);
  const [previewPage, setPreviewPage] = useState<any>(null);
  const createMutation = useCreateLandingPage();
  const updateMutation = useUpdateLandingPage();
  const deleteMutation = useDeleteLandingPage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      htmlContent: `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hoş Geldiniz</title>
</head>
<body>
  <h1>Hoş Geldiniz</h1>
  <p>Bu güvenli bir sayfadır.</p>
</body>
</html>`,
      cssContent: "body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }",
      jsContent: "",
      thumbnail: ""
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        setIsCreateOpen(false);
        form.reset();
      }
    });
  };

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      htmlContent: "",
      cssContent: "",
      jsContent: "",
      thumbnail: ""
    },
  });

  useEffect(() => {
    if (editingPage) {
      editForm.reset({
        name: editingPage.name,
        htmlContent: editingPage.htmlContent,
        cssContent: editingPage.cssContent || "",
        jsContent: editingPage.jsContent || "",
        thumbnail: editingPage.thumbnail || ""
      });
    }
  }, [editingPage]);

  const onEditSubmit = (values: z.infer<typeof formSchema>) => {
    if (!editingPage) return;
    updateMutation.mutate({ id: editingPage.id, ...values }, {
      onSuccess: () => {
        setEditingPage(null);
        editForm.reset();
      }
    });
  };

  const getPreviewSrc = (page: any) => {
    const html = page.htmlContent || "";
    const css = page.cssContent ? `<style>${page.cssContent}</style>` : "";
    const js = page.jsContent ? `<script>${page.jsContent}</script>` : "";
    const fullHtml = html.includes("</head>") 
      ? html.replace("</head>", `${css}</head>`).replace("</body>", `${js}</body>`)
      : `<!DOCTYPE html><html><head>${css}</head><body>${html}${js}</body></html>`;
    return `data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold glow-text">Güvenli Sayfalar</h2>
            <p className="text-muted-foreground">Bot ve reklam denetçilerine gösterilecek sayfalar</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20" data-testid="button-new-page">
                <Plus className="w-4 h-4 mr-2" /> Yeni Sayfa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] glass-panel border-white/10 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Güvenli Sayfa Oluştur</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sayfa Adı</FormLabel>
                        <FormControl>
                          <Input placeholder="Blog Şablonu" {...field} data-testid="input-page-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="htmlContent"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>HTML İçerik</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="<html>...</html>" 
                              className="font-mono text-xs min-h-[200px]" 
                              {...field}
                              data-testid="textarea-html" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cssContent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CSS (Opsiyonel)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="body { ... }" 
                              className="font-mono text-xs min-h-[150px]" 
                              {...field} 
                              value={field.value || ""}
                              data-testid="textarea-css"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="jsContent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>JavaScript (Opsiyonel)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="console.log('...')" 
                              className="font-mono text-xs min-h-[150px]" 
                              {...field}
                              value={field.value || ""}
                              data-testid="textarea-js" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-save-page">
                    {createMutation.isPending ? "Kaydediliyor..." : "Sayfayı Kaydet"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[1,2,3].map(i => <div key={i} className="h-48 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : pages?.length === 0 ? (
          <Card className="glass-panel">
            <CardContent className="py-12 text-center">
              <Code className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Henüz sayfa yok</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Bot ve denetçilere gösterilecek güvenli sayfalar oluşturun
              </p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-page">
                <Plus className="w-4 h-4 mr-2" /> İlk Sayfanızı Oluşturun
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages?.map((page) => (
              <Card key={page.id} className="glass-panel group hover:border-primary/30 transition-all duration-300">
                <div className="aspect-video bg-black/40 border-b border-white/5 flex items-center justify-center relative overflow-hidden">
                  <Code className="w-12 h-12 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60" />
                  <div className="absolute bottom-3 left-3">
                     <div className="text-xs font-mono text-white/70 bg-black/50 px-2 py-1 rounded border border-white/10">
                        ID: {page.id}
                     </div>
                  </div>
                </div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg truncate">{page.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Calendar className="w-3 h-3" />
                    {page.createdAt && format(new Date(page.createdAt), 'dd.MM.yyyy')} oluşturuldu
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-4">
                     <div className="bg-white/5 p-2 rounded text-center">
                        <span className="block font-bold text-foreground">HTML</span>
                        {page.htmlContent.length} k
                     </div>
                     <div className="bg-white/5 p-2 rounded text-center">
                        <span className="block font-bold text-foreground">CSS</span>
                        {page.cssContent?.length || 0} k
                     </div>
                     <div className="bg-white/5 p-2 rounded text-center">
                        <span className="block font-bold text-foreground">JS</span>
                        {page.jsContent?.length || 0} k
                     </div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="flex-1 text-xs"
                          onClick={() => setPreviewPage(page)}
                          data-testid={`button-preview-${page.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Önizle
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[900px] h-[80vh] glass-panel border-white/10">
                        <DialogHeader>
                          <DialogTitle>Önizleme: {page.name}</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 h-full mt-4">
                          <iframe 
                            src={getPreviewSrc(page)}
                            className="w-full h-[calc(80vh-100px)] rounded-lg border border-white/10 bg-white"
                            title={`Preview: ${page.name}`}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="outline" 
                      className="flex-1 text-xs"
                      onClick={() => setEditingPage(page)}
                      data-testid={`button-edit-${page.id}`}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Düzenle
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => {
                        if (window.confirm(`"${page.name}" sayfasını silmek istediğinize emin misiniz?`)) {
                          deleteMutation.mutate(page.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${page.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
          <DialogContent className="sm:max-w-[800px] glass-panel border-white/10 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sayfayı Düzenle: {editingPage?.name}</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sayfa Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Blog Şablonu" {...field} data-testid="input-edit-page-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="htmlContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HTML İçerik</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="<html>...</html>" 
                          className="font-mono text-xs min-h-[200px]" 
                          {...field}
                          data-testid="textarea-edit-html" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="cssContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CSS Stilleri</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="body { ... }" 
                            className="font-mono text-xs min-h-[100px]" 
                            {...field}
                            value={field.value || ""}
                            data-testid="textarea-edit-css" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="jsContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>JavaScript</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="console.log('...');" 
                            className="font-mono text-xs min-h-[100px]" 
                            {...field}
                            value={field.value || ""}
                            data-testid="textarea-edit-js" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setEditingPage(null)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-edit">
                    {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
