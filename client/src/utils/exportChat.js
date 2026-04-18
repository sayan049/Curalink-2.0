import jsPDF from "jspdf";

// ============================================================
// HELPERS
// ============================================================
const safeText = (text) => {
  if (!text) return "";
  return String(text)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const safeArr = (arr) => (Array.isArray(arr) ? arr : []);

// ============================================================
// EXPORT AS PDF
// ============================================================
export const exportConversationToPDF = (conversation, messages) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 15;
  const CW = PW - M * 2;
  let y = M;

  // ── COLORS ────────────────────────────────────────────────
  const C = {
    primary: [14, 165, 233],
    teal: [20, 184, 166],
    purple: [139, 92, 246],
    green: [16, 185, 129],
    red: [239, 68, 68],
    orange: [249, 115, 22],
    slate: [71, 85, 105],
    lightBg: [248, 250, 252],
    border: [226, 232, 240],
    white: [255, 255, 255],
    dark: [15, 23, 42],
    gray: [100, 116, 139],
    blueBg: [239, 246, 255],
    blueBorder: [191, 219, 254],
    tealBg: [240, 253, 250],
    tealBorder: [167, 243, 208],
    purpleBg: [250, 245, 255],
    purpleBorder: [221, 214, 254],
    greenBg: [240, 253, 244],
    redBg: [254, 242, 242],
    redBorder: [252, 165, 165],
    yellowBg: [255, 251, 235],
    yellowBorder: [253, 230, 138],
    pubCardBg: [250, 252, 255],
    pubCardBorder: [186, 213, 242],
    trialCardBg: [252, 250, 255],
    numBg: [14, 165, 233],
    numBgPurple: [139, 92, 246],
    tagGreenBg: [209, 250, 229],
    tagGreenText: [6, 95, 70],
    tagGrayBg: [226, 232, 240],
    tagGrayText: [71, 85, 105],
    tagBlueBg: [219, 234, 254],
    tagBlueText: [30, 64, 175],
    linkBlue: [37, 99, 235],
  };

  // Line heights per font size — critical for accurate card sizing
  const LH = {
    xl: 5.5, // font 9-10
    lg: 5.2, // font 8.5 (title)
    md: 4.8, // font 7.5 (authors, meta)
    sm: 4.5, // font 7   (url, small)
    tag: 8, // tags row fixed
    pad: 12, // card top + bottom padding
  };

  // ── CORE HELPERS ──────────────────────────────────────────
  const checkPage = (need = 20) => {
    if (y + need > PH - M) {
      doc.addPage();
      y = M;
    }
  };

  const fillRect = (x, ry, w, h, fill, stroke = null, radius = 2) => {
    doc.setFillColor(...fill);
    if (stroke) {
      doc.setDrawColor(...stroke);
      doc.roundedRect(x, ry, w, h, radius, radius, "FD");
    } else {
      doc.roundedRect(x, ry, w, h, radius, radius, "F");
    }
  };

  const setFont = (size, color, bold = false, italic = false) => {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont("helvetica", italic ? "italic" : bold ? "bold" : "normal");
  };

  // Measure-then-split: always set font size BEFORE splitting
  const splitAt = (str, size, maxW) => {
    doc.setFontSize(size);
    return str ? doc.splitTextToSize(safeText(str), maxW) : [];
  };

  const sectionBar = (label, bgColor) => {
    checkPage(14);
    fillRect(M, y, CW, 9, bgColor, null, 2);
    setFont(9, C.white, true);
    doc.text(safeText(label), M + 5, y + 6.2);
    y += 13;
  };

  const divider = () => {
    checkPage(6);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.line(M, y, PW - M, y);
    y += 5;
  };

  // Small filled badge — returns width consumed
  const drawTag = (label, x, ty, bgColor, textColor) => {
    setFont(6.5, textColor, true);
    const tw = doc.getTextWidth(label);
    const w = tw + 6;
    fillRect(x, ty - 3.8, w, 5.5, bgColor, null, 1);
    doc.text(label, x + 3, ty + 0.3);
    return w + 3;
  };

  // ── RESOLVE DISEASE & LOCATION from last AI message ───────
  // This gives the CURRENT disease/location per conversation turn,
  // not the stale creation-time value.
  const aiMessages = messages.filter((m) => m.role === "assistant");
  const lastAiMsg = aiMessages.slice(-1)[0];
  const exportDisease =
    lastAiMsg?.metadata?.disease ||
    conversation?.context?.disease ||
    "General Research";
  const exportLocation =
    lastAiMsg?.metadata?.location ||
    conversation?.context?.location ||
    "Not specified";

  // ── COVER PAGE ────────────────────────────────────────────
  fillRect(0, 0, PW, 42, C.primary);
  setFont(21, C.white, true);
  doc.text("Curalink Medical AI", M, 17);
  setFont(10, C.white);
  doc.text("Research Conversation Export", M, 26);

  y = 52;
  setFont(16, C.dark, true);
  const titleLines = splitAt(conversation?.title || "Medical Research", 16, CW);
  doc.text(titleLines, M, y);
  y += titleLines.length * 7 + 8;

  // Meta box
  fillRect(M, y, CW, 28, C.lightBg, C.border);
  const metaItems = [
    ["Disease:", safeText(exportDisease)],
    ["Location:", safeText(exportLocation)],
    [
      "Date:",
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    ],
    [
      "Messages:",
      `${messages.filter((m) => m.role === "user").length} questions`,
    ],
  ];
  metaItems.forEach(([label, val], idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const mx = M + 5 + col * (CW / 2);
    const my = y + 6 + row * 9;
    setFont(8, C.slate, true);
    doc.text(label, mx, my);
    setFont(8, C.dark);
    doc.text(safeText(val), mx + 24, my);
  });
  y += 36;

  // Stats row
  const totalPubs = aiMessages.reduce(
    (s, m) => s + (m.metadata?.publications?.length || 0),
    0,
  );
  const totalTrials = aiMessages.reduce(
    (s, m) => s + (m.metadata?.clinicalTrials?.length || 0),
    0,
  );
  const stats = [
    {
      val: messages.filter((m) => m.role === "user").length,
      lbl: "Queries",
      col: C.primary,
    },
    { val: totalPubs, lbl: "Publications", col: C.teal },
    { val: totalTrials, lbl: "Trials", col: C.purple },
    { val: aiMessages.length, lbl: "AI Responses", col: C.green },
  ];
  const sw = CW / 4;
  stats.forEach((s, i) => {
    fillRect(M + i * sw + 1, y, sw - 2, 18, s.col, null, 2);
    setFont(13, C.white, true);
    doc.text(String(s.val), M + i * sw + sw / 2, y + 8, { align: "center" });
    setFont(7, C.white);
    doc.text(s.lbl, M + i * sw + sw / 2, y + 14, { align: "center" });
  });
  y += 26;
  divider();

  // Disclaimer
  checkPage(16);
  fillRect(M, y, CW, 14, C.yellowBg, C.yellowBorder);
  setFont(8, [146, 64, 14], true);
  doc.text("MEDICAL DISCLAIMER", M + 4, y + 5);
  setFont(8, [146, 64, 14]);
  const dLines = splitAt(
    "This research is for informational purposes only. Always consult qualified healthcare professionals for medical decisions.",
    8,
    CW - 8,
  );
  doc.text(dLines, M + 4, y + 10);
  y += 18;

  // ── MESSAGES ──────────────────────────────────────────────
  let qNum = 1;

  messages.forEach((msg) => {
    // ── USER QUESTION ──────────────────────────────────────
    if (msg.role === "user") {
      checkPage(18);
      y += 4;
      const qLines = splitAt(msg.content, 9, CW - 20);
      const qH = Math.max(12, qLines.length * LH.lg + 6);
      fillRect(M, y, CW, qH, C.blueBg, C.blueBorder);
      setFont(9, C.primary, true);
      doc.text(`Q${qNum++}`, M + 4, y + qH / 2 + 3);
      setFont(9, C.dark);
      doc.text(qLines, M + 14, y + (qH - qLines.length * LH.lg) / 2 + LH.lg);
      y += qH + 5;
      return;
    }

    if (msg.role !== "assistant") return;

    const s = msg.metadata?.structuredResponse;
    const pubs = safeArr(msg.metadata?.publications);
    const trials = safeArr(msg.metadata?.clinicalTrials);

    if (!s) {
      const bLines = splitAt(msg.content || "", 9, CW - 6);
      const bh = bLines.length * LH.lg + 8;
      checkPage(bh + 5);
      fillRect(M, y, CW, bh, C.lightBg);
      setFont(9, C.slate);
      doc.text(bLines, M + 4, y + 5);
      y += bh + 6;
      divider();
      return;
    }

    // ─ Condition Overview ──────────────────────────────────
    if (s.conditionOverview) {
      checkPage(20);
      sectionBar("CONDITION OVERVIEW", C.primary);
      const lines = splitAt(s.conditionOverview, 9, CW - 8);
      const bh = lines.length * LH.lg + 8;
      fillRect(M, y, CW, bh, C.lightBg);
      setFont(9, C.dark);
      doc.text(lines, M + 4, y + 5.5);
      y += bh + 6;
    }

    // ─ Key Findings ───────────────────────────────────────
    if (safeArr(s.keyFindings).length > 0) {
      checkPage(20);
      sectionBar("KEY FINDINGS", C.teal);
      safeArr(s.keyFindings).forEach((finding, idx) => {
        const fLines = splitAt(finding, 8.5, CW - 20);
        const bh = fLines.length * LH.lg + 10;
        checkPage(bh + 4);
        fillRect(M, y, CW, bh, C.tealBg, C.tealBorder);
        fillRect(M + 3, y + (bh - 7) / 2, 7, 7, C.teal, null, 1);
        setFont(7.5, C.white, true);
        doc.text(String(idx + 1), M + 6.5, y + (bh - 7) / 2 + 5, {
          align: "center",
        });
        setFont(8.5, C.dark);
        doc.text(fLines, M + 13, y + 5.5);
        y += bh + 3;
      });
      y += 3;
    }

    // ─ Research Insights ──────────────────────────────────
    if (s.researchInsights) {
      checkPage(20);
      sectionBar("RESEARCH INSIGHTS", C.slate);
      const lines = splitAt(s.researchInsights, 8.5, CW - 8);
      const bh = lines.length * LH.lg + 8;
      checkPage(bh + 5);
      fillRect(M, y, CW, bh, C.lightBg);
      setFont(8.5, C.slate);
      doc.text(lines, M + 4, y + 5.5);
      y += bh + 6;
    }

    // ─ Clinical Trials Summary ────────────────────────────
    if (s.clinicalTrialsSummary) {
      checkPage(20);
      sectionBar("CLINICAL TRIALS SUMMARY", C.purple);
      const lines = splitAt(s.clinicalTrialsSummary, 8.5, CW - 8);
      const bh = lines.length * LH.lg + 8;
      fillRect(M, y, CW, bh, C.purpleBg, C.purpleBorder);
      setFont(8.5, C.dark);
      doc.text(lines, M + 4, y + 5.5);
      y += bh + 6;
    }

    // ─ Recommendations ────────────────────────────────────
    if (safeArr(s.recommendations).length > 0) {
      checkPage(20);
      sectionBar("RECOMMENDATIONS", C.green);
      safeArr(s.recommendations).forEach((rec) => {
        const rLines = splitAt(rec, 8.5, CW - 14);
        const bh = rLines.length * LH.lg + 8;
        checkPage(bh + 3);
        fillRect(M, y, CW, bh, C.greenBg, C.tealBorder);
        setFont(9, C.green, true);
        doc.text("→", M + 4, y + 5.5);
        setFont(8.5, C.dark);
        doc.text(rLines, M + 10, y + 5.5);
        y += bh + 3;
      });
      y += 3;
    }

    // ─ Safety Considerations ──────────────────────────────
    if (safeArr(s.safetyConsiderations).length > 0) {
      checkPage(20);
      sectionBar("SAFETY CONSIDERATIONS", C.red);
      safeArr(s.safetyConsiderations).forEach((sc) => {
        const scLines = splitAt(sc, 8.5, CW - 14);
        const bh = scLines.length * LH.lg + 8;
        checkPage(bh + 3);
        fillRect(M, y, CW, bh, C.redBg, C.redBorder);
        setFont(9, C.red, true);
        doc.text("!", M + 5, y + 5.5);
        setFont(8.5, C.dark);
        doc.text(scLines, M + 10, y + 5.5);
        y += bh + 3;
      });
      y += 3;
    }

    // ─ ✅ PUBLICATIONS — Accurate card sizing ──────────────
    if (pubs.length > 0) {
      checkPage(24);
      sectionBar(`RESEARCH PUBLICATIONS (${pubs.length})`, C.primary);

      pubs.forEach((pub, idx) => {
        // Measure everything at correct font size BEFORE drawing
        const contentW = CW - 22; // 16px left offset + 6px right padding

        const titleLines = splitAt(pub.title || "Untitled", 8.5, contentW);
        const authorStr = safeText(
          safeArr(pub.authors).slice(0, 3).join(", ") +
            (safeArr(pub.authors).length > 3 ? " et al." : ""),
        );
        const authorLines = splitAt(authorStr, 7.5, contentW);
        const journalLines = splitAt(pub.journalName || "", 7, contentW);
        const urlStr = safeText(pub.url || "");
        const shortUrl =
          urlStr.length > 68 ? urlStr.substring(0, 65) + "..." : urlStr;

        // Precise height: sum each element's real line count × its line height
        const cardH = Math.ceil(
          LH.pad +
            titleLines.length * LH.lg +
            (authorLines.length > 0 ? authorLines.length * LH.md + 2 : 0) +
            (journalLines.length > 0 ? journalLines.length * LH.sm + 2 : 0) +
            LH.tag +
            (shortUrl ? LH.sm + 1 : 0),
        );

        checkPage(cardH + 6);

        // Card
        fillRect(M, y, CW, cardH, C.pubCardBg, C.pubCardBorder, 3);

        // Number circle
        fillRect(M + 3, y + 3, 10, 10, C.numBg, null, 5);
        setFont(7.5, C.white, true);
        doc.text(String(idx + 1), M + 8, y + 10, { align: "center" });

        const cx = M + 16;
        let cy = y + 6;

        // Title
        setFont(8.5, C.dark, true);
        doc.text(titleLines, cx, cy);
        cy += titleLines.length * LH.lg + 2;

        // Authors
        if (authorLines.length > 0) {
          setFont(7.5, C.slate);
          doc.text(authorLines, cx, cy);
          cy += authorLines.length * LH.md + 2;
        }

        // Journal (italic)
        if (journalLines.length > 0) {
          setFont(7, C.gray, false, true);
          doc.text(journalLines, cx, cy);
          cy += journalLines.length * LH.sm + 2;
        }

        // Tags
        cy += 1;
        let tx = cx;
        if (pub.year) {
          tx += drawTag(String(pub.year), tx, cy, C.tagBlueBg, C.tagBlueText);
        }
        if (pub.source) {
          const isP = pub.source === "pubmed";
          tx += drawTag(
            pub.source.toUpperCase(),
            tx,
            cy,
            isP ? C.tagGreenBg : C.tagGrayBg,
            isP ? C.tagGreenText : C.tagGrayText,
          );
        }
        if (pub.citationCount > 0) {
          drawTag(
            `${pub.citationCount} cited`,
            tx,
            cy,
            C.tagGrayBg,
            C.tagGrayText,
          );
        }
        cy += LH.tag;

        // URL with underline
        if (shortUrl) {
          setFont(7, C.linkBlue);
          doc.text(shortUrl, cx, cy);
          doc.setDrawColor(...C.linkBlue);
          doc.setLineWidth(0.1);
          doc.line(
            cx,
            cy + 0.5,
            cx + Math.min(doc.getTextWidth(shortUrl), contentW),
            cy + 0.5,
          );
        }

        y += cardH + 4;
      });

      y += 4;
    }

    // ─ ✅ CLINICAL TRIALS — Accurate card sizing ───────────
    if (trials.length > 0) {
      checkPage(24);
      sectionBar(`CLINICAL TRIALS (${trials.length})`, C.purple);

      trials.forEach((trial, idx) => {
        const contentW = CW - 22;

        // Measure all fields at their render font size
        const titleLines = splitAt(trial.title || "Untitled", 8.5, contentW);

        const locationStr =
          safeArr(trial.locations).length > 0
            ? safeText(trial.locations.slice(0, 2).join(" | "))
            : "";
        const locationLines = splitAt(locationStr, 7.5, contentW - 24);

        const condStr = safeArr(trial.conditions)
          .slice(0, 3)
          .map((c) => safeText(c))
          .join(", ");
        const condLines = splitAt(condStr, 7.5, contentW - 30);

        const intStr = safeArr(trial.interventions)
          .slice(0, 2)
          .map((i) => safeText(i))
          .join(", ");
        const intLines = splitAt(intStr, 7.5, contentW - 34);

        const contactEmail = safeText(trial.contact?.email || "");
        const contactPhone = safeText(trial.contact?.phone || "");
        const enrollStr = trial.enrollmentCount
          ? `${trial.enrollmentCount.toLocaleString()} participants`
          : "";
        const urlStr = safeText(trial.url || "");
        const shortUrl =
          urlStr.length > 65 ? urlStr.substring(0, 62) + "..." : urlStr;

        // Precise height
        const cardH = Math.ceil(
          LH.pad +
            titleLines.length * LH.lg +
            LH.tag +
            (locationLines.length > 0
              ? Math.max(locationLines.length * LH.md, LH.md) + 3
              : 0) +
            (condLines.length > 0
              ? Math.max(condLines.length * LH.md, LH.md) + 3
              : 0) +
            (intLines.length > 0
              ? Math.max(intLines.length * LH.md, LH.md) + 3
              : 0) +
            (enrollStr ? LH.md : 0) +
            (contactEmail ? LH.sm : 0) +
            (contactPhone ? LH.sm : 0) +
            (shortUrl ? LH.sm + 1 : 0),
        );

        checkPage(cardH + 6);

        // Card
        fillRect(M, y, CW, cardH, C.trialCardBg, C.purpleBorder, 3);

        // Number circle
        fillRect(M + 3, y + 3, 10, 10, C.numBgPurple, null, 5);
        setFont(7.5, C.white, true);
        doc.text(String(idx + 1), M + 8, y + 10, { align: "center" });

        const cx = M + 16;
        let cy = y + 6;

        // Title
        setFont(8.5, C.dark, true);
        doc.text(titleLines, cx, cy);
        cy += titleLines.length * LH.lg + 2;

        // Status + Phase tags
        let tx = cx;
        const status = safeText(trial.status || "Unknown");
        const isRec = trial.status === "RECRUITING";
        tx += drawTag(
          status,
          tx,
          cy,
          isRec ? C.tagGreenBg : C.tagGrayBg,
          isRec ? C.tagGreenText : C.tagGrayText,
        );
        if (trial.phase && trial.phase !== "N/A" && trial.phase !== "NA") {
          drawTag(safeText(trial.phase), tx, cy, C.tagBlueBg, C.tagBlueText);
        }
        cy += LH.tag;

        // Location
        if (locationLines.length > 0) {
          setFont(7.5, C.slate, true);
          doc.text("Location:", cx, cy);
          setFont(7.5, C.dark);
          doc.text(locationLines, cx + 22, cy);
          cy += Math.max(locationLines.length * LH.md, LH.md) + 3;
        }

        // Conditions
        if (condLines.length > 0) {
          setFont(7.5, C.slate, true);
          doc.text("Conditions:", cx, cy);
          setFont(7.5, C.dark, false, true);
          doc.text(condLines, cx + 27, cy);
          cy += Math.max(condLines.length * LH.md, LH.md) + 3;
        }

        // Interventions
        if (intLines.length > 0) {
          setFont(7.5, C.slate, true);
          doc.text("Interventions:", cx, cy);
          setFont(7.5, C.dark, false, true);
          doc.text(intLines, cx + 31, cy);
          cy += Math.max(intLines.length * LH.md, LH.md) + 3;
        }

        // Enrollment
        if (enrollStr) {
          setFont(7.5, C.slate, true);
          doc.text("Enrollment:", cx, cy);
          setFont(7.5, C.dark);
          doc.text(enrollStr, cx + 26, cy);
          cy += LH.md;
        }

        // Contact email
        if (contactEmail) {
          setFont(7.5, C.slate, true);
          doc.text("Contact:", cx, cy);
          setFont(7.5, C.primary);
          doc.text(contactEmail, cx + 20, cy);
          cy += LH.sm;
        }

        // Contact phone
        if (contactPhone) {
          setFont(7.5, C.slate, true);
          doc.text("Phone:", cx, cy);
          setFont(7.5, C.dark);
          doc.text(contactPhone, cx + 16, cy);
          cy += LH.sm;
        }

        // URL with underline
        if (shortUrl) {
          setFont(7, C.linkBlue);
          doc.text(shortUrl, cx, cy);
          doc.setDrawColor(...C.linkBlue);
          doc.setLineWidth(0.1);
          doc.line(
            cx,
            cy + 0.5,
            cx + Math.min(doc.getTextWidth(shortUrl), contentW),
            cy + 0.5,
          );
        }

        y += cardH + 4;
      });

      y += 4;
    }

    // ─ Stats bar ──────────────────────────────────────────
    checkPage(10);
    fillRect(M, y, CW, 8, C.lightBg, C.border);
    const statsStr = safeText(
      [
        `${pubs.length} publications`,
        `${trials.length} trials`,
        msg.metadata?.processingTime
          ? `${(msg.metadata.processingTime / 1000).toFixed(1)}s`
          : "",
        msg.metadata?.modelUsed || "",
      ]
        .filter(Boolean)
        .join("   |   "),
    );
    setFont(7.5, C.gray);
    doc.text(statsStr, M + 4, y + 5.5);
    y += 12;

    divider();
  });

  // ── FOOTER ON EVERY PAGE ──────────────────────────────────
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    fillRect(0, PH - 10, PW, 10, C.primary);
    setFont(7, C.white);
    doc.text("Curalink Medical AI Research Assistant", M, PH - 4);
    doc.text(new Date().toLocaleDateString(), PW / 2, PH - 4, {
      align: "center",
    });
    doc.text(`Page ${i} of ${total}`, PW - M, PH - 4, { align: "right" });
  }

  // ── SAVE ──────────────────────────────────────────────────
  const safeName = safeText(conversation?.title || "research")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .substring(0, 30);
  doc.save(`curalink-${safeName}-${Date.now()}.pdf`);
};

