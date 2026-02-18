import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, ShieldCheck, Truck } from "lucide-react";

export default function Features() {
  const features = [
    { icon: Truck, title: "Gratis Ongkir", desc: "Area tertentu & syarat berlaku" },
    { icon: ShieldCheck, title: "Garansi Resmi", desc: "Unit bergaransi sesuai brand" },
    { icon: RotateCcw, title: "Retur Mudah", desc: "Pengembalian dalam 7 hari" },
  ];

  return (
    <Card className="mb-16 border-border">
      <CardContent className="p-6 sm:p-8">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-foreground">{feature.title}</h2>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
