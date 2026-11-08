"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteForm({
  action,
  id,
  label,
  message,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
  message: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive" size="sm">
        <Trash2 /> {label}
      </Button>
    </form>
  );
}
