import { Card, CardContent } from "@/components/ui/card";
import { Inbox } from "lucide-react";

export default function EmptyProfile() {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
        <p className="text-muted-foreground max-w-md">
          This user hasn't created any applications yet. Check back later to see
          their work.
        </p>
      </CardContent>
    </Card>
  );
}
