"use client";

import { useEffect } from "react";

const GOOGLE_TRANSLATE_ENDPOINT =
  "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=te&dt=t&q=";

const STATIC_TE_DICTIONARY = {
  "Service Enquiry": "సేవ విచారణ",
  "Appointment Request": "అపాయింట్‌మెంట్ అభ్యర్థన",
  "Order Request": "ఆర్డర్ అభ్యర్థన",
  "Generate Bill": "బిల్ రూపొందించండి",
  Generating: "రూపొందిస్తోంది",
  "Call Us": "మాకు కాల్ చేయండి",
  "Our Location": "మా స్థానం",
  "Business Hours": "వ్యాపార వేళలు",
  Categories: "వర్గాలు",
  Gallery: "గ్యాలరీ",
  "Why Us": "ఎందుకు మేము",
  "Quick Links": "త్వరిత లింకులు",
  Services: "సేవలు",
  Contact: "సంప్రదించండి",
  Offers: "ఆఫర్లు",
  "Our Story": "మా కథ",
  "Add to Cart": "కార్ట్‌లో జోడించండి",
  Cart: "కార్ట్",
  "No logo": "లోగో లేదు",
  Contact: "సంప్రదించండి",
  Save: "సేవ్ చేయండి",
  Reviews: "సమీక్షలు",
  Overview: "అవలోకనం",
  About: "గురించి",
  Directions: "దిశలు",
  Nearby: "సమీపంలో",
  Share: "షేర్ చేయండి",
  Closed: "మూసివేయబడింది",
  Open: "తెరవబడింది",
  Monday: "సోమవారం",
  Tuesday: "మంగళవారం",
  Wednesday: "బుధవారం",
  Thursday: "గురువారం",
  Friday: "శుక్రవారం",
  Saturday: "శనివారం",
  Sunday: "ఆదివారం",
};

const translationCache = new Map();
const placeholderCacheKey = "ynotTranslatedPlaceholder";

function shouldTranslateText(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (value.length < 2) return false;
  if (!/[A-Za-z]/.test(value)) return false;
  if (/[\u0C00-\u0C7F]/.test(value)) return false;
  if (/^https?:\/\//i.test(value)) return false;
  if (/^[\d\s₹:./-]+$/.test(value)) return false;
  return true;
}

function normalizeWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

async function translateText(text) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return normalized;

  if (STATIC_TE_DICTIONARY[normalized]) {
    return STATIC_TE_DICTIONARY[normalized];
  }

  if (translationCache.has(normalized)) {
    return translationCache.get(normalized);
  }

  try {
    const response = await fetch(
      `${GOOGLE_TRANSLATE_ENDPOINT}${encodeURIComponent(normalized)}`
    );
    const data = await response.json();
    const translated = Array.isArray(data?.[0])
      ? data[0].map((part) => part?.[0] || "").join("").trim()
      : "";

    const finalValue = translated || normalized;
    translationCache.set(normalized, finalValue);
    return finalValue;
  } catch {
    translationCache.set(normalized, normalized);
    return normalized;
  }
}

function getTranslatableTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (
        parent.closest("[data-ynot-no-translate='true']") ||
        ["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"].includes(parent.tagName)
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!shouldTranslateText(node.nodeValue)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    nodes.push(currentNode);
    currentNode = walker.nextNode();
  }
  return nodes;
}

async function translateElementTree(root) {
  const nodes = getTranslatableTextNodes(root);

  for (const node of nodes) {
    const original = normalizeWhitespace(node.nodeValue);
    if (!original) continue;
    const translated = await translateText(original);
    if (translated && translated !== original) {
      node.nodeValue = node.nodeValue.replace(original, translated);
    }
  }

  const placeholders = root.querySelectorAll("input[placeholder], textarea[placeholder]");
  for (const element of Array.from(placeholders)) {
    const alreadyTranslated = element.dataset?.[placeholderCacheKey] === "true";
    const original = normalizeWhitespace(element.getAttribute("placeholder"));
    if (alreadyTranslated || !shouldTranslateText(original)) continue;
    const translated = await translateText(original);
    if (translated && translated !== original) {
      element.setAttribute("placeholder", translated);
      element.dataset[placeholderCacheKey] = "true";
    }
  }
}

export function useRuntimeTeluguPreviewTranslation({ enabled, rootRef, ready }) {
  useEffect(() => {
    if (!enabled || !ready || typeof window === "undefined") return undefined;
    const root = rootRef?.current;
    if (!root) return undefined;

    let cancelled = false;
    let observer;
    let queued = false;
    const pendingRoots = new Set();

    const runTranslation = async (targetRoot) => {
      if (cancelled) return;
      await translateElementTree(targetRoot);
    };

    runTranslation(root);

    const queueNode = (node) => {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (parent) pendingRoots.add(parent);
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        pendingRoots.add(node);
      }
    };

    const flushQueue = async () => {
      queued = false;
      if (cancelled || pendingRoots.size === 0) return;
      const targets = Array.from(pendingRoots);
      pendingRoots.clear();
      for (const target of targets) {
        if (cancelled) return;
        await runTranslation(target);
      }
    };

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(queueNode);
      }

      if (!queued && pendingRoots.size > 0) {
        queued = true;
        window.requestAnimationFrame(() => {
          flushQueue();
        });
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [enabled, rootRef, ready]);
}
