import { describe, it, expect } from "vitest";

describe("shadcn/ui components installation", () => {
  it("should be able to import Button component", async () => {
    const { Button } = await import("@/components/ui/button");
    expect(Button).toBeDefined();
  });

  it("should be able to import Card components", async () => {
    const {
      Card,
      CardHeader,
      CardTitle,
      CardDescription,
      CardContent,
      CardFooter,
    } = await import("@/components/ui/card");
    expect(Card).toBeDefined();
    expect(CardHeader).toBeDefined();
    expect(CardTitle).toBeDefined();
    expect(CardDescription).toBeDefined();
    expect(CardContent).toBeDefined();
    expect(CardFooter).toBeDefined();
  });

  it("should be able to import Badge component", async () => {
    const { Badge } = await import("@/components/ui/badge");
    expect(Badge).toBeDefined();
  });

  it("should be able to import Input component", async () => {
    const { Input } = await import("@/components/ui/input");
    expect(Input).toBeDefined();
  });

  it("should be able to import Label component", async () => {
    const { Label } = await import("@/components/ui/label");
    expect(Label).toBeDefined();
  });

  it("should be able to import Select components", async () => {
    const {
      Select,
      SelectGroup,
      SelectValue,
      SelectTrigger,
      SelectContent,
      SelectLabel,
      SelectItem,
      SelectSeparator,
      SelectScrollUpButton,
      SelectScrollDownButton,
    } = await import("@/components/ui/select");
    expect(Select).toBeDefined();
    expect(SelectGroup).toBeDefined();
    expect(SelectValue).toBeDefined();
    expect(SelectTrigger).toBeDefined();
    expect(SelectContent).toBeDefined();
    expect(SelectLabel).toBeDefined();
    expect(SelectItem).toBeDefined();
    expect(SelectSeparator).toBeDefined();
    expect(SelectScrollUpButton).toBeDefined();
    expect(SelectScrollDownButton).toBeDefined();
  });

  it("should be able to import Sheet components", async () => {
    const {
      Sheet,
      SheetPortal,
      SheetOverlay,
      SheetTrigger,
      SheetClose,
      SheetContent,
      SheetHeader,
      SheetFooter,
      SheetTitle,
      SheetDescription,
    } = await import("@/components/ui/sheet");
    expect(Sheet).toBeDefined();
    expect(SheetPortal).toBeDefined();
    expect(SheetOverlay).toBeDefined();
    expect(SheetTrigger).toBeDefined();
    expect(SheetClose).toBeDefined();
    expect(SheetContent).toBeDefined();
    expect(SheetHeader).toBeDefined();
    expect(SheetFooter).toBeDefined();
    expect(SheetTitle).toBeDefined();
    expect(SheetDescription).toBeDefined();
  });

  it("should be able to import Checkbox component", async () => {
    const { Checkbox } = await import("@/components/ui/checkbox");
    expect(Checkbox).toBeDefined();
  });
});
