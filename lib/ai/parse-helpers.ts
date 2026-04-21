import { UploadStatus } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const BUCKET = "uploads";

/** Download a private Supabase Storage file and return it as a Buffer */
export async function downloadUpload(storagePath: string): Promise<Buffer> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download file from storage: ${error?.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

/**
 * Match a Claude-suggested category name to the user's actual category IDs.
 * Falls back to "Other" category, then the first category if neither exists.
 */
export async function resolveCategoryId(
  userId: string,
  suggestedName: string
): Promise<string> {
  const categories = await prisma.category.findMany({
    where: { userId },
  });

  const exact = categories.find(
    (c) => c.name.toLowerCase() === suggestedName.toLowerCase()
  );
  if (exact) return exact.id;

  const other = categories.find(
    (c) => c.name.toLowerCase() === "other"
  );
  if (other) return other.id;

  // Last resort — should never happen for a properly seeded user
  return categories[0].id;
}

/** Mark an Upload record as FAILED */
export async function markFailed(uploadId: string) {
  await prisma.upload.update({
    where: { id: uploadId },
    data: { status: UploadStatus.FAILED },
  });
}
