import type { Dictionary } from "@/lib/i18n";

/**
 * Every string on the site, in English.
 *
 * Typed against the Spanish dictionary on purpose: add a key there and this
 * file stops compiling until it's translated. That's what keeps the English
 * version from silently going half-missing.
 *
 * Tone: dry, competitive, leaderboard humour. Never cute. We treat something
 * ridiculous with total seriousness.
 */
export const en: Dictionary = {
  site: {
    name: "topcats",
    domain: "topcats.lol",
    tagline: "Cat Show",
    subtitle: "The spot is bought. There's no jury.",
    metaDescription:
      "A public cat ranking where the spot is bought. The order is decided by how much you paid. That's it.",
  },

  live: {
    online: "online",
    visitors: "visits since launch",
    seeRules: "how it works →",
  },

  nav: {
    board: "The board",
    enter: "Enter my cat",
    rules: "Rules",
    privacy: "Privacy",
  },

  hero: {
    takeRank: (rank: number) => `Take #${rank} for`,
    takeTop: "Claim #1 for",
    takeFree: (rank: number) => `#${rank} is open for`,
    lede: "Getting in costs $3. Paying less than #1 still puts you on the board, at whatever spot that amount reaches.",
    cta: "Enter my cat",
    ctaEmpty: "Claim #1",
    less: "One dollar less",
    more: "One dollar more",
    displaces: (name: string, bid: string) =>
      `You take the spot from ${name}, who paid ${bid}.`,
    displacesNobody: "That spot is open right now.",
  },

  board: {
    heading: "General Catalogue",
    countCats: "cats on show",
    countToday: "bid today",
    countClicks: "clicks sent",
    podium: "Table of honour",
    rest: "General catalogue",
    takeThisSpot: (price: string) => `Take this spot — ${price}`,
    takeThisSpotShort: (price: string) => `Take for ${price}`,
    currentBid: "Bid",
    clicks: "clicks",
    lastBid: "Last bid",
    report: "Report",
    reported: "Reported",
    emptyTitle: "The catalogue is empty.",
    emptyBody:
      "Nobody has entered a cat yet. #1 costs $3 and it's open right now.",
    emptyCta: "Claim #1 for $3",
    pagePrev: "Previous",
    pageNext: "Next",
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    showingRange: (firstRank: number, lastRank: number, total: number) =>
      `#${firstRank} to #${lastRank} of ${total} cats`,
    activityHeading: "Recent moves",
    activityEmpty: "No moves yet.",
    activityEntered: "entered with",
    activityClimbed: "climbed to",
    seniority: "on the board since",
  },

  reportDialog: {
    title: (name: string) => `Report ${name}`,
    lede: "Tell us what's wrong. A person reads this.",
    reasonLabel: "What's the problem?",
    reasonRequired: "Pick a reason so we can look into it.",
    reasons: [
      "Not a cat",
      "Inappropriate content",
      "The link is misleading or unsafe",
      "Using a photo that isn't theirs",
      "It's my cat and I want it taken down",
      "Something else",
    ],
    detailLabel: "Tell us more (optional)",
    detailPlaceholder: "Anything that helps us understand…",
    detailRequired: "Tell us what's wrong so we can look into it.",
    cancel: "Cancel",
    send: "Send report",
    sending: "Sending…",
    doneTitle: "Report sent.",
    doneBody:
      "A person reviews it. If it checks out, we take the cat off the catalogue.",
    close: "Close",
  },

  cat: {
    rankOf: (rank: number, total: number) => `#${rank} of ${total}`,
    outOf: (total: number) => `of ${total}`,
    underReview: "under review",
    photoAlt: "Preview of your cat",
    heldTitle: "This cat isn't on the catalogue.",
    heldBody:
      "It's under review or it was taken down. It doesn't show on the public board.",
    notFoundTitle: "No such cat.",
    notFoundBody: "The link is wrong, or the cat was taken down.",
    backToBoard: "Back to the catalogue",
    historyHeading: "Bid history",
    historyEntry: (amount: string, total: string) =>
      `Paid ${amount} — landed at ${total}`,
    raiseHeading: "Raise the bid",
    raiseHelp: (current: string, min: string) =>
      `It's at ${current} today. To move you need at least ${min}, and you only pay the difference.`,
    raiseCta: (rank: number, charge: string) => `Climb to #${rank} — pay ${charge}`,
    linkGoesTo: "Clicks go to",
    linkGoesHere: "Clicks come back to this page",
    ownerAnon: "no owner given",
  },

  enter: {
    title: "Enter a cat",
    lede: "No account, no email, no waiting for anyone's approval. Upload the photo, pick your spot, pay. The money decides the order.",

    step1Label: "Step 1",
    step1Title: "Upload the photo",
    step1Help: "One square photo of the cat. jpg, png, webp or heic. Up to 8 MB.",
    step1Drop: "Drop the photo here",
    step1Browse: "or pick a file",
    step1Uploading: "Uploading…",
    step1Replace: "Change the photo",
    step1ErrorType: "That file isn't an image. We take jpg, png, webp and heic.",
    step1ErrorSize: "The photo is over 8 MB. Shrink it and try again.",
    step1ErrorFailed: "Couldn't upload the photo. Try again.",

    step2Label: "Step 2",
    step2Title: "What's its name?",
    step2NameLabel: "Cat's name",
    step2NamePlaceholder: "Michi",
    step2NameHelp: "Up to 24 characters. This is what shows on the board.",
    step2NameRequired: "The name is missing. It's required.",
    step2NameTooLong: "The name can't go over 24 characters.",
    step2HandleLabel: "Your @handle (optional)",
    step2HandlePlaceholder: "michicat",
    step2HandleHelp: "Shows under the name. Without the @.",
    step2HandleInvalid:
      "Letters, numbers, dots and underscores only. Up to 30 characters.",
    step2HandleReserved: "That @handle is reserved for the site. Pick another.",
    step2CountryLabel: "Country (optional)",
    step2CountryNone: "No country",
    step2CountrySearch: "Search for a country…",
    step2CountryEmpty: "No country matches.",
    step2CountryHelp: "Puts the little flag on the row.",

    step3Label: "Step 3",
    step3Title: "Where do the clicks go?",
    step3UrlLabel: "Your link (optional)",
    step3UrlPlaceholder: "https://…",
    step3UrlHelp:
      "Your row on the board is clickable. Every click goes to this link. Leave it empty and it goes to the cat's page.",
    step3UrlInvalid: "That link isn't valid. It has to start with https://",
    step3UrlShortener:
      "No link shorteners. Paste the final destination, no middlemen.",

    step4Label: "Step 4",
    step4Title: "Who are you knocking off?",
    step4Help:
      "Tap a spot and the amount adjusts itself. Taking an occupied spot costs that spot's bid plus one dollar.",
    step4Free: "open",
    step4RankLabel: (rank: number) => `#${rank}`,

    step5Label: "Step 5",
    step5Title: "How much are you putting in?",
    step5AmountLabel: "Amount in dollars",
    step5Decrease: "One dollar less",
    step5Increase: "One dollar more",
    step5Min: (min: string) => `The minimum to get in is ${min}.`,
    step5Outcome: (rank: number, amount: string, name: string, theirBid: string) =>
      `With ${amount} you land at #${rank} and knock off ${name} (their bid: ${theirBid}).`,
    step5OutcomeFree: (rank: number, amount: string) =>
      `With ${amount} you land at #${rank}. That spot is open.`,
    step5OutcomeTop: (amount: string, name: string, theirBid: string) =>
      `With ${amount} you take #1 and knock off ${name} (their bid: ${theirBid}).`,
    step5OutcomeFirstEver: (amount: string) =>
      `With ${amount} you take #1. Nobody else is on the catalogue.`,
    raiseOutcome: (rank: number, amount: string, name: string, theirBid: string) =>
      `With ${amount} you climb to #${rank} and knock off ${name} (their bid: ${theirBid}).`,
    raiseOutcomeSame: (rank: number, amount: string) =>
      `With ${amount} you stay at #${rank}. Not enough to move.`,
    raiseOutcomeFree: (rank: number, amount: string) =>
      `With ${amount} you climb to #${rank}. That spot is open.`,

    previewHeading: "How it will look",
    previewYou: "your cat",
    previewYouName: "Your cat",
    previewEmpty: "Pick an amount to see where you land.",

    payCta: (rank: number, amount: string) => `Take #${rank} — ${amount}`,
    payCtaIncomplete: "Finish the steps above",
    payFine1: "Your spot changes the moment the payment clears.",
    payFine2: "Every click on your row goes to your link.",
    payFine3: "If someone outbids you there's no refund. It's in the rules.",
    payWorking: "Opening checkout…",
    payError: "Couldn't open checkout. Try again.",

    preselected: (rank: number) => `You're going for spot #${rank}.`,
    clearPreselect: "Pick another spot",
  },

  success: {
    title: "Payment received.",
    body: "One step left: we confirm the payment with the provider and then you're on the board. It usually takes a few seconds.",
    checking: "Confirming the payment…",
    live: (rank: number) => `Done. You're at #${rank}.`,
    heldTitle: "The payment went through, but the photo didn't pass the check.",
    heldBody:
      "The automatic check flagged the image, so your cat isn't on the board yet. A person is looking at it. Your bid is recorded and the spot is yours if the photo gets approved.",
    viewCat: "See my cat",
    viewBoard: "See the catalogue",
    stillWaiting:
      "The confirmation hasn't reached us yet. Don't close this page; if it takes more than a minute, get in touch.",
  },

  rules: {
    title: "Catalogue rules",
    lede: "This is an auction for spots. No jury, no algorithm, no votes. The order is decided by how much you paid.",
    biddingHeading: "How bidding works",
    bidding: [
      "Getting on the catalogue costs $3 minimum. Increments are $1. Whole dollars only.",
      "Paying less than #1 still puts you on the board, at whatever spot that amount reaches.",
      "To take a spot that's already occupied you pay that spot's bid plus $1.",
      "If two cats tie on amount, the one who got there first stays on top.",
      "A cat already on the catalogue can raise its bid by paying only the difference. The target has to be at least its current amount plus $1.",
      "Nobody loses their spot unless someone else pays above it. Your amount stands until it's beaten.",
    ],
    refundHeading: "There are no refunds",
    refundBody:
      "None. Not when you get outbid, not when you drop a spot, not when you change your mind. What you pay for is the spot at the moment of payment, and the spot belongs to whoever pays most. If that doesn't sit right with you, don't pay.",
    contentHeading: "What you can upload",
    content: [
      "Photos of cats. One cat per entry.",
      "They have to be yours, or you have to have permission to use them.",
      "No nudity, violence, gore, hate, or identifiable people without their consent.",
      "No brands, no third-party logos, no advertising dressed up as a cat.",
      "No link shorteners. The link has to be the final destination.",
    ],
    moderationHeading: "Moderation",
    moderationBody:
      "Every photo goes through an automatic check on upload. If the check flags it, the cat isn't published: a person reviews it and the payment isn't returned — that's covered by the rule above too. If the check clears it, the cat goes live as soon as the payment confirms. We review afterwards, and we can take any cat down at any time, without explanation and without a refund.",
    clicksHeading: "The clicks",
    clicksBody:
      "Your row on the board is clickable and leads to whatever link you set. We count the clicks and show them. We guarantee nothing about that number: it's a counter, not an audited metric.",
    contactHeading: "Contact",
    contactBody: "For reports and takedowns: the report button on every row.",
  },

  privacy: {
    title: "Privacy",
    lede: "The short version: we don't ask for an account, we don't ask for an email, and we have almost nothing of yours.",
    sections: [
      {
        heading: "What we store",
        body: "The photo you upload, the cat's name, the @handle and country if you set them, the link if you set one, and the amount paid. Nothing else. No accounts, no passwords, no email.",
      },
      {
        heading: "The payment",
        body: "Payments are handled by Polar, acting as merchant of record. Your card details never pass through here and we never see them. From the transaction we only store the identifier the provider returns and the amount.",
      },
      {
        heading: "The clicks",
        body: "When someone clicks a row we bump a counter. We don't store who clicked, or their IP, and we don't set tracking cookies.",
      },
      {
        heading: "Analytics",
        body: "We don't use third-party analytics or advertising pixels.",
      },
      {
        heading: "Deleting your cat",
        body: "Ask for a takedown with the report button on your own row. We take the cat down and delete the photo. The bid isn't refunded.",
      },
    ],
  },

  admin: {
    title: "Moderation",
    tokenPrompt: "Admin token",
    tokenCta: "Enter",
    tokenInvalid: "Invalid token.",
    noModerationTitle: "There's no automatic image check running.",
    noModerationBody:
      "Everything that gets paid goes live unreviewed, and shows on the board and in the shared image. Set SIGHTENGINE_USER and SIGHTENGINE_SECRET, and set MODERATION_PROVIDER=sightengine before launch.",
    blockedHeading: "Blocked by the check",
    blockedEmpty: "Nothing blocked.",
    blockedNote:
      "They paid, but the automatic check flagged the photo so they weren't published. Take a look and decide: approving publishes them.",
    unreviewedHeading: "Live but unconfirmed",
    unreviewedEmpty: "All confirmed.",
    unreviewedNote:
      "These are already on the board. The automatic check couldn't confirm them — worth a look, and take down whatever doesn't belong.",
    waitingBlocked: "The automatic check rejected it. It paid and wasn't published.",
    waitingUnreviewed: "It's on the board. The automatic check couldn't confirm it.",
    draftsHeading: "Drafts without payment",
    draftsEmpty: "No drafts.",
    draftsNote:
      "They opened checkout and never paid. They don't show on the board and they bother nobody: they're here only in case you want to clean up.",
    waitingReview: "Paid and waiting on your call.",
    waitingPayment: "Never completed payment. Approving won't publish it.",
    waitingPaymentApproved:
      "Approved, but the payment is missing. It goes live only when the payment confirms.",
    liveHeading: "On the catalogue",
    reportsHeading: "Reported",
    approve: "Approve",
    reject: "Reject",
    remove: "Take down",
    restore: "Restore",
    unpaid: "unpaid",
    paid: "paid",
    moderationOk: "auto: passed",
    moderationReview: "auto: review",
    moderationReject: "auto: rejected",
    moderationNone: "auto: not run",
    reportCount: (n: number) => `${n} report${n === 1 ? "" : "s"}`,
    reportsWhy: "Reported reasons",
    reportNoReason: "no reason given",
    reportMore: (n: number) => `and ${n} more`,
    dismissReports: "Mark reviewed",
    purgePhoto: "Delete photo",
  },

  errors: {
    generic: "Something broke. Try again.",
    notFound: "We couldn't find that page.",
    notFoundCta: "Go to the catalogue",
    rateLimited: "Too many attempts. Wait a moment.",
  },
};
