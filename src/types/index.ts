// ============================================================
// AgentPay India — Shared TypeScript Interfaces & API Contracts
// ============================================================
// The single source of truth for API shapes. Change a type here and update
// every consumer in the same step.
// ============================================================

// ---------------------
// Language Support
// ---------------------

/** Supported languages for agent responses and voice */
export type SupportedLanguage = 'hi' | 'mr' | 'en' | 'hinglish';

// ---------------------
// Product & Catalog
// ---------------------

/** A product in the Sakhi Sarees catalog */
export interface Product {
  id: string;
  name: string;
  /** Devanagari name (Hindi or Marathi) */
  name_hindi: string;
  description: string;
  /** Price in INR (₹) — NOT paise */
  price: number;
  category: string;
  tags: string[];
  tags_hindi: string[];
  sizes: string[];
  colors: string[];
  in_stock: boolean;
  image_url: string;
  merchant: {
    name: string;
    razorpay_id: string;
  };
}

// ---------------------
// Agent Chat API
// ---------------------

/** Response types from POST /api/agent/chat */
export type AgentResponseType =
  | 'text'
  | 'products'
  | 'order_created'
  | 'guardrail_blocked'
  | 'consent_required'
  | 'failure_handled'
  | 'error';

/** Guardrail configuration sent with each chat request */
export interface GuardrailConfig {
  /** Maximum spend allowed in ₹ (default: 1000) */
  max_spend: number;
  /** Optional: restrict to specific product categories */
  allowed_categories?: string[];
}

/** Request body for POST /api/agent/chat */
export interface ChatRequest {
  message: string;
  session_id: string;
  guardrails: GuardrailConfig;
}

/** Order data returned when an order is created */
export interface OrderData {
  /** Razorpay order ID, e.g. "order_PthN4kSaR1" */
  razorpay_order_id: string;
  /** Amount in ₹ */
  amount: number;
  /** Clickable Razorpay payment link URL */
  payment_link: string;
}

/** Guardrail block data returned when spending is denied */
export interface GuardrailData {
  /** Which rule was triggered, e.g. "spending_cap" */
  rule: string;
  /** The user's spending limit in ₹ */
  limit: number;
  /** The amount the user attempted to spend in ₹ */
  attempted: number;
  /** Agent's suggestion for alternatives */
  suggestion: string;
  /**
   * The saree the rule fired on, so the UI can name it. Optional because a
   * block can precede any product being identified (an unknown id, a rate
   * limit) — the card must render without it.
   */
  asked_for?: string;
}

/** Failure data returned when an error is handled gracefully */
export interface FailureData {
  /** Type of failure: "out_of_stock" | "payment_failed" | "timeout" */
  type: string;
  /** What the agent did to recover */
  recovery_action: string;
}

/** Response body from POST /api/agent/chat */
export interface AgentResponse {
  type: AgentResponseType;
  /** Agent's text response (Hindi/Marathi/Hinglish/English) */
  content: string;
  data?: {
    products?: Product[];
    order?: OrderData;
    guardrail?: GuardrailData;
    failure?: FailureData;
  };
  language: SupportedLanguage;
  /** Unique ID for this audit log entry */
  audit_id: string;
}

// ---------------------
// Voice API
// ---------------------

/** Response from POST /api/voice/stt */
export interface STTResponse {
  /** Transcribed text from audio */
  text: string;
  /** Detected language of the audio */
  language: 'hi' | 'mr' | 'en';
  /** Confidence score 0-1 */
  confidence: number;
}

/** Request body for POST /api/voice/tts */
export interface TTSRequest {
  text: string;
  language: 'hi' | 'mr' | 'en';
}

// Response for TTS is audio/wav binary stream (not JSON)

// ---------------------
// Audit Trail
// ---------------------

/** Actions that get logged to the audit trail */
export type AuditAction =
  | 'search_products'
  | 'create_order'
  | 'guardrail_check'
  | 'consent_request'
  | 'failure_recovery';

/** Status of a guardrail check */
export type GuardrailStatus = 'passed' | 'blocked' | 'n/a';

/** A single entry in the audit trail */
export interface AuditEntry {
  id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  action: AuditAction;
  /** What was sent to the tool/function */
  input: Record<string, unknown>;
  /** What the tool/function returned */
  output: Record<string, unknown>;
  guardrail_status: GuardrailStatus;
  /** Agent's reasoning for this decision */
  reasoning: string;
}

/** Response from GET /api/audit?session_id=xxx */
export interface AuditResponse {
  entries: AuditEntry[];
}

// ---------------------
// Razorpay Order (Internal)
// ---------------------

/** Internal order record stored in Supabase */
export interface Order {
  id: string;
  session_id: string;
  product_id: string;
  product_name: string;
  /** Amount in ₹ */
  amount: number;
  /** Amount in paise (amount * 100) — sent to Razorpay */
  amount_paise: number;
  razorpay_order_id: string;
  payment_link: string;
  status: 'created' | 'paid' | 'failed';
  created_at: string;
}

// ---------------------
// Catalog API
// ---------------------

/** Query params for GET /api/catalog */
export interface CatalogQuery {
  q?: string;
  max_price?: number;
  min_price?: number;
  category?: string;
}

/** Response from GET /api/catalog */
export interface CatalogResponse {
  products: Product[];
}

// ---------------------
// Error Response
// ---------------------

/** Standard error response from any API route */
export interface ApiError {
  error: string;
  message: string;
}
