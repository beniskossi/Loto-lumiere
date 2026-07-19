import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Copy, Download, MessageCircle, Send, Facebook, Twitter, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SocialShareProps {
  title: string;
  description: string;
  numbers?: number[];
  drawName?: string;
  url?: string;
  predictionId?: string;
  confidence?: number | null;
}

export const SocialShare = ({ 
  title, 
  description, 
  numbers = [], 
  drawName = "", 
  url = window.location.href,
  predictionId,
  confidence
}: SocialShareProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();

  const shareText = `${title}\n${description}\n${numbers.length > 0 ? `Numéros: ${numbers.join(', ')}` : ''}\n${drawName ? `Tirage: ${drawName}` : ''}\n\n#LotoLumiere #Prediction`;

  const trackShare = async (platform: string) => {
    if (!user || !predictionId) return;
    
    try {
      await supabase.from("prediction_shares").insert({
        user_id: user.id,
        prediction_id: predictionId,
        share_platform: platform,
      });
    } catch (error) {
      console.error("Error tracking share:", error);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url
        });
      } catch (error) {
        console.log('Partage annulé');
      }
    } else {
      toast.error("Le partage natif n'est pas supporté sur ce navigateur");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Lien copié dans le presse-papiers!");
    trackShare("clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    toast.success("Texte copié dans le presse-papiers!");
    trackShare("clipboard");
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + url)}`;
    window.open(whatsappUrl, '_blank');
    trackShare("whatsapp");
    setIsOpen(false);
  };

  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, '_blank');
    trackShare("telegram");
    setIsOpen(false);
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, "_blank", "width=600,height=400");
    trackShare("facebook");
    setIsOpen(false);
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, "_blank", "width=600,height=400");
    trackShare("twitter");
    setIsOpen(false);
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `loto-lumiere-qr-${Date.now()}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      const encoded = btoa(String.fromCharCode.apply(null, Array.from(new TextEncoder().encode(svgData))));
      img.src = 'data:image/svg+xml;base64,' + encoded;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Partager
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partager</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Partage natif */}
          {navigator.share && (
            <Button onClick={handleNativeShare} className="w-full gap-2">
              <Share2 className="w-4 h-4" />
              Partager
            </Button>
          )}

          {/* Réseaux sociaux */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              onClick={handleWhatsAppShare}
              className="gap-2 bg-green-50 hover:bg-green-100 border-green-200 dark:bg-green-950 dark:hover:bg-green-900 dark:border-green-800"
            >
              <MessageCircle className="w-4 h-4 text-green-600" />
              WhatsApp
            </Button>
            <Button 
              variant="outline" 
              onClick={handleTelegramShare}
              className="gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-800"
            >
              <Send className="w-4 h-4 text-blue-600" />
              Telegram
            </Button>
            <Button 
              variant="outline" 
              onClick={handleFacebookShare}
              className="gap-2"
            >
              <Facebook className="w-4 h-4" />
              Facebook
            </Button>
            <Button 
              variant="outline" 
              onClick={handleTwitterShare}
              className="gap-2"
            >
              <Twitter className="w-4 h-4" />
              Twitter
            </Button>
          </div>

          {/* Copier */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input value={url} readOnly className="flex-1" />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button variant="outline" onClick={handleCopyText} className="w-full gap-2">
              <Copy className="w-4 h-4" />
              Copier le texte
            </Button>
          </div>

          {/* QR Code */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">QR Code</CardTitle>
              <CardDescription className="text-xs">
                Scannez pour partager rapidement
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-2">
              <QRCodeSVG 
                id="qr-code"
                value={url} 
                size={120}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
              <Button variant="outline" size="sm" onClick={downloadQRCode} className="gap-2">
                <Download className="w-3 h-3" />
                Télécharger
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};