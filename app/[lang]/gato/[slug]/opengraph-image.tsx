import { ImageResponse } from "next/og";

import { getCat } from "@/lib/cat";
import { getDictionary } from "@/lib/i18n";
import { flagEmoji } from "@/lib/countries";
import { formatMoney } from "@/lib/money";
import {
  CAT_PATH,
  CROWN_PATH,
  MARK_VIEWBOX,
  STAR_CENTER_PATH,
  STAR_LEFT_PATH,
  STAR_RIGHT_PATH,
  WORDMARK_PATH,
  WORDMARK_VIEWBOX,
} from "@/lib/logo-paths";
import { ogFonts } from "@/lib/og-fonts";
import { catPhotoDataUri } from "@/lib/og-photo";
import { resolveLocale } from "@/lib/i18n/config";

export const runtime = "nodejs";
export const alt = "Ficha del ejemplar en topcats.lol";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * La pieza de marketing del proyecto: lo que la gente pega en WhatsApp y X.
 *
 * Restricción de diseño: WhatsApp recorta a un cuadrado centrado, así que
 * TODO lo esencial (foto, nombre, puesto) vive en la banda central de 630 px
 * — de x=285 a x=915. Lo de afuera es decorado sacrificable.
 */
const PHOTO = 260;
const GAP = 32;
const TEXT_COLUMN = 330;

/** El nombre se achica solo para que nunca desborde la columna. */
function nameSize(name: string): number {
  if (name.length <= 7) return 58;
  if (name.length <= 11) return 44;
  if (name.length <= 16) return 34;
  return 27;
}

/** Los mismos tokens que `globals.css`, en literal: satori no lee CSS. */
const COLORS = {
  bone: "#faf7f0",
  paper: "#fffdf9",
  ink: "#101820",
  inkSoft: "#4a5158",
  inkFaint: "#5f666f",
  rule: "#ddd6c8",
  amber: "#f5ae0a",
  amberInk: "#906604",
  gold: "#b89159",
  silver: "#95948c",
  bronze: "#a56c41",
} as const;

function medalColor(rank: number | null): string {
  if (rank === 1) return COLORS.gold;
  if (rank === 2) return COLORS.silver;
  if (rank === 3) return COLORS.bronze;
  return COLORS.rule;
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const locale = resolveLocale(lang);
  const copy = getDictionary(locale);
  const [cat, fonts] = await Promise.all([getCat(slug), ogFonts()]);

  const photo = cat ? await catPhotoDataUri(cat.imageKey, PHOTO * 2) : null;
  const name = cat?.name ?? copy.site.name;
  const flag = flagEmoji(cat?.country ?? null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          background: COLORS.bone,
          padding: "34px 0",
          fontFamily: "Newsreader",
        }}
      >
        {/* Cabecera: el logo de verdad. Sacrificable en el recorte cuadrado. */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width={38} height={58} viewBox={MARK_VIEWBOX}>
            <path d={CAT_PATH} fill={COLORS.ink} />
            <path d={CROWN_PATH} fill={COLORS.gold} />
            <path d={STAR_CENTER_PATH} fill={COLORS.gold} />
            <path d={STAR_LEFT_PATH} fill={COLORS.gold} />
            <path d={STAR_RIGHT_PATH} fill={COLORS.gold} />
          </svg>
          {/*
            Sin bajada, igual que la cabecera del sitio: la línea de abajo
            ya explica de qué se trata, y repetirlo acá metía ruido.
          */}
          <svg width={118} height={28} viewBox={WORDMARK_VIEWBOX}>
            <path d={WORDMARK_PATH} fill={COLORS.ink} />
          </svg>
        </div>

        {/* Banda central: todo lo que no se puede perder. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: GAP,
            width: PHOTO + GAP + TEXT_COLUMN,
          }}
        >
          <div
            style={{
              display: "flex",
              position: "relative",
              width: PHOTO,
              height: PHOTO,
              background: COLORS.paper,
              border: `1px solid ${COLORS.rule}`,
              padding: 6,
              boxShadow: "0 10px 30px rgba(28,24,18,0.16)",
            }}
          >
            {photo ? (
              <img
                src={photo}
                width={PHOTO - 12}
                height={PHOTO - 12}
                style={{ objectFit: "cover" }}
                alt=""
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "100%",
                  background: COLORS.rule,
                }}
              />
            )}

            {cat?.rank ? (
              <div
                style={{
                  position: "absolute",
                  // Metida dentro de la banda segura: si se sale, WhatsApp
                  // la corta al recortar a cuadrado.
                  top: -16,
                  left: 6,
                  width: 62,
                  height: 62,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 62,
                  background: COLORS.paper,
                  border: `5px solid ${medalColor(cat.rank)}`,
                  fontFamily: "Fraunces",
                  fontSize: 26,
                  color: COLORS.ink,
                }}
              >
                {`${cat.rank}`}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: TEXT_COLUMN,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "Fraunces",
                fontSize: nameSize(name),
                lineHeight: 1.05,
                color: COLORS.ink,
              }}
            >
              {name}
              {flag ? <span style={{ fontSize: 26 }}>{flag}</span> : null}
            </div>

            {cat?.ownerHandle ? (
              <div
                style={{ marginTop: 4, fontSize: 19, color: COLORS.inkSoft }}
              >
                {`@${cat.ownerHandle}`}
              </div>
            ) : null}

            {/* El número de puesto es el protagonista absoluto. */}
            {cat?.rank ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  marginTop: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: "Fraunces",
                    fontSize: 138,
                    lineHeight: 0.86,
                    color: COLORS.ink,
                  }}
                >
                  {`#${cat.rank}`}
                </div>
                <div style={{ fontSize: 24, color: COLORS.inkSoft }}>
                  {copy.cat.outOf(cat.total)}
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 14,
                  fontFamily: "Fraunces",
                  fontSize: 40,
                  color: COLORS.inkSoft,
                }}
              >
                {copy.cat.underReview}
              </div>
            )}

            {cat && cat.amountCents > 0 ? (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: `1px solid ${COLORS.rule}`,
                  fontFamily: "Fraunces",
                  fontSize: 40,
                  color: COLORS.amberInk,
                }}
              >
                {formatMoney(cat.amountCents, locale)}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ fontSize: 17, letterSpacing: 3, color: COLORS.inkFaint }}>
          {`${copy.site.domain.toUpperCase()} · ${copy.site.subtitle.toUpperCase()}`}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fonts.display, style: "normal", weight: 700 },
        { name: "Newsreader", data: fonts.text, style: "normal", weight: 500 },
      ],
    },
  );
}
