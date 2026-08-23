/**
 * Todos los textos del sitio en español.
 *
 * Este archivo es la FUENTE: define la forma del diccionario. `en.ts` tiene
 * que calzar con `typeof es` — si acá se agrega una clave y allá falta, no
 * compila. Es lo que evita que el inglés quede a medias sin que nadie note.
 *
 * Tono: seco, competitivo, humor de tabla de posiciones.
 * Nunca cursi. Tratamos una tontería con absoluta seriedad.
 */

export const es = {
  site: {
    name: "topcats",
    domain: "topcats.lol",
    tagline: "Exposición Felina",
    subtitle: "El puesto se compra. No hay jurado.",
    metaDescription:
      "Ranking público de gatos donde el puesto se compra. El orden lo decide el monto pagado. Nada más.",
  },

  live: {
    online: "en línea",
    visitors: "visitas desde el lanzamiento",
    seeRules: "cómo funciona →",
  },

  nav: {
    board: "El tablero",
    enter: "Inscribir mi gato",
    rules: "Reglas",
    privacy: "Privacidad",
  },

  hero: {
    takeRank: (rank: number) => `Tomá el #${rank} por`,
    takeTop: "Quedate con el #1 por",
    takeFree: (rank: number) => `El #${rank} está libre por`,
    lede: "Entrar cuesta $3. Pagar menos que el #1 igual te pone en el tablero, en el puesto que alcance ese monto.",
    cta: "Inscribir mi gato",
    ctaEmpty: "Tomar el #1",
    less: "Bajar un dólar",
    more: "Subir un dólar",
    displaces: (name: string, bid: string) => `Le sacás el puesto a ${name}, que puso ${bid}.`,
    displacesNobody: "Ese puesto está libre ahora mismo.",
  },

  board: {
    heading: "Catálogo General",
    countCats: "ejemplares en exhibición",
    countToday: "pujado hoy",
    countClicks: "clics enviados",
    podium: "Mesa de honor",
    rest: "Catálogo general",
    takeThisSpot: (price: string) => `Tomar este puesto — ${price}`,
    takeThisSpotShort: (price: string) => `Tomar por ${price}`,
    currentBid: "Puja",
    clicks: "clics",
    lastBid: "Última puja",
    report: "Reportar",
    reported: "Reportado",
    emptyTitle: "El catálogo está vacío.",
    emptyBody:
      "Nadie inscribió un gato todavía. El #1 cuesta $3 y está libre ahora mismo.",
    emptyCta: "Tomar el #1 por $3",
    pagePrev: "Anterior",
    pageNext: "Siguiente",
    pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
    showingRange: (firstRank: number, lastRank: number, total: number) =>
      `Del #${firstRank} al #${lastRank} de ${total} ejemplares`,
    activityHeading: "Movimientos recientes",
    activityEmpty: "Todavía no hay movimientos.",
    activityEntered: "entró con",
    activityClimbed: "subió a",
    seniority: "en el tablero desde",
  },

  reportDialog: {
    title: (name: string) => `Reportar a ${name}`,
    lede: "Contanos qué pasa. Lo mira una persona.",
    reasonLabel: "¿Qué problema hay?",
    reasonRequired: "Elegí un motivo para poder revisarlo.",
    reasons: [
      "No es un gato",
      "Contenido inapropiado",
      "El enlace engaña o es peligroso",
      "Usa una foto que no es suya",
      "Es mi gato y quiero bajarlo",
      "Otra cosa",
    ],
    detailLabel: "Contá un poco más (opcional)",
    detailPlaceholder: "Lo que nos ayude a entenderlo…",
    detailRequired: "Contanos qué pasa para poder revisarlo.",
    cancel: "Cancelar",
    send: "Enviar reporte",
    sending: "Enviando…",
    doneTitle: "Reporte enviado.",
    doneBody:
      "Lo revisa una persona. Si corresponde, bajamos el ejemplar del catálogo.",
    close: "Cerrar",
  },

  cat: {
    rankOf: (rank: number, total: number) => `#${rank} de ${total}`,
    /** Solo el "de N": la imagen OG lo pone en su propia línea. */
    outOf: (total: number) => `de ${total}`,
    underReview: "en revisión",
    photoAlt: "Vista previa del ejemplar",
    heldTitle: "Este ejemplar no está en el catálogo.",
    heldBody:
      "Está en revisión o fue dado de baja. No aparece en el tablero público.",
    notFoundTitle: "No existe ese ejemplar.",
    notFoundBody: "El enlace está mal o el gato fue dado de baja.",
    backToBoard: "Volver al catálogo",
    historyHeading: "Historial de pujas",
    historyEntry: (amount: string, total: string) =>
      `Pagó ${amount} — quedó en ${total}`,
    raiseHeading: "Subir la puja",
    raiseHelp: (current: string, min: string) =>
      `Hoy tiene ${current}. Para moverse hay que llegar al menos a ${min}, y solo se paga la diferencia.`,
    raiseCta: (rank: number, charge: string) =>
      `Subir al #${rank} — pagar ${charge}`,
    linkGoesTo: "Los clics van a",
    linkGoesHere: "Los clics vuelven a esta página",
    ownerAnon: "sin dueño declarado",
  },

  enter: {
    title: "Inscribir un ejemplar",
    lede: "Sin cuenta, sin correo, sin esperar aprobación de nadie. Subís la foto, elegís el puesto, pagás. El orden lo decide la plata.",

    step1Label: "Paso 1",
    step1Title: "Subí la foto",
    step1Help:
      "Una foto, cuadrada, del gato. jpg, png, webp o heic. Hasta 8 MB.",
    step1Drop: "Arrastrá la foto acá",
    step1Browse: "o elegí un archivo",
    step1Uploading: "Subiendo…",
    step1Replace: "Cambiar la foto",
    step1ErrorType:
      "Ese archivo no es una imagen. Aceptamos jpg, png, webp y heic.",
    step1ErrorSize: "La foto pesa más de 8 MB. Bajá el tamaño y volvé a intentar.",
    step1ErrorFailed: "No se pudo subir la foto. Volvé a intentar.",
    step1Rejected:
      "Esa foto no pasó el control de contenido. Probá con otra — no te cobramos nada.",

    step2Label: "Paso 2",
    step2Title: "¿Cómo se llama?",
    step2NameLabel: "Nombre del ejemplar",
    step2NamePlaceholder: "Michi",
    step2NameHelp: "Hasta 24 caracteres. Es lo que se ve en el tablero.",
    step2NameRequired: "Falta el nombre. Es obligatorio.",
    step2NameTooLong: "El nombre no puede pasar de 24 caracteres.",
    step2HandleLabel: "Tu @usuario (opcional)",
    step2HandlePlaceholder: "michicat",
    step2HandleHelp: "Se muestra debajo del nombre. Sin el @.",
    step2HandleInvalid:
      "Solo letras, números, puntos y guiones bajos. Hasta 30 caracteres.",
    step2HandleReserved:
      "Ese @usuario está reservado para el sitio. Elegí otro.",
    step2CountryLabel: "País (opcional)",
    step2CountryNone: "Sin país",
    step2CountrySearch: "Buscá un país…",
    step2CountryEmpty: "Ningún país coincide.",
    step2CountryHelp: "Pone la banderita en la fila.",

    step3Label: "Paso 3",
    step3Title: "¿A dónde van los clics?",
    step3UrlLabel: "Tu enlace (opcional)",
    step3UrlPlaceholder: "https://…",
    step3UrlHelp:
      "Tu fila del tablero es clickeable. Cada clic va a este enlace. Si lo dejás vacío, va a la página del gato.",
    step3UrlInvalid: "Ese enlace no es válido. Tiene que empezar con https://",
    step3UrlShortener:
      "No aceptamos acortadores. Pegá el enlace final, sin intermediarios.",

    step4Label: "Paso 4",
    step4Title: "¿A quién tumbás?",
    step4Help:
      "Tocá un puesto y el monto se ajusta solo. Tomar un puesto ocupado cuesta la puja de ese puesto más un dólar.",
    step4Free: "libre",
    step4RankLabel: (rank: number) => `#${rank}`,

    step5Label: "Paso 5",
    step5Title: "¿Cuánto pones?",
    step5AmountLabel: "Monto en dólares",
    step5Decrease: "Bajar un dólar",
    step5Increase: "Subir un dólar",
    step5Min: (min: string) => `El mínimo para entrar es ${min}.`,
    step5Outcome: (rank: number, amount: string, name: string, theirBid: string) =>
      `Con ${amount} entrás en el #${rank} y tumbás a ${name} (su puja: ${theirBid}).`,
    step5OutcomeFree: (rank: number, amount: string) =>
      `Con ${amount} entrás en el #${rank}. Ese puesto está libre.`,
    step5OutcomeTop: (amount: string, name: string, theirBid: string) =>
      `Con ${amount} te quedás con el #1 y tumbás a ${name} (su puja: ${theirBid}).`,
    step5OutcomeFirstEver: (amount: string) =>
      `Con ${amount} te quedás con el #1. No hay nadie más en el catálogo.`,
    raiseOutcome: (rank: number, amount: string, name: string, theirBid: string) =>
      `Con ${amount} subís al #${rank} y tumbás a ${name} (su puja: ${theirBid}).`,
    raiseOutcomeSame: (rank: number, amount: string) =>
      `Con ${amount} seguís en el #${rank}. No alcanza para moverte.`,
    raiseOutcomeFree: (rank: number, amount: string) =>
      `Con ${amount} subís al #${rank}. Ese puesto está libre.`,

    previewHeading: "Así se va a ver",
    previewYou: "tu ejemplar",
    previewYouName: "Tu gato",
    previewEmpty: "Elegí un monto para ver dónde caés.",

    payCta: (rank: number, amount: string) => `Tomá el #${rank} — ${amount}`,
    payCtaIncomplete: "Completá los pasos de arriba",
    payFine1: "La posición cambia al instante, apenas se confirma el pago.",
    payFine2: "Cada clic en tu fila va a tu enlace.",
    payFine3: "Si te superan no hay reembolso. Está en las reglas.",
    payWorking: "Abriendo el pago…",
    payError: "No se pudo abrir el pago. Volvé a intentar.",

    preselected: (rank: number) => `Vas por el puesto #${rank}.`,
    clearPreselect: "Elegir otro puesto",
  },

  success: {
    title: "Pago recibido.",
    body: "Falta un paso: confirmamos el pago con el proveedor y ahí entrás al tablero. Suele tardar unos segundos.",
    checking: "Confirmando el pago…",
    live: (rank: number) => `Listo. Estás en el #${rank}.`,
    heldTitle: "El pago entró, pero la foto no pasó el control.",
    heldBody:
      "El control automático marcó la imagen como no apta, así que tu ejemplar todavía no está en el tablero. Lo mira una persona. Tu puja quedó registrada y el puesto es tuyo si la foto se aprueba.",
    viewCat: "Ver mi ejemplar",
    viewBoard: "Ver el catálogo",
    stillWaiting:
      "Todavía no nos llegó la confirmación. No cierres esta página; si tarda más de un minuto, escribinos.",
  },

  rules: {
    title: "Reglas del catálogo",
    lede: "Esto es una subasta de puestos. No hay jurado, no hay algoritmo, no hay votos. El orden lo decide el monto pagado.",
    biddingHeading: "Cómo funciona la puja",
    bidding: [
      "Entrar al catálogo cuesta $3 como mínimo. Los incrementos son de $1. Solo dólares enteros.",
      "Pagar menos que el #1 igual te pone en el tablero, en el puesto que alcance ese monto.",
      "Para tomar un puesto que ya está ocupado hay que pagar la puja de ese puesto más $1.",
      "Si dos ejemplares empatan en monto, queda arriba el que llegó primero.",
      "Un ejemplar que ya está en el catálogo puede subir su puja pagando solo la diferencia. El objetivo tiene que ser al menos su monto actual más $1.",
      "Nadie pierde su puesto sin que otro pague por encima. Tu monto queda hasta que lo superen.",
    ],
    refundHeading: "No hay reembolsos",
    refundBody:
      "Ninguno. No cuando te superan, no cuando bajás de puesto, no cuando te arrepentís. Lo que pagás es el puesto en el momento del pago, y el puesto es de quien más paga. Si esto no te cierra, no pagues.",
    contentHeading: "Qué se puede subir",
    content: [
      "Fotos de gatos. Un gato por inscripción.",
      "Tienen que ser tuyas o tener permiso para usarlas.",
      "Nada de desnudez, violencia, sangre, odio, ni personas identificables sin su permiso.",
      "Nada de marcas, logos ajenos ni publicidad disfrazada de gato.",
      "Nada de acortadores de enlaces. El enlace tiene que ser el destino final.",
    ],
    moderationHeading: "Moderación",
    moderationBody:
      "Toda foto pasa por un control automático al subirla. Si el control la marca como no apta, el ejemplar no se publica: lo revisa una persona y el pago no se devuelve — eso también está en la regla de arriba. Si el control la deja pasar, el ejemplar se publica apenas se confirma el pago. Revisamos después, y podemos dar de baja cualquier ejemplar en cualquier momento, sin explicación y sin reembolso.",
    clicksHeading: "Los clics",
    clicksBody:
      "Tu fila del tablero es clickeable y lleva al enlace que hayas puesto. Contamos los clics y los mostramos. No garantizamos nada sobre ese número: es un contador, no una métrica auditada.",
    contactHeading: "Contacto",
    contactBody: "Para reportes y bajas: el botón de reportar en cada fila.",
  },

  privacy: {
    title: "Privacidad",
    lede: "La versión corta: no te pedimos cuenta, no te pedimos correo, y no tenemos casi nada tuyo.",
    sections: [
      {
        heading: "Qué guardamos",
        body: "La foto que subís, el nombre del ejemplar, el @usuario y el país si los pusiste, el enlace si lo pusiste, y el monto pagado. Nada más. No hay cuentas, no hay contraseñas, no hay correo.",
      },
      {
        heading: "El pago",
        body: "El pago lo procesa Polar, que actúa como vendedor registrado. Los datos de tu tarjeta no pasan por acá y nunca los vemos. De la transacción solo guardamos el identificador que nos devuelve el proveedor y el monto.",
      },
      {
        heading: "Los clics",
        body: "Cuando alguien hace clic en una fila incrementamos un contador. No guardamos quién hizo clic, ni su IP, ni le ponemos cookies de seguimiento.",
      },
      {
        heading: "Analítica",
        body: "No usamos analítica de terceros ni píxeles de publicidad.",
      },
      {
        heading: "Borrar tu ejemplar",
        body: "Pedí la baja con el botón de reportar en tu propia fila. Bajamos el ejemplar y borramos la foto. La puja no se devuelve.",
      },
    ],
  },

  admin: {
    title: "Moderación",
    tokenPrompt: "Token de administración",
    tokenCta: "Entrar",
    tokenInvalid: "Token inválido.",
    noModerationTitle: "No hay control automático de imágenes.",
    noModerationBody:
      "Todo lo que se paga se publica sin revisar, y aparece en el tablero y en la imagen que se comparte. Configurá SIGHTENGINE_USER y SIGHTENGINE_SECRET, y poné MODERATION_PROVIDER=sightengine antes de lanzar.",
    blockedHeading: "Bloqueados por el control",
    blockedEmpty: "Nada bloqueado.",
    blockedNote:
      "Pagaron, pero el control automático marcó la foto como no apta y por eso no se publicaron. Mirá y decidí: aprobar los publica.",
    unreviewedHeading: "Publicados sin confirmar",
    unreviewedEmpty: "Todo confirmado.",
    unreviewedNote:
      "Ya están en el tablero. El control automático no pudo confirmarlos — conviene mirarlos y bajar lo que no corresponda.",
    waitingBlocked: "El control automático lo rechazó. Pagó y no se publicó.",
    waitingUnreviewed:
      "Está en el tablero. El control automático no lo pudo confirmar.",
    draftsHeading: "Borradores sin pago",
    draftsEmpty: "No hay borradores.",
    draftsNote:
      "Abrieron el checkout y nunca pagaron. No aparecen en el tablero ni molestan a nadie: están acá solo por si querés limpiar.",
    waitingReview: "Pagó y espera tu decisión.",
    waitingPayment: "Nunca completó el pago. Aprobarlo no lo publica.",
    waitingPaymentApproved:
      "Aprobado, pero falta el pago. Se publica solo cuando el pago se confirma.",
    liveHeading: "En el catálogo",
    reportsHeading: "Reportados",
    approve: "Aprobar",
    reject: "Rechazar",
    remove: "Dar de baja",
    restore: "Reponer",
    unpaid: "sin pago",
    paid: "pagado",
    moderationOk: "auto: pasó",
    moderationReview: "auto: revisar",
    moderationReject: "auto: rechazada",
    moderationNone: "auto: sin correr",
    reportCount: (n: number) => `${n} reporte${n === 1 ? "" : "s"}`,
    reportsWhy: "Motivos reportados",
    reportNoReason: "sin motivo",
    reportMore: (n: number) => `y ${n} más`,
    dismissReports: "Marcar revisado",
    purgePhoto: "Borrar foto",
  },

  errors: {
    generic: "Algo se rompió. Volvé a intentar.",
    notFound: "No encontramos esa página.",
    notFoundCta: "Ir al catálogo",
    rateLimited: "Demasiados intentos. Esperá un momento.",
  },
};