// ============================================================
// EXPORT AS TEXT
// ============================================================
export const exportConversationAsText = (conversation, messages) => {
  const safeArr = (arr) => (Array.isArray(arr) ? arr : []);
  let out = "";

  const LINE = "=".repeat(60);
  const DLINE = "-".repeat(60);

  // ── Resolve disease/location from last AI message ─────────
  const lastAiMsg = messages.filter((m) => m.role === "assistant").slice(-1)[0];
  const exportDisease =
    lastAiMsg?.metadata?.disease || conversation?.context?.disease || "General";
  const exportLocation =
    lastAiMsg?.metadata?.location ||
    conversation?.context?.location ||
    "Not specified";

  out += `${LINE}\n`;
  out += `CURALINK MEDICAL AI - RESEARCH EXPORT\n`;
  out += `${LINE}\n\n`;
  out += `Title    : ${conversation?.title || "Medical Research"}\n`;
  out += `Disease  : ${exportDisease}\n`;
  out += `Location : ${exportLocation}\n`;
  out += `Date     : ${new Date().toLocaleString()}\n`;
  out += `Model    : LLaMA 3.1 8B (Ollama)\n\n`;
  out += `${DLINE}\n\n`;

  let qNum = 1;

  messages.forEach((msg) => {
    if (msg.role === "user") {
      out += `Q${qNum++}: ${msg.content}\n`;
      out += `${"-".repeat(40)}\n\n`;
      return;
    }

    if (msg.role !== "assistant") return;

    const s = msg.metadata?.structuredResponse;
    const pubs = safeArr(msg.metadata?.publications);
    const trials = safeArr(msg.metadata?.clinicalTrials);

    if (!s) {
      out += `RESPONSE:\n${msg.content || ""}\n\n${LINE}\n\n`;
      return;
    }

    if (s.conditionOverview) {
      out += `CONDITION OVERVIEW\n${s.conditionOverview}\n\n`;
    }

    if (safeArr(s.keyFindings).length > 0) {
      out += `KEY FINDINGS\n`;
      safeArr(s.keyFindings).forEach((f, i) => {
        out += `  ${i + 1}. ${f}\n`;
      });
      out += "\n";
    }

    if (s.researchInsights) {
      out += `RESEARCH INSIGHTS\n${s.researchInsights}\n\n`;
    }

    if (s.clinicalTrialsSummary) {
      out += `CLINICAL TRIALS\n${s.clinicalTrialsSummary}\n\n`;
    }

    if (safeArr(s.recommendations).length > 0) {
      out += `RECOMMENDATIONS\n`;
      safeArr(s.recommendations).forEach((r) => {
        out += `  * ${r}\n`;
      });
      out += "\n";
    }

    if (safeArr(s.safetyConsiderations).length > 0) {
      out += `SAFETY CONSIDERATIONS\n`;
      safeArr(s.safetyConsiderations).forEach((sc) => {
        out += `  ! ${sc}\n`;
      });
      out += "\n";
    }

    // Publications
    if (pubs.length > 0) {
      out += `RESEARCH PUBLICATIONS (${pubs.length})\n`;
      pubs.forEach((p, i) => {
        out += `  [${i + 1}] ${p.title || "Untitled"}\n`;

        const authors =
          safeArr(p.authors).slice(0, 3).join(", ") +
          (safeArr(p.authors).length > 3 ? " et al." : "");
        if (authors) out += `      By: ${authors}\n`;
        if (p.year)
          out += `      Year: ${p.year} | Source: ${(p.source || "").toUpperCase()}\n`;
        if (p.journalName) out += `      Journal: ${p.journalName}\n`;
        if (p.url) out += `      URL: ${p.url}\n`;
        out += "\n";
      });
    }

    // Clinical Trials
    if (trials.length > 0) {
      out += `CLINICAL TRIALS (${trials.length})\n`;
      trials.forEach((t, i) => {
        out += `  [${i + 1}] ${t.title || "Untitled"}\n`;

        const sp = [t.status, t.phase && t.phase !== "N/A" ? t.phase : null]
          .filter(Boolean)
          .join(" | ");
        if (sp) out += `      Status: ${sp}\n`;

        if (safeArr(t.conditions).length > 0) {
          out += `      Conditions:\n`;
          safeArr(t.conditions)
            .slice(0, 3)
            .forEach((c) => {
              out += `        - ${c}\n`;
            });
        }

        if (safeArr(t.interventions).length > 0) {
          out += `      Interventions:\n`;
          safeArr(t.interventions)
            .slice(0, 3)
            .forEach((iv) => {
              out += `        - ${iv}\n`;
            });
        }

        if (safeArr(t.locations).length > 0) {
          out += `      Location: ${t.locations.slice(0, 2).join("; ")}\n`;
        }

        if (t.enrollmentCount) {
          out += `      Enrollment: ${t.enrollmentCount.toLocaleString()} participants\n`;
        }

        if (t.contact?.email) out += `      Contact: ${t.contact.email}\n`;
        if (t.contact?.phone) out += `      Phone:   ${t.contact.phone}\n`;
        if (t.url) out += `      URL: ${t.url}\n`;
        out += "\n";
      });
    }

    out += `Stats: ${pubs.length} publications | ${trials.length} trials`;
    if (msg.metadata?.processingTime) {
      out += ` | ${(msg.metadata.processingTime / 1000).toFixed(1)}s`;
    }
    out += `\n${LINE}\n\n`;
  });

  out += `DISCLAIMER: For informational purposes only.\n`;
  out += `Always consult qualified healthcare professionals.\n`;

  const blob = new Blob([out], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `curalink-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
