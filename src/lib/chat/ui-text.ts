import type { SupportedLanguage } from "@/types";

/**
 * Everything the interface says, in every language it offers.
 *
 * The picker kept looking broken because the copy was scattered: a welcome
 * constant in the container, a placeholder default in the composer, voice
 * labels inline in the header, tour wording in its own component. Each was
 * written in whatever language its author had in mind, so choosing मराठी
 * changed the agent's replies and left the interface around them in Hinglish
 * and English — the reply in one language, the shop in another.
 *
 * Fixing them one at a time is how it got this way. The point of this file is
 * that there is now only one place a user-visible string can live, and a test
 * that fails if any language is missing one.
 */
export interface UiText {
  placeholder: string;
  limitLabel: string;
  change: string;
  enterToSend: string;
  voiceOn: string;
  voiceOff: string;
  speaking: string;
  voiceToggleOn: string;
  voiceToggleOff: string;
  budgetHint: string;
  budgetAria: string;
  tourHeading: string;
  feedbackAria: string;
  languageAria: string;
  errorGeneric: string;
  errorTimeout: string;
  errorOffline: string;
  micSpeak: string;
  micStop: string;
  micListening: string;
  micTranscribing: string;
  micBlocked: string;
  micUnheard: string;
  micUnreachable: string;
}

