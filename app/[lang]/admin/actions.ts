"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { isAdmin, signIn, signOut } from "@/lib/admin";
import { BOARD_TAG } from "@/lib/board";
import { prisma } from "@/lib/db";
import { deleteImage } from "@/lib/storage";

async function assertAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("no autorizado");
}

function refresh(): void {
  revalidateTag(BOARD_TAG, { expire: 0 });
  revalidatePath("/[lang]/admin", "page");
}

export async function login(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  await signIn(token);
  revalidatePath("/[lang]/admin", "page");
}

export async function logout(): Promise<void> {
  await signOut();
  revalidatePath("/[lang]/admin", "page");
}

/**
 * Aprobar deja pasar la moderación, pero NO publica un ejemplar sin pago:
 * el puesto se otorga en el webhook, nunca acá.
 */
export async function approve(catId: string): Promise<void> {
  await assertAdmin();

  const cat = await prisma.cat.findUnique({
    where: { id: catId },
    select: { amountCents: true },
  });
  if (!cat) return;

  /*
    Aprobar marca la foto como revisada. Publica solo si además hay pago:
    el puesto se otorga con la plata, no con el visto bueno.
  */
  await prisma.cat.update({
    where: { id: catId },
    data: {
      moderation: "OK",
      status: cat.amountCents > 0 ? "LIVE" : "PENDING",
    },
  });

  refresh();
}

export async function reject(catId: string): Promise<void> {
  await assertAdmin();
  await prisma.cat.update({
    where: { id: catId },
    data: { moderation: "REJECT", status: "REMOVED" },
  });
  refresh();
}

/** Baja de un ejemplar publicado. Reversible: la foto se conserva. */
export async function remove(catId: string): Promise<void> {
  await assertAdmin();
  await prisma.cat.update({
    where: { id: catId },
    data: { status: "REMOVED" },
  });
  refresh();
}

export async function restore(catId: string): Promise<void> {
  await assertAdmin();

  const cat = await prisma.cat.findUnique({
    where: { id: catId },
    select: { amountCents: true, moderation: true },
  });
  if (!cat) return;

  await prisma.cat.update({
    where: { id: catId },
    data: {
      // Mismo criterio que el webhook: solo un REJECT impide publicar.
      status:
        cat.amountCents > 0 && cat.moderation !== "REJECT" ? "LIVE" : "PENDING",
    },
  });

  refresh();
}

/**
 * Cierra los reportes de un ejemplar sin bajarlo.
 *
 * Hace falta para poder decir "ya lo miré y está bien": sin esto, un gato
 * reportado una vez por error queda marcado en el panel para siempre y la
 * cola de reportes deja de ser una cola.
 */
export async function dismissReports(catId: string): Promise<void> {
  await assertAdmin();
  await prisma.report.deleteMany({ where: { catId } });
  refresh();
}

/**
 * Borrado definitivo de la foto. Es lo que cumple la promesa de la página
 * de privacidad. No se puede deshacer y deja el ejemplar sin imagen.
 */
export async function purgePhoto(catId: string): Promise<void> {
  await assertAdmin();

  const cat = await prisma.cat.findUnique({
    where: { id: catId },
    select: { imageKey: true },
  });
  if (!cat) return;

  /*
    El estado va primero: aunque después falle algo, el ejemplar ya salió
    del tablero. Al revés no: dejaríamos una fila visible apuntando a una
    foto borrada.
  */
  await prisma.cat.update({
    where: { id: catId },
    data: { status: "REMOVED", imageKey: "" },
  });
  refresh();

  /*
    Sin `catch`. Antes se tragaba cualquier error acá, y eso convertía una
    baja fallida en una baja aparentemente exitosa. Borrar la foto incluye
    sacarla del caché de borde; si cualquiera de los dos pasos falla, la
    imagen sigue siendo accesible por su URL y quien dio de baja tiene que
    enterarse AHORA, no cuando alguien se la muestre.

    Borrar dos veces es inofensivo: S3 responde bien aunque la key ya no
    esté, y purgar algo que no está cacheado tampoco es error.
  */
  await deleteImage(cat.imageKey);
}