export const UI_TEXT: Record<SupportedLanguage, UiText> = {
  hinglish: {
    placeholder: "Hindi, Marathi, Hinglish ya English mein likhiye…",
    limitLabel: "aapki limit",
    change: "Badlein",
    enterToSend: "bhejne ke liye",
    voiceOn: "Awaaz chalu",
    voiceOff: "Awaaz band",
    speaking: "Bol rahi hoon",
    voiceToggleOn: "Agent ki awaaz band karein",
    voiceToggleOff: "Agent ki awaaz chalu karein",
    budgetHint: "Ya amount likh dijiye — woh bhi samajh aata hai.",
    budgetAria: "Kharch ki limit chuniye",
    tourHeading: "Ya inmein se koi ek.",
    feedbackAria: "Aapka experience kaisa raha?",
    languageAria: "Dukaan kis bhasha mein jawab de",
    errorGeneric: "Kuch galat ho gaya. Dobara try karein?",
    errorTimeout: "Agent thoda waqt le rahi hai. Ruk jaiye ya dobara try karein.",
    errorOffline: "Connection toot gaya. Internet check karke dobara try karein.",
    micSpeak: "Bol kar bataiye",
    micStop: "Recording band karein",
    micListening: "Sun rahi hoon — band karne ke liye dabaiye",
    micTranscribing: "Likh rahi hoon…",
    micBlocked: "Microphone band hai. Likh dijiye.",
    micUnheard: "Sunai nahi diya. Dobara boliye, ya likh dijiye.",
    micUnreachable: "Awaaz nahi pahunch payi. Likh dijiye.",
  },
  hi: {
    placeholder: "हिंदी, मराठी, हिंग्लिश या अंग्रेज़ी में लिखिए…",
    limitLabel: "आपकी सीमा",
    change: "बदलें",
    enterToSend: "भेजने के लिए",
    voiceOn: "आवाज़ चालू",
    voiceOff: "आवाज़ बंद",
    speaking: "बोल रही हूँ",
    voiceToggleOn: "एजेंट की आवाज़ बंद करें",
    voiceToggleOff: "एजेंट की आवाज़ चालू करें",
    budgetHint: "या रकम लिख दीजिए — वह भी समझ आती है।",
    budgetAria: "खर्च की सीमा चुनिए",
    tourHeading: "या इनमें से कोई एक।",
    feedbackAria: "आपका अनुभव कैसा रहा?",
    languageAria: "दुकान किस भाषा में जवाब दे",
    errorGeneric: "कुछ गड़बड़ हो गई। दोबारा कोशिश करें?",
    errorTimeout: "एजेंट को थोड़ा समय लग रहा है। रुकिए या दोबारा कोशिश करें।",
    errorOffline: "कनेक्शन टूट गया। इंटरनेट देखकर दोबारा कोशिश करें।",
    micSpeak: "बोलकर बताइए",
    micStop: "रिकॉर्डिंग बंद करें",
    micListening: "सुन रही हूँ — बंद करने के लिए दबाइए",
    micTranscribing: "लिख रही हूँ…",
    micBlocked: "माइक्रोफ़ोन बंद है। लिख दीजिए।",
    micUnheard: "सुनाई नहीं दिया। दोबारा बोलिए, या लिख दीजिए।",
    micUnreachable: "आवाज़ पहुँच नहीं पाई। लिख दीजिए।",
  },
  mr: {
    placeholder: "हिंदी, मराठी, हिंग्लिश किंवा इंग्रजीत लिहा…",
    limitLabel: "तुमची मर्यादा",
    change: "बदला",
    enterToSend: "पाठवण्यासाठी",
    voiceOn: "आवाज सुरू",
    voiceOff: "आवाज बंद",
    speaking: "बोलत आहे",
    voiceToggleOn: "एजंटचा आवाज बंद करा",
    voiceToggleOff: "एजंटचा आवाज सुरू करा",
    budgetHint: "किंवा रक्कम लिहा — तीही समजते.",
    budgetAria: "खर्चाची मर्यादा निवडा",
    tourHeading: "किंवा यापैकी एक.",
    feedbackAria: "तुमचा अनुभव कसा होता?",
    languageAria: "दुकानाने कोणत्या भाषेत उत्तर द्यावं",
    errorGeneric: "काहीतरी चुकलं. पुन्हा प्रयत्न कराल?",
    errorTimeout: "एजंटला थोडा वेळ लागतो आहे. थांबा किंवा पुन्हा प्रयत्न करा.",
    errorOffline: "कनेक्शन तुटलं. इंटरनेट पाहून पुन्हा प्रयत्न करा.",
    micSpeak: "बोलून सांगा",
    micStop: "रेकॉर्डिंग थांबवा",
    micListening: "ऐकत आहे — थांबवण्यासाठी दाबा",
    micTranscribing: "लिहीत आहे…",
    micBlocked: "मायक्रोफोन बंद आहे. लिहून सांगा.",
    micUnheard: "ऐकू आलं नाही. पुन्हा बोला, किंवा लिहा.",
    micUnreachable: "आवाज पोहोचला नाही. लिहून सांगा.",
  },
  en: {
    placeholder: "Type in Hindi, Marathi, Hinglish or English…",
    limitLabel: "your limit",
    change: "Change",
    enterToSend: "to send",
    voiceOn: "Voice on",
    voiceOff: "Voice off",
    speaking: "Speaking",
    voiceToggleOn: "Turn off the agent's voice",
    voiceToggleOff: "Turn on the agent's voice",
    budgetHint: "Or type an amount — she reads that too.",
    budgetAria: "Choose a spending limit",
    tourHeading: "Or try one of these.",
    feedbackAria: "How was your experience?",
    languageAria: "Language the shop replies in",
    errorGeneric: "Something went wrong. Try again?",
    errorTimeout: "The agent is taking longer than usual. Please wait or try again.",
    errorOffline: "Connection lost. Check your internet and try again.",
    micSpeak: "Speak your message",
    micStop: "Stop recording",
    micListening: "Listening — tap to stop",
    micTranscribing: "Transcribing…",
    micBlocked: "Microphone blocked. Type instead.",
    micUnheard: "I couldn't catch that. Try again, or type it.",
    micUnreachable: "Couldn't reach the transcriber. Type instead.",
  },
};

/** Hinglish is the fallback: the safest opener for a buyer who has not chosen. */
export function uiText(language: SupportedLanguage): UiText {
  return UI_TEXT[language] ?? UI_TEXT.hinglish;
}
